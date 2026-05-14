const bcrypt = require('bcryptjs');
const { supabase } = require('./supabase');

let initialized = false;

async function initDatabase() {
  if (initialized) return;
  initialized = true;
  try {
    const { data: admin } = await supabase.from('users').select('id').eq('username', 'admin').maybeSingle();
    if (!admin) {
      const hash = bcrypt.hashSync('admin123', 10);
      await supabase.from('users').insert({
        username: 'admin', password: hash, role: 'admin',
        coins: 0, pvp_fame: 0, pvp_kills: 0, cta_attendance: 0, total_activities: 0,
      });
      console.log('  Admin creado: admin / admin123');
    }
  } catch (e) {
    console.error('initDatabase error:', e.message);
  }
}

module.exports = { initDatabase };
