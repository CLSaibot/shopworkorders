-- Cory's Lawn Service — Shop Work Orders
-- Schema, row-level security, and workflow functions.

-------------------------------------------------------------------------------
-- Tables
-------------------------------------------------------------------------------
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  username    text not null unique,
  full_name   text not null,
  role        text not null default 'tech' check (role in ('tech','manager','admin')),
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

create table public.equipment (
  id               bigint generated always as identity primary key,
  asset_number     text not null unique,
  name             text not null,
  category         text not null default 'Other',
  make             text,
  model            text,
  serial           text,
  year             int,
  truck            text,
  status           text not null default 'in_service'
                   check (status in ('in_service','issue_reported','in_shop','out_of_service','retired')),
  current_hours    numeric(10,1),
  hours_updated_at timestamptz,
  notes            text,
  created_at       timestamptz not null default now()
);

-- Equipment a user normally runs (assigned by the shop) or has starred.
create table public.user_equipment (
  user_id      uuid not null references public.profiles(id) on delete cascade,
  equipment_id bigint not null references public.equipment(id) on delete cascade,
  kind         text not null check (kind in ('assigned','favorite')),
  primary key (user_id, equipment_id, kind)
);

create table public.work_orders (
  id               bigint generated always as identity (start with 1001) primary key,
  equipment_id     bigint not null references public.equipment(id),
  title            text not null,
  description      text,
  priority         text not null default 'normal' check (priority in ('low','normal','high','urgent')),
  status           text not null default 'submitted'
                   check (status in ('submitted','checked_in','in_progress','paused','completed','cancelled')),
  reported_by      uuid not null default auth.uid() references public.profiles(id),
  reported_at      timestamptz not null default now(),   -- when the problem happened
  created_at       timestamptz not null default now(),
  checked_in_at    timestamptz,
  checked_in_by    uuid references public.profiles(id),
  hours_at_checkin numeric(10,1),
  pause_reason     text,
  completed_at     timestamptz,
  completed_by     uuid references public.profiles(id),
  resolution       text
);
create index on public.work_orders (equipment_id);
create index on public.work_orders (status);

create table public.inventory_items (
  id           bigint generated always as identity primary key,
  name         text not null,
  part_number  text,
  category     text,
  unit         text not null default 'each',
  unit_cost    numeric(10,2),
  qty_on_hand  numeric(10,2),
  is_stocked   boolean not null default true,   -- on the regular "always used" list
  notes        text,
  created_at   timestamptz not null default now()
);

create table public.work_order_parts (
  id             bigint generated always as identity primary key,
  work_order_id  bigint not null references public.work_orders(id) on delete cascade,
  item_id        bigint references public.inventory_items(id) on delete set null,
  name           text not null,
  part_number    text,
  quantity       numeric(10,2) not null check (quantity > 0),
  unit           text not null default 'each',
  unit_cost      numeric(10,2),
  source         text not null default 'shop_stock' check (source in ('shop_stock','purchased','online')),
  vendor         text,
  added_by       uuid default auth.uid() references public.profiles(id),
  created_at     timestamptz not null default now()
);
create index on public.work_order_parts (work_order_id);

create table public.attachments (
  id             bigint generated always as identity primary key,
  work_order_id  bigint references public.work_orders(id) on delete cascade,
  equipment_id   bigint references public.equipment(id) on delete cascade,
  part_id        bigint references public.work_order_parts(id) on delete set null,
  uploaded_by    uuid not null default auth.uid() references public.profiles(id),
  category       text not null default 'issue' check (category in ('issue','shop','receipt')),
  storage_path   text not null,
  original_name  text,
  mime           text,
  size           bigint,
  created_at     timestamptz not null default now()
);
create index on public.attachments (work_order_id);
create index on public.attachments (equipment_id);

-- Labor clock: one row per clock-in / clock-out span.
create table public.time_entries (
  id             bigint generated always as identity primary key,
  work_order_id  bigint not null references public.work_orders(id) on delete cascade,
  user_id        uuid not null references public.profiles(id),
  started_at     timestamptz not null default now(),
  ended_at       timestamptz,
  note           text,
  check (ended_at is null or ended_at >= started_at)
);
create index on public.time_entries (work_order_id);
create index on public.time_entries (user_id) where ended_at is null;

create table public.hour_readings (
  id             bigint generated always as identity primary key,
  equipment_id   bigint not null references public.equipment(id) on delete cascade,
  hours          numeric(10,1) not null check (hours >= 0),
  source         text not null check (source in ('check_in','work_start','inspection','other')),
  work_order_id  bigint references public.work_orders(id) on delete set null,
  recorded_by    uuid not null default auth.uid() references public.profiles(id),
  recorded_at    timestamptz not null default now(),
  note           text
);
create index on public.hour_readings (equipment_id, recorded_at desc);

create table public.wo_events (
  id             bigint generated always as identity primary key,
  work_order_id  bigint not null references public.work_orders(id) on delete cascade,
  user_id        uuid default auth.uid() references public.profiles(id),
  type           text not null,
  message        text,
  created_at     timestamptz not null default now()
);
create index on public.wo_events (work_order_id);

-------------------------------------------------------------------------------
-- Helpers
-------------------------------------------------------------------------------
create or replace function public.is_manager() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role in ('manager','admin') and active);
$$;

create or replace function public.require_manager() returns void
language plpgsql stable security definer set search_path = public as $$
begin
  if not is_manager() then raise exception 'Only the shop manager can do that' using errcode = '42501'; end if;
end $$;

create or replace function public.log_event(p_wo bigint, p_type text, p_msg text) returns void
language sql security definer set search_path = public as $$
  insert into wo_events (work_order_id, user_id, type, message) values (p_wo, auth.uid(), p_type, p_msg);
$$;

-- Record an hour-meter reading and roll it onto the equipment.
create or replace function public.record_hours(p_equipment bigint, p_hours numeric, p_source text,
                                               p_wo bigint default null, p_note text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  if p_hours is null or p_hours < 0 then raise exception 'Enter a valid hour reading'; end if;
  insert into hour_readings (equipment_id, hours, source, work_order_id, recorded_by, note)
  values (p_equipment, p_hours, p_source, p_wo, auth.uid(), nullif(trim(p_note), ''));
  update equipment set current_hours = p_hours, hours_updated_at = now() where id = p_equipment;
end $$;

-- Manual inspection (no work order) — any signed-in user.
create or replace function public.log_hours(p_equipment bigint, p_hours numeric, p_note text default null)
returns void language sql security definer set search_path = public as $$
  select record_hours(p_equipment, p_hours, 'inspection', null, p_note);
$$;

-------------------------------------------------------------------------------
-- Work order lifecycle
-------------------------------------------------------------------------------
-- New issue from the field: log it and flag the machine.
create or replace function public.tg_work_order_created() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into wo_events (work_order_id, user_id, type, message)
  values (new.id, new.reported_by, 'created', 'Work order submitted');
  update equipment set status = 'issue_reported' where id = new.equipment_id and status = 'in_service';
  return new;
end $$;
create trigger work_order_created after insert on public.work_orders
for each row execute function public.tg_work_order_created();

create or replace function public.check_in_work_order(p_wo bigint, p_hours numeric)
returns void language plpgsql security definer set search_path = public as $$
declare w work_orders;
begin
  perform require_manager();
  select * into w from work_orders where id = p_wo for update;
  if not found then raise exception 'Work order not found'; end if;
  if w.status <> 'submitted' then raise exception 'This work order is already checked in'; end if;
  if p_hours is null then raise exception 'Enter the hour meter reading to check in'; end if;
  update work_orders set status = 'checked_in', checked_in_at = now(), checked_in_by = auth.uid(),
         hours_at_checkin = p_hours where id = p_wo;
  perform record_hours(w.equipment_id, p_hours, 'check_in', p_wo);
  update equipment set status = 'in_shop' where id = w.equipment_id and status <> 'retired';
  perform log_event(p_wo, 'checked_in', format('Checked in at %s hrs', p_hours));
end $$;

-- Close any open clock spans for this user (optionally only on one work order).
create or replace function public.close_open_time(p_user uuid, p_wo bigint default null, p_note text default null)
returns setof bigint language sql security definer set search_path = public as $$
  update time_entries set ended_at = now(), note = coalesce(note, p_note)
  where ended_at is null and user_id = p_user and (p_wo is null or work_order_id = p_wo)
  returning work_order_id;
$$;

create or replace function public.start_work(p_wo bigint, p_hours numeric default null)
returns void language plpgsql security definer set search_path = public as $$
declare w work_orders; other bigint;
begin
  perform require_manager();
  select * into w from work_orders where id = p_wo for update;
  if not found then raise exception 'Work order not found'; end if;
  if w.status in ('completed','cancelled') then raise exception 'This work order is closed'; end if;
  if w.status = 'in_progress' and exists (select 1 from time_entries where work_order_id = p_wo
       and user_id = auth.uid() and ended_at is null) then
    return;  -- already clocked in
  end if;
  if w.hours_at_checkin is null and p_hours is null then
    raise exception 'Enter the hour meter reading before starting work';
  end if;

  -- One job at a time: pause whatever else this person is clocked into.
  for other in select distinct x from close_open_time(auth.uid(), null, 'Switched jobs') x where x <> p_wo loop
    if not exists (select 1 from time_entries where work_order_id = other and ended_at is null) then
      update work_orders set status = 'paused', pause_reason = format('Switched to WO #%s', p_wo) where id = other;
      perform log_event(other, 'paused', format('Paused: switched to WO #%s', p_wo));
    end if;
  end loop;

  if p_hours is not null then
    perform record_hours(w.equipment_id, p_hours, case when w.hours_at_checkin is null then 'check_in' else 'work_start' end, p_wo);
  end if;
  update work_orders set status = 'in_progress', pause_reason = null,
         hours_at_checkin = coalesce(hours_at_checkin, p_hours),
         checked_in_at = coalesce(checked_in_at, now()),
         checked_in_by = coalesce(checked_in_by, auth.uid())
   where id = p_wo;
  insert into time_entries (work_order_id, user_id) values (p_wo, auth.uid());
  update equipment set status = 'in_shop' where id = w.equipment_id and status <> 'retired';
  perform log_event(p_wo, 'started', 'Clocked in');
end $$;

create or replace function public.pause_work(p_wo bigint, p_reason text default null)
returns void language plpgsql security definer set search_path = public as $$
declare w work_orders;
begin
  perform require_manager();
  select * into w from work_orders where id = p_wo for update;
  if w.status not in ('in_progress','checked_in') then raise exception 'Only an active job can be paused'; end if;
  update time_entries set ended_at = now(), note = coalesce(nullif(trim(p_reason), ''), note)
   where work_order_id = p_wo and ended_at is null;
  update work_orders set status = 'paused', pause_reason = nullif(trim(p_reason), '') where id = p_wo;
  perform log_event(p_wo, 'paused', 'Paused' || coalesce(': ' || nullif(trim(p_reason), ''), ''));
end $$;

create or replace function public.complete_work(p_wo bigint, p_resolution text default null)
returns void language plpgsql security definer set search_path = public as $$
declare w work_orders;
begin
  perform require_manager();
  select * into w from work_orders where id = p_wo for update;
  if w.status in ('completed','cancelled') then raise exception 'This work order is already closed'; end if;
  update time_entries set ended_at = now() where work_order_id = p_wo and ended_at is null;
  update work_orders set status = 'completed', completed_at = now(), completed_by = auth.uid(),
         pause_reason = null, resolution = nullif(trim(p_resolution), '') where id = p_wo;
  if not exists (select 1 from work_orders where equipment_id = w.equipment_id and id <> p_wo
                 and status not in ('completed','cancelled')) then
    update equipment set status = 'in_service' where id = w.equipment_id and status in ('issue_reported','in_shop');
  end if;
  perform log_event(p_wo, 'completed', 'Completed');
end $$;

create or replace function public.cancel_work_order(p_wo bigint, p_reason text default null)
returns void language plpgsql security definer set search_path = public as $$
declare w work_orders;
begin
  select * into w from work_orders where id = p_wo for update;
  if not (is_manager() or (w.reported_by = auth.uid() and w.status = 'submitted')) then
    raise exception 'You can only cancel your own work order before the shop checks it in';
  end if;
  if w.status in ('completed','cancelled') then raise exception 'This work order is already closed'; end if;
  update time_entries set ended_at = now() where work_order_id = p_wo and ended_at is null;
  update work_orders set status = 'cancelled', pause_reason = null where id = p_wo;
  if not exists (select 1 from work_orders where equipment_id = w.equipment_id and id <> p_wo
                 and status not in ('completed','cancelled')) then
    update equipment set status = 'in_service' where id = w.equipment_id and status in ('issue_reported','in_shop');
  end if;
  perform log_event(p_wo, 'cancelled', 'Cancelled' || coalesce(': ' || nullif(trim(p_reason), ''), ''));
end $$;

create or replace function public.reopen_work_order(p_wo bigint)
returns void language plpgsql security definer set search_path = public as $$
declare w work_orders;
begin
  perform require_manager();
  select * into w from work_orders where id = p_wo for update;
  if w.status not in ('completed','cancelled') then raise exception 'This work order is still open'; end if;
  update work_orders set status = case when checked_in_at is null then 'submitted' else 'paused' end,
         completed_at = null, completed_by = null where id = p_wo;
  update equipment set status = case when w.checked_in_at is null then 'issue_reported' else 'in_shop' end
   where id = w.equipment_id and status <> 'retired';
  perform log_event(p_wo, 'reopened', 'Reopened');
end $$;

-------------------------------------------------------------------------------
-- Parts: pulling shop stock decrements inventory; removing a line puts it back.
-------------------------------------------------------------------------------
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
    values (new.work_order_id, auth.uid(), 'part', format('Added %s %s %s', new.quantity, new.unit, new.name));
  end if;
  return coalesce(new, old);
end $$;
create trigger work_order_parts_stock after insert or update or delete on public.work_order_parts
for each row execute function public.tg_part_stock();

-------------------------------------------------------------------------------
-- Reporting
-------------------------------------------------------------------------------
-- Labor + parts for a date range. Time spans are clipped to the range; open spans count up to now.
create or replace function public.shop_report(p_from timestamptz, p_to timestamptz)
returns jsonb language sql stable security definer set search_path = public as $$
  with spans as (
    select te.*, greatest(te.started_at, p_from) s, least(coalesce(te.ended_at, now()), p_to) e
    from time_entries te
    where te.started_at < p_to and coalesce(te.ended_at, now()) > p_from
  ), labor as (
    select work_order_id, user_id, s, extract(epoch from (e - s)) / 3600.0 hrs from spans where e > s
  ), wo_set as (
    select distinct w.id from work_orders w
    where w.id in (select work_order_id from labor)
       or (w.completed_at >= p_from and w.completed_at < p_to)
       or (w.created_at >= p_from and w.created_at < p_to)
  ), parts as (
    select p.work_order_id, sum(p.quantity * coalesce(p.unit_cost, 0)) cost
    from work_order_parts p
    where p.created_at >= p_from and p.created_at < p_to
    group by 1
  ), per_wo as (
    select w.id, w.title, w.status, w.priority, w.created_at, w.completed_at, w.equipment_id,
           coalesce((select sum(hrs) from labor l where l.work_order_id = w.id), 0) labor_hours,
           coalesce((select cost from parts p where p.work_order_id = w.id), 0) parts_cost
    from work_orders w join wo_set using (id)
  )
  select jsonb_build_object(
    'from', p_from, 'to', p_to,
    'totals', jsonb_build_object(
      'labor_hours', coalesce((select sum(hrs) from labor), 0),
      'work_orders', (select count(*) from per_wo),
      'opened', (select count(*) from per_wo where created_at >= p_from and created_at < p_to),
      'completed', (select count(*) from per_wo where completed_at >= p_from and completed_at < p_to),
      'equipment', (select count(distinct equipment_id) from per_wo),
      'parts_cost', coalesce((select sum(cost) from parts), 0)
    ),
    'by_equipment', coalesce((
      select jsonb_agg(x order by x.labor_hours desc, x.asset_number) from (
        select e.id, e.asset_number, e.name, e.category,
               count(*) work_orders, sum(pw.labor_hours) labor_hours, sum(pw.parts_cost) parts_cost,
               jsonb_agg(jsonb_build_object('id', pw.id, 'title', pw.title, 'status', pw.status,
                         'labor_hours', pw.labor_hours, 'parts_cost', pw.parts_cost,
                         'completed_at', pw.completed_at) order by pw.id) orders
        from per_wo pw join equipment e on e.id = pw.equipment_id
        group by e.id
      ) x), '[]'::jsonb),
    'by_day', coalesce((
      select jsonb_agg(jsonb_build_object('day', d, 'labor_hours', h) order by d) from (
        select (s at time zone 'America/Los_Angeles')::date d, sum(hrs) h from labor group by 1
      ) y), '[]'::jsonb),
    'by_tech', coalesce((
      select jsonb_agg(jsonb_build_object('user_id', p.id, 'name', p.full_name, 'labor_hours', z.h, 'work_orders', z.n)
             order by z.h desc) from (
        select user_id, sum(hrs) h, count(distinct work_order_id) n from labor group by 1
      ) z join profiles p on p.id = z.user_id), '[]'::jsonb)
  );
$$;

-------------------------------------------------------------------------------
-- Convenience view: labor totals per work order
-------------------------------------------------------------------------------
create or replace view public.work_order_labor with (security_invoker = true) as
  select work_order_id,
         sum(extract(epoch from (coalesce(ended_at, now()) - started_at)) / 3600.0) labor_hours,
         bool_or(ended_at is null) clocked_in
  from public.time_entries group by work_order_id;

-------------------------------------------------------------------------------
-- Row-level security
-------------------------------------------------------------------------------
alter table public.profiles         enable row level security;
alter table public.equipment        enable row level security;
alter table public.user_equipment   enable row level security;
alter table public.work_orders      enable row level security;
alter table public.inventory_items  enable row level security;
alter table public.work_order_parts enable row level security;
alter table public.attachments      enable row level security;
alter table public.time_entries     enable row level security;
alter table public.hour_readings    enable row level security;
alter table public.wo_events        enable row level security;

-- Everyone signed in can see everything (small shop, full transparency).
do $$ declare t text; begin
  foreach t in array array['profiles','equipment','user_equipment','work_orders','inventory_items',
                           'work_order_parts','attachments','time_entries','hour_readings','wo_events'] loop
    execute format('create policy "read all" on public.%I for select to authenticated using (true)', t);
  end loop;
end $$;

-- Manager writes.
do $$ declare t text; begin
  foreach t in array array['profiles','equipment','inventory_items','work_order_parts','time_entries','work_orders'] loop
    execute format('create policy "manager write" on public.%I for all to authenticated using (public.is_manager()) with check (public.is_manager())', t);
  end loop;
end $$;

-- Techs: report issues, upload media, star equipment, add hour readings / comments.
create policy "report issue" on public.work_orders for insert to authenticated
  with check (reported_by = auth.uid() and status = 'submitted');
create policy "edit own new report" on public.work_orders for update to authenticated
  using (reported_by = auth.uid() and status = 'submitted')
  with check (reported_by = auth.uid() and status = 'submitted');

create policy "upload own" on public.attachments for insert to authenticated
  with check (uploaded_by = auth.uid());
create policy "delete own or manager" on public.attachments for delete to authenticated
  using (uploaded_by = auth.uid() or public.is_manager());

create policy "own favorites" on public.user_equipment for all to authenticated
  using (public.is_manager() or (user_id = auth.uid() and kind = 'favorite'))
  with check (public.is_manager() or (user_id = auth.uid() and kind = 'favorite'));

create policy "comment" on public.wo_events for insert to authenticated
  with check (user_id = auth.uid() and type = 'comment');

create policy "manager delete readings" on public.hour_readings for delete to authenticated
  using (public.is_manager());

-- Lock down internal helpers.
revoke execute on function public.record_hours(bigint, numeric, text, bigint, text) from public, anon, authenticated;
revoke execute on function public.close_open_time(uuid, bigint, text) from public, anon, authenticated;
revoke execute on function public.log_event(bigint, text, text) from public, anon, authenticated;
revoke execute on all functions in schema public from anon;

-------------------------------------------------------------------------------
-- Storage: photos, videos, receipts
-------------------------------------------------------------------------------
insert into storage.buckets (id, name, public) values ('attachments', 'attachments', false)
on conflict (id) do nothing;

create policy "read attachments" on storage.objects for select to authenticated
  using (bucket_id = 'attachments');
create policy "upload attachments" on storage.objects for insert to authenticated
  with check (bucket_id = 'attachments');
create policy "delete own attachments" on storage.objects for delete to authenticated
  using (bucket_id = 'attachments' and (owner = auth.uid() or public.is_manager()));

-------------------------------------------------------------------------------
-- Live updates for the shop dashboard
-------------------------------------------------------------------------------
alter publication supabase_realtime add table public.work_orders, public.time_entries;
