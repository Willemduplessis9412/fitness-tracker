-- referrals: attributes a new signup to whoever's link they arrived through.
-- One row per referred user (a user can only ever be credited to one referrer).
-- View/filter this table in the Supabase dashboard to see who signed up via which link.
create table if not exists referrals (
  user_id uuid primary key references auth.users(id) on delete cascade,
  ref_code text not null,
  created_at timestamptz not null default now()
);

create index if not exists referrals_ref_code_idx on referrals (ref_code);

alter table referrals enable row level security;

create policy "Users can read own referral"
  on referrals for select
  using (auth.uid() = user_id);

create policy "Users can insert own referral"
  on referrals for insert
  with check (auth.uid() = user_id);
