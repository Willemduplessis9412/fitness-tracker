import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// In-app account deletion (required by Apple App Review guideline 5.1.1(v) and Google Play's
// account deletion policy). Every app table references auth.users with `on delete cascade`,
// so deleting the auth user removes all of their data too.

const PAYSTACK_SECRET_KEY = Deno.env.get("PAYSTACK_SECRET_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await supabase.auth.getUser();
    if (userErr || !user) return json({ error: "Not authenticated" }, 401);

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Stop any Paystack (web) subscription first so a deleted account is never billed again.
    // Best-effort: a Paystack hiccup shouldn't block the user from deleting their account.
    const { data: sub } = await admin
      .from("subscriptions")
      .select("paystack_subscription_code, paystack_email_token")
      .eq("user_id", user.id)
      .maybeSingle();
    if (PAYSTACK_SECRET_KEY && sub?.paystack_subscription_code && sub?.paystack_email_token) {
      await fetch("https://api.paystack.co/subscription/disable", {
        method: "POST",
        headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ code: sub.paystack_subscription_code, token: sub.paystack_email_token }),
      }).catch(() => {});
    }

    const { error: delErr } = await admin.auth.admin.deleteUser(user.id);
    if (delErr) return json({ error: delErr.message }, 500);

    return json({ ok: true });
  } catch (e) {
    return json({ error: (e as Error).message || "Unexpected error" }, 500);
  }
});
