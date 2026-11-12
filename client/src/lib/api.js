import { supabase, q, BUCKET, MAX_UPLOAD_BYTES } from './supabase';

const WO_LIST_SELECT = `id, title, status, priority, reported_at, created_at, checked_in_at, completed_at, pause_reason,
  hours_at_checkin, equipment_id,
  equipment:equipment_id (id, asset_number, name, category),
  reporter:reported_by (id, full_name),
  attachments (id, mime, category),
  labor:work_order_labor (labor_hours, clocked_in)`;

// ---------- Equipment ----------
export const listEquipment = () =>
  q(supabase.from('equipment').select('*').order('asset_number'));

export const getEquipment = (id) =>
  q(supabase.from('equipment').select('*').eq('id', id).single());

export const saveEquipment = (row) => {
  const { id, ...fields } = row;
  return id
    ? q(supabase.from('equipment').update(fields).eq('id', id).select().single())
    : q(supabase.from('equipment').insert(fields).select().single());
};

export const listMyEquipmentLinks = (userId) =>
  q(supabase.from('user_equipment').select('equipment_id, kind').eq('user_id', userId));

export const listAssignments = (equipmentId) =>
  q(supabase.from('user_equipment').select('user_id, kind').eq('equipment_id', equipmentId).eq('kind', 'assigned'));

export async function setAssignments(equipmentId, userIds) {
  await q(supabase.from('user_equipment').delete().eq('equipment_id', equipmentId).eq('kind', 'assigned'));
  if (userIds.length) {
    await q(supabase.from('user_equipment').insert(userIds.map((u) => ({ user_id: u, equipment_id: equipmentId, kind: 'assigned' }))));
  }
}

export const setFavorite = (userId, equipmentId, on) =>
  on
    ? q(supabase.from('user_equipment').upsert({ user_id: userId, equipment_id: equipmentId, kind: 'favorite' }))
    : q(supabase.from('user_equipment').delete().match({ user_id: userId, equipment_id: equipmentId, kind: 'favorite' }));

export const listHourReadings = (equipmentId) =>
  q(supabase.from('hour_readings').select('*, who:recorded_by (full_name)').eq('equipment_id', equipmentId)
    .order('recorded_at', { ascending: false }));

export const logHours = (equipmentId, hours, note) =>
  q(supabase.rpc('log_hours', { p_equipment: equipmentId, p_hours: hours, p_note: note || null }));

// ---------- People ----------
export const listProfiles = () => q(supabase.from('profiles').select('*').eq('active', true).order('full_name'));

// ---------- Work orders ----------
export function listWorkOrders({ statuses, equipmentId, reportedBy, limit = 300 } = {}) {
  let query = supabase.from('work_orders').select(WO_LIST_SELECT).order('id', { ascending: false }).limit(limit);
  if (statuses?.length) query = query.in('status', statuses);
  if (equipmentId) query = query.eq('equipment_id', equipmentId);
  if (reportedBy) query = query.eq('reported_by', reportedBy);
  return q(query);
}

export const getWorkOrder = (id) =>
  q(supabase.from('work_orders').select(`*,
    equipment:equipment_id (*),
    reporter:reported_by (id, full_name),
    checker:checked_in_by (full_name),
    completer:completed_by (full_name)`).eq('id', id).single());

export const listTimeEntries = (woId) =>
  q(supabase.from('time_entries').select('*, who:user_id (full_name)').eq('work_order_id', woId).order('started_at'));

export const listParts = (woId) =>
  q(supabase.from('work_order_parts').select('*').eq('work_order_id', woId).order('created_at'));

export const listEvents = (woId) =>
  q(supabase.from('wo_events').select('*, who:user_id (full_name)').eq('work_order_id', woId).order('created_at'));

export const listAttachments = ({ woId, woIds }) => {
  let query = supabase.from('attachments').select('*, who:uploaded_by (full_name)').order('created_at');
  if (woId) query = query.eq('work_order_id', woId);
  if (woIds) query = query.in('work_order_id', woIds);
  return q(query);
};

export const createWorkOrder = (row) =>
  q(supabase.from('work_orders').insert(row).select('id').single());

export const rpc = (fn, args) => q(supabase.rpc(fn, args));
export const checkIn = (woId, hours) => rpc('check_in_work_order', { p_wo: woId, p_hours: hours });
export const startWork = (woId, hours = null) => rpc('start_work', { p_wo: woId, p_hours: hours });
export const pauseWork = (woId, reason) => rpc('pause_work', { p_wo: woId, p_reason: reason || null });
export const completeWork = (woId, resolution) => rpc('complete_work', { p_wo: woId, p_resolution: resolution || null });
export const cancelWork = (woId, reason) => rpc('cancel_work_order', { p_wo: woId, p_reason: reason || null });
export const reopenWork = (woId) => rpc('reopen_work_order', { p_wo: woId });

export const updateWorkOrder = (id, fields) => q(supabase.from('work_orders').update(fields).eq('id', id));

export const addComment = (woId, userId, message) =>
  q(supabase.from('wo_events').insert({ work_order_id: woId, user_id: userId, type: 'comment', message }));

export const addTimeEntry = (row) => q(supabase.from('time_entries').insert(row));
export const deleteTimeEntry = (id) => q(supabase.from('time_entries').delete().eq('id', id));

export const getActiveTimer = (userId) =>
  q(supabase.from('time_entries').select('id, started_at, work_order_id, wo:work_order_id (id, title, equipment:equipment_id (asset_number, name))')
    .eq('user_id', userId).is('ended_at', null).order('started_at', { ascending: false }).limit(1).maybeSingle());

// ---------- Parts & inventory ----------
export const listInventory = ({ stockedOnly } = {}) => {
  let query = supabase.from('inventory_items').select('*').order('name');
  if (stockedOnly) query = query.eq('is_stocked', true);
  return q(query);
};
export const saveInventoryItem = (row) => {
  const { id, ...fields } = row;
  return id
    ? q(supabase.from('inventory_items').update(fields).eq('id', id).select().single())
    : q(supabase.from('inventory_items').insert(fields).select().single());
};
export const deleteInventoryItem = (id) => q(supabase.from('inventory_items').delete().eq('id', id));
export const addPart = (row) => q(supabase.from('work_order_parts').insert(row).select().single());
export const deletePart = (id) => q(supabase.from('work_order_parts').delete().eq('id', id));

// ---------- Files ----------
export function validateFile(file) {
  if (file.size > MAX_UPLOAD_BYTES) {
    return `${file.name} is ${(file.size / 1048576).toFixed(0)} MB — the limit is ${MAX_UPLOAD_BYTES / 1048576} MB. Try a shorter clip.`;
  }
  return null;
}

/** Upload one file and record it. */
export async function uploadAttachment(file, { woId, equipmentId, category, partId, userId }) {
  const err = validateFile(file);
  if (err) throw new Error(err);
  const safe = file.name.replace(/[^a-zA-Z0-9._-]+/g, '_').slice(-80) || 'file';
  const path = `wo/${woId ?? 'none'}/${crypto.randomUUID()}-${safe}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: file.type || 'application/octet-stream',
    upsert: false,
  });
  if (error) throw new Error(error.message);
  return q(supabase.from('attachments').insert({
    work_order_id: woId ?? null,
    equipment_id: equipmentId ?? null,
    part_id: partId ?? null,
    category,
    storage_path: path,
    original_name: file.name,
    mime: file.type,
    size: file.size,
    uploaded_by: userId,
  }).select().single());
}

export async function deleteAttachment(att) {
  await supabase.storage.from(BUCKET).remove([att.storage_path]);
  await q(supabase.from('attachments').delete().eq('id', att.id));
}

const urlCache = new Map();
/** Signed URLs (1h) for private files, cached. */
export async function signedUrls(paths) {
  const now = Date.now();
  const need = paths.filter((p) => !(urlCache.get(p)?.exp > now));
  if (need.length) {
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrls(need, 3600);
    if (error) throw error;
    data.forEach((d) => d.signedUrl && urlCache.set(d.path, { url: d.signedUrl, exp: now + 3500_000 }));
  }
  return Object.fromEntries(paths.map((p) => [p, urlCache.get(p)?.url]));
}

// ---------- Reports ----------
export const shopReport = (from, to) => rpc('shop_report', { p_from: from, p_to: to });
