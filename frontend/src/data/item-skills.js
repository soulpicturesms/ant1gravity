// Skills por item base ID (sin prefijo de tier)
// Formato: { q, w, e, passive }
export const ITEM_SKILLS = {

  // ── HOLY STAFFS ──────────────────────────────────────────
  'HALLOWFALL':                   { q:'Holy Bolt', w:'Holy Orb', e:'Avenging Strike', passive:'Blessed' },
  '2H_HOLYSTAFF':                 { q:'Holy Bolt', w:'Holy Orb', e:'Holy Beam', passive:'Holy Shield' },
  'MAIN_HOLYSTAFF':               { q:'Holy Bolt', w:'Holy Orb', e:'Holy Beam', passive:'Holy Shield' },
  '2H_HOLYSTAFF_MORGANA':         { q:'Smite', w:'Holy Flash', e:'Fallen Sanctum', passive:'Fallen Blessing' },
  '2H_HOLYSTAFF_UNDEAD':          { q:'Holy Bolt', w:'Holy Orb', e:'Holy Aura', passive:'Holy Spirit' },

  // ── NATURE STAFFS ─────────────────────────────────────────
  '2H_NATURESTAFF_CRYSTAL':       { q:'Rejuvenating Mushrooms', w:'Vine', e:"Nature's Cry", passive:'Thorns' },
  '2H_NATURESTAFF':               { q:'Rejuvenating Mushrooms', w:'Vine', e:"Nature's Cry", passive:'Thorns' },
  'MAIN_NATURESTAFF':             { q:'Regeneration', w:'Entangle', e:'Blessed Youth', passive:'Rejuvenation' },
  '2H_WILDCATSTAFF':              { q:'Life Touch', w:'Entangle', e:'Rampant Growth', passive:'Rejuvenation' },
  '2H_NATURESTAFF_KEEPER':        { q:'Life Touch', w:'Druidic Staff', e:"Keeper's Harmony", passive:'Nature Mastery' },

  // ── FIRE STAFFS ───────────────────────────────────────────
  '2H_FIRESTAFF_CRYSTAL':         { q:'Fire Bolt', w:'Wall of Flames', e:'Meteor', passive:'Mana Sparks' },
  '2H_FIRESTAFF':                 { q:'Fire Bolt', w:'Wall of Flames', e:'Meteor', passive:'Mana Sparks' },
  'MAIN_FIRESTAFF':               { q:'Fire Bolt', w:'Burning Field', e:'Fire Ball', passive:'Mana Sparks' },
  '2H_INFERNOSTAFF':              { q:'Fire Bolt', w:'Inferno', e:'Pyroblast', passive:'Ignite' },
  '2H_FIRESTAFF_UNDEAD':          { q:'Fire Bolt', w:'Burning Hell', e:'Mass Destruction', passive:'Fiery Burst' },
  '2H_FIRESTAFF_KEEPER':          { q:"Keeper's Flame", w:'Wildfire', e:'Scorched Earth', passive:'Infernal Shield' },

  // ── ARCANE STAFFS ─────────────────────────────────────────
  '2H_ARCANESTAFF_CRYSTAL':       { q:'Arcane Bolt', w:'Mana Bubble', e:'Arcane Sphere', passive:'Enigmatic Orb' },
  '2H_ARCANESTAFF':               { q:'Arcane Bolt', w:'Mana Bubble', e:'Arcane Sphere', passive:'Enigmatic Orb' },
  'MAIN_ARCANESTAFF':             { q:'Arcane Bolt', w:'Mana Void', e:'Forceful Swing', passive:'Arcane Mastery' },
  '2H_ARCANESTAFF_UNDEAD':        { q:'Arcane Bolt', w:'Soul Collector', e:'Occult Circle', passive:'Occult Mind' },

  // ── CURSED STAFFS ─────────────────────────────────────────
  '2H_CURSEDSTAFF_CRYSTAL':       { q:'Soulless Stream', w:'Banishment', e:'Cursed Sickle', passive:'Ominous Shield' },
  '2H_CURSEDSTAFF':               { q:'Pestilence', w:'Void Sphere', e:'Desecrate', passive:'Curse Arrow' },
  'MAIN_CURSEDSTAFF':             { q:'Pestilence', w:'Void Sphere', e:'Desecrate', passive:'Curse Arrow' },
  '2H_DAMNEDSTAFF':               { q:'Pestilence', w:'Cursed Sphere', e:'Damnation', passive:'Curse Arrow' },
  '2H_CURSEDSTAFF_UNDEAD':        { q:'Death Plague', w:'Terror Shield', e:'Deathly Corses', passive:'Corrupted Void' },

  // ── FROST STAFFS ──────────────────────────────────────────
  '2H_FROSTSTAFF_CRYSTAL':        { q:'Ice Shard', w:'Ice Block', e:'Permafrost', passive:'Cold Metal' },
  '2H_FROSTSTAFF':                { q:'Ice Shard', w:'Ice Block', e:'Blizzard', passive:'Cold Metal' },
  'MAIN_FROSTSTAFF':              { q:'Ice Shard', w:'Ice Block', e:'Flash Freeze', passive:'Cold Metal' },
  '2H_ICECRYSTAL':                { q:'Ice Shard', w:'Crystal Sphere', e:'Giant Boulder', passive:'Crystal Mastery' },

  // ── MACES ─────────────────────────────────────────────────
  '2H_MACE_CRYSTAL':              { q:'Ground Shaker', w:'Cripple', e:'Threatening Shout', passive:'Block Mastery' },
  '2H_MACE':                      { q:'Ground Shaker', w:'Cripple', e:'Threatening Shout', passive:'Block Mastery' },
  'MAIN_MACE':                    { q:'Aggressive Rush', w:'Ground Shaker', e:'Forceful Swing', passive:'Block Mastery' },
  '2H_FLAIL':                     { q:'Morning Prayer', w:'Magnetic Field', e:'Holy Ground', passive:'Holy Avenger' },

  // ── HAMMERS ───────────────────────────────────────────────
  '2H_HAMMER':                    { q:'Deadly Swipe', w:'Raging Blow', e:'Earthshatter', passive:'Sunder Armor' },
  '2H_HAMMER_UNDEAD':             { q:'Deadly Swipe', w:'Grim Aura', e:'Graveguard Strike', passive:'Graveguard Shield' },
  '2H_HAMMER_MORGANA':            { q:'Mighty Strike', w:'Taunt', e:'Deflect', passive:'War Glove Mastery' },
  '2H_HAMMER_KEEPER':             { q:'Deadly Swipe', w:"Keeper's Might", e:'Battle Cry', passive:'Toughness' },

  // ── SWORDS ────────────────────────────────────────────────
  '2H_CLAYMORE_CRYSTAL':          { q:'Heroic Strike', w:'Heroic Charge', e:'Rending Slash', passive:'Battle Trance' },
  '2H_CLAYMORE':                  { q:'Heroic Strike', w:'Heroic Charge', e:'Mighty Blow', passive:'Battle Trance' },
  'MAIN_SWORD':                   { q:'Heroic Strike', w:'Heroic Charge', e:'Force Field', passive:'Battle Trance' },
  '2H_DUALSWORD':                 { q:'Deadly Swipe', w:'Dash', e:'Bladestorm', passive:'Sunder Armor' },
  '2H_DUALSCIMITAR_UNDEAD':       { q:'Deadly Swipe', w:'Dash', e:'Bladestorm', passive:'Sunder Armor' },

  // ── AXES ──────────────────────────────────────────────────
  '2H_HALBERD':                   { q:'Rending Spin', w:'Galeforce', e:'Adrenaline Boost', passive:'Rending Slice' },
  '2H_HALBERD_UNDEAD':            { q:'Rending Spin', w:'Bloody Reap', e:'Bloodthirst', passive:'Bloodhound' },
  '2H_HALBERD_CRYSTAL':           { q:'Rending Spin', w:'Galeforce', e:'Kingmaker', passive:'Sunder Armor' },
  'MAIN_AXE':                     { q:'Rending Spin', w:'Galeforce', e:'Adrenaline Boost', passive:'Rending Slice' },

  // ── BOWS ──────────────────────────────────────────────────
  '2H_BOW_CRYSTAL':               { q:'Deadly Shot', w:'Explosive Arrow', e:'Arrow Rain', passive:'Ranger' },
  '2H_BOW':                       { q:'Deadly Shot', w:'Explosive Arrow', e:'Arrow Rain', passive:'Ranger' },
  '2H_BOW_UNDEAD':                { q:'Deadly Shot', w:'Wailing Arrow', e:'Crying Arrows', passive:'Doom' },
  'MAIN_CROSSBOW':                { q:'Bolt', w:'Explosive Bolt', e:'Snipe', passive:'Ranger' },
  '2H_CROSSBOW':                  { q:'Bolt', w:'Explosive Bolt', e:'Hail of Bolts', passive:'Ranger' },
  '2H_CROSSBOW_UNDEAD':           { q:'Bolt', w:'Weeping Repeater', e:'Repeating Crossbow', passive:'Lethal Momentum' },
  '2H_CROSSBOW_CRYSTAL':          { q:'Bolt', w:'Explosive Bolt', e:'Snipe', passive:'Boltcaster Mastery' },

  // ── DAGGERS ───────────────────────────────────────────────
  '2H_DAGGERPAIR':                { q:'Deadly Swipe', w:'Dash', e:'Bladestorm', passive:'Sunder Armor' },
  '2H_DAGGERPAIR_UNDEAD':         { q:'Deadly Swipe', w:'Crimson Oath', e:'Bloodlust', passive:'Sunder Armor' },
  'MAIN_DAGGER':                  { q:'Cheap Shot', w:'Dash', e:'Sinister Strike', passive:'Shadow Calm' },
  '2H_CLAWS':                     { q:'Claw Swipe', w:'Dash', e:'Flying Blade', passive:'Predator' },
  '2H_SCYTHE':                    { q:'Deadly Swipe', w:'Reaper', e:'Death Scythe', passive:'Sunder Armor' },

  // ── QUARTERSTAFFS ─────────────────────────────────────────
  '2H_QUARTERSTAFF':              { q:'Crippling Strike', w:'Concussive Blow', e:'Barrier', passive:'Fortify' },
  '2H_QUARTERSTAFF_UNDEAD':       { q:'Crippling Strike', w:'Mana Kill', e:'Barrier', passive:'Aggressive Energy' },
  '2H_IRONCLADSTAFF':             { q:'Crippling Strike', w:'Shield Bash', e:'Barrier', passive:'Iron Shield' },
  '2H_ROCKSTAFF_CRYSTAL':         { q:'Crippling Strike', w:'Concussive Blow', e:'Earth Shatter', passive:'Crystal Shield' },

  // ── SPEARS ────────────────────────────────────────────────
  'MAIN_SPEAR':                   { q:'Lunging Stab', w:'Impale', e:'Heron Blade', passive:'Bloodthirst' },
  '2H_SPEAR':                     { q:'Lunging Stab', w:'Impale', e:'Charge', passive:'Bloodthirst' },
  '2H_GLAIVE':                    { q:'Lunging Stab', w:'Whirlwind', e:'Infernal Scythe', passive:'Rampage' },

  // ── SHAPESHIFTER ──────────────────────────────────────────
  '2H_SHAPESHIFTER_SET1':         { q:'Pounce', w:'Vicious Bite', e:'Wild Transformation', passive:'Wild Form' },
  '2H_SHAPESHIFTER_SET2':         { q:'Pounce', w:'Vicious Bite', e:'Wild Transformation', passive:'Wild Form' },
  '2H_SHAPESHIFTER_SET3':         { q:'Pounce', w:'Vicious Bite', e:'Wild Transformation', passive:'Wild Form' },

  // ── OFFHANDS ──────────────────────────────────────────────
  'OFF_SHIELD':                   { passive:'Shield Block' },
  'OFF_SHIELD_UNDEAD':            { passive:'Graveguard Shield' },
  'OFF_SHIELD_MORGANA':           { passive:'Steadfast' },
  'OFF_SHIELD_KEEPER':            { passive:"Keeper's Shield" },
  'OFF_SHIELD_HELL':              { passive:'Fiend Shield' },
  'OFF_SHIELD_AVALON':            { passive:'Avalonian Shield' },
  'OFF_TOTEM_KEEPER':             { passive:"Keeper's Totem" },
  'OFF_HORN_KEEPER':              { passive:"Keeper's Moan" },
  'OFF_TORCH':                    { passive:'Torch Mastery' },
  'OFF_ORB_UNDEAD':               { passive:'Frost Bolt' },
  'OFF_BOOK':                     { passive:'Spellbook' },
  'OFF_BOOK_UNDEAD':              { passive:'Muisak' },
  'OFF_JUDI_PENDANT':             { passive:"Judi's Pendant" },

  // ── HEAD — PLATE ──────────────────────────────────────────
  'HEAD_PLATE_SET1':              { passive:'Block Mastery' },
  'HEAD_PLATE_SET2':              { passive:'Taunt' },
  'HEAD_PLATE_SET3':              { passive:'Guardian Helmet' },
  'HEAD_PLATE_UNDEAD':            { passive:'Undead Resistance' },
  'HEAD_PLATE_KEEPER':            { passive:"Keeper's Judgment" },
  'HEAD_PLATE_FEY':               { passive:'Faerie Veil' },
  'HEAD_PLATE_HELL':              { passive:'Sunder Armor' },
  'HEAD_PLATE_MORGANA':           { passive:'Demon Helmet' },
  'HEAD_PLATE_ROYAL':             { passive:'Royal Helmet' },
  'HEAD_PLATE_AVALON':            { passive:'Shield of Valor' },
  'HEAD_PLATE_GUARDIAN':          { passive:'Guardian Helmet' },

  // ── HEAD — LEATHER ────────────────────────────────────────
  'HEAD_LEATHER_SET1':            { passive:'Toughness' },
  'HEAD_LEATHER_SET2':            { passive:'Rejuvenation' },
  'HEAD_LEATHER_SET3':            { passive:'Specter Shield' },
  'HEAD_LEATHER_UNDEAD':          { passive:'Shadow Power' },
  'HEAD_LEATHER_KEEPER':          { passive:"Nature's Speed" },
  'HEAD_LEATHER_FEY':             { passive:'Fey Agility' },
  'HEAD_LEATHER_HELL':            { passive:'Fiend Cowl' },
  'HEAD_LEATHER_MORGANA':         { passive:'Demon Cowl' },
  'HEAD_LEATHER_ROYAL':           { passive:'Royal Cowl' },
  'HEAD_LEATHER_AVALON':          { passive:'Avalonian Sight' },

  // ── HEAD — CLOTH ──────────────────────────────────────────
  'HEAD_CLOTH_SET1':              { passive:'Force Field' },
  'HEAD_CLOTH_SET2':              { passive:'Energetic Mind' },
  'HEAD_CLOTH_SET3':              { passive:'Concentration Shield' },
  'HEAD_CLOTH_UNDEAD':            { passive:'Undead Resonance' },
  'HEAD_CLOTH_KEEPER':            { passive:'Druidic Focus' },
  'HEAD_CLOTH_FEY':               { passive:'Pixie Dust' },
  'HEAD_CLOTH_HELL':              { passive:'Frenzied Empowerment' },
  'HEAD_CLOTH_MORGANA':           { passive:'Demon Hood' },
  'HEAD_CLOTH_ROYAL':             { passive:'Royal Hood' },
  'HEAD_CLOTH_AVALON':            { passive:'Avalonian Mind' },

  // ── ARMOR — PLATE ─────────────────────────────────────────
  'ARMOR_PLATE_SET1':             { passive:'Hardened' },
  'ARMOR_PLATE_SET2':             { passive:'Toughness' },
  'ARMOR_PLATE_SET3':             { passive:'Guardian Armor' },
  'ARMOR_PLATE_UNDEAD':           { passive:'Undead Guard' },
  'ARMOR_PLATE_KEEPER':           { passive:"Keeper's Armor" },
  'ARMOR_PLATE_FEY':              { passive:'Fey Shield' },
  'ARMOR_PLATE_HELL':             { passive:'Sunder Armor' },
  'ARMOR_PLATE_MORGANA':          { passive:'Demon Armor' },
  'ARMOR_PLATE_ROYAL':            { passive:'Royal Armor' },
  'ARMOR_PLATE_AVALON':           { passive:'Avalonian Plate' },
  'ARMOR_PLATE_GUARDIAN':         { passive:"Guardian's Plate" },

  // ── ARMOR — LEATHER ───────────────────────────────────────
  'ARMOR_LEATHER_SET1':           { passive:'Aggressive Rage' },
  'ARMOR_LEATHER_SET2':           { passive:'Swiftness' },
  'ARMOR_LEATHER_SET3':           { passive:'Specter Jacket' },
  'ARMOR_LEATHER_UNDEAD':         { passive:'Undead Scout' },
  'ARMOR_LEATHER_KEEPER':         { passive:"Keeper's Jacket" },
  'ARMOR_LEATHER_FEY':            { passive:'Fey Jacket' },
  'ARMOR_LEATHER_HELL':           { passive:'Fiend Jacket' },
  'ARMOR_LEATHER_MORGANA':        { passive:'Demon Jacket' },
  'ARMOR_LEATHER_ROYAL':          { passive:'Royal Jacket' },
  'ARMOR_LEATHER_AVALON':         { passive:'Avalonian Jacket' },
  'ARMOR_LEATHER_GUARDIAN':       { passive:"Guardian's Jacket" },

  // ── ARMOR — CLOTH ─────────────────────────────────────────
  'ARMOR_CLOTH_SET1':             { passive:'Mana Regen' },
  'ARMOR_CLOTH_SET2':             { passive:'Aggressive Energy' },
  'ARMOR_CLOTH_SET3':             { passive:'Balefire' },
  'ARMOR_CLOTH_UNDEAD':           { passive:'Undead Scholar' },
  'ARMOR_CLOTH_KEEPER':           { passive:'Druidic Robe' },
  'ARMOR_CLOTH_FEY':              { passive:'Fey Robe' },
  'ARMOR_CLOTH_HELL':             { passive:'Cultist Robe' },
  'ARMOR_CLOTH_MORGANA':          { passive:'Demon Robe' },
  'ARMOR_CLOTH_ROYAL':            { passive:'Royal Robe' },
  'ARMOR_CLOTH_AVALON':           { passive:'Avalonian Robe' },

  // ── SHOES — PLATE ─────────────────────────────────────────
  'SHOES_PLATE_SET1':             { passive:'Toughness Boots' },
  'SHOES_PLATE_SET2':             { passive:'Knight Boots' },
  'SHOES_PLATE_SET3':             { passive:'Guardian Boots' },
  'SHOES_PLATE_UNDEAD':           { passive:'Undead Boots' },
  'SHOES_PLATE_KEEPER':           { passive:"Keeper's Boots" },
  'SHOES_PLATE_FEY':              { passive:'Fey Boots' },
  'SHOES_PLATE_HELL':             { passive:'Soldier Boots' },
  'SHOES_PLATE_MORGANA':          { passive:'Demon Boots' },
  'SHOES_PLATE_ROYAL':            { passive:'Royal Boots' },
  'SHOES_PLATE_AVALON':           { passive:'Avalonian Boots' },
  'SHOES_PLATE_GUARDIAN':         { passive:"Guardian's Boots" },

  // ── SHOES — LEATHER ───────────────────────────────────────
  'SHOES_LEATHER_SET1':           { passive:'Wanderlust' },
  'SHOES_LEATHER_SET2':           { passive:'Energetic Sprint' },
  'SHOES_LEATHER_SET3':           { passive:'Specter Shoes' },
  'SHOES_LEATHER_UNDEAD':         { passive:'Undead Sprint' },
  'SHOES_LEATHER_KEEPER':         { passive:"Nature's Step" },
  'SHOES_LEATHER_FEY':            { passive:'Fey Steps' },
  'SHOES_LEATHER_HELL':           { passive:'Fiend Shoes' },
  'SHOES_LEATHER_MORGANA':        { passive:'Demon Shoes' },
  'SHOES_LEATHER_ROYAL':          { passive:'Royal Shoes' },
  'SHOES_LEATHER_AVALON':         { passive:'Avalonian Shoes' },
  'SHOES_LEATHER_GUARDIAN':       { passive:"Guardian's Shoes" },

  // ── SHOES — CLOTH ─────────────────────────────────────────
  'SHOES_CLOTH_SET1':             { passive:'Aggression' },
  'SHOES_CLOTH_SET2':             { passive:'Chase / Escape' },
  'SHOES_CLOTH_SET3':             { passive:'Cleric Sandals' },
  'SHOES_CLOTH_UNDEAD':           { passive:'Undead Sandals' },
  'SHOES_CLOTH_KEEPER':           { passive:"Druid's Sandals" },
  'SHOES_CLOTH_FEY':              { passive:'Fey Sandals' },
  'SHOES_CLOTH_HELL':             { passive:'Fiend Sandals' },
  'SHOES_CLOTH_MORGANA':          { passive:'Demon Sandals' },
  'SHOES_CLOTH_ROYAL':            { passive:'Royal Sandals' },
  'SHOES_CLOTH_AVALON':           { passive:'Avalonian Sandals' },
};
