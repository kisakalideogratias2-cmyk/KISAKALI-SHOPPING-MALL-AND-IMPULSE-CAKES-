-- ============================================================
-- KISAKALI  kisakali_payments.sql   (additive only)
-- Run AFTER phase_payments_1.sql. Safe to run more than once.
-- Does NOT change place_order, vendor_mark_ready, admin_verify_payment
-- or any existing function. Admin still verifies payment in both modes;
-- vendor confirmation in "direct" mode only records the commission owed.
-- ============================================================

-- 1) Commission owed by vendors (direct-payment orders) ----------------
create table if not exists public.commission_dues (
  id           bigserial primary key,
  sub_order_id uuid not null unique references public.sub_orders(id) on delete cascade,
  vendor_id    uuid not null references public.vendors(id),
  order_number text not null,
  base_amount  numeric not null,
  rate         numeric not null,
  amount       numeric not null,
  status       text not null default 'Due' check (status in ('Due','Paid')),
  paid_at      timestamptz,
  paid_ref     text,
  created_at   timestamptz not null default now()
);
create index if not exists commission_dues_vendor_idx on public.commission_dues(vendor_id, status);
create index if not exists commission_dues_status_idx on public.commission_dues(status, created_at desc);
alter table public.commission_dues enable row level security;   -- no policies: access only through the RPCs below
revoke all on public.commission_dues from anon, authenticated;
revoke all on sequence public.commission_dues_id_seq from anon, authenticated;

-- 2) Platform payment numbers (stored in settings, key platform_payment) --
create or replace function public.admin_get_platform_payment()
returns jsonb language plpgsql security definer set search_path = public as $$
declare v text;
begin
  perform public.require_perm('settings');
  select value into v from settings where key = 'platform_payment';
  return coalesce(v::jsonb, '[]'::jsonb);
end $$;

create or replace function public.admin_set_platform_payment(p jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  ch jsonb := coalesce(p->'channels', '[]'::jsonb);
  c jsonb; clean jsonb := '[]'::jsonb; num text;
  allowed text[] := array['Vodacom M-Pesa','Tigo Pesa','Airtel Money','HaloPesa','CRDB / NMB Bank Transfer'];
begin
  perform public.require_perm('settings');
  if jsonb_typeof(ch) <> 'array' or jsonb_array_length(ch) > 8 then raise exception 'Too many payment numbers.'; end if;
  for c in select * from jsonb_array_elements(ch) loop
    if not ((c->>'channel') = any(allowed)) then raise exception 'Unknown payment channel.'; end if;
    num := regexp_replace(coalesce(c->>'number',''), '[\s-]', '', 'g');
    if num !~ '^(\+?255|0)?[0-9]{7,16}$' then raise exception 'Enter a valid payment number for %.', c->>'channel'; end if;
    if length(coalesce(c->>'name','')) not between 2 and 60 then raise exception 'Enter the account name for %.', c->>'channel'; end if;
    clean := clean || jsonb_build_array(jsonb_build_object('channel', c->>'channel', 'number', num, 'name', trim(c->>'name')));
  end loop;
  update settings set value = clean::text where key = 'platform_payment';
  if not found then insert into settings(key, value) values ('platform_payment', clean::text); end if;
  perform public.log_action('platform payment numbers saved', jsonb_array_length(clean)::text);
  return clean;
end $$;

-- 3) What the customer must pay, and to whom, for one order -------------
--    Same access rule as track_order: order number + customer phone.
--    Delivery fee is split evenly across vendors (place_order = vendors x fee_per_vendor)
--    and goes 100% to the vendor, in both modes.
create or replace function public.order_payment_info(p_number text, p_phone text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  o orders%rowtype; n int; fee_each numeric; v_platform text;
  groups jsonb; plat_total numeric;
begin
  select * into o from orders where order_number = upper(trim(p_number));
  if not found or public.norm_phone(o.customer_phone) <> public.norm_phone(p_phone) then
    raise exception 'Order not found';
  end if;
  select count(*) into n from sub_orders where order_id = o.id;
  fee_each := case when n > 0 then o.delivery_fee / n else 0 end;
  select value into v_platform from settings where key = 'platform_payment';

  with x as (
    select so.id, so.subtotal, v.id as vendor_id, v.shop_name,
           coalesce(ps.mode, 'platform') as mode,
           case when coalesce(ps.mode,'platform') = 'direct' then coalesce(ps.channels, '[]'::jsonb) else '[]'::jsonb end as channels
      from sub_orders so
      join vendors v on v.id = so.vendor_id
      left join vendor_payment_settings ps on ps.user_id = v.owner_id
     where so.order_id = o.id
  )
  select
    coalesce(jsonb_agg(jsonb_build_object(
      'vendor', shop_name, 'mode', mode, 'channels', channels,
      'items_total', subtotal, 'delivery_share', round(fee_each), 'pay_amount', round(subtotal + fee_each)
    ) order by shop_name) filter (where mode = 'direct' and jsonb_array_length(channels) > 0), '[]'::jsonb),
    round(coalesce(sum(subtotal + fee_each) filter (where not (mode = 'direct' and jsonb_array_length(channels) > 0)), 0))
  into groups, plat_total
  from x;

  return jsonb_build_object(
    'order_number', o.order_number,
    'payment_status', o.payment_status,
    'total', o.total,
    'direct', groups,
    'platform_amount', plat_total,
    'platform_channels', case when plat_total > 0 then coalesce(v_platform::jsonb, '[]'::jsonb) else '[]'::jsonb end
  );
end $$;

-- 4) Vendor confirms a direct payment -> records commission owed --------
create or replace function public.vendor_confirm_direct_payment(p_number text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  r record; v_mode text; v_amt numeric;
begin
  perform require_role('vendor');
  select so.id as so_id, so.subtotal, so.vendor_id, o.order_number, o.commission_percent, o.status, o.payment_status, v.owner_id
    into r
    from sub_orders so
    join orders o on o.id = so.order_id
    join vendors v on v.id = so.vendor_id
   where o.order_number = upper(trim(p_number)) and v.owner_id = auth.uid()
   limit 1;
  if not found then raise exception 'Order not found for your shop'; end if;
  if r.status = 'Cancelled' or r.payment_status = 'Failed' then raise exception 'This order is cancelled or failed'; end if;

  select mode into v_mode from vendor_payment_settings where user_id = r.owner_id;
  if coalesce(v_mode, 'platform') <> 'direct' then
    raise exception 'Your shop receives payments through the platform for this order';
  end if;

  v_amt := round(r.subtotal * coalesce(r.commission_percent, 0) / 100, 0);
  insert into commission_dues (sub_order_id, vendor_id, order_number, base_amount, rate, amount)
  values (r.so_id, r.vendor_id, r.order_number, r.subtotal, coalesce(r.commission_percent, 0), v_amt)
  on conflict (sub_order_id) do nothing;

  perform public.log_action('direct payment confirmed', r.order_number);
  return jsonb_build_object('ok', true, 'commission_due', v_amt);
end $$;

-- 5) Vendor sees his own commission debts ------------------------------
create or replace function public.vendor_commission_dues()
returns jsonb language plpgsql security definer set search_path = public as $$
declare vid uuid := my_vendor_id();
begin
  perform require_role('vendor');
  return jsonb_build_object(
    'due',  coalesce((select sum(amount) from commission_dues where vendor_id = vid and status = 'Due'), 0),
    'paid', coalesce((select sum(amount) from commission_dues where vendor_id = vid and status = 'Paid'), 0),
    'rows', coalesce((select jsonb_agg(to_jsonb(x) order by x.created_at desc) from (
        select order_number, base_amount, rate, amount, status, paid_at, paid_ref, created_at
          from commission_dues where vendor_id = vid order by created_at desc limit 100) x), '[]'::jsonb)
  );
end $$;

-- 6) Admin: list and settle ----------------------------------------------
create or replace function public.admin_commission_dues(p_status text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  perform public.require_perm('orders');
  return jsonb_build_object(
    'due_total', coalesce((select sum(amount) from commission_dues where status = 'Due'), 0),
    'rows', coalesce((select jsonb_agg(to_jsonb(x) order by x.created_at desc) from (
        select d.id, d.order_number, v.shop_name, v.phone, d.base_amount, d.rate, d.amount,
               d.status, d.paid_at, d.paid_ref, d.created_at
          from commission_dues d join vendors v on v.id = d.vendor_id
         where p_status is null or d.status = p_status
         order by d.created_at desc limit 300) x), '[]'::jsonb)
  );
end $$;

create or replace function public.admin_mark_commission_paid(p_id bigint, p_ref text)
returns void language plpgsql security definer set search_path = public as $$
declare v_on text;
begin
  perform public.require_perm('orders');
  if coalesce(trim(p_ref), '') = '' then raise exception 'Payment reference required'; end if;
  update commission_dues set status = 'Paid', paid_at = now(), paid_ref = left(trim(p_ref), 100)
   where id = p_id and status = 'Due'
   returning order_number into v_on;
  if not found then raise exception 'Commission not found or already paid'; end if;
  perform public.log_action('commission paid', v_on || ' ' || trim(p_ref));
end $$;

-- 7) Grants (RPC only) ---------------------------------------------------
revoke all on function public.admin_get_platform_payment()          from public;
revoke all on function public.admin_set_platform_payment(jsonb)     from public;
revoke all on function public.order_payment_info(text, text)        from public;
revoke all on function public.vendor_confirm_direct_payment(text)   from public;
revoke all on function public.vendor_commission_dues()              from public;
revoke all on function public.admin_commission_dues(text)           from public;
revoke all on function public.admin_mark_commission_paid(bigint, text) from public;
grant execute on function public.admin_get_platform_payment()          to authenticated;
grant execute on function public.admin_set_platform_payment(jsonb)     to authenticated;
grant execute on function public.order_payment_info(text, text)        to anon, authenticated;
grant execute on function public.vendor_confirm_direct_payment(text)   to authenticated;
grant execute on function public.vendor_commission_dues()              to authenticated;
grant execute on function public.admin_commission_dues(text)           to authenticated;
grant execute on function public.admin_mark_commission_paid(bigint, text) to authenticated;
