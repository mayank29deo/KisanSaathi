-- =============================================================
-- KisanSaathi — P1 Earn Hardening Migration (2026-06-11)
--
-- Run this once in the Supabase SQL editor. It is idempotent — safe to
-- re-run; creates-or-replaces the new RPCs without dropping existing data.
--
-- 2026-06-11 v2: switched from SELECT ... FOR UPDATE (invalid on aggregate
-- queries — Postgres error 0A000) to pg_advisory_xact_lock keyed by user_id.
-- Advisory locks are transaction-scoped, automatically released on COMMIT,
-- and actually serialize ALL operations on a user's ledger (FOR UPDATE only
-- would have locked existing rows, leaving new INSERTs unblocked).
-- =============================================================


-- ─── log_manual_payout ─────────────────────────────────────────
-- Used by POST /api/admin/log-payout.
create or replace function log_manual_payout(
  p_user_id        text,
  p_amount         numeric,
  p_method         text,
  p_reference      text,
  p_transfer_date  timestamptz,
  p_admin_email    text,
  p_force          boolean default false
) returns jsonb language plpgsql as $$
declare
  v_balance      numeric;
  v_payout_id    uuid;
  v_user_exists  boolean;
begin
  if p_amount is null or p_amount <= 0 then
    return jsonb_build_object('error', 'invalid_amount');
  end if;

  -- Transaction-scoped advisory lock keyed by user_id. Any other
  -- concurrent call for the same user waits here until we commit.
  -- Released automatically on COMMIT/ROLLBACK. The 'ks_ledger_' prefix
  -- namespaces our locks so they don't collide with any other code.
  perform pg_advisory_xact_lock(hashtext('ks_ledger_' || p_user_id));

  select exists(select 1 from users where id = p_user_id) into v_user_exists;
  if not v_user_exists then
    return jsonb_build_object('error', 'user_not_found');
  end if;

  -- Safe now: advisory lock prevents another tx from inserting
  -- concurrent debits/credits between this read and the writes below.
  select coalesce(sum(amount), 0) into v_balance
    from earnings_ledger
    where user_id = p_user_id;

  if not p_force and p_amount > v_balance then
    return jsonb_build_object(
      'error',           'insufficient_balance',
      'currentBalance',  v_balance,
      'requestedAmount', p_amount
    );
  end if;

  insert into payout_requests(user_id, amount, status, nbfc_ref, requested_at, completed_at)
    values (p_user_id, p_amount, 'completed', p_reference, p_transfer_date, p_transfer_date)
    returning id into v_payout_id;

  insert into earnings_ledger(user_id, type, amount, reference_id, description, created_at)
    values (
      p_user_id,
      'payout',
      -p_amount,
      v_payout_id,
      'Manual ' || p_method || ' payout logged by ' || p_admin_email ||
        case when p_reference is not null and p_reference <> '' then ' — ref: ' || p_reference else '' end,
      p_transfer_date
    );

  return jsonb_build_object(
    'payout_id',   v_payout_id,
    'amount',      p_amount,
    'new_balance', v_balance - p_amount,
    'forced',      p_force
  );
end $$;


-- ─── mark_payout_completed ─────────────────────────────────────
-- Used by POST /api/admin/mark-paid.
create or replace function mark_payout_completed(
  p_user_id      text,
  p_nbfc_ref     text,
  p_admin_email  text
) returns jsonb language plpgsql as $$
declare
  v_balance         numeric;
  v_existing_id     uuid;
  v_existing_amount numeric;
  v_amount          numeric;
  v_payout_id       uuid;
begin
  -- Advisory lock — same key as log_manual_payout so all payout-affecting
  -- operations on the same user serialize against each other.
  perform pg_advisory_xact_lock(hashtext('ks_ledger_' || p_user_id));

  -- Adopt any in-flight pending payout (created by old request_payout
  -- RPC path). The ledger was already debited when that pending row
  -- was created, so we only flip status to completed — no re-debit.
  -- Row-level FOR UPDATE is fine here since it's NOT an aggregate query.
  select id, amount into v_existing_id, v_existing_amount
    from payout_requests
    where user_id = p_user_id and status in ('pending', 'processing')
    order by requested_at asc
    limit 1
    for update;

  if v_existing_id is not null then
    update payout_requests
      set status = 'completed', nbfc_ref = p_nbfc_ref, completed_at = now()
      where id = v_existing_id;
    return jsonb_build_object(
      'adopted',   true,
      'payout_id', v_existing_id,
      'amount',    v_existing_amount,
      'reference', p_nbfc_ref
    );
  end if;

  -- No pending: balance check + fresh payout
  select coalesce(sum(amount), 0) into v_balance
    from earnings_ledger
    where user_id = p_user_id;

  if v_balance < 10 then
    return jsonb_build_object('error', 'balance_too_low', 'balance', v_balance);
  end if;

  v_amount := floor(v_balance / 10) * 10;

  insert into payout_requests(user_id, amount, status, nbfc_ref, requested_at, completed_at)
    values (p_user_id, v_amount, 'completed', p_nbfc_ref, now(), now())
    returning id into v_payout_id;

  insert into earnings_ledger(user_id, type, amount, reference_id, description)
    values (
      p_user_id,
      'payout',
      -v_amount,
      v_payout_id,
      'Payout marked by ' || p_admin_email || ' — ref: ' || p_nbfc_ref
    );

  return jsonb_build_object(
    'adopted',     false,
    'payout_id',   v_payout_id,
    'amount',      v_amount,
    'reference',   p_nbfc_ref,
    'new_balance', v_balance - v_amount
  );
end $$;


-- ─── Verification ─────────────────────────────────────────────
-- After running, both functions should be visible here:
--   select proname from pg_proc where proname in ('log_manual_payout', 'mark_payout_completed');
