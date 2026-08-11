// Scheduled daily (see setup notes) — pushes an "evening check-in" reminder
// to every subscribed device, even if the app is closed or the phone is offline
// (the push service queues it and delivers once the device reconnects).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY")!;

webpush.setVapidDetails("mailto:support@fitdata.fit", VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

Deno.serve(async (req) => {
  // only the scheduled cron job (invoked with the service role key) may trigger this —
  // the anon key is public, so without this check anyone could spam every user's phone
  const auth = req.headers.get("Authorization") ?? "";
  if (auth !== `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const { data: subs, error } = await admin
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth");

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const payload = JSON.stringify({
    title: "FIT DATA",
    body: "Time for your evening check-in — log today's food, workout and steps.",
    url: "/",
  });

  let sent = 0;
  const staleIds = [];
  await Promise.all(
    (subs || []).map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          payload
        );
        sent++;
      } catch (e) {
        // 404/410 = the browser/OS invalidated this subscription — stop trying it
        if (e?.statusCode === 404 || e?.statusCode === 410) staleIds.push(s.id);
      }
    })
  );

  if (staleIds.length > 0) {
    await admin.from("push_subscriptions").delete().in("id", staleIds);
  }

  return new Response(
    JSON.stringify({ sent, removed: staleIds.length, total: (subs || []).length }),
    { headers: { "Content-Type": "application/json" } }
  );
});
