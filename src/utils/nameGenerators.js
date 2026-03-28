// ── Helpers ──────────────────────────────────────────────
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)]
const roll = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min
const rollDice = (count, sides) => {
  let total = 0
  for (let i = 0; i < count; i++) total += roll(1, sides)
  return total
}
const pickN = (arr, n) => {
  const shuffled = [...arr].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, Math.min(n, arr.length))
}

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

// ── Loot tables ────────────────────────────────────────

const GEMS_10 = ['Azurite','Blue quartz','Hematite','Lapis lazuli','Malachite','Obsidian','Tiger eye','Turquoise']
const GEMS_50 = ['Bloodstone','Carnelian','Chalcedony','Chrysoprase','Citrine','Jasper','Moonstone','Onyx','Sardonyx','Star rose quartz','Zircon']
const GEMS_100 = ['Amber','Amethyst','Chrysoberyl','Coral','Garnet','Jade','Jet','Pearl','Spinel','Tourmaline']
const GEMS_500 = ['Alexandrite','Aquamarine','Black pearl','Blue spinel','Peridot','Topaz']
const GEMS_1000 = ['Black opal','Blue sapphire','Emerald','Fire opal','Opal','Star ruby','Star sapphire','Yellow sapphire']

const ART_25 = ['Silver ewer','Carved bone statuette','Gold bracelet','Silk pouch of gemstones','Silver necklace with pendant','Copper chalice with silver filigree','Pair of engraved bone dice']
const ART_250 = ['Gold ring set with bloodstones','Carved ivory statuette','Gold bracelet with pearls','Silver chalice with moonstones','Silk-and-velvet mask with chrysoberyls','Bronze crown']
const ART_750 = ['Silver chalice with sapphires','Carved harp of exotic wood with ivory inlay','Gold dragon comb with red garnets','Platinum ring with moonstones','Obsidian statuette with gold fittings']
const ART_2500 = ['Fine gold chain with fire opal','Old masterpiece painting','Embroidered silk mantle with emeralds','Platinum bracelet with sapphires','Gold music box']

const MAGIC_ITEMS_MINOR = [
  'Potion of Healing','Spell Scroll (1st level)','Potion of Climbing','Bag of Holding',
  'Driftglobe','Goggles of Night','Cloak of Protection','Boots of Elvenkind',
  'Gloves of Missile Snaring','Hat of Disguise','Lantern of Revealing','Ring of Jumping',
  'Wand of Magic Detection','Rope of Climbing','Sending Stones','Immovable Rod',
  'Alchemy Jug','Decanter of Endless Water','Eyes of Minute Seeing',
]

const MAGIC_ITEMS_MAJOR = [
  'Flame Tongue','Cloak of Displacement','Ring of Protection','Staff of the Woodlands',
  'Amulet of Health','Belt of Giant Strength (Hill)','Boots of Speed','Bracers of Defense',
  'Cape of the Mountebank','Helm of Teleportation','Ring of Spell Storing',
  'Wand of Fireballs','Wings of Flying','Animated Shield','Rod of the Pact Keeper +2',
]

const LOOT_TIERS = {
  '1-4': {
    individual: { cp: [5,30], sp: [4,24], gp: [0,6] },
    hoard:      { gp: [20,120], sp: [30,180], gems: GEMS_10,  gemCount: [0,6], art: ART_25,  artCount: [0,4], magicChance: 0.1, magicPool: MAGIC_ITEMS_MINOR },
  },
  '5-10': {
    individual: { cp: [0,0], sp: [10,60], gp: [4,40], pp: [0,0] },
    hoard:      { gp: [200,1200], pp: [0,10], gems: GEMS_50,  gemCount: [1,6], art: ART_250, artCount: [0,4], magicChance: 0.3, magicPool: MAGIC_ITEMS_MINOR },
  },
  '11-16': {
    individual: { sp: [0,0], gp: [10,100], pp: [1,12] },
    hoard:      { gp: [1000,6000], pp: [10,60], gems: GEMS_500, gemCount: [1,8], art: ART_750, artCount: [0,6], magicChance: 0.6, magicPool: MAGIC_ITEMS_MAJOR },
  },
  '17-20': {
    individual: { gp: [20,200], pp: [4,40] },
    hoard:      { gp: [4000,24000], pp: [40,240], gems: GEMS_1000, gemCount: [2,10], art: ART_2500, artCount: [1,6], magicChance: 0.8, magicPool: MAGIC_ITEMS_MAJOR },
  },
}

export function generateLoot(options = {}) {
  const tier = options.partyLevel || '1-4'
  const type = options.treasureType || 'Individual'
  const data = LOOT_TIERS[tier]
  if (!data) return 'Invalid tier.'

  const lines = []

  if (type === 'Individual') {
    const t = data.individual
    const coins = []
    if (t.cp) { const v = roll(t.cp[0], t.cp[1]); if (v > 0) coins.push(`${v} cp`) }
    if (t.sp) { const v = roll(t.sp[0], t.sp[1]); if (v > 0) coins.push(`${v} sp`) }
    if (t.gp) { const v = roll(t.gp[0], t.gp[1]); if (v > 0) coins.push(`${v} gp`) }
    if (t.pp) { const v = roll(t.pp[0], t.pp[1]); if (v > 0) coins.push(`${v} pp`) }
    lines.push(`Coins: ${coins.length ? coins.join(', ') : 'none'}`)
  } else {
    // Hoard
    const t = data.hoard
    const coins = []
    if (t.sp) { const v = roll(t.sp[0], t.sp[1]); if (v > 0) coins.push(`${v} sp`) }
    if (t.gp) { const v = roll(t.gp[0], t.gp[1]); if (v > 0) coins.push(`${v} gp`) }
    if (t.pp) { const v = roll(t.pp[0], t.pp[1]); if (v > 0) coins.push(`${v} pp`) }
    lines.push(`Coins: ${coins.join(', ')}`)

    // Gems
    const gemCount = roll(t.gemCount[0], t.gemCount[1])
    if (gemCount > 0) {
      const gems = pickN(t.gems, Math.min(gemCount, 3))
      const gemValue = t.gems === GEMS_10 ? 10 : t.gems === GEMS_50 ? 50 : t.gems === GEMS_100 ? 100 : t.gems === GEMS_500 ? 500 : 1000
      lines.push('')
      lines.push('Gems:')
      gems.forEach(g => {
        const count = gemCount <= 3 ? 1 : roll(1, 3)
        lines.push(`  ${count}x ${g} (${gemValue} gp each)`)
      })
    }

    // Art
    const artCount = roll(t.artCount[0], t.artCount[1])
    if (artCount > 0) {
      const art = pickN(t.art, Math.min(artCount, 3))
      const artValue = t.art === ART_25 ? 25 : t.art === ART_250 ? 250 : t.art === ART_750 ? 750 : 2500
      lines.push('')
      lines.push('Art Objects:')
      art.forEach(a => lines.push(`  ${a} (${artValue} gp)`))
    }

    // Magic items
    if (Math.random() < t.magicChance) {
      const magicCount = tier === '17-20' ? roll(1, 3) : 1
      const items = pickN(t.magicPool, magicCount)
      lines.push('')
      lines.push('Magic Items:')
      items.forEach(i => lines.push(`  ${i}`))
    }
  }

  return lines.join('\n')
}

// ── Shop inventory tables ──────────────────────────────

const SHOP_WEAPONS = [
  { name: 'Dagger', price: '2 gp' }, { name: 'Handaxe', price: '5 gp' },
  { name: 'Javelin', price: '5 sp' }, { name: 'Light hammer', price: '2 gp' },
  { name: 'Mace', price: '5 gp' }, { name: 'Quarterstaff', price: '2 sp' },
  { name: 'Sickle', price: '1 gp' }, { name: 'Spear', price: '1 gp' },
  { name: 'Shortbow', price: '25 gp' }, { name: 'Shortsword', price: '10 gp' },
  { name: 'Longsword', price: '15 gp' }, { name: 'Battleaxe', price: '10 gp' },
  { name: 'Rapier', price: '25 gp' }, { name: 'Crossbow, light', price: '25 gp' },
  { name: 'Warhammer', price: '15 gp' }, { name: 'Longbow', price: '50 gp' },
]

const SHOP_ARMOR = [
  { name: 'Padded armor', price: '5 gp' }, { name: 'Leather armor', price: '10 gp' },
  { name: 'Studded leather', price: '45 gp' }, { name: 'Hide armor', price: '10 gp' },
  { name: 'Chain shirt', price: '50 gp' }, { name: 'Scale mail', price: '50 gp' },
  { name: 'Breastplate', price: '400 gp' }, { name: 'Shield', price: '10 gp' },
  { name: 'Ring mail', price: '30 gp' }, { name: 'Chain mail', price: '75 gp' },
]

const SHOP_GEAR = [
  { name: 'Backpack', price: '2 gp' }, { name: 'Bedroll', price: '1 gp' },
  { name: 'Rope, hempen (50 ft)', price: '1 gp' }, { name: 'Torch (10)', price: '1 sp' },
  { name: 'Rations (1 day)', price: '5 sp' }, { name: 'Waterskin', price: '2 sp' },
  { name: 'Tinderbox', price: '5 sp' }, { name: 'Crowbar', price: '2 gp' },
  { name: 'Grappling hook', price: '2 gp' }, { name: 'Lantern, hooded', price: '5 gp' },
  { name: 'Oil flask', price: '1 sp' }, { name: 'Piton (10)', price: '5 cp' },
  { name: 'Healer\'s kit', price: '5 gp' }, { name: 'Caltrops (bag of 20)', price: '1 gp' },
  { name: 'Chain (10 ft)', price: '5 gp' }, { name: 'Climber\'s kit', price: '25 gp' },
  { name: 'Hunting trap', price: '5 gp' }, { name: 'Ink (1 oz bottle)', price: '10 gp' },
  { name: 'Manacles', price: '2 gp' }, { name: 'Mess kit', price: '2 sp' },
  { name: 'Potion of Healing', price: '50 gp' }, { name: 'Antitoxin (vial)', price: '50 gp' },
  { name: 'Alchemist\'s fire (flask)', price: '50 gp' }, { name: 'Holy water (flask)', price: '25 gp' },
]

const MAGIC_SHOP_ITEMS = [
  { name: 'Potion of Healing', rarity: 'Common', price: '50 gp' },
  { name: 'Potion of Greater Healing', rarity: 'Uncommon', price: '150 gp' },
  { name: 'Spell Scroll (1st level)', rarity: 'Common', price: '75 gp' },
  { name: 'Spell Scroll (2nd level)', rarity: 'Uncommon', price: '200 gp' },
  { name: 'Spell Scroll (3rd level)', rarity: 'Uncommon', price: '400 gp' },
  { name: 'Bag of Holding', rarity: 'Uncommon', price: '500 gp' },
  { name: 'Goggles of Night', rarity: 'Uncommon', price: '400 gp' },
  { name: 'Cloak of Protection', rarity: 'Uncommon', price: '600 gp' },
  { name: 'Boots of Elvenkind', rarity: 'Uncommon', price: '500 gp' },
  { name: 'Driftglobe', rarity: 'Uncommon', price: '350 gp' },
  { name: 'Hat of Disguise', rarity: 'Uncommon', price: '500 gp' },
  { name: 'Immovable Rod', rarity: 'Uncommon', price: '500 gp' },
  { name: 'Lantern of Revealing', rarity: 'Uncommon', price: '500 gp' },
  { name: 'Ring of Jumping', rarity: 'Uncommon', price: '400 gp' },
  { name: 'Wand of Magic Detection', rarity: 'Uncommon', price: '500 gp' },
  { name: 'Potion of Climbing', rarity: 'Common', price: '50 gp' },
  { name: 'Potion of Animal Friendship', rarity: 'Uncommon', price: '200 gp' },
  { name: 'Potion of Fire Breath', rarity: 'Uncommon', price: '200 gp' },
  { name: 'Dust of Disappearance', rarity: 'Uncommon', price: '300 gp' },
  { name: 'Sending Stones', rarity: 'Uncommon', price: '600 gp' },
  { name: 'Rope of Climbing', rarity: 'Uncommon', price: '400 gp' },
  { name: 'Pearl of Power', rarity: 'Uncommon', price: '600 gp' },
  { name: 'Gloves of Thievery', rarity: 'Uncommon', price: '500 gp' },
  { name: 'Eyes of the Eagle', rarity: 'Uncommon', price: '500 gp' },
]

const RANDOM_INGREDIENTS = [
  { name: 'Dried nightshade petals', rarity: 'Common' },
  { name: 'Powdered silver moss', rarity: 'Common' },
  { name: 'Firethorn berries', rarity: 'Common' },
  { name: 'Crushed selenite', rarity: 'Common' },
  { name: 'Toadstool caps', rarity: 'Common' },
  { name: 'Wormwood extract', rarity: 'Common' },
  { name: 'Spider silk threads', rarity: 'Common' },
  { name: 'Dried willow bark', rarity: 'Common' },
  { name: 'Luminous lichen', rarity: 'Uncommon' },
  { name: 'Basilisk scale', rarity: 'Uncommon' },
  { name: 'Frost fern fronds', rarity: 'Uncommon' },
  { name: 'Ethereal dust', rarity: 'Uncommon' },
  { name: 'Wraith essence', rarity: 'Uncommon' },
  { name: 'Deepcave mushroom', rarity: 'Uncommon' },
  { name: 'Starbloom pollen', rarity: 'Uncommon' },
  { name: 'Manticore quill', rarity: 'Uncommon' },
  { name: 'Phoenix ash', rarity: 'Rare' },
  { name: 'Dragon blood vial', rarity: 'Rare' },
  { name: 'Beholder eye fluid', rarity: 'Rare' },
  { name: 'Treant heartwood', rarity: 'Rare' },
]

// Region name mapping: user-facing choice → Notion Location values
const REGION_MAP = {
  "Vel'kihrm": "Vel'kihrm",
  'Valhedria': 'Valhedria',
  'Mírgorûn': 'Mírgorûn',
  'Blightlands': 'The Blightlands',
  'Eisvolar': 'Eisvolar',
}

function isNativeToRegion(ingredientLocations, selectedRegion) {
  if (!ingredientLocations || ingredientLocations.length === 0) return true // default native
  if (ingredientLocations.includes('All regions')) return true
  const notionRegion = REGION_MAP[selectedRegion] || selectedRegion
  return ingredientLocations.includes(notionRegion)
}

function ingredientPrice(rarity, native) {
  if (rarity === 'Common' && native) return 5
  if (rarity === 'Common' && !native) return 10
  if (rarity === 'Uncommon' && native) return 10
  if (rarity === 'Uncommon' && !native) return 25
  return 0 // Rare shouldn't reach here (filtered out)
}

export function generateShopInventory(options = {}) {
  const shopType = options.shopType || 'General Goods'

  if (shopType === 'General Goods') {
    const itemCount = roll(8, 12)
    const allItems = [...SHOP_WEAPONS, ...SHOP_ARMOR, ...SHOP_GEAR]
    const selected = pickN(allItems, itemCount)
    const lines = ['General Goods:', '']
    selected.forEach(item => {
      lines.push(`  ${item.name}  -  ${item.price}`)
    })
    return lines.join('\n')
  }

  if (shopType === 'Magical Items') {
    const itemCount = roll(4, 8)
    const selected = pickN(MAGIC_SHOP_ITEMS, itemCount)
    const lines = ['Magical Items for Sale:', '']
    selected.forEach(item => {
      lines.push(`  ${item.name}  (${item.rarity})  -  ${item.price}`)
    })
    return lines.join('\n')
  }

  if (shopType === 'Ingredients') {
    const notionItems = options.notionIngredients
    const region = options.region || 'Valhedria'
    const itemCount = parseInt(options.ingredientCount, 10) || 8

    // Pick source items, filter out Rare
    const sourceItems = (notionItems && notionItems.length > 0)
      ? notionItems.filter(i => i.rarity !== 'Rare')
      : RANDOM_INGREDIENTS.filter(i => i.rarity !== 'Rare')

    const selected = pickN(sourceItems, itemCount)
    const usingNotion = notionItems && notionItems.length > 0

    // Return structured output with color info for the modal
    const lines = [
      { text: usingNotion ? `Ingredients (${region}):` : `Ingredients (${region}, random):`, color: null },
      { text: '', color: null },
    ]

    selected.forEach(item => {
      const native = isNativeToRegion(item.location, region)
      const price = ingredientPrice(item.rarity, native)
      const nativeLabel = native ? 'native' : 'foreign'
      const color = item.rarity === 'Uncommon' ? 'blue' : 'green'
      lines.push({
        text: `  ${item.name}  (${item.rarity}, ${nativeLabel})  -  ${price} gp`,
        color,
      })
      if (item.description) {
        lines.push({ text: `    ${item.description}`, color: null })
      }
    })

    return lines
  }

  return 'Unknown shop type.'
}

// ── Trap tables ────────────────────────────────────────

const TRAP_TYPES = [
  'Poison dart','Pit trap','Falling net','Collapsing ceiling','Swinging blade',
  'Flame jet','Poison gas','Arrow volley','Crushing walls','Spike trap',
  'Acid spray','Lightning rune','Thunder glyph','Freezing ward','Necrotic sigil',
  'Entangling vines','Quicksand pit','Rolling boulder','Scything blade','Explosive rune',
]

const TRAP_TRIGGERS = [
  'Pressure plate','Tripwire','Opening a door','Moving an object','Stepping on a tile',
  'Pulling a lever','Disturbing a corpse','Reading an inscription','Touching a gem',
  'Crossing a threshold','Breaking a seal','Lifting a lid','Turning a handle',
]

const TRAP_SAVE_TYPES = ['DEX','CON','WIS','STR','INT']

// Damage by tier and severity (avg damage values from DMG)
const TRAP_DAMAGE = {
  '1-4':   { Setback: [1,4,1],  Dangerous: [2,10,0], Deadly: [4,10,0] },
  '5-10':  { Setback: [2,6,0],  Dangerous: [4,10,0], Deadly: [10,10,0] },
  '11-16': { Setback: [4,6,0],  Dangerous: [10,10,0], Deadly: [18,10,0] },
  '17-20': { Setback: [6,6,0],  Dangerous: [18,10,0], Deadly: [24,10,0] },
}

const TRAP_DC = {
  Setback:   [10, 11],
  Dangerous: [12, 15],
  Deadly:    [16, 20],
}

export function generateTrap(options = {}) {
  const tier = options.partyLevel || '1-4'
  const severity = options.severity || 'Setback'

  const trapType = pick(TRAP_TYPES)
  const trigger = pick(TRAP_TRIGGERS)
  const saveType = pick(TRAP_SAVE_TYPES)
  const dc = roll(TRAP_DC[severity][0], TRAP_DC[severity][1])

  const dmg = TRAP_DAMAGE[tier]?.[severity] || TRAP_DAMAGE['1-4']['Setback']
  const damage = rollDice(dmg[0], dmg[1]) + dmg[2]
  const damageNotation = `${dmg[0]}d${dmg[1]}${dmg[2] > 0 ? ` + ${dmg[2]}` : ''}`

  const lines = [
    `${trapType}`,
    `Severity: ${severity}`,
    '',
    `Trigger: ${trigger}`,
    `Save: DC ${dc} ${saveType}`,
    `Damage: ${damage} (${damageNotation})`,
    '',
    `Detection: DC ${dc} (Investigation/Perception)`,
    `Disarm: DC ${dc} (Thieves' tools)`,
  ]

  return lines.join('\n')
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
  { key: 'establishment',  label: 'Establishment',  generate: generateTavernName,     notionTarget: 'location', locationType: 'Establishments', subtypes: ESTABLISHMENT_SUBTYPES, npcRole: 'Owner',                npcRelation: 'location' },
  { key: 'ruins',          label: 'Ruins',          generate: generateRuinName,       notionTarget: 'location', locationType: 'Ruin' },
  { key: 'organization',   label: 'Organization',   generate: generateOrgName,        notionTarget: 'organization', npcRole: 'Head of Organization', npcRelation: 'organization' },
  { key: 'settlement',     label: 'Settlement',     generate: generateSettlementName, notionTarget: 'location', locationType: 'Settlements', npcRole: 'Ruler',                npcRelation: 'location' },
  { key: 'ship',           label: 'Ship',           generate: generateShipName,       notionTarget: 'location', locationType: 'Vessel', npcRole: 'Captain',              npcRelation: 'location' },
  {
    key: 'loot', label: 'Loot', generate: generateLoot,
    options: [
      { key: 'partyLevel', label: 'Party Level', choices: ['1-4','5-10','11-16','17-20'] },
      { key: 'treasureType', label: 'Treasure Type', choices: ['Individual','Hoard'] },
    ],
  },
  {
    key: 'shop', label: 'Shop Inventory', generate: generateShopInventory,
    options: [
      { key: 'shopType', label: 'Shop Type', choices: ['General Goods','Magical Items','Ingredients'] },
      { key: 'region', label: 'Region', choices: ["Vel'kihrm",'Valhedria','Mírgorûn','Blightlands','Eisvolar'], showWhen: { shopType: 'Ingredients' } },
      { key: 'ingredientCount', label: 'Items', choices: ['4','6','8','10','12'], default: '8', showWhen: { shopType: 'Ingredients' } },
    ],
  },
  {
    key: 'trap', label: 'Trap', generate: generateTrap,
    options: [
      { key: 'partyLevel', label: 'Party Level', choices: ['1-4','5-10','11-16','17-20'] },
      { key: 'severity', label: 'Severity', choices: ['Setback','Dangerous','Deadly'] },
    ],
  },
]
