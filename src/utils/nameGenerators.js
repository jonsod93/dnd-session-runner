// ── Helpers ──────────────────────────────────────────────
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)]

// ── Word lists ──────────────────────────────────────────

const FIRST_NAMES = [
  'Aldric','Bael','Caelum','Dareth','Elden','Faelan','Gideon','Haldor',
  'Isolde','Jorin','Kaelen','Lysara','Miriel','Nyx','Orin','Petra',
  'Quillan','Rhea','Seraphine','Theron','Ulric','Vesper','Wren','Xander',
  'Ysolde','Zephyr','Anara','Brinley','Corvus','Daeris','Elara','Fenwick',
  'Gael','Hester','Ilya','Jareth','Kiera','Lothar','Maren','Nessa',
  'Oswin','Phaedra','Riven','Sable','Talia','Ulfric','Vara','Wynne',
  'Asha','Bran','Cira','Dorian','Eira','Finnian','Gwyn','Haldis',
  'Idris','Jael','Kai','Liora','Maelis','Nerys',
]

const LAST_NAMES = [
  'Ashford','Blackthorn','Crestfall','Dawnforge','Emberheart','Frostwind',
  'Grimholt','Holloway','Ironvale','Kettlebrook','Lightfoot','Moonwhisper',
  'Nighthollow','Oakenshield','Pyreborn','Ravencrest','Stoneblade','Thornwall',
  'Underhill','Vexmoor','Windhelm','Yarrow','Ashveil','Brightsteel',
  'Coldmere','Dunrath','Everstone','Flamewick','Greymane','Hawkridge',
  'Ivywood','Kinsgrove','Loreweaver','Mistwalker','Norvaen','Oathbinder',
  'Pallwick','Rustveil','Silkwater','Tideborn',
]

const TAVERN_ADJECTIVES = [
  'Golden','Rusty','Drunken','Prancing','Silver','Wandering','Lucky',
  'Crimson','Sleeping','Howling','Broken','Jolly','Merry','Weeping',
  'Dancing','Laughing','Gilded','Sunken','Crooked','Copper',
]

const TAVERN_NOUNS = [
  'Dragon','Flagon','Stag','Goblet','Griffin','Hound','Barrel',
  'Raven','Boar','Anchor','Lantern','Serpent','Goat','Tankard',
  'Stallion','Sparrow','Helm','Shield','Fox','Pony',
]

const MAGIC_SHOP_ADJECTIVES = [
  'Arcane','Mystic','Enchanted','Glowing','Astral','Ethereal',
  'Flickering','Whispering','Luminous','Spectral','Eldritch','Prismatic',
]

const MAGIC_SHOP_NOUNS = [
  'Emporium','Sanctum','Atelier','Cauldron','Grimoire','Wand',
  'Crystal','Orb','Tome','Scroll','Catalyst','Crucible',
]

const GENERAL_STORE_ADJECTIVES = [
  'Honest','Old','Reliable','Fair','Friendly','Humble',
  'Sturdy','Trusty','Thrifty','Bountiful','Hearty','Stout',
]

const GENERAL_STORE_NOUNS = [
  'Provisions','Goods','Sundries','Supplies','Wares','Mercantile',
  'Pantry','Stockpile','Storehouse','Emporium','Market','Depot',
]

const WAREHOUSE_ADJECTIVES = [
  'Iron','Stone','Heavy','Grand','Vast','Deep',
  'Broad','Sealed','Guarded','Old','Wide','Long',
]

const WAREHOUSE_NOUNS = [
  'Warehouse','Depot','Storehouse','Holdfast','Vault','Repository',
  'Granary','Cellar','Stockade','Cache','Loft','Stores',
]

const STABLE_ADJECTIVES = [
  'Swift','Proud','Hardy','Gentle','Sturdy','Fine',
  'Wild','Noble','Faithful','Strong','Nimble','Steady',
]

const STABLE_NOUNS = [
  'Stables','Paddock','Corral','Mews','Livery','Ranch',
  'Pasture','Bridle','Saddle','Hoof','Stirrup','Trough',
]

const DOCKS_ADJECTIVES = [
  'Salty','Weathered','Barnacled','Creaking','Foggy','Tidal',
  'Breezy','Sandy','Mossy','Muddy','Rusty','Damp',
]

const DOCKS_NOUNS = [
  'Docks','Wharf','Pier','Moorings','Jetty','Quay',
  'Landing','Berth','Harbor','Slipway','Anchorage','Marina',
]

const RUIN_ADJECTIVES = [
  'Forsaken','Sunken','Hollow','Shattered','Silent','Cursed','Fallen',
  'Blighted','Withered','Ashen','Forgotten','Desolate','Crumbling',
  'Haunted','Scorched','Drowned','Ruined','Ancient','Lost','Blackened',
]

const RUIN_NOUNS = [
  'Tomb','Crypt','Spire','Sanctum','Temple','Vault','Citadel',
  'Keep','Bastion','Barrow','Tower','Halls','Catacombs','Archive',
  'Monastery','Fortress','Throne','Gate','Pinnacle','Depths',
]

const ORG_PREFIXES = [
  'Order','Brotherhood','Guild','Circle','Covenant','League','Council',
  'Assembly','Fellowship','Syndicate','Conclave','Alliance','House',
  'Court','Lodge','Cabal','Sect','Tribunal','Pact','Band',
]

const ORG_SUFFIXES = [
  'the Flame','the Veil','Iron','Twilight','the Arcane','Shadows',
  'the Crown','Ash','the Thorn','the Eclipse','Silver','the Dawn',
  'the Abyss','Storm','the Serpent','the Forge','the Chalice',
  'the Raven','the Blade','the Star',
]

const SETTLEMENT_PREFIXES = [
  'Ash','Raven','Thorn','Iron','Stone','Dusk','Mist','Ember',
  'Frost','Hawk','Oak','Silver','Copper','Wolf','Briar','Elder',
  'Red','Hollow','Bright','Dark',
]

const SETTLEMENT_SUFFIXES = [
  'hollow','ford','haven','mere','wick','gate','vale','stead',
  'brook','ridge','well','ton','burgh','crest','moor','dale',
  'keep','watch','helm','fall',
]

const SHIP_ADJECTIVES = [
  'Crimson','Storm','Shadow','Golden','Midnight','Iron','Silver',
  'Black','Emerald','Sapphire','Scarlet','Phantom','Dread','Swift',
  'Raging','Silent','Howling','Restless','Burning','Azure',
]

const SHIP_NOUNS = [
  'Tide','Serpent','Wing','Maiden','Vengeance','Fury','Pearl',
  'Fang','Wanderer','Spirit','Herald','Tempest','Blade','Fortune',
  'Hawk','Wrath','Crown','Star','Voyager','Leviathan',
]

// ── Generator functions ─────────────────────────────────

export function generateNPCName() {
  return `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`
}

export function generateTavernName() {
  return `The ${pick(TAVERN_ADJECTIVES)} ${pick(TAVERN_NOUNS)}`
}

export function generateMagicShopName() {
  const patterns = [
    () => `The ${pick(MAGIC_SHOP_ADJECTIVES)} ${pick(MAGIC_SHOP_NOUNS)}`,
    () => `${pick(FIRST_NAMES)}'s ${pick(MAGIC_SHOP_NOUNS)}`,
  ]
  return pick(patterns)()
}

export function generateGeneralStoreName() {
  const patterns = [
    () => `${pick(FIRST_NAMES)}'s ${pick(GENERAL_STORE_NOUNS)}`,
    () => `The ${pick(GENERAL_STORE_ADJECTIVES)} ${pick(GENERAL_STORE_NOUNS)}`,
  ]
  return pick(patterns)()
}

export function generateWarehouseName() {
  const patterns = [
    () => `The ${pick(WAREHOUSE_ADJECTIVES)} ${pick(WAREHOUSE_NOUNS)}`,
    () => `${pick(FIRST_NAMES)}'s ${pick(WAREHOUSE_NOUNS)}`,
  ]
  return pick(patterns)()
}

export function generateStableName() {
  const patterns = [
    () => `The ${pick(STABLE_ADJECTIVES)} ${pick(STABLE_NOUNS)}`,
    () => `${pick(FIRST_NAMES)}'s ${pick(STABLE_NOUNS)}`,
  ]
  return pick(patterns)()
}

export function generateDocksName() {
  const patterns = [
    () => `The ${pick(DOCKS_ADJECTIVES)} ${pick(DOCKS_NOUNS)}`,
    () => `${pick(FIRST_NAMES)}'s ${pick(DOCKS_NOUNS)}`,
  ]
  return pick(patterns)()
}

export function generateRuinName() {
  const patterns = [
    () => `The ${pick(RUIN_ADJECTIVES)} ${pick(RUIN_NOUNS)}`,
    () => `${pick(FIRST_NAMES)}'s ${pick(RUIN_NOUNS)}`,
    () => `${pick(RUIN_NOUNS)} of the ${pick(RUIN_ADJECTIVES)}`,
  ]
  return pick(patterns)()
}

export function generateOrgName() {
  const patterns = [
    () => `The ${pick(ORG_PREFIXES)} of ${pick(ORG_SUFFIXES)}`,
    () => `${pick(ORG_PREFIXES)} of the ${pick(ORG_SUFFIXES)}`,
  ]
  return pick(patterns)()
}

export function generateSettlementName() {
  return `${pick(SETTLEMENT_PREFIXES)}${pick(SETTLEMENT_SUFFIXES)}`
}

export function generateShipName() {
  const patterns = [
    () => `The ${pick(SHIP_ADJECTIVES)} ${pick(SHIP_NOUNS)}`,
    () => `${pick(SHIP_NOUNS)} of ${pick(SHIP_ADJECTIVES)} Seas`,
  ]
  return pick(patterns)()
}

// ── Establishment subtypes ──────────────────────────────

export const ESTABLISHMENT_SUBTYPES = [
  { key: 'tavern',        label: 'Inn / Tavern',    generate: generateTavernName },
  { key: 'magic-shop',    label: 'Magic Shop',      generate: generateMagicShopName },
  { key: 'general-store', label: 'General Store',   generate: generateGeneralStoreName },
  { key: 'warehouse',     label: 'Warehouse',       generate: generateWarehouseName },
  { key: 'stable',        label: 'Stable',          generate: generateStableName },
  { key: 'docks',         label: 'Docks',           generate: generateDocksName },
]

// ── Generator config (used by the page) ─────────────────

export const GENERATORS = [
  { key: 'npc',            label: 'NPC',            generate: generateNPCName,        notionTarget: 'npc' },
  { key: 'establishment',  label: 'Establishment',  generate: generateTavernName,     notionTarget: 'location', locationType: 'Establishments', subtypes: ESTABLISHMENT_SUBTYPES },
  { key: 'ruins',          label: 'Ruins',          generate: generateRuinName,       notionTarget: 'location', locationType: 'Ruin' },
  { key: 'organization',   label: 'Organization',   generate: generateOrgName,        notionTarget: 'organization' },
  { key: 'settlement',     label: 'Settlement',     generate: generateSettlementName, notionTarget: 'location', locationType: 'Settlements' },
  { key: 'ship',           label: 'Ship',           generate: generateShipName,       notionTarget: 'location', locationType: 'Vessel' },
]
