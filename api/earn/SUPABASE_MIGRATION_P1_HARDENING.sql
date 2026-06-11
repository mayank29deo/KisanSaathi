-- =============================================================
-- KisanSaathi — P1 Earn Hardening Migration (2026-06-11)
--
-- Run this once in the Supabase SQL editor. It is idempotent — safe to
-- re-run; creates-or-replaces the new RPCs without dropping existing data.
--
-- What this adds:
--   1. log_manual_payout(p_user_id, p_amount, p_method, p_reference,
--      p_transfer_date, p_admin_email, p_force) — atomic balance-check +
--      payout insert + ledger debit, all under FOR UPDATE row locks.
--      Replaces the multi-call REST sequence in api/admin/log-payout.js.
--
--   2. mark_payout_completed(p_user_id, p_nbfc_ref, p_admin_email) —
--      atomic adopt-pending OR create-new-completed payout flow.
--      Replaces the multi-call REST sequence in api/admin/mark-paid.js.
--
-- Both functions lock earnings_ledger rows for the target user before
-- computing balance, so two concurrent admin clicks cannot both pass
-- the balance check and double-debit. The FOR UPDATE lock is held for
-- the full function call (since PL/pgSQL runs each call as one tx).
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

  select exists(select 1 from users where id = p_user_id) into v_user_exists;
  if not v_user_exists then
    return jsonb_build_object('error', 'user_not_found');
  end if;

  -- Lock ledger rows for this user. Held for the whole function call.
  select coalesce(sum(amount), 0) into v_balance
    from earnings_ledger
    where user_id = p_user_id
    for update;

  -- Balance guard (skippable only with p_force=true)
  if not p_force and p_amount > v_balance then
    return jsonb_build_object(
      'error',           'insufficient_balance',
      'currentBalance',  v_balance,
      'requestedAmount', p_amount
    );
  end if;

  -- Create the payout (status=completed since admin is recording an
  -- already-disbursed transfer)
  insert into payout_requests(user_id, amount, status, nbfc_ref, requested_at, completed_at)
    values (p_user_id, p_amount, 'completed', p_reference, p_transfer_date, p_transfer_date)
    returning id into v_payout_id;

  -- Debit ledger
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
  -- Lock ledger first so no concurrent debit can race us
  select coalesce(sum(amount), 0) into v_balance
    from earnings_ledger
    where user_id = p_user_id
    for update;

  -- Adopt any in-flight pending payout (created by old request_payout
  -- RPC path). The ledger was already debited when that pending row
  -- was created, so we only flip status to completed — no re-debit.
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
