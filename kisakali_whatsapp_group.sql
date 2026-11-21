-- KISAKALI: WhatsApp group link, set from the Admin portal (Settings & audit).
-- Run this ONCE in Supabase > SQL Editor. It is safe to run again.
-- The link is stored in the database (settings table, key whatsapp_group_link),
-- so it is never reset by a website redeploy.

-- 1) Public read: every page asks for the link here (no login needed) ------
create or replace function public.get_whatsapp_group_link()
returns text language sql stable security definer set search_path = public as $$
  select nullif(trim(value), '') from settings where key = 'whatsapp_group_link'
$$;

-- 2) Admin read (needs the "settings" permission) ---------------------------
create or replace function public.admin_get_whatsapp_group_link()
returns text language plpgsql security definer set search_path = public as $$
declare v text;
begin
  perform public.require_perm('settings');
  select value into v from settings where key = 'whatsapp_group_link';
  return coalesce(v, '');
end $$;

-- 3) Admin save (needs the "settings" permission). Empty text removes the link.
create or replace function public.admin_set_whatsapp_group_link(p_link text)
returns text language plpgsql security definer set search_path = public as $$
declare clean text := trim(coalesce(p_link, ''));
begin
  perform public.require_perm('settings');
  clean := split_part(clean, '?', 1);   -- drop any ?mode=... tracking part
  if clean <> '' and clean !~ '^https://(chat\.whatsapp\.com|(www\.)?whatsapp\.com/channel)/[A-Za-z0-9_-]{10,60}$' then
    raise exception 'Enter a WhatsApp group link that looks like https://chat.whatsapp.com/XXXXXXXXXX';
  end if;
  update settings set value = clean where key = 'whatsapp_group_link';
  if not found then insert into settings(key, value) values ('whatsapp_group_link', clean); end if;
  perform public.log_action('whatsapp group link saved', case when clean = '' then 'removed' else 'set' end);
  return clean;
end $$;

-- 4) Grants (RPC only) -------------------------------------------------------
revoke all on function public.get_whatsapp_group_link()              from public;
revoke all on function public.admin_get_whatsapp_group_link()        from public;
revoke all on function public.admin_set_whatsapp_group_link(text)    from public;
grant execute on function public.get_whatsapp_group_link()           to anon, authenticated;
grant execute on function public.admin_get_whatsapp_group_link()     to authenticated;
grant execute on function public.admin_set_whatsapp_group_link(text) to authenticated;
