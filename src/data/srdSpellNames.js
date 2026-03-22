// SRD + common D&D 5e spell names used in monster statblocks
const NAMES = [
  // Cantrips
  'Acid Splash','Blade Ward','Booming Blade','Chill Touch','Control Flames','Create Bonfire',
  'Dancing Lights','Druidcraft','Eldritch Blast','Fire Bolt','Friends','Frostbite',
  'Green-Flame Blade','Guidance','Gust','Infestation','Light','Lightning Lure',
  'Mage Hand','Magic Stone','Mending','Message','Mind Sliver','Minor Illusion',
  'Mold Earth','Poison Spray','Prestidigitation','Primal Savagery','Produce Flame',
  'Ray of Frost','Resistance','Sacred Flame','Shape Water','Shillelagh','Shocking Grasp',
  'Spare the Dying','Sword Burst','Thaumaturgy','Thorn Whip','Thunderclap','Toll the Dead',
  'True Strike','Vicious Mockery','Word of Radiance',
  // 1st level
  'Absorb Elements','Alarm','Animal Friendship','Armor of Agathys','Arms of Hadar',
  'Bane','Bless','Burning Hands','Catapult','Cause Fear','Charm Person','Chromatic Orb',
  'Color Spray','Command','Comprehend Languages','Create or Destroy Water','Cure Wounds',
  'Detect Evil and Good','Detect Magic','Detect Poison and Disease','Disguise Self',
  'Dissonant Whispers','Divine Favor','Earth Tremor','Entangle','Expeditious Retreat',
  'Faerie Fire','False Life','Feather Fall','Find Familiar','Fog Cloud','Goodberry',
  'Grease','Guiding Bolt','Hail of Thorns','Healing Word','Hellish Rebuke','Heroism',
  'Hex','Hunter\'s Mark','Ice Knife','Identify','Illusory Script','Inflict Wounds',
  'Jump','Longstrider','Mage Armor','Magic Missile','Protection from Evil and Good',
  'Purify Food and Drink','Ray of Sickness','Sanctuary','Searing Smite','Shield',
  'Shield of Faith','Silent Image','Sleep','Snare','Speak with Animals',
  'Tasha\'s Hideous Laughter','Tenser\'s Floating Disk','Thunderous Smite','Thunderwave',
  'Unseen Servant','Witch Bolt','Wrathful Smite','Zephyr Strike',
  // 2nd level
  'Aganazzar\'s Scorcher','Aid','Alter Self','Animal Messenger','Arcane Lock','Augury',
  'Barkskin','Beast Sense','Blindness/Deafness','Blur','Borrowed Knowledge','Branding Smite',
  'Calm Emotions','Cloud of Daggers','Continual Flame','Cordon of Arrows','Crown of Madness',
  'Darkness','Darkvision','Detect Thoughts','Dragon\'s Breath','Dust Devil','Earthbind',
  'Enhance Ability','Enlarge/Reduce','Enthrall','Find Steed','Find Traps','Flame Blade',
  'Flaming Sphere','Fortune\'s Favor','Gentle Repose','Gust of Wind','Healing Spirit',
  'Heat Metal','Hold Person','Invisibility','Knock','Lesser Restoration','Levitate',
  'Locate Animals or Plants','Locate Object','Magic Mouth','Magic Weapon',
  'Maximilian\'s Earthen Grasp','Melf\'s Acid Arrow','Mind Spike','Mirror Image',
  'Misty Step','Moonbeam','Nathair\'s Mischief','Nystul\'s Magic Aura',
  'Pass without Trace','Phantasmal Force','Prayer of Healing','Protection from Poison',
  'Pyrotechnics','Ray of Enfeeblement','Rope Trick','Scorching Ray','See Invisibility',
  'Shadow Blade','Shatter','Silence','Skywrite','Snilloc\'s Snowball Swarm',
  'Spider Climb','Spike Growth','Spiritual Weapon','Suggestion','Summon Beast',
  'Tasha\'s Mind Whip','Vortex Warp','Warding Bond','Web','Zone of Truth',
  // 3rd level
  'Animate Dead','Aura of Vitality','Beacon of Hope','Bestow Curse','Blinding Smite',
  'Call Lightning','Catnap','Clairvoyance','Conjure Animals','Conjure Barrage',
  'Counterspell','Create Food and Water','Crusader\'s Mantle','Daylight','Dispel Magic',
  'Elemental Weapon','Enemies Abound','Erupting Earth','Fear','Feign Death','Fireball',
  'Flame Arrows','Fly','Gaseous Form','Glyph of Warding','Haste','Hunger of Hadar',
  'Hypnotic Pattern','Leomund\'s Tiny Hut','Life Transference','Lightning Arrow',
  'Lightning Bolt','Magic Circle','Major Image','Mass Healing Word','Meld into Stone',
  'Melf\'s Minute Meteors','Nondetection','Phantom Steed','Plant Growth',
  'Protection from Energy','Remove Curse','Revivify','Sending','Sleet Storm','Slow',
  'Speak with Dead','Speak with Plants','Spirit Guardians','Spirit Shroud','Stinking Cloud',
  'Summon Fey','Summon Lesser Demons','Summon Shadowspawn','Summon Undead','Thunder Step',
  'Tidal Wave','Tiny Servant','Tongues','Vampiric Touch','Wall of Sand','Wall of Water',
  'Water Breathing','Water Walk','Wind Wall',
  // 4th level
  'Arcane Eye','Aura of Life','Aura of Purity','Banishment','Blight','Charm Monster',
  'Compulsion','Confusion','Conjure Minor Elementals','Conjure Woodland Beings',
  'Control Water','Death Ward','Divination','Dominate Beast','Elemental Bane',
  'Evard\'s Black Tentacles','Fabricate','Fire Shield','Freedom of Movement',
  'Giant Insect','Grasping Vine','Gravity Sinkhole','Guardian of Faith','Guardian of Nature',
  'Hallucinatory Terrain','Ice Storm','Leomund\'s Secret Chest','Locate Creature',
  'Mordenkainen\'s Faithful Hound','Mordenkainen\'s Private Sanctum',
  'Otiluke\'s Resilient Sphere','Phantasmal Killer','Polymorph','Shadow of Moil',
  'Stone Shape','Stoneskin','Storm Sphere','Summon Aberration','Summon Construct',
  'Summon Elemental','Summon Greater Demon','Vitriolic Sphere','Wall of Fire','Watery Sphere',
  // 5th level
  'Animate Objects','Antilife Shell','Arcane Hand','Awaken','Banishing Smite',
  'Circle of Power','Cloudkill','Commune','Commune with Nature','Cone of Cold',
  'Conjure Elemental','Conjure Volley','Contact Other Plane','Contagion','Control Winds',
  'Creation','Danse Macabre','Dawn','Destructive Wave','Dispel Evil and Good',
  'Dominate Person','Dream','Enervation','Far Step','Flame Strike','Geas',
  'Greater Restoration','Hallow','Hold Monster','Holy Weapon','Immolation',
  'Infernal Calling','Insect Plague','Legend Lore','Maelstrom','Mass Cure Wounds',
  'Mislead','Modify Memory','Negative Energy Flood','Passwall','Planar Binding',
  'Raise Dead','Rary\'s Telepathic Bond','Scrying','Seeming','Skill Empowerment',
  'Steel Wind Strike','Summon Celestial','Summon Draconic Spirit','Swift Quiver',
  'Synaptic Static','Telekinesis','Teleportation Circle','Tree Stride','Wall of Force',
  'Wall of Light','Wall of Stone','Wrath of Nature',
  // 6th level
  'Arcane Gate','Blade Barrier','Bones of the Earth','Chain Lightning','Circle of Death',
  'Conjure Fey','Contingency','Create Homunculus','Create Undead','Disintegrate',
  'Divine Word','Drawmij\'s Instant Summons','Eyebite','Fizban\'s Platinum Shield',
  'Flesh to Stone','Forbiddance','Freezing Sphere','Globe of Invulnerability',
  'Gravity Fissure','Guards and Wards','Harm','Heal','Heroes\' Feast',
  'Investiture of Flame','Investiture of Ice','Investiture of Stone','Investiture of Wind',
  'Irresistible Dance','Magic Jar','Mass Suggestion','Mental Prison','Move Earth',
  'Programmed Illusion','Scatter','Soul Cage','Summon Fiend','Sunbeam',
  'Tasha\'s Otherworldly Guise','Transport via Plants','True Seeing','Wall of Ice',
  'Wall of Thorns','Wind Walk','Word of Recall',
  // 7th level
  'Conjure Celestial','Crown of Stars','Delayed Blast Fireball','Dream of the Blue Veil',
  'Etherealness','Finger of Death','Fire Storm','Forcecage','Mirage Arcane',
  'Mordenkainen\'s Magnificent Mansion','Mordenkainen\'s Sword','Plane Shift',
  'Power Word Pain','Prismatic Spray','Project Image','Regenerate','Resurrection',
  'Reverse Gravity','Sequester','Simulacrum','Symbol','Teleport','Temple of the Gods',
  'Tether Essence','Whirlwind',
  // 8th level
  'Abi-Dalzim\'s Horrid Wilting','Animal Shapes','Antimagic Field','Antipathy/Sympathy',
  'Clone','Control Weather','Demiplane','Dominate Monster','Earthquake','Feeblemind',
  'Glibness','Holy Aura','Illusory Dragon','Incendiary Cloud','Maddening Darkness',
  'Maze','Mighty Fortress','Mind Blank','Power Word Stun','Sunburst','Telepathy','Tsunami',
  // 9th level
  'Astral Projection','Blade of Disaster','Foresight','Gate','Imprisonment','Invulnerability',
  'Mass Polymorph','Meteor Swarm','Power Word Heal','Power Word Kill','Prismatic Wall',
  'Psychic Scream','Ravenous Void','Shapechange','Storm of Vengeance','Time Ravage',
  'Time Stop','True Polymorph','True Resurrection','Weird','Wish',
]

export const SRD_SPELL_NAMES = new Set(NAMES)

// Pre-compiled regex — sorted longest-first so longer names win over shorter substrings
const sorted  = [...NAMES].sort((a, b) => b.length - a.length)
const escaped = sorted.map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
export const SPELL_REGEX = new RegExp(`\\b(${escaped.join('|')})\\b`, 'i')

// Slugify a spell name for Open5e API lookup
export function spellNameToSlug(name) {
  return name
    .toLowerCase()
    .replace(/['']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}
