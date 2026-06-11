-- =============================================================
-- KisanSaathi — Ledger Repair / Audit SQL
--
-- One-time queries to inspect and repair the earnings_ledger after
-- the over-debit bug (June 2026). Bug summary: log-payout had no
-- balance validation, so admin-typed amounts could exceed the user's
-- current balance and push earnings_ledger negative. Sheet column O
-- captured those negative snapshots at price-entry time and they're
-- now frozen in the sheet's history.
--
-- Code fix shipped: api/admin/log-payout.js now refuses to debit
-- more than current balance unless force=true is set. UI shows a
-- confirm prompt before forcing.
--
-- These SQL queries help you understand the existing damage and
-- (optionally) zero out negative balances by inserting corrective
-- adjustment entries.
--
-- Read-only queries are safe to run blindly. The MANUAL CORRECTION
-- section at the bottom requires you to review numbers before running.
-- =============================================================


-- ─── QUERY 1 — Blast radius ────────────────────────────────────
-- Lists every user whose current ledger balance is negative.
-- Run this first to see which users are affected and by how much.
select
  l.user_id,
  u.name,
  u.phone,
  sum(l.amount)::numeric              as current_balance,
  count(*) filter (where l.type = 'price_entry') as credits_count,
  count(*) filter (where l.type = 'payout')      as payout_count,
  sum(l.amount) filter (where l.amount > 0)      as total_credited,
  sum(l.amount) filter (where l.amount < 0)      as total_debited
from earnings_ledger l
left join users u on u.id = l.user_id
group by l.user_id, u.name, u.phone
having sum(l.amount) < 0
order by sum(l.amount) asc;


-- ─── QUERY 2 — Timeline reconstruction for a specific user ─────
-- See every credit and debit chronologically with a running balance.
-- Use this to spot exactly which payout(s) over-debited.
-- Replace the name/phone filter with the actual user_id you found above.
with target as (
  select id from users
  where name ilike '%rahul kumar%'        -- ← change this
  limit 5
)
select
  l.created_at,
  l.type,
  l.amount,
  l.description,
  l.reference_id,
  sum(l.amount) over (
    partition by l.user_id
    order by l.created_at, l.id
    rows between unbounded preceding and current row
  ) as running_balance
from earnings_ledger l
where l.user_id in (select id from target)
order by l.created_at asc, l.id asc;


-- ─── QUERY 3 — Smoking-gun report ──────────────────────────────
-- Lists every payout_requests row where the amount disbursed
-- exceeded the user's balance at the moment the payout was created.
-- These are the bad manual payouts. Sorted by severity.
with credits_before as (
  select
    p.id            as payout_id,
    p.user_id,
    p.amount        as payout_amount,
    p.requested_at,
    p.nbfc_ref,
    p.status,
    coalesce((
      select sum(l.amount)
      from earnings_ledger l
      where l.user_id = p.user_id
        and l.created_at < p.requested_at
    ), 0) as balance_at_time
  from payout_requests p
)
select
  payout_id,
  user_id,
  payout_amount,
  balance_at_time,
  (payout_amount - balance_at_time) as over_debit_by,
  requested_at,
  status,
  nbfc_ref
from credits_before
where payout_amount > balance_at_time
order by (payout_amount - balance_at_time) desc;


-- ─── QUERY 4 — Generate corrective inserts (REVIEW BEFORE RUNNING) ──
-- This DOES NOT execute anything. It outputs the exact INSERT
-- statements you would run to zero out every currently-negative user.
-- Copy the output rows, paste them as a new query, and review each
-- one before executing. Only run for users where you've confirmed the
-- negative balance is a genuine bug, not a real off-platform repayment.
select format(
  $$insert into earnings_ledger(user_id, type, amount, description) values (%L, 'adjustment', %s, 'Zero-out negative balance from pre-fix log-payout over-debit bug');$$,
  user_id,
  (-1 * sum(amount))::text
) as correction_sql
from earnings_ledger
group by user_id
having sum(amount) < 0
order by sum(amount) asc;


-- ─── MANUAL CORRECTION — one user at a time ────────────────────
-- Hand-edit :user_id and :delta. :delta = (-1 * current_balance).
-- e.g. if user is at -₹80, set delta to 80 to bring them to ₹0.
-- Wrapped in a transaction so you can rollback if numbers look wrong.
/*
begin;

-- Inspect first
select user_id, sum(amount) as balance_before
from earnings_ledger
where user_id = :'user_id'
group by user_id;

-- Apply correction
insert into earnings_ledger (user_id, type, amount, description)
values (
  :'user_id',
  'adjustment',
  :delta,
  'Manual correction — reverse over-debit from pre-fix log-payout bug. Reason: <FILL IN>'
);

-- Re-inspect
select user_id, sum(amount) as balance_after
from earnings_ledger
where user_id = :'user_id'
group by user_id;

-- If balance_after looks right (>= 0), commit. Otherwise rollback.
-- commit;
-- rollback;
*/
