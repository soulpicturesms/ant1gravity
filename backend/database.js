const bcrypt = require('bcryptjs');
const { supabase } = require('./supabase');

let initialized = false;

async function initDatabase() {
  if (initialized) return;
  initialized = true;
  try {
    // Solo crea el admin por defecto si no existe ningun admin (base nueva)
    const { count, error } = await supabase.from('users').select('id', { count: 'exact', head: true }).eq('role', 'admin');
    if (!error && count === 0) {
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
