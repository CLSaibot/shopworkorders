-- Show "2 qt" instead of "2.00 qt" in the activity log.
create or replace function public.tg_part_stock() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op in ('UPDATE','DELETE') and old.item_id is not null and old.source = 'shop_stock' then
    update inventory_items set qty_on_hand = qty_on_hand + old.quantity where id = old.item_id and qty_on_hand is not null;
  end if;
  if tg_op in ('INSERT','UPDATE') and new.item_id is not null and new.source = 'shop_stock' then
    update inventory_items set qty_on_hand = qty_on_hand - new.quantity where id = new.item_id and qty_on_hand is not null;
  end if;
  if tg_op = 'INSERT' then
    insert into wo_events (work_order_id, user_id, type, message)
    values (new.work_order_id, auth.uid(), 'part', format('Added %s %s %s', trim_scale(new.quantity), new.unit, new.name));
  elsif tg_op = 'DELETE' then
    insert into wo_events (work_order_id, user_id, type, message)
    select old.work_order_id, auth.uid(), 'part', format('Removed %s %s %s', trim_scale(old.quantity), old.unit, old.name)
    where exists (select 1 from work_orders where id = old.work_order_id);
  end if;
  return coalesce(new, old);
end $$;

update wo_events set message = regexp_replace(message, '^Added (\d+)\.00 ', 'Added \1 ') where type = 'part';
