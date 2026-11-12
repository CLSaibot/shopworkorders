// Create (or update) a login.
// Usage: SUPABASE_URL=... SUPABASE_SECRET_KEY=... node scripts/create-user.mjs <username> "<Full Name>" <tech|manager|admin> <password>
// Usernames become <username>@shop.coryslawnservice.com behind the scenes; people only ever type the username.
import { createClient } from '@supabase/supabase-js';

const [username, fullName, role = 'tech', password] = process.argv.slice(2);
if (!username || !fullName || !password) {
  console.error('Usage: node scripts/create-user.mjs <username> "<Full Name>" <tech|manager|admin> <password>');
  process.exit(1);
}
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });
const email = `${username.toLowerCase()}@shop.coryslawnservice.com`;

let { data: list } = await sb.auth.admin.listUsers({ perPage: 1000 });
let user = list.users.find((u) => u.email === email);
if (user) {
  const { error } = await sb.auth.admin.updateUserById(user.id, { password });
  if (error) throw error;
} else {
  const { data, error } = await sb.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: fullName } });
  if (error) throw error;
  user = data.user;
}
const { error } = await sb.from('profiles').upsert({ id: user.id, username: username.toLowerCase(), full_name: fullName, role, active: true });
if (error) throw error;
console.log(`${user ? 'Ready' : ''}: ${username} (${fullName}) — ${role}`);
