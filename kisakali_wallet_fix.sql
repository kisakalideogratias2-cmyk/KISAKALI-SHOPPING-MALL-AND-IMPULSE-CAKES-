-- ============================================================
-- KISAKALI  kisakali_wallet_fix.sql
-- Run AFTER kisakali_payments.sql.
-- Replaces ONLY the helper _vendor_wallet (exact copy of the live version,
-- plus one filter). Orders the vendor was paid for directly are no longer
-- counted as money KISAKALI owes him, so he cannot withdraw money the
-- platform never received.
-- Excluded from the wallet:
--   (a) any sub-order that already has a commission_dues row, and
--   (b) any order placed while the vendor's mode is "direct"
--       (order created at/after his last payment-settings save).
-- Same signature and same JSON keys: nothing else needs to change.
-- ============================================================
create or replace function public._vendor_wallet(vid uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare g numeric; c numeric; pg numeric; pc numeric; wd numeric;
begin
  select coalesce(sum(so.subtotal),0), coalesce(sum(so.subtotal * o.commission_percent / 100),0) into g, c
    from sub_orders so join orders o on o.id = so.order_id
   where so.vendor_id = vid and o.payment_status = 'Verified' and o.status = 'Delivered'
     and not exists (select 1 from commission_dues d where d.sub_order_id = so.id)
     and not exists (select 1 from vendors vv join vendor_payment_settings ps on ps.user_id = vv.owner_id
                      where vv.id = so.vendor_id and ps.mode = 'direct' and o.created_at >= ps.updated_at);
  select coalesce(sum(so.subtotal),0), coalesce(sum(so.subtotal * o.commission_percent / 100),0) into pg, pc
    from sub_orders so join orders o on o.id = so.order_id
   where so.vendor_id = vid and o.payment_status = 'Verified' and o.status not in ('Delivered','Cancelled')
     and not exists (select 1 from commission_dues d where d.sub_order_id = so.id)
     and not exists (select 1 from vendors vv join vendor_payment_settings ps on ps.user_id = vv.owner_id
                      where vv.id = so.vendor_id and ps.mode = 'direct' and o.created_at >= ps.updated_at);
  select coalesce(sum(amount),0) into wd from payout_requests where vendor_id = vid and status in ('Pending','Approved','Paid');
  return jsonb_build_object('gross', g, 'commission', c, 'net', g - c, 'pending', pg - pc, 'withdrawn', wd,
      'available', g - c - wd, 'rate', (select value::numeric from settings where key = 'commission_percent'));
end $function$;
