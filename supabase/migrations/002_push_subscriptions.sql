-- push_subscriptions: Web Push endpoints, one row per subscribed device.
-- Users manage their own rows (insert on subscribe, delete on unsubscribe);
-- the send-checkin-reminders Edge Function reads across all rows using the
-- service_role key, which bypasses RLS.
create table if not exists push_subscriptions (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

alter table push_subscriptions enable row level security;

create policy "Users can read own push subscriptions"
  on push_subscriptions for select
  using (auth.uid() = user_id);

create policy "Users can insert own push subscriptions"
  on push_subscriptions for insert
  with check (auth.uid() = user_id);

create policy "Users can upsert own push subscriptions"
  on push_subscriptions for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own push subscriptions"
  on push_subscriptions for delete
  using (auth.uid() = user_id);
