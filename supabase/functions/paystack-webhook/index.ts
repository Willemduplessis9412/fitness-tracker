import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const PAYSTACK_SECRET_KEY = Deno.env.get("PAYSTACK_SECRET_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function verifySignature(rawBody: string, signature: string): Promise<boolean> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(PAYSTACK_SECRET_KEY),
    { name: "HMAC", hash: "SHA-512" },
    false,
    ["sign"],
  );
  const sigBuffer = await crypto.subtle.sign("HMAC", key, enc.encode(rawBody));
  const hex = Array.from(new Uint8Array(sigBuffer)).map((b) => b.toString(16).padStart(2, "0")).join("");
  return hex === signature;
}

Deno.serve(async (req) => {
  const rawBody = await req.text();
  const signature = req.headers.get("x-paystack-signature") || "";

  const valid = await verifySignature(rawBody, signature);
  if (!valid) {
    return new Response("Invalid signature", { status: 401 });
  }

  const event = JSON.parse(rawBody);
  const data = event.data;

  try {
    if (event.event === "charge.success") {
      const userId = data.metadata?.user_id;
      const plan = data.metadata?.plan;
      const customerCode = data.customer?.customer_code ?? null;

      if (userId) {
        // first payment on a fresh subscription — we know exactly who this is
        await admin.from("subscriptions").upsert({
          user_id: userId,
          status: "active",
          plan: plan ?? null,
          paystack_customer_code: customerCode,
          updated_at: new Date().toISOString(),
        });
      } else if (customerCode) {
        // a renewal charge — Paystack doesn't echo our metadata back on these,
        // so match the existing row by customer code instead
        await admin
          .from("subscriptions")
          .update({ status: "active", updated_at: new Date().toISOString() })
          .eq("paystack_customer_code", customerCode);
      }
    }

    if (event.event === "subscription.create") {
      const customerCode = data.customer?.customer_code ?? null;
      if (customerCode) {
        await admin
          .from("subscriptions")
          .update({
            paystack_subscription_code: data.subscription_code ?? null,
            paystack_email_token: data.email_token ?? null,
            current_period_end: data.next_payment_date ?? null,
            updated_at: new Date().toISOString(),
          })
          .eq("paystack_customer_code", customerCode);
      }
    }

    if (event.event === "subscription.disable" || event.event === "subscription.not_renew") {
      const subCode = data.subscription_code ?? null;
      if (subCode) {
        await admin
          .from("subscriptions")
          .update({ status: "cancelled", updated_at: new Date().toISOString() })
          .eq("paystack_subscription_code", subCode);
      }
    }

    if (event.event === "invoice.payment_failed") {
      const customerCode = data.customer?.customer_code ?? null;
      if (customerCode) {
        await admin
          .from("subscriptions")
          .update({ status: "past_due", updated_at: new Date().toISOString() })
          .eq("paystack_customer_code", customerCode);
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("paystack webhook handling failed", e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 });
  }
});
