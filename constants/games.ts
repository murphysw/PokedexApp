export const GAME_IDS = [
	'red',
	'blue',
	'yellow',
	'gold',
	'silver',
	'crystal',
	'ruby',
	'sapphire',
	'emerald',
	'firered',
	'leafgreen',
	'diamond',
	'pearl',
	'platinum',
	'heartgold',
	'soulsilver',
	'black',
	'white',
	'black-2',
	'white-2',
	'x',
	'y',
	'omega-ruby',
	'alpha-sapphire',
	'sun',
	'moon',
	'ultra-sun',
	'ultra-moon',
	'lets-go-pikachu',
	'lets-go-eevee',
] as const;

export type GameId = (typeof GAME_IDS)[number];
export type Generation = 1 | 2 | 3 | 4 | 5 | 6 | 7;
export type RegionalDexKey =
	| 'kanto'
	| 'original-johto'
	| 'updated-johto'
	| 'hoenn'
	| 'updated-hoenn'
	| 'original-sinnoh'
	| 'extended-sinnoh'
	| 'original-unova'
	| 'updated-unova'
	| 'kalos-central'
	| 'kalos-coastal'
	| 'kalos-mountain'
	| 'original-alola'
	| 'updated-alola'
	| 'letsgo-kanto';

export type GameMetadata = {
	displayName: string;
	regionalDexKey: RegionalDexKey;
	additionalRegionalDexKeys?: readonly RegionalDexKey[];
	versionGroupEngineKey: string;
	generation: Generation;
	engineGeneration?: Generation;
	pairedGameId: GameId | null;
	exclusivePokemonIds: readonly number[];
};

// Encounter exclusives and their evolutions, limited to each regional roster.
const VERSION_EXCLUSIVE_IDS = {
	red: [23, 24, 43, 44, 45, 56, 57, 58, 59, 123, 125],
	blue: [27, 28, 37, 38, 52, 53, 69, 70, 71, 126, 127],
	yellow: [],
	gold: [10, 11, 12, 56, 57, 58, 59, 167, 168, 207, 216, 217, 226],
	silver: [13, 14, 15, 37, 38, 52, 53, 165, 166, 225, 227, 231, 232],
	crystal: [],
	ruby: [273, 274, 275, 303, 335, 338, 383],
	sapphire: [270, 271, 272, 302, 336, 337, 382],
	emerald: [],
	firered: [23, 24, 43, 44, 45, 54, 55, 58, 59, 90, 91, 123, 125],
	leafgreen: [27, 28, 37, 38, 69, 70, 71, 79, 80, 120, 121, 126, 127],
	diamond: [198, 430, 434, 435, 483],
	pearl: [200, 429, 431, 432, 484],
	platinum: [],
	heartgold: [56, 57, 58, 59, 167, 168, 207, 226, 231, 232],
	soulsilver: [37, 38, 52, 53, 165, 166, 216, 217, 225, 227],
	black: [546, 547, 574, 575, 576, 629, 630, 641, 643],
	white: [548, 549, 577, 578, 579, 627, 628, 642, 644],
	'black-2': [126, 240, 325, 326, 427, 428, 467, 574, 575, 576, 629, 630, 644],
	'white-2': [125, 239, 300, 301, 322, 323, 466, 577, 578, 579, 627, 628, 643],
	x: [120, 121, 228, 229, 304, 305, 306, 692, 693, 716],
	y: [90, 246, 309, 690, 691, 717],
	'omega-ruby': [109, 110, 273, 274, 275, 303, 383],
	'alpha-sapphire': [88, 89, 270, 271, 272, 302, 382],
	sun: [546, 547, 627, 628, 766, 776, 794, 798],
	moon: [548, 549, 629, 630, 765, 780, 795, 797],
	'ultra-sun': [228, 229, 546, 547, 622, 623, 627, 628, 693, 766, 776, 794, 798, 806],
	'ultra-moon': [309, 310, 343, 344, 548, 549, 629, 630, 691, 765, 780, 795, 797, 805],
	'lets-go-pikachu': [27, 28, 43, 44, 45, 56, 57, 58, 88, 89, 123],
	'lets-go-eevee': [23, 24, 37, 38, 52, 69, 70, 71, 109, 110, 127],
} satisfies Record<GameId, readonly number[]>;

export const GAMES: Record<GameId, GameMetadata> = {
	red: {
		displayName: 'Pokémon Red',
		regionalDexKey: 'kanto',
		versionGroupEngineKey: 'red-blue',
		generation: 1,
		pairedGameId: 'blue',
		exclusivePokemonIds: VERSION_EXCLUSIVE_IDS.red,
	},
	blue: {
		displayName: 'Pokémon Blue',
		regionalDexKey: 'kanto',
		versionGroupEngineKey: 'red-blue',
		generation: 1,
		pairedGameId: 'red',
		exclusivePokemonIds: VERSION_EXCLUSIVE_IDS.blue,
	},
	yellow: {
		displayName: 'Pokémon Yellow',
		regionalDexKey: 'kanto',
		versionGroupEngineKey: 'yellow',
		generation: 1,
		pairedGameId: null,
		exclusivePokemonIds: VERSION_EXCLUSIVE_IDS.yellow,
	},
	gold: {
		displayName: 'Pokémon Gold',
		regionalDexKey: 'original-johto',
		versionGroupEngineKey: 'gold-silver',
		generation: 2,
		pairedGameId: 'silver',
		exclusivePokemonIds: VERSION_EXCLUSIVE_IDS.gold,
	},
	silver: {
		displayName: 'Pokémon Silver',
		regionalDexKey: 'original-johto',
		versionGroupEngineKey: 'gold-silver',
		generation: 2,
		pairedGameId: 'gold',
		exclusivePokemonIds: VERSION_EXCLUSIVE_IDS.silver,
	},
	crystal: {
		displayName: 'Pokémon Crystal',
		regionalDexKey: 'original-johto',
		versionGroupEngineKey: 'crystal',
		generation: 2,
		pairedGameId: null,
		exclusivePokemonIds: VERSION_EXCLUSIVE_IDS.crystal,
	},
	ruby: {
		displayName: 'Pokémon Ruby',
		regionalDexKey: 'hoenn',
		versionGroupEngineKey: 'ruby-sapphire',
		generation: 3,
		pairedGameId: 'sapphire',
		exclusivePokemonIds: VERSION_EXCLUSIVE_IDS.ruby,
	},
	sapphire: {
		displayName: 'Pokémon Sapphire',
		regionalDexKey: 'hoenn',
		versionGroupEngineKey: 'ruby-sapphire',
		generation: 3,
		pairedGameId: 'ruby',
		exclusivePokemonIds: VERSION_EXCLUSIVE_IDS.sapphire,
	},
	emerald: {
		displayName: 'Pokémon Emerald',
		regionalDexKey: 'hoenn',
		versionGroupEngineKey: 'emerald',
		generation: 3,
		pairedGameId: null,
		exclusivePokemonIds: VERSION_EXCLUSIVE_IDS.emerald,
	},
	firered: {
		displayName: 'Pokémon FireRed',
		regionalDexKey: 'kanto',
		versionGroupEngineKey: 'firered-leafgreen',
		generation: 1,
		engineGeneration: 3,
		pairedGameId: 'leafgreen',
		exclusivePokemonIds: VERSION_EXCLUSIVE_IDS.firered,
	},
	leafgreen: {
		displayName: 'Pokémon LeafGreen',
		regionalDexKey: 'kanto',
		versionGroupEngineKey: 'firered-leafgreen',
		generation: 1,
		engineGeneration: 3,
		pairedGameId: 'firered',
		exclusivePokemonIds: VERSION_EXCLUSIVE_IDS.leafgreen,
	},
	diamond: {
		displayName: 'Pokémon Diamond',
		regionalDexKey: 'original-sinnoh',
		versionGroupEngineKey: 'diamond-pearl',
		generation: 4,
		pairedGameId: 'pearl',
		exclusivePokemonIds: VERSION_EXCLUSIVE_IDS.diamond,
	},
	pearl: {
		displayName: 'Pokémon Pearl',
		regionalDexKey: 'original-sinnoh',
		versionGroupEngineKey: 'diamond-pearl',
		generation: 4,
		pairedGameId: 'diamond',
		exclusivePokemonIds: VERSION_EXCLUSIVE_IDS.pearl,
	},
	platinum: {
		displayName: 'Pokémon Platinum',
		regionalDexKey: 'extended-sinnoh',
		versionGroupEngineKey: 'platinum',
		generation: 4,
		pairedGameId: null,
		exclusivePokemonIds: VERSION_EXCLUSIVE_IDS.platinum,
	},
	heartgold: {
		displayName: 'Pokémon HeartGold',
		regionalDexKey: 'updated-johto',
		versionGroupEngineKey: 'heartgold-soulsilver',
		generation: 2,
		engineGeneration: 4,
		pairedGameId: 'soulsilver',
		exclusivePokemonIds: VERSION_EXCLUSIVE_IDS.heartgold,
	},
	soulsilver: {
		displayName: 'Pokémon SoulSilver',
		regionalDexKey: 'updated-johto',
		versionGroupEngineKey: 'heartgold-soulsilver',
		generation: 2,
		engineGeneration: 4,
		pairedGameId: 'heartgold',
		exclusivePokemonIds: VERSION_EXCLUSIVE_IDS.soulsilver,
	},
	black: {
		displayName: 'Pokémon Black',
		regionalDexKey: 'original-unova',
		versionGroupEngineKey: 'black-white',
		generation: 5,
		pairedGameId: 'white',
		exclusivePokemonIds: VERSION_EXCLUSIVE_IDS.black,
	},
	white: {
		displayName: 'Pokémon White',
		regionalDexKey: 'original-unova',
		versionGroupEngineKey: 'black-white',
		generation: 5,
		pairedGameId: 'black',
		exclusivePokemonIds: VERSION_EXCLUSIVE_IDS.white,
	},
	'black-2': {
		displayName: 'Pokémon Black 2',
		regionalDexKey: 'updated-unova',
		versionGroupEngineKey: 'black-2-white-2',
		generation: 5,
		pairedGameId: 'white-2',
		exclusivePokemonIds: VERSION_EXCLUSIVE_IDS['black-2'],
	},
	'white-2': {
		displayName: 'Pokémon White 2',
		regionalDexKey: 'updated-unova',
		versionGroupEngineKey: 'black-2-white-2',
		generation: 5,
		pairedGameId: 'black-2',
		exclusivePokemonIds: VERSION_EXCLUSIVE_IDS['white-2'],
	},
	x: {
		displayName: 'Pokémon X',
		regionalDexKey: 'kalos-central',
		additionalRegionalDexKeys: ['kalos-coastal', 'kalos-mountain'],
		versionGroupEngineKey: 'x-y',
		generation: 6,
		pairedGameId: 'y',
		exclusivePokemonIds: VERSION_EXCLUSIVE_IDS.x,
	},
	y: {
		displayName: 'Pokémon Y',
		regionalDexKey: 'kalos-central',
		additionalRegionalDexKeys: ['kalos-coastal', 'kalos-mountain'],
		versionGroupEngineKey: 'x-y',
		generation: 6,
		pairedGameId: 'x',
		exclusivePokemonIds: VERSION_EXCLUSIVE_IDS.y,
	},
	'omega-ruby': {
		displayName: 'Pokémon Omega Ruby',
		regionalDexKey: 'updated-hoenn',
		versionGroupEngineKey: 'omega-ruby-alpha-sapphire',
		generation: 3,
		engineGeneration: 6,
		pairedGameId: 'alpha-sapphire',
		exclusivePokemonIds: VERSION_EXCLUSIVE_IDS['omega-ruby'],
	},
	'alpha-sapphire': {
		displayName: 'Pokémon Alpha Sapphire',
		regionalDexKey: 'updated-hoenn',
		versionGroupEngineKey: 'omega-ruby-alpha-sapphire',
		generation: 3,
		engineGeneration: 6,
		pairedGameId: 'omega-ruby',
		exclusivePokemonIds: VERSION_EXCLUSIVE_IDS['alpha-sapphire'],
	},
	sun: {
		displayName: 'Pokémon Sun',
		regionalDexKey: 'original-alola',
		versionGroupEngineKey: 'sun-moon',
		generation: 7,
		pairedGameId: 'moon',
		exclusivePokemonIds: VERSION_EXCLUSIVE_IDS.sun,
	},
	moon: {
		displayName: 'Pokémon Moon',
		regionalDexKey: 'original-alola',
		versionGroupEngineKey: 'sun-moon',
		generation: 7,
		pairedGameId: 'sun',
		exclusivePokemonIds: VERSION_EXCLUSIVE_IDS.moon,
	},
	'ultra-sun': {
		displayName: 'Pokémon Ultra Sun',
		regionalDexKey: 'updated-alola',
		versionGroupEngineKey: 'ultra-sun-ultra-moon',
		generation: 7,
		pairedGameId: 'ultra-moon',
		exclusivePokemonIds: VERSION_EXCLUSIVE_IDS['ultra-sun'],
	},
	'ultra-moon': {
		displayName: 'Pokémon Ultra Moon',
		regionalDexKey: 'updated-alola',
		versionGroupEngineKey: 'ultra-sun-ultra-moon',
		generation: 7,
		pairedGameId: 'ultra-sun',
		exclusivePokemonIds: VERSION_EXCLUSIVE_IDS['ultra-moon'],
	},
	'lets-go-pikachu': {
		displayName: 'Pokémon: Let’s Go, Pikachu!',
		regionalDexKey: 'letsgo-kanto',
		versionGroupEngineKey: 'lets-go-pikachu-lets-go-eevee',
		generation: 7,
		pairedGameId: 'lets-go-eevee',
		exclusivePokemonIds: VERSION_EXCLUSIVE_IDS['lets-go-pikachu'],
	},
	'lets-go-eevee': {
		displayName: 'Pokémon: Let’s Go, Eevee!',
		regionalDexKey: 'letsgo-kanto',
		versionGroupEngineKey: 'lets-go-pikachu-lets-go-eevee',
		generation: 7,
		pairedGameId: 'lets-go-pikachu',
		exclusivePokemonIds: VERSION_EXCLUSIVE_IDS['lets-go-eevee'],
	},
};

const REGIONAL_DEX_KEYS_CACHE = new Map<GameMetadata, readonly RegionalDexKey[]>();

export function getRegionalDexKeys(game: GameMetadata): readonly RegionalDexKey[] {
	let keys = REGIONAL_DEX_KEYS_CACHE.get(game);
	if (!keys) {
		keys = Object.freeze([game.regionalDexKey, ...(game.additionalRegionalDexKeys ?? [])]);
		REGIONAL_DEX_KEYS_CACHE.set(game, keys);
	}
	return keys;
}
