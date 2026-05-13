const Datastore = require('@seald-io/nedb');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = {
  users:           new Datastore({ filename: path.join(dataDir, 'users.db'),           autoload: true }),
  news:            new Datastore({ filename: path.join(dataDir, 'news.db'),            autoload: true }),
  activities:      new Datastore({ filename: path.join(dataDir, 'activities.db'),      autoload: true }),
  attendance:      new Datastore({ filename: path.join(dataDir, 'attendance.db'),      autoload: true }),
  builds:          new Datastore({ filename: path.join(dataDir, 'builds.db'),          autoload: true }),
  presets:         new Datastore({ filename: path.join(dataDir, 'presets.db'),         autoload: true }),
  reports:         new Datastore({ filename: path.join(dataDir, 'reports.db'),         autoload: true }),
  transactions:    new Datastore({ filename: path.join(dataDir, 'transactions.db'),    autoload: true }),
  blacklist:       new Datastore({ filename: path.join(dataDir, 'blacklist.db'),       autoload: true }),
  credit_requests: new Datastore({ filename: path.join(dataDir, 'credit_requests.db'), autoload: true }),
  rankings_cache:  new Datastore({ filename: path.join(dataDir, 'rankings_cache.db'),  autoload: true }),
  giveaways:       new Datastore({ filename: path.join(dataDir, 'giveaways.db'),       autoload: true }),
  media:           new Datastore({ filename: path.join(dataDir, 'media.db'),           autoload: true }),
};

db.users.ensureIndex({ fieldName: 'username', unique: true });
db.attendance.ensureIndex({ fieldName: 'userActivity', unique: true });

async function initDatabase() {
  // Admin
  const admin = await db.users.findOneAsync({ username: 'admin' });
  if (!admin) {
    await db.users.insertAsync({ username: 'admin', password: bcrypt.hashSync('admin123', 10), role: 'admin', avatar: null, coins: 0, pvp_fame: 0, pvp_kills: 0, cta_attendance: 0, total_activities: 0, created_at: new Date().toISOString() });
    console.log('  Admin creado: admin / admin123');
  }

  // Presets
  if (await db.presets.countAsync({}) === 0) {
    await db.presets.insertAsync([
      { name: 'Cultist Cowl',    slot: 'head',      coin_value: 600,  tier: 'T8' },
      { name: 'Specter Hood',    slot: 'head',      coin_value: 500,  tier: 'T8' },
      { name: 'Scholar Cowl',    slot: 'head',      coin_value: 300,  tier: 'T8' },
      { name: 'Mage Cowl',       slot: 'head',      coin_value: 250,  tier: 'T7' },
      { name: 'Cultist Robe',    slot: 'chest',     coin_value: 800,  tier: 'T8' },
      { name: 'Specter Jacket',  slot: 'chest',     coin_value: 700,  tier: 'T8' },
      { name: 'Royal Robe',      slot: 'chest',     coin_value: 900,  tier: 'T8' },
      { name: 'Cleric Robe',     slot: 'chest',     coin_value: 400,  tier: 'T8' },
      { name: 'Cultist Sandals', slot: 'feet',      coin_value: 500,  tier: 'T8' },
      { name: 'Specter Shoes',   slot: 'feet',      coin_value: 450,  tier: 'T8' },
      { name: 'Scholar Sandals', slot: 'feet',      coin_value: 250,  tier: 'T8' },
      { name: 'Graveguard Boots',slot: 'feet',      coin_value: 350,  tier: 'T8' },
      { name: 'Great Nature Staff', slot: 'main_hand', coin_value: 1200, tier: 'T8' },
      { name: 'Hallowfall',      slot: 'main_hand', coin_value: 2000, tier: 'T8' },
      { name: 'Bedrock Mace',    slot: 'main_hand', coin_value: 800,  tier: 'T8' },
      { name: 'Blazing Staff',   slot: 'main_hand', coin_value: 900,  tier: 'T8' },
      { name: 'Occult Staff',    slot: 'main_hand', coin_value: 1100, tier: 'T8' },
      { name: 'Bow of Badon',    slot: 'main_hand', coin_value: 1500, tier: 'T8' },
      { name: 'Shield of Badon', slot: 'off_hand',  coin_value: 800,  tier: 'T8' },
      { name: 'Tome of Spells',  slot: 'off_hand',  coin_value: 300,  tier: 'T8' },
      { name: 'Mistcaller',      slot: 'off_hand',  coin_value: 200,  tier: 'T8' },
      { name: 'Muisak',          slot: 'off_hand',  coin_value: 350,  tier: 'T8' },
      { name: 'Lymhurst Cape',   slot: 'cape',      coin_value: 150,  tier: 'T8' },
      { name: 'Thetford Cape',   slot: 'cape',      coin_value: 150,  tier: 'T8' },
      { name: 'Bridgewatch Cape',slot: 'cape',      coin_value: 150,  tier: 'T8' },
      { name: 'Direwolf',        slot: 'mount',     coin_value: 500,  tier: 'T8' },
      { name: 'Swiftclaw',       slot: 'mount',     coin_value: 300,  tier: 'T7' },
      { name: 'Armored Horse',   slot: 'mount',     coin_value: 100,  tier: 'T5' },
      { name: 'Roast Pork',      slot: 'food',      coin_value: 80,   tier: 'T8' },
      { name: 'Pork Omelette',   slot: 'food',      coin_value: 60,   tier: 'T7' },
      { name: 'Major Resistance Potion', slot: 'potion', coin_value: 50, tier: 'T7' },
      { name: 'Invisibility Potion',     slot: 'potion', coin_value: 70, tier: 'T7' },
    ]);
    console.log('  Presets de equipo creados');
  }

  if (await db.news.countAsync({}) === 0) {
    await db.news.insertAsync({ title: 'Bienvenidos a ANT1GRAVITY', content: '¡Este es el portal oficial del gremio ANT1GRAVITY en Albion Online! Aquí encontrarán toda la información sobre actividades, builds, rankings y el sistema de reequipo. ¡Que comience la batalla!', category: 'announcement', pinned: true, author_name: 'Sistema', created_at: new Date().toISOString() });
  }
}

module.exports = { db, initDatabase };
