export const POKEMON_TYPES = [
	'normal',
	'fire',
	'water',
	'electric',
	'grass',
	'ice',
	'fighting',
	'poison',
	'ground',
	'flying',
	'psychic',
	'bug',
	'rock',
	'ghost',
	'dragon',
	'dark',
	'steel',
	'fairy',
] as const;

export type PokemonType = (typeof POKEMON_TYPES)[number];

export const TYPE_COLORS: Record<string, string> = {
	normal: '#77766C',
	fire: '#BD5238',
	water: '#3477A8',
	electric: '#9A7700',
	grass: '#43834A',
	ice: '#438894',
	fighting: '#A33D32',
	poison: '#79458F',
	ground: '#947039',
	flying: '#626BA8',
	psychic: '#B74270',
	bug: '#68792B',
	rock: '#806F43',
	ghost: '#5F517D',
	dragon: '#5C4E9C',
	dark: '#58473D',
	steel: '#707080',
	fairy: '#9B5B78',
};

