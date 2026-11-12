-- Test data. Requires the users "cory" and "zach" to exist (scripts/create-user.mjs).
do $$
declare
  cory uuid := (select id from profiles where username = 'cory');
  zach uuid := (select id from profiles where username = 'zach');
  wo1 bigint; wo2 bigint;
  d1 timestamptz := date_trunc('day', now()) - interval '1 day';
  d2 timestamptz := date_trunc('day', now()) - interval '2 days';
begin
  insert into equipment (asset_number, name, category, make, model, serial, year, truck, current_hours, hours_updated_at) values
    ('M-101', '60" Zero-Turn Mower',  'Mower',   'Scag',       'Turf Tiger II',    'STT61V-001234',      2023, 'Truck 12', 412.5, now() - interval '20 days'),
    ('M-102', '52" Stand-On Mower',   'Mower',   'Exmark',     'Staris E-Series',  'EX52-778812',        2022, 'Truck 12', 655.0, now() - interval '20 days'),
    ('T-201', 'String Trimmer',       'Trimmer', 'Stihl',      'FS 131 R',         'FS131-55120',        2024, 'Truck 12', 118.0, now() - interval '20 days'),
    ('B-301', 'Backpack Blower',      'Blower',  'Stihl',      'BR 800 C-E',       'BR800-90211',        2024, 'Truck 12',  96.0, now() - interval '20 days'),
    ('E-401', 'Stick Edger',          'Edger',   'Echo',       'PE-2620',          'PE26-11873',         2021, 'Truck 7',  233.0, now() - interval '20 days'),
    ('A-501', 'Core Aerator',         'Aerator', 'Ryan',       'Lawnaire IV',      'RY-LA4-3301',        2020, 'Shop',     341.0, now() - interval '20 days'),
    ('M-103', '72" Zero-Turn Mower',  'Mower',   'John Deere', 'Z997R',            'JDZ997-44109',       2021, 'Truck 7', 1288.0, now() - interval '20 days'),
    ('TR-12', 'Truck 12 – F-250',     'Truck',   'Ford',       'F-250 Super Duty', '1FT7W2B60NEC01234',  2022, 'Truck 12', null, null);

  insert into hour_readings (equipment_id, hours, source, recorded_by, recorded_at, note)
  select id, current_hours, 'inspection', zach, hours_updated_at, 'Initial reading' from equipment where current_hours is not null;

  insert into user_equipment (user_id, equipment_id, kind)
  select cory, id, 'assigned' from equipment where asset_number in ('M-101','M-102','T-201','B-301','TR-12');
  insert into user_equipment (user_id, equipment_id, kind)
  select cory, id, 'favorite' from equipment where asset_number = 'E-401';

  insert into inventory_items (name, part_number, category, unit, unit_cost, qty_on_hand) values
    ('SAE 30 Engine Oil',         'OIL-SAE30',       'Fluids',   'qt',    6.50, 24),
    ('10W-30 Engine Oil',         'OIL-10W30',       'Fluids',   'qt',    7.25, 18),
    ('Hydraulic Fluid 20W-50',    'HYD-2050',        'Fluids',   'gal',  32.00, 4),
    ('Gasoline (unleaded)',       'FUEL-GAS',        'Fuel',     'gal',   3.89, null),
    ('2-Cycle Mixed Fuel 50:1',   'FUEL-2CY',        'Fuel',     'gal',   9.50, 10),
    ('Mower Blade 21" (Scag)',    'SCAG-482878',     'Blades',   'each', 18.99, 12),
    ('Air Filter – Kawasaki FX',  'KAW-11013-7049',  'Filters',  'each', 24.50, 6),
    ('Oil Filter – Kawasaki',     'KAW-49065-7007',  'Filters',  'each', 11.75, 8),
    ('Spark Plug NGK BPR6ES',     'NGK-BPR6ES',      'Ignition', 'each',  3.50, 30),
    ('Trimmer Line .095 (5 lb)',  'LINE-095',        'Trimmer',  'each', 42.00, 5),
    ('Grease Cartridge',          'GREASE-14OZ',     'Fluids',   'each',  6.00, 10);

  -- A finished job.
  insert into work_orders (equipment_id, title, description, priority, status, reported_by, reported_at, created_at,
                           checked_in_at, checked_in_by, hours_at_checkin, completed_at, completed_by, resolution)
  values ((select id from equipment where asset_number = 'M-101'),
          'Deck vibrating badly, blade looks bent',
          'Hit a sprinkler head on the Johnson property. Deck shakes above half throttle.', 'high',
          'submitted', cory, d2 + interval '10 hours 15 minutes', d2 + interval '10 hours 20 minutes',
          null, null, null, null, null, null)
  returning id into wo1;
  update work_orders set status = 'completed', checked_in_at = d2 + interval '16 hours 40 minutes', checked_in_by = zach,
         hours_at_checkin = 418.2, completed_at = d1 + interval '11 hours 5 minutes', completed_by = zach,
         resolution = 'Replaced both outer blades, checked spindles (OK), sharpened center blade, greased deck.'
   where id = wo1;
  update wo_events set created_at = d2 + interval '10 hours 20 minutes' where work_order_id = wo1;
  insert into hour_readings (equipment_id, hours, source, work_order_id, recorded_by, recorded_at)
  values ((select id from equipment where asset_number = 'M-101'), 418.2, 'check_in', wo1, zach, d2 + interval '16 hours 40 minutes');
  update equipment set current_hours = 418.2, hours_updated_at = d2 + interval '16 hours 40 minutes', status = 'in_service'
   where asset_number = 'M-101';
  insert into time_entries (work_order_id, user_id, started_at, ended_at, note) values
    (wo1, zach, d1 + interval '7 hours 30 minutes', d1 + interval '8 hours 45 minutes', 'Waiting on blades from parts room'),
    (wo1, zach, d1 + interval '10 hours 15 minutes', d1 + interval '11 hours 5 minutes', null);
  insert into work_order_parts (work_order_id, item_id, name, part_number, quantity, unit, unit_cost, source, added_by, created_at)
  select wo1, id, name, part_number, q, unit, unit_cost, 'shop_stock', zach, d1 + interval '10 hours 30 minutes'
  from inventory_items, (values ('SCAG-482878', 2), ('GREASE-14OZ', 1)) v(pn, q) where part_number = v.pn;
  update wo_events set created_at = d1 + interval '10 hours 30 minutes', user_id = zach where work_order_id = wo1 and type = 'part';
  insert into wo_events (work_order_id, user_id, type, message, created_at) values
    (wo1, zach, 'checked_in', 'Checked in at 418.2 hrs',                  d2 + interval '16 hours 40 minutes'),
    (wo1, zach, 'started',    'Clocked in',                               d1 + interval '7 hours 30 minutes'),
    (wo1, zach, 'paused',     'Paused: Waiting on blades from parts room', d1 + interval '8 hours 45 minutes'),
    (wo1, zach, 'started',    'Clocked in',                               d1 + interval '10 hours 15 minutes'),
    (wo1, zach, 'completed',  'Completed',                                d1 + interval '11 hours 5 minutes');

  -- An open issue still out in the field.
  insert into work_orders (equipment_id, title, description, priority, reported_by, reported_at)
  values ((select id from equipment where asset_number = 'T-201'),
          'Trimmer bogs down at full throttle',
          'Starts fine but dies when I squeeze the throttle all the way. Might be the fuel filter or carb.',
          'normal', cory, now() - interval '3 hours')
  returning id into wo2;
end $$;
