// Script de migración NeDB → Supabase
// Ejecutar: node migrate.js
require('dotenv').config({ path: './.env' });
const { createClient } = require('@supabase/supabase-js');
const Datastore = require('@seald-io/nedb');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Faltan SUPABASE_URL o SUPABASE_SERVICE_KEY en backend/.env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });

const dataDir = path.join(__dirname, 'backend/data');
const uploadsDir = path.join(__dirname, 'backend/uploads');

function loadDb(name) {
  return new Promise((resolve) => {
    const db = new Datastore({ filename: path.join(dataDir, name), autoload: true });
    db.findAsync({}).then(resolve);
  });
}

async function uploadFile(bucket, localPath, filename) {
  if (!fs.existsSync(localPath)) return null;
  const buffer = fs.readFileSync(localPath);
  const ext = path.extname(filename).toLowerCase();
  const mime = ext === '.png' ? 'image/png' : ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : 'image/png';
  const { error } = await supabase.storage.from(bucket).upload(filename, buffer, { contentType: mime, upsert: true });
  if (error) { console.error(`  Error subiendo ${filename}:`, error.message); return null; }
  const { data } = supabase.storage.from(bucket).getPublicUrl(filename);
  return data.publicUrl;
}

function localUrlToPath(url) {
  if (!url) return null;
  // url like /uploads/media/filename.png
  return path.join(uploadsDir, url.replace('/uploads/', ''));
}

async function main() {
  console.log('🚀 Iniciando migración NeDB → Supabase...\n');

  // ── USERS ──
  console.log('👥 Migrando usuarios...');
  const users = await loadDb('users.db');
  const userIdMap = {}; // oldId → newId
  for (const u of users) {
    const { data, error } = await supabase.from('users').insert({
      username: u.username, password: u.password, role: u.role || 'member',
      avatar_url: null, coins: u.coins || 0,
      pvp_fame: u.pvp_fame || 0, pvp_kills: u.pvp_kills || 0,
      cta_attendance: u.cta_attendance || 0, total_activities: u.total_activities || 0,
      created_at: u.created_at || new Date().toISOString(),
    }).select('id').single();
    if (error) { console.error(`  Error usuario ${u.username}:`, error.message); continue; }
    userIdMap[u._id] = data.id;
    process.stdout.write('.');
  }
  console.log(`\n  ✅ ${users.length} usuarios migrados`);

  // ── AVATARS ──
  console.log('🖼️  Subiendo avatars...');
  for (const u of users) {
    if (!u.avatar) continue;
    const localPath = localUrlToPath(u.avatar);
    const filename = path.basename(localPath);
    const url = await uploadFile('avatars', localPath, filename);
    if (url && userIdMap[u._id]) {
      await supabase.from('users').update({ avatar_url: url }).eq('id', userIdMap[u._id]);
      process.stdout.write('.');
    }
  }
  console.log('\n  ✅ Avatars subidos');

  // ── NEWS ──
  console.log('📰 Migrando noticias...');
  const news = await loadDb('news.db');
  for (const n of news) {
    await supabase.from('news').insert({
      title: n.title, content: n.content, image_url: n.image_url || null,
      author_id: userIdMap[n.author_id] || null, author_name: n.author_name,
      pinned: !!n.pinned, category: n.category || 'general',
      created_at: n.created_at || new Date().toISOString(),
    });
    process.stdout.write('.');
  }
  console.log(`\n  ✅ ${news.length} noticias migradas`);

  // ── BUILDS ──
  console.log('⚔️  Migrando builds...');
  const builds = await loadDb('builds.db');
  for (const b of builds) {
    let image_url = null;
    if (b.image_url) {
      const localPath = localUrlToPath(b.image_url);
      image_url = await uploadFile('builds', localPath, path.basename(localPath));
    }
    await supabase.from('builds').insert({
      title: b.title, category: b.category, description: b.description || null,
      items: b.items || null, image_url,
      author_id: userIdMap[b.author_id] || null, author_name: b.author_name,
      featured: !!b.featured, created_at: b.created_at || new Date().toISOString(),
    });
    process.stdout.write('.');
  }
  console.log(`\n  ✅ ${builds.length} builds migrados`);

  // ── MEDIA (banners + weekly prize) ──
  console.log('🖼️  Migrando media...');
  const media = await loadDb('media.db');
  for (const m of media) {
    const localPath = localUrlToPath(m.url);
    const url = await uploadFile('media', localPath, path.basename(localPath));
    if (url) {
      await supabase.from('media').insert({
        key: m.key, url, caption: m.caption || '',
        order: m.order || 0, uploaded_at: m.uploaded_at || new Date().toISOString(),
      });
    }
    process.stdout.write('.');
  }
  console.log(`\n  ✅ ${media.length} media migrados`);

  // ── ACTIVITIES ──
  console.log('📅 Migrando actividades...');
  const activities = await loadDb('activities.db');
  const actIdMap = {};
  for (const a of activities) {
    const { data, error } = await supabase.from('activities').insert({
      name: a.name, type: a.type, date: a.date, description: a.description || null,
      created_by: userIdMap[a.created_by] || null, creator_name: a.creator_name,
      created_at: a.created_at || new Date().toISOString(),
    }).select('id').single();
    if (!error) actIdMap[a._id] = data.id;
    process.stdout.write('.');
  }
  console.log(`\n  ✅ ${activities.length} actividades migradas`);

  // ── ATTENDANCE ──
  console.log('✅ Migrando asistencias...');
  const attendance = await loadDb('attendance.db');
  for (const a of attendance) {
    const uid = userIdMap[a.user_id];
    const aid = actIdMap[a.activity_id];
    if (!uid || !aid) continue;
    await supabase.from('attendance').insert({ user_id: uid, activity_id: aid, present: !!a.present }).catch(() => {});
    process.stdout.write('.');
  }
  console.log(`\n  ✅ ${attendance.length} asistencias migradas`);

  // ── BLACKLIST ──
  console.log('🚫 Migrando blacklist...');
  const blacklist = await loadDb('blacklist.db');
  for (const b of blacklist) {
    await supabase.from('blacklist').insert({
      username: b.username, reason: b.reason,
      added_by: userIdMap[b.added_by] || null, added_by_name: b.added_by_name,
      created_at: b.created_at || new Date().toISOString(),
    });
    process.stdout.write('.');
  }
  console.log(`\n  ✅ ${blacklist.length} blacklist migrados`);

  // ── REPORTS ──
  console.log('📋 Migrando reportes...');
  const reports = await loadDb('reports.db');
  for (const r of reports) {
    let screenshot_url = r.screenshot_url;
    if (screenshot_url && screenshot_url.startsWith('/uploads/')) {
      const localPath = localUrlToPath(screenshot_url);
      const uploaded = await uploadFile('screenshots', localPath, path.basename(localPath));
      if (uploaded) screenshot_url = uploaded;
    }
    await supabase.from('death_reports').insert({
      user_id: userIdMap[r.user_id] || null, username: r.username, avatar_url: null,
      screenshot_url, description: r.description || null, status: r.status || 'pending',
      coins_awarded: r.coins_awarded || 0, admin_notes: r.admin_notes || null,
      items_lost: r.items_lost || null, reviewed_by: null, claimed: !!r.claimed,
      created_at: r.created_at || new Date().toISOString(),
    });
    process.stdout.write('.');
  }
  console.log(`\n  ✅ ${reports.length} reportes migrados`);

  // ── TRANSACTIONS ──
  console.log('💰 Migrando transacciones...');
  const txs = await loadDb('transactions.db');
  for (const t of txs) {
    await supabase.from('coin_transactions').insert({
      user_id: userIdMap[t.user_id] || null, username: t.username,
      amount: t.amount, type: t.type, reason: t.reason || null,
      admin_id: userIdMap[t.admin_id] || null,
      created_at: t.created_at || new Date().toISOString(),
    });
    process.stdout.write('.');
  }
  console.log(`\n  ✅ ${txs.length} transacciones migradas`);

  // ── RANKINGS CACHE ──
  console.log('🏆 Migrando rankings...');
  const rc = await loadDb('rankings_cache.db');
  if (rc.length > 0) {
    const r = rc[0];
    for (const [type, key] of [['pvp_fame', 'pvp_fame'], ['kills', 'kills'], ['pve_fame', 'pve_fame']]) {
      if (r[key] && r[key].length) {
        await supabase.from('rankings_cache').upsert({
          type, data: r[key], total: r[key].length,
          updated_at: r[`${key}_updated`] || new Date().toISOString(),
        }, { onConflict: 'type' });
        process.stdout.write('.');
      }
    }
  }
  console.log('\n  ✅ Rankings migrados');

  console.log('\n✅ Migración completa!');
}

main().catch(console.error);
