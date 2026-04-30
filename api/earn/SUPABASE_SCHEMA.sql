-- =============================================================
-- KisanSaathi Earn — Supabase Schema
-- Run this once in your Supabase SQL editor when you set up the DB.
-- =============================================================

-- ─── Tables ──────────────────────────────────────────────────

create table if not exists price_entries (
  id              uuid primary key default gen_random_uuid(),
  user_id         text not null,
  commodity       text not null,
  price           numeric not null check (price > 0),
  unit            text not null,
  source_type     text not null,
  state           text,
  district        text not null,
  pincode         text,
  lat             numeric,
  lon             numeric,
  geo_verified    boolean default false,
  status          text not null default 'pending',  -- 'pending' | 'verified' | 'flagged' | 'rejected'
  flagged_reason  text,
  photo_url       text,
  created_at      timestamptz default now(),
  verified_at     timestamptz
);

-- Prevents same user logging same commodity in same district more than once per day
create unique index if not exists uq_price_entry_per_day
  on price_entries(user_id, commodity, district, (created_at::date));

create index if not exists idx_price_entries_district_commodity
  on price_entries(state, district, commodity, created_at desc);

create index if not exists idx_price_entries_user_status
  on price_entries(user_id, status, created_at desc);

create table if not exists earnings_ledger (
  id            bigserial primary key,
  user_id       text not null,
  type          text not null,                  -- 'price_entry' | 'referral' | 'payout' | 'adjustment'
  amount        numeric not null,
  reference_id  uuid,
  description   text,
  created_at    timestamptz default now()
);

create index if not exists idx_ledger_user on earnings_ledger(user_id, created_at desc);

create table if not exists user_bank_accounts (
  user_id                   text primary key,
  account_holder            text,
  account_number_encrypted  text,
  ifsc                      text,
  upi_id                    text,
  verified                  boolean default false,
  created_at                timestamptz default now(),
  updated_at                timestamptz default now()
);

create table if not exists referral_codes (
  user_id    text primary key,
  code       text unique not null,
  created_at timestamptz default now()
);

create table if not exists referrals (
  id                 uuid primary key default gen_random_uuid(),
  referrer_user_id   text not null,
  referred_user_id   text not null unique,
  referral_code      text not null,
  bonus_credited     boolean default false,
  created_at         timestamptz default now()
);

create table if not exists payout_requests (
  id              uuid primary key default gen_random_uuid(),
  user_id         text not null,
  amount          numeric not null,
  status          text default 'pending',         -- 'pending' | 'processing' | 'completed' | 'failed'
  nbfc_ref        text,
  failure_reason  text,
  requested_at    timestamptz default now(),
  completed_at    timestamptz
);

create index if not exists idx_payouts_status on payout_requests(status, requested_at);

create table if not exists daily_counters (
  user_id  text not null,
  date     date not null,
  entries  int  default 0,
  primary key (user_id, date)
);

create table if not exists idempotency_keys (
  key         text not null,
  user_id     text not null,
  response    jsonb not null,
  created_at  timestamptz default now(),
  primary key (key, user_id)
);

-- TTL: clean up old idempotency keys after 7 days
create index if not exists idx_idem_created on idempotency_keys(created_at);

-- ─── Atomic functions (concurrency-safe) ────────────────────

-- Atomic daily counter increment with limit check
create or replace function increment_daily_counter(
  p_user_id text, p_date date, p_limit int
) returns jsonb language plpgsql as $$
declare
  v_count int;
begin
  insert into daily_counters(user_id, date, entries)
  values (p_user_id, p_date, 1)
  on conflict (user_id, date)
  do update set entries = daily_counters.entries + 1
  returning entries into v_count;

  if v_count > p_limit then
    -- rollback the increment
    update daily_counters set entries = entries - 1
    where user_id = p_user_id and date = p_date;
    return jsonb_build_object('error', 'limit_exceeded', 'count', v_count - 1);
  end if;

  return jsonb_build_object('count', v_count, 'remaining', p_limit - v_count);
end $$;

-- Median price for outlier detection
create or replace function get_price_median(
  p_commodity text, p_district text, p_unit text, p_days int
) returns jsonb language plpgsql as $$
declare
  v_median numeric;
  v_size int;
begin
  select percentile_cont(0.5) within group (order by price), count(*)
    into v_median, v_size
  from price_entries
  where commodity = p_commodity
    and district = p_district
    and unit = p_unit
    and status = 'verified'
    and created_at > now() - (p_days || ' days')::interval;

  return jsonb_build_object('median', v_median, 'sample_size', v_size);
end $$;

-- Geo verification (simple bbox check — refine later)
create or replace function check_geo_match(
  p_state text, p_district text, p_lat numeric, p_lon numeric
) returns jsonb language plpgsql as $$
begin
  -- TODO: lookup district centroid + radius from a static table
  -- For now: trust if coords are reasonable (within India)
  if p_lat between 6 and 38 and p_lon between 68 and 98 then
    return jsonb_build_object('matched', true);
  end if;
  return jsonb_build_object('matched', false);
end $$;

-- Get user's earn stats (balance, today, total)
create or replace function get_user_earn_stats(
  p_user_id text
) returns jsonb language plpgsql as $$
declare
  v_balance numeric;
  v_today int;
  v_total int;
  v_verified int;
  v_flagged int;
begin
  select coalesce(sum(amount), 0) into v_balance
    from earnings_ledger where user_id = p_user_id;

  select count(*) into v_today
    from price_entries
    where user_id = p_user_id and created_at::date = current_date;

  select count(*) into v_total
    from price_entries where user_id = p_user_id;

  select count(*) into v_verified
    from price_entries where user_id = p_user_id and status = 'verified';

  select count(*) into v_flagged
    from price_entries where user_id = p_user_id and status = 'flagged';

  return jsonb_build_object(
    'balance', v_balance,
    'entriesToday', v_today,
    'entriesTotal', v_total,
    'verified', v_verified,
    'flagged', v_flagged
  );
end $$;

-- Atomic payout request: locks user's balance, debits, creates payout row
create or replace function request_payout(
  p_user_id text, p_min_amount numeric
) returns jsonb language plpgsql as $$
declare
  v_balance numeric;
  v_payout_amt numeric;
  v_payout_id uuid;
  v_existing uuid;
begin
  -- Check existing in-flight payout
  select id into v_existing
    from payout_requests
    where user_id = p_user_id and status in ('pending', 'processing')
    limit 1;
  if found then
    return jsonb_build_object('error', 'payout_already_in_progress', 'payout_id', v_existing);
  end if;

  -- Calculate balance with row lock to prevent races
  select coalesce(sum(amount), 0) into v_balance
    from earnings_ledger where user_id = p_user_id
    for update;

  if v_balance < p_min_amount then
    return jsonb_build_object('error', 'balance_too_low', 'balance', v_balance);
  end if;

  -- Floor to nearest ₹10 multiple (since reward is ₹10 per 10 entries)
  v_payout_amt := floor(v_balance / 10) * 10;

  -- Verify bank linked
  if not exists (select 1 from user_bank_accounts where user_id = p_user_id) then
    return jsonb_build_object('error', 'bank_not_linked');
  end if;

  -- Create payout request
  insert into payout_requests(user_id, amount, status)
    values (p_user_id, v_payout_amt, 'pending')
    returning id into v_payout_id;

  -- Debit ledger
  insert into earnings_ledger(user_id, type, amount, reference_id, description)
    values (p_user_id, 'payout', -v_payout_amt, v_payout_id, 'Payout to bank');

  return jsonb_build_object('payout_id', v_payout_id, 'amount', v_payout_amt);
end $$;

-- ─── Row Level Security ──────────────────────────────────────
-- (Optional — enable if frontend reads directly via Supabase client)
-- alter table price_entries enable row level security;
-- create policy "users_own" on price_entries for select using (user_id = auth.uid()::text);
