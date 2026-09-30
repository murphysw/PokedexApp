import { useState } from 'react';
import { Image } from 'expo-image';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams, type Href } from 'expo-router';

import moveData from '../../assets/data/moves.json';
import pokemonData from '../../assets/data/pokemon.json';
import { GAMES, GAME_IDS } from '../../constants/games';
import { useAppContext } from '../../context/AppContext';
import { TypeMatchupCard, type PokemonType, type TypeSelection } from '../tools/type-matchup';
import { MaxContentWidth, Spacing } from '../../src/constants/theme';
import { useTheme } from '../../src/hooks/use-theme';

type StatKey = 'hp' | 'atk' | 'def' | 'spa' | 'spdef' | 'spe';
type StatBlock = Record<StatKey, number>;

type EvolutionDetail = {
	trigger: string | null;
	min_level: number | null;
	item: string | null;
	held_item: string | null;
	time_of_day: string;
	known_move: string | null;
	known_move_type: string | null;
	location: string | null;
	gender: number | null;
	min_happiness: number | null;
	min_affection: number | null;
	min_beauty: number | null;
	party_species: string | null;
	party_type: string | null;
	relative_physical_stats: number | null;
	trade_species: string | null;
	needs_overworld_rain: boolean;
	turn_upside_down: boolean;
	version_group: string | null;
};

type PokemonRecord = {
	id: number;
	name: string;
	nationalNo: number;
	localDexNumbers: Record<string, number>;
	types: string[];
	abilities: { name: string; isHidden: boolean; description: string }[];
	baseStats: StatBlock;
	megaForms: {
		id: number;
		name: string;
		statOverrides: Partial<StatBlock>;
	}[];
	evolvesFrom: { id: number; name: string } | null;
	evolutionDetails: EvolutionDetail[];
	evolutions: { id: number; name: string; details: EvolutionDetail[] }[];
	locations: {
		locationAreaId: number;
		locationArea: string;
		versionGroups: string[];
	}[];
};

type MoveRecord = {
	id: number;
	name: string;
	type: string;
	category: 'physical' | 'special' | 'status';
	power: number | null;
	accuracy: number | null;
	pp: number;
	description: string;
	effects?: { short?: string; full?: string };
	learnedBy: {
		pokemonId: number;
		versionGroupDetails: {
			version_group: string;
			level_learned_at: number;
			learn_method: string;
		}[];
	}[];
};

type SectionKey = 'stats' | 'forms' | 'abilities' | 'evolution' | 'locations' | 'moves';
type LearnableMove = {
	move: MoveRecord;
	detail: MoveRecord['learnedBy'][number]['versionGroupDetails'][number];
};

type MoveFilter = 'all' | 'level-up' | 'tm' | 'tutor';

const POKEMON_RECORDS = pokemonData as unknown as PokemonRecord[];
const POKEMON_BY_ID = new Map(POKEMON_RECORDS.map((entry) => [entry.id, entry]));
const MOVE_RECORDS = moveData as unknown as MoveRecord[];
const spriteContext = require.context('../../assets/sprites', false, /\.png$/);
const SPRITE_BY_ID = new Map<number, number>();
for (const assetPath of spriteContext.keys()) {
	const spriteId = Number(assetPath.match(/(\d+)\.png$/)?.[1]);
	if (Number.isInteger(spriteId)) SPRITE_BY_ID.set(spriteId, spriteContext(assetPath));
}
const DEX_GENERATIONS: Record<string, number> = {
	kanto: 1,
	'original-johto': 2,
	'updated-johto': 2,
	hoenn: 3,
	'updated-hoenn': 3,
	'original-sinnoh': 4,
	'extended-sinnoh': 4,
	'original-unova': 5,
	'updated-unova': 5,
	'kalos-central': 6,
	'kalos-coastal': 6,
	'kalos-mountain': 6,
	'original-alola': 7,
	'updated-alola': 7,
	'letsgo-kanto': 7,
};
const STAT_ROWS: { key: StatKey; label: string; color: string }[] = [
	{ key: 'hp', label: 'HP', color: '#BE5543' },
	{ key: 'atk', label: 'Attack', color: '#C48337' },
	{ key: 'def', label: 'Defense', color: '#B49A37' },
	{ key: 'spa', label: 'Sp. Atk', color: '#477FA8' },
	{ key: 'spdef', label: 'Sp. Def', color: '#4E8B70' },
	{ key: 'spe', label: 'Speed', color: '#9163A4' },
];
const SECTIONS: { key: SectionKey; label: string }[] = [
	{ key: 'stats', label: 'Base Stats' },
	{ key: 'forms', label: 'Mega Forms' },
	{ key: 'abilities', label: 'Abilities' },
	{ key: 'evolution', label: 'Evolution' },
	{ key: 'locations', label: 'Locations' },
	{ key: 'moves', label: 'Moves' },
];

function titleCase(value: string) {
	return value
		.split('-')
		.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
		.join(' ');
}

type EvolutionStep = { pokemon: PokemonRecord; details: EvolutionDetail[]; parentName: string };

function getEvolutionLine(pokemon: PokemonRecord) {
	const ancestors: PokemonRecord[] = [pokemon];
	let root = pokemon;
	while (root.evolvesFrom) {
		const parent = POKEMON_BY_ID.get(root.evolvesFrom.id);
		if (!parent || ancestors.some((entry) => entry.id === parent.id)) break;
		ancestors.unshift(parent);
		root = parent;
	}

	const steps: EvolutionStep[] = ancestors.slice(1).map((entry, index) => ({
		pokemon: entry,
		details: entry.evolutionDetails,
		parentName: ancestors[index].name,
	}));
	const visited = new Set(ancestors.map((entry) => entry.id));
	const visitDescendants = (parent: PokemonRecord) => {
		for (const edge of parent.evolutions) {
			const child = POKEMON_BY_ID.get(edge.id);
			if (!child || visited.has(child.id)) continue;
			visited.add(child.id);
			steps.push({ pokemon: child, details: edge.details, parentName: parent.name });
			visitDescendants(child);
		}
	};
	visitDescendants(pokemon);
	return { root, steps };
}

function describeEvolution(detail: EvolutionDetail) {
	const conditions: string[] = [];
	if (detail.trigger) conditions.push(titleCase(detail.trigger));
	if (detail.min_level !== null) conditions.push(`Level ${detail.min_level} or higher`);
	if (detail.item) conditions.push(`Use ${titleCase(detail.item)}`);
	if (detail.held_item) conditions.push(`Hold ${titleCase(detail.held_item)}`);
	if (detail.time_of_day) conditions.push(`${titleCase(detail.time_of_day)} time`);
	if (detail.known_move) conditions.push(`Know ${titleCase(detail.known_move)}`);
	if (detail.known_move_type) conditions.push(`Know a ${titleCase(detail.known_move_type)} move`);
	if (detail.location) conditions.push(`At ${titleCase(detail.location)}`);
	if (detail.gender === 1) conditions.push('Female');
	if (detail.gender === 2) conditions.push('Male');
	if (detail.min_happiness !== null) conditions.push(`Friendship ${detail.min_happiness}+`);
	if (detail.min_affection !== null) conditions.push(`Affection ${detail.min_affection}+`);
	if (detail.min_beauty !== null) conditions.push(`Beauty ${detail.min_beauty}+`);
	if (detail.party_species) conditions.push(`${titleCase(detail.party_species)} in party`);
	if (detail.party_type) conditions.push(`${titleCase(detail.party_type)} type in party`);
	if (detail.trade_species) conditions.push(`Trade for ${titleCase(detail.trade_species)}`);
	if (detail.relative_physical_stats === 1) conditions.push('Attack higher than Defense');
	if (detail.relative_physical_stats === -1) conditions.push('Defense higher than Attack');
	if (detail.relative_physical_stats === 0) conditions.push('Attack equals Defense');
	if (detail.needs_overworld_rain) conditions.push('Rain in the overworld');
	if (detail.turn_upside_down) conditions.push('Turn the device upside down');
	if (detail.version_group) conditions.push(`In ${titleCase(detail.version_group)}`);
	return conditions.length ? conditions.join(' · ') : 'No additional condition listed';
}

function LearnMethodLabel({ detail }: { detail: LearnableMove['detail'] }) {
	if (detail.learn_method === 'level-up') return <Text>Level {detail.level_learned_at}</Text>;
	if (detail.learn_method === 'tm') return <Text>TM / machine</Text>;
	if (detail.learn_method === 'tutor') return <Text>Tutor</Text>;
	return <Text>{titleCase(detail.learn_method)}</Text>;
}

function StatBars({ stats, baseStats, theme }: { stats: StatBlock; baseStats: StatBlock; theme: ReturnType<typeof useTheme> }) {
	const total = STAT_ROWS.reduce((sum, stat) => sum + stats[stat.key], 0);
	return (
		<View>
			<View style={styles.totalRow}>
				<Text style={[styles.totalLabel, { color: theme.textSecondary }]}>TOTAL</Text>
				<Text style={[styles.totalValue, { color: theme.text }]}>{total}</Text>
			</View>
			{STAT_ROWS.map(({ key, label, color }) => {
				const value = stats[key];
				const change = value - baseStats[key];
				return (
					<View key={key} style={styles.statRow}>
						<Text style={[styles.statLabel, { color: theme.textSecondary }]}>{label}</Text>
						<View style={[styles.statTrack, { backgroundColor: theme.backgroundSelected }]}>
							<View style={[styles.statFill, { width: `${Math.min(value / 255, 1) * 100}%`, backgroundColor: color }]} />
						</View>
						<Text style={[styles.statValue, { color: theme.text }]}>{value}</Text>
						{change !== 0 && (
							<Text style={[styles.statChange, { color: change > 0 ? '#338064' : '#AE4A40' }]}>
								{change > 0 ? '+' : ''}{change}
							</Text>
						)}
					</View>
				);
			})}
		</View>
	);
}

export default function PokemonDetailScreen() {
	const theme = useTheme();
	const { activeGame } = useAppContext();
	const { id, listMode: routeListMode, regionKey: routeRegionKey } = useLocalSearchParams<{
		id?: string | string[];
		listMode?: string | string[];
		regionKey?: string | string[];
	}>();
	const routeId = Array.isArray(id) ? id[0] : id;
	const listModeParam = Array.isArray(routeListMode) ? routeListMode[0] : routeListMode;
	const regionKeyParam = Array.isArray(routeRegionKey) ? routeRegionKey[0] : routeRegionKey;
	const listMode = listModeParam === 'national' ? 'national' : 'local';
	const pokemonId = Number(routeId);
	const pokemon = Number.isInteger(pokemonId)
		? POKEMON_RECORDS.find((record) => record.id === pokemonId)
		: undefined;
	const validGameId = GAME_IDS.find((gameId) => gameId === activeGame) ?? 'soulsilver';
	const game = GAMES[validGameId];
	const [section, setSection] = useState<SectionKey>('stats');
	const [selectedMegaId, setSelectedMegaId] = useState<number | null>(null);
	const [selectedMove, setSelectedMove] = useState<LearnableMove | null>(null);
	const [matchupVisible, setMatchupVisible] = useState(false);
	const [selectedGeneration, setSelectedGeneration] = useState<{ pokemonId: number; gameId: string; listMode: string; generation: number } | null>(null);
	const [moveFilter, setMoveFilter] = useState<MoveFilter>('all');
	const selectedMega = pokemon?.megaForms.find((form) => form.id === selectedMegaId);
	const displayedStats = pokemon
		? { ...pokemon.baseStats, ...(selectedMega?.statOverrides ?? {}) }
		: undefined;
	const learnableMoves: LearnableMove[] = pokemon
		? MOVE_RECORDS.flatMap((move) => {
			const learnedByPokemon = move.learnedBy.find((entry) => entry.pokemonId === pokemon.id);
			return (learnedByPokemon?.versionGroupDetails ?? [])
				.filter((detail) => detail.version_group === game.versionGroupEngineKey)
				.map((detail) => ({ move, detail }));
		}).sort((first, second) => {
			const methodOrder = (method: string) => method === 'level-up' ? 0 : method === 'tm' ? 1 : method === 'tutor' ? 2 : 3;
			return methodOrder(first.detail.learn_method) - methodOrder(second.detail.learn_method)
				|| first.detail.level_learned_at - second.detail.level_learned_at
				|| first.move.name.localeCompare(second.move.name);
		})
		: [];
	const gameLocations = pokemon?.locations.filter((location) =>
		location.versionGroups.includes(game.versionGroupEngineKey),
	) ?? [];
	const dexEntries = pokemon
		? Object.entries(pokemon.localDexNumbers)
			.filter(([key]) => DEX_GENERATIONS[key] !== undefined)
			.map(([key, number]) => ({ key, number, generation: DEX_GENERATIONS[key] }))
			.sort((first, second) => first.generation - second.generation || first.number - second.number)
		: [];
	const preferredRegion = listMode === 'local' && regionKeyParam && pokemon?.localDexNumbers[regionKeyParam] !== undefined
		? regionKeyParam
		: listMode === 'local' && pokemon?.localDexNumbers[game.regionalDexKey] !== undefined
			? game.regionalDexKey
			: dexEntries[0]?.key;
	const defaultGeneration = preferredRegion ? DEX_GENERATIONS[preferredRegion] : dexEntries[0]?.generation;
	const activeGeneration = selectedGeneration
		&& selectedGeneration.pokemonId === pokemon?.id
		&& selectedGeneration.gameId === validGameId
		&& selectedGeneration.listMode === listMode
		? selectedGeneration.generation
		: defaultGeneration;
	const selectedDexEntry = dexEntries.find((entry) => entry.key === preferredRegion && entry.generation === activeGeneration)
		?? dexEntries.find((entry) => entry.generation === activeGeneration)
		?? dexEntries[0];
	const availableGenerations = [...new Set(dexEntries.map((entry) => entry.generation))];
	const evolutionLine = pokemon ? getEvolutionLine(pokemon) : undefined;
	const activeListRegion = listMode === 'local' && regionKeyParam && DEX_GENERATIONS[regionKeyParam]
		? regionKeyParam
		: game.regionalDexKey;
	const navigationRoster = listMode === 'local'
		? POKEMON_RECORDS.filter((entry) => entry.localDexNumbers[activeListRegion] !== undefined)
			.sort((first, second) => first.localDexNumbers[activeListRegion] - second.localDexNumbers[activeListRegion])
		: POKEMON_RECORDS;
	const navigationIndex = pokemon ? navigationRoster.findIndex((entry) => entry.id === pokemon.id) : -1;
	const previousPokemon = navigationIndex > 0 ? navigationRoster[navigationIndex - 1] : undefined;
	const nextPokemon = navigationIndex >= 0 ? navigationRoster[navigationIndex + 1] : undefined;
	const visibleMoves = moveFilter === 'all'
		? learnableMoves
		: learnableMoves.filter(({ detail }) => detail.learn_method === moveFilter);
	const typeSelection: TypeSelection | undefined = pokemon?.types.length
		? pokemon.types.length > 1
			? [pokemon.types[0] as PokemonType, pokemon.types[1] as PokemonType]
			: [pokemon.types[0] as PokemonType]
		: undefined;

	const navigateToPokemon = (targetId: number) => router.push({
		pathname: '/pokemon/[id]',
		params: {
			id: String(targetId),
			listMode,
			regionKey: listMode === 'local' ? activeListRegion : '',
		},
	});

	if (!pokemon || !displayedStats) {
		return (
			<SafeAreaView style={[styles.screen, styles.centered, { backgroundColor: theme.background }]}>
				<Text style={[styles.title, { color: theme.text }]}>Pokémon not found</Text>
				<Text style={[styles.body, { color: theme.textSecondary }]}>No National Pokédex entry matches this ID.</Text>
			</SafeAreaView>
		);
	}

	return (
		<SafeAreaView style={[styles.screen, { backgroundColor: theme.background }]}>
			<ScrollView contentContainerStyle={styles.pageContent} showsVerticalScrollIndicator={false}>
				<View style={styles.hero}>
					<View style={[styles.heroSpriteFrame, { backgroundColor: theme.backgroundElement }]}>
						{SPRITE_BY_ID.get(pokemon.id)
							? <Image source={SPRITE_BY_ID.get(pokemon.id)!} style={styles.heroSprite} contentFit="contain" accessibilityLabel={`${titleCase(pokemon.name)} sprite`} />
							: <Text style={[styles.heroSpriteFallback, { color: theme.textSecondary }]}>{pokemon.nationalNo}</Text>}
					</View>
					<View style={styles.header}>
						<Text style={[styles.eyebrow, { color: theme.textSecondary }]}>{game.displayName} · National #{String(pokemon.nationalNo).padStart(3, '0')}</Text>
						<Text style={[styles.title, { color: theme.text }]}>{titleCase(pokemon.name)}</Text>
						{selectedDexEntry && (
							<Text style={[styles.regionNumber, { color: theme.textSecondary }]}>
								Gen {selectedDexEntry.generation} · {titleCase(selectedDexEntry.key)} #{String(selectedDexEntry.number).padStart(3, '0')}
							</Text>
						)}
						<View style={styles.typeRow}>
							{pokemon.types.map((type) => (
								<Pressable
									key={type}
									accessibilityRole="button"
									accessibilityLabel={`Show ${type} type matchup`}
									onPress={() => setMatchupVisible(true)}
									style={({ pressed }) => [styles.typePill, { backgroundColor: theme.backgroundElement, opacity: pressed ? 0.7 : 1 }]}>
									<Text style={[styles.typePillText, { color: theme.text }]}>{titleCase(type)}</Text>
								</Pressable>
							))}
						</View>
					</View>
				</View>
				{availableGenerations.length > 1 && (
					<View style={styles.regionSelector}>
						<Text style={[styles.regionSelectorLabel, { color: theme.textSecondary }]}>DEX NUMBER</Text>
						<View style={styles.regionOptions} accessibilityRole="radiogroup" accessibilityLabel="Pokédex generation for the displayed number">
							{availableGenerations.map((generation) => {
								const selected = generation === activeGeneration;
								return (
									<Pressable
										key={generation}
										accessibilityRole="radio"
										accessibilityState={{ checked: selected }}
										onPress={() => setSelectedGeneration({ pokemonId: pokemon.id, gameId: validGameId, listMode, generation })}
										style={[styles.regionOption, { backgroundColor: selected ? theme.text : theme.backgroundElement }]}>
										<Text style={[styles.regionOptionText, { color: selected ? theme.background : theme.text }]}>{generation}</Text>
									</Pressable>
								);
							})}
						</View>
					</View>
				)}

				<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sectionTabs}>
					{SECTIONS.map((item) => (
						<Pressable
							key={item.key}
							accessibilityRole="tab"
							accessibilityState={{ selected: section === item.key }}
							onPress={() => setSection(item.key)}
							style={({ pressed }) => [
								styles.sectionTab,
								{ backgroundColor: section === item.key ? theme.text : theme.backgroundElement, opacity: pressed ? 0.75 : 1 },
							]}>
							<Text style={[styles.sectionTabText, { color: section === item.key ? theme.background : theme.text }]}>{item.label}</Text>
						</Pressable>
					))}
				</ScrollView>

				<View style={[styles.sectionPanel, { backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected }]}>
					{section === 'stats' && (
						<View style={styles.sectionContent}>
							<SectionHeading title="Base stats" detail="National Dex record" theme={theme} />
							<StatBars stats={pokemon.baseStats} baseStats={pokemon.baseStats} theme={theme} />
						</View>
					)}

					{section === 'forms' && (
						<View style={styles.sectionContent}>
							<SectionHeading title="Mega forms" detail="Compare each form with the base stats" theme={theme} />
							<View style={styles.formChoices}>
								<FormChoice label="Base form" selected={selectedMegaId === null} onPress={() => setSelectedMegaId(null)} theme={theme} />
								{pokemon.megaForms.map((form) => (
									<FormChoice key={form.id} label={titleCase(form.name)} selected={selectedMegaId === form.id} onPress={() => setSelectedMegaId(form.id)} theme={theme} />
								))}
							</View>
							{pokemon.megaForms.length ? (
								<>
									<Text style={[styles.formName, { color: theme.text }]}>{selectedMega ? titleCase(selectedMega.name) : titleCase(pokemon.name)}</Text>
									<View style={[styles.formSpriteFrame, { backgroundColor: theme.background }]}>
										{SPRITE_BY_ID.get(selectedMega?.id ?? pokemon.id)
											? <Image source={SPRITE_BY_ID.get(selectedMega?.id ?? pokemon.id)!} style={styles.formSprite} contentFit="contain" accessibilityLabel={`${titleCase(selectedMega?.name ?? pokemon.name)} sprite`} />
											: <Text style={[styles.heroSpriteFallback, { color: theme.textSecondary }]}>{selectedMega?.id ?? pokemon.nationalNo}</Text>}
									</View>
									<StatBars stats={displayedStats} baseStats={pokemon.baseStats} theme={theme} />
								</>
							) : <EmptyState text="This Pokémon has no Mega Evolutions." theme={theme} />}
						</View>
					)}

					{section === 'abilities' && (
						<View style={styles.sectionContent}>
							<SectionHeading title="Abilities" detail="Standard and hidden abilities" theme={theme} />
							{pokemon.abilities.length ? pokemon.abilities.map((ability) => (
								<View key={`${ability.name}-${ability.isHidden}`} style={[styles.abilityRow, { borderBottomColor: theme.backgroundSelected }]}>
									<View style={styles.abilityHeader}>
										<Text style={[styles.rowTitle, { color: theme.text }]}>{titleCase(ability.name)}</Text>
										{ability.isHidden && <Text style={styles.hiddenAbilityBadge}>HIDDEN</Text>}
									</View>
									<Text style={[styles.rowDetail, { color: theme.textSecondary }]}>{ability.description || 'No description available.'}</Text>
								</View>
							)) : <EmptyState text="No abilities are listed for this Pokémon." theme={theme} />}
						</View>
					)}

					{section === 'evolution' && (
						<View style={styles.sectionContent}>
							<SectionHeading title="Evolution line" detail="Select a Pokémon to open its details; conditions appear between stages." theme={theme} />
							{evolutionLine && (pokemon.evolvesFrom || pokemon.evolutions.length) ? (
								<View style={styles.evolutionFlow}>
									<EvolutionLinkCard pokemon={evolutionLine.root} current={evolutionLine.root.id === pokemon.id} onPress={() => navigateToPokemon(evolutionLine.root.id)} theme={theme} />
									{evolutionLine.steps.map((step, index) => (
										<View key={`${step.parentName}-${step.pokemon.id}-${index}`} style={styles.evolutionStep}>
											<Text style={[styles.evolutionArrow, { color: theme.textSecondary }]}>↓</Text>
											<Text style={[styles.evolutionFrom, { color: theme.textSecondary }]}>From {titleCase(step.parentName)}</Text>
											{step.details.map((detail, detailIndex) => (
												<Text key={`${detail.trigger}-${detail.version_group}-${detailIndex}`} style={[styles.rowDetail, { color: theme.textSecondary }]}>{describeEvolution(detail)}</Text>
											))}
											<EvolutionLinkCard pokemon={step.pokemon} current={step.pokemon.id === pokemon.id} onPress={() => navigateToPokemon(step.pokemon.id)} theme={theme} />
										</View>
									))}
								</View>
							) : <EmptyState text="No other species are listed in this evolution line." theme={theme} />}
						</View>
					)}

					{section === 'locations' && (
						<View style={styles.sectionContent}>
							<SectionHeading title="Location areas" detail={`Filtered for ${game.displayName}`} theme={theme} />
							{gameLocations.length ? gameLocations.map((location) => (
								<View key={location.locationAreaId} style={[styles.listRow, { borderBottomColor: theme.backgroundSelected }]}>
									<View style={styles.listCopy}>
										<Text style={[styles.rowTitle, { color: theme.text }]}>{titleCase(location.locationArea)}</Text>
										<Text style={[styles.rowDetail, { color: theme.textSecondary }]}>{game.versionGroupEngineKey}</Text>
									</View>
									<Text style={[styles.rowId, { color: theme.textSecondary }]}>#{location.locationAreaId}</Text>
								</View>
							)) : <EmptyState text={`No encounter areas are recorded for ${game.displayName}.`} theme={theme} />}
						</View>
					)}

					{section === 'moves' && (
						<View style={styles.sectionContent}>
							<SectionHeading title="Learnable moves" detail={`${game.displayName} engine · ${game.versionGroupEngineKey}`} theme={theme} />
							<View style={styles.methodFilter} accessibilityRole="radiogroup" accessibilityLabel="Move learn method">
								{([
									{ value: 'all', label: 'All' },
									{ value: 'level-up', label: 'Level-up' },
									{ value: 'tm', label: 'TM' },
									{ value: 'tutor', label: 'Tutor' },
								] as const).map((option) => {
									const selected = moveFilter === option.value;
									return (
										<Pressable
											key={option.value}
											accessibilityRole="radio"
											accessibilityState={{ checked: selected }}
											onPress={() => setMoveFilter(option.value)}
											style={[styles.methodFilterButton, { backgroundColor: selected ? theme.text : theme.background, borderColor: selected ? theme.text : theme.backgroundSelected }]}>
											<Text style={[styles.methodFilterText, { color: selected ? theme.background : theme.text }]}>{option.label}</Text>
										</Pressable>
									);
								})}
							</View>
							{visibleMoves.length ? visibleMoves.map((learnable, index) => (
								<Pressable
									key={`${learnable.move.id}-${learnable.detail.learn_method}-${learnable.detail.level_learned_at}-${index}`}
									accessibilityRole="button"
									accessibilityLabel={`${titleCase(learnable.move.name)}, ${learnable.detail.learn_method}`}
									onPress={() => setSelectedMove(learnable)}
									style={({ pressed }) => [styles.listRow, { borderBottomColor: theme.backgroundSelected, opacity: pressed ? 0.7 : 1 }]}>
									<View style={styles.listCopy}>
										<Text style={[styles.rowTitle, { color: theme.text }]}>{titleCase(learnable.move.name)}</Text>
										<View style={styles.moveMeta}>
											<Text style={[styles.moveType, { backgroundColor: theme.backgroundSelected, color: theme.text }]}>{titleCase(learnable.move.type)}</Text>
											<Text style={[styles.rowDetail, { color: theme.textSecondary }]}><LearnMethodLabel detail={learnable.detail} /></Text>
										</View>
									</View>
									<Text style={[styles.rowChevron, { color: theme.textSecondary }]}>›</Text>
								</Pressable>
							)) : <EmptyState text={`No ${moveFilter === 'all' ? '' : `${titleCase(moveFilter)} `}moves are listed for ${game.displayName}.`} theme={theme} />}
						</View>
					)}
				</View>

				<View style={[styles.dexNavigation, { borderTopColor: theme.backgroundSelected }]}>
					<Pressable
						disabled={!previousPokemon}
						accessibilityRole="button"
						accessibilityLabel={previousPokemon ? `Previous Pokémon: ${titleCase(previousPokemon.name)}` : 'No previous Pokémon'}
						onPress={() => previousPokemon && navigateToPokemon(previousPokemon.id)}
						style={({ pressed }) => [styles.dexNavButton, { opacity: previousPokemon ? pressed ? 0.65 : 1 : 0.35 }]}>
						<Text style={[styles.dexNavLabel, { color: theme.textSecondary }]}>PREVIOUS</Text>
						<Text style={[styles.dexNavName, { color: theme.text }]} numberOfLines={1}>{previousPokemon ? titleCase(previousPokemon.name) : '—'}</Text>
					</Pressable>
					<Pressable accessibilityRole="button" onPress={() => router.replace('/' as Href)} style={[styles.dexListButton, { backgroundColor: theme.text }]}>
						<Text style={[styles.dexListButtonText, { color: theme.background }]}>Back to list</Text>
					</Pressable>
					<Pressable
						disabled={!nextPokemon}
						accessibilityRole="button"
						accessibilityLabel={nextPokemon ? `Next Pokémon: ${titleCase(nextPokemon.name)}` : 'No next Pokémon'}
						onPress={() => nextPokemon && navigateToPokemon(nextPokemon.id)}
						style={({ pressed }) => [styles.dexNavButton, styles.dexNavEnd, { opacity: nextPokemon ? pressed ? 0.65 : 1 : 0.35 }]}>
						<Text style={[styles.dexNavLabel, { color: theme.textSecondary }]}>NEXT</Text>
						<Text style={[styles.dexNavName, { color: theme.text }]} numberOfLines={1}>{nextPokemon ? titleCase(nextPokemon.name) : '—'}</Text>
					</Pressable>
				</View>
			</ScrollView>

			<TypeMatchupModal visible={matchupVisible} types={typeSelection} onClose={() => setMatchupVisible(false)} theme={theme} />
			<MoveModal move={selectedMove?.move ?? null} onClose={() => setSelectedMove(null)} theme={theme} />
		</SafeAreaView>
	);
}

function SectionHeading({ title, detail, theme }: { title: string; detail: string; theme: ReturnType<typeof useTheme> }) {
	return (
		<View style={styles.sectionHeading}>
			<Text style={[styles.sectionTitle, { color: theme.text }]}>{title}</Text>
			<Text style={[styles.sectionDetail, { color: theme.textSecondary }]}>{detail}</Text>
		</View>
	);
}

function FormChoice({ label, selected, onPress, theme }: { label: string; selected: boolean; onPress: () => void; theme: ReturnType<typeof useTheme> }) {
	return (
		<Pressable
			accessibilityRole="button"
			accessibilityState={{ selected }}
			onPress={onPress}
			style={({ pressed }) => [
				styles.formChoice,
				{ backgroundColor: selected ? theme.text : theme.background, borderColor: selected ? theme.text : theme.backgroundSelected, opacity: pressed ? 0.75 : 1 },
			]}>
			<Text style={[styles.formChoiceText, { color: selected ? theme.background : theme.text }]}>{label}</Text>
		</Pressable>
	);
}

function EvolutionLinkCard({ pokemon, current, onPress, theme }: { pokemon: PokemonRecord; current: boolean; onPress: () => void; theme: ReturnType<typeof useTheme> }) {
	return (
		<Pressable
			accessibilityRole="link"
			accessibilityLabel={`Open ${titleCase(pokemon.name)} details`}
			disabled={current}
			onPress={onPress}
			style={({ pressed }) => [styles.evolutionCard, { backgroundColor: theme.backgroundElement, borderColor: current ? theme.text : theme.backgroundSelected, opacity: pressed ? 0.7 : 1 }]}>
			{SPRITE_BY_ID.get(pokemon.id)
				? <Image source={SPRITE_BY_ID.get(pokemon.id)!} style={styles.evolutionSprite} contentFit="contain" accessibilityLabel={`${titleCase(pokemon.name)} sprite`} />
				: <View style={styles.evolutionSpriteFallback}><Text style={[styles.rowId, { color: theme.textSecondary }]}>{pokemon.nationalNo}</Text></View>}
			<View style={styles.listCopy}>
				{current && <Text style={[styles.currentNodeLabel, { color: theme.textSecondary }]}>CURRENT POKÉMON</Text>}
				<Text style={[styles.rowTitle, { color: theme.text }]}>{titleCase(pokemon.name)}</Text>
				<Text style={[styles.rowDetail, { color: theme.textSecondary }]}>National #{String(pokemon.nationalNo).padStart(3, '0')}</Text>
			</View>
			{!current && <Text style={[styles.rowChevron, { color: theme.textSecondary }]}>›</Text>}
		</Pressable>
	);
}

function EmptyState({ text, theme }: { text: string; theme: ReturnType<typeof useTheme> }) {
	return <Text style={[styles.emptyState, { color: theme.textSecondary }]}>{text}</Text>;
}

function TypeMatchupModal({
	visible,
	types,
	onClose,
	theme,
}: {
	visible: boolean;
	types?: TypeSelection;
	onClose: () => void;
	theme: ReturnType<typeof useTheme>;
}) {
	return (
		<Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
			<View style={styles.modalBackdrop}>
				<Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close type matchup" />
				<View style={[styles.typeModalSheet, { backgroundColor: theme.background, borderColor: theme.backgroundSelected }]}>
					<View style={styles.modalHeader}>
						<View style={styles.listCopy}>
							<Text style={[styles.eyebrow, { color: theme.textSecondary }]}>DEFENSIVE PROFILE</Text>
							<Text style={[styles.modalTitle, { color: theme.text }]}>Type matchup</Text>
						</View>
						<Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close type matchup" style={[styles.closeButton, { backgroundColor: theme.backgroundElement }]}>
							<Text style={[styles.closeText, { color: theme.text }]}>Close</Text>
						</Pressable>
					</View>
					{types && <TypeMatchupCard types={types} mode="defense" title="Damage taken" />}
				</View>
			</View>
		</Modal>
	);
}

function MoveModal({ move, onClose, theme }: { move: MoveRecord | null; onClose: () => void; theme: ReturnType<typeof useTheme> }) {
	const effectDescription = move?.effects?.full || move?.effects?.short || move?.description || 'No effect description is available.';
	return (
		<Modal visible={move !== null} transparent animationType="slide" onRequestClose={onClose}>
			<View style={styles.modalBackdrop}>
				<Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close move details" />
				<View style={[styles.modalSheet, { backgroundColor: theme.background, borderColor: theme.backgroundSelected }]}>
					{move && (
						<ScrollView contentContainerStyle={styles.modalContent}>
							<View style={styles.modalHeader}>
								<View style={styles.listCopy}>
									<Text style={[styles.eyebrow, { color: theme.textSecondary }]}>MOVE DETAILS</Text>
									<Text style={[styles.modalTitle, { color: theme.text }]}>{titleCase(move.name)}</Text>
								</View>
								<Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close move details" style={[styles.closeButton, { backgroundColor: theme.backgroundElement }]}>
									<Text style={[styles.closeText, { color: theme.text }]}>Close</Text>
								</Pressable>
							</View>
							<View style={styles.moveFacts}>
								<MoveFact label="Type" value={titleCase(move.type)} theme={theme} />
								<MoveFact label="Category" value={titleCase(move.category)} theme={theme} />
								<MoveFact label="Power" value={move.power === null ? '—' : String(move.power)} theme={theme} />
								<MoveFact label="Accuracy" value={move.accuracy === null ? '—' : `${move.accuracy}%`} theme={theme} />
								<MoveFact label="PP" value={String(move.pp)} theme={theme} />
							</View>
							<View style={[styles.effectBox, { backgroundColor: theme.backgroundElement }]}>
								<Text style={[styles.factLabel, { color: theme.textSecondary }]}>EFFECT</Text>
								<Text style={[styles.effectText, { color: theme.text }]}>{effectDescription}</Text>
							</View>
						</ScrollView>
					)}
				</View>
			</View>
		</Modal>
	);
}

function MoveFact({ label, value, theme }: { label: string; value: string; theme: ReturnType<typeof useTheme> }) {
	return (
		<View style={[styles.moveFact, { backgroundColor: theme.backgroundElement }]}>
			<Text style={[styles.factLabel, { color: theme.textSecondary }]}>{label}</Text>
			<Text style={[styles.factValue, { color: theme.text }]}>{value}</Text>
		</View>
	);
}

const styles = StyleSheet.create({
	screen: { flex: 1 },
	centered: { justifyContent: 'center', alignItems: 'center', padding: Spacing.four, gap: Spacing.two },
	pageContent: {
		width: '100%',
		maxWidth: MaxContentWidth,
		alignSelf: 'center',
		paddingHorizontal: Spacing.three,
		paddingTop: Spacing.three,
		paddingBottom: Spacing.six,
		gap: Spacing.three,
	},
	hero: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
	heroSpriteFrame: { width: 112, height: 112, alignItems: 'center', justifyContent: 'center', borderRadius: 8 },
	heroSprite: { width: 104, height: 104 },
	heroSpriteFallback: { fontSize: 18, fontWeight: '700' },
	header: { flex: 1, minWidth: 0, gap: Spacing.one, paddingBottom: Spacing.one },
	eyebrow: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
	title: { fontSize: 30, lineHeight: 38, fontWeight: '700' },
	body: { fontSize: 15, lineHeight: 22, textAlign: 'center' },
	typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two, marginTop: Spacing.one },
	typePill: { paddingHorizontal: Spacing.two, paddingVertical: Spacing.one, borderRadius: 4 },
	typePillText: { fontSize: 12, fontWeight: '700' },
	regionNumber: { fontSize: 12, fontWeight: '600' },
	regionSelector: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
	regionSelectorLabel: { fontSize: 10, fontWeight: '700' },
	regionOptions: { flexDirection: 'row', gap: Spacing.one },
	regionOption: { minWidth: 32, minHeight: 32, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.two, borderRadius: 4 },
	regionOptionText: { fontSize: 12, fontWeight: '700' },
	sectionTabs: { gap: Spacing.two, paddingVertical: Spacing.one },
	sectionTab: { minHeight: 38, justifyContent: 'center', paddingHorizontal: Spacing.three, borderRadius: 5 },
	sectionTabText: { fontSize: 13, fontWeight: '700' },
	sectionPanel: { borderWidth: 1, borderRadius: 7, padding: Spacing.three },
	sectionContent: { gap: Spacing.three },
	sectionHeading: { gap: Spacing.one, paddingBottom: Spacing.one },
	sectionTitle: { fontSize: 20, lineHeight: 26, fontWeight: '700' },
	sectionDetail: { fontSize: 12, lineHeight: 18 },
	totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: Spacing.two },
	totalLabel: { fontSize: 11, fontWeight: '700' },
	totalValue: { fontSize: 18, fontWeight: '700' },
	statRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, minHeight: 32 },
	statLabel: { width: 62, fontSize: 12 },
	statTrack: { flex: 1, height: 8, borderRadius: 4, overflow: 'hidden' },
	statFill: { height: '100%', borderRadius: 4 },
	statValue: { width: 30, fontSize: 13, fontWeight: '700', textAlign: 'right' },
	statChange: { width: 34, fontSize: 11, fontWeight: '700', textAlign: 'right' },
	formChoices: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
	formChoice: { minHeight: 38, justifyContent: 'center', paddingHorizontal: Spacing.two, borderWidth: 1, borderRadius: 5 },
	formChoiceText: { fontSize: 12, fontWeight: '700' },
	formName: { fontSize: 16, fontWeight: '700' },
	formSpriteFrame: { width: 120, height: 120, alignSelf: 'center', alignItems: 'center', justifyContent: 'center', borderRadius: 6 },
	formSprite: { width: 112, height: 112 },
	abilityRow: { gap: Spacing.two, borderBottomWidth: StyleSheet.hairlineWidth, paddingVertical: Spacing.two },
	abilityHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
	hiddenAbilityBadge: { overflow: 'hidden', paddingHorizontal: 6, paddingVertical: 3, borderRadius: 3, backgroundColor: '#567691', color: '#FFFFFF', fontSize: 9, fontWeight: '800' },
	evolutionFlow: { gap: Spacing.one },
	evolutionStep: { alignItems: 'center', gap: Spacing.one, paddingVertical: Spacing.one },
	evolutionArrow: { fontSize: 20, lineHeight: 24 },
	evolutionFrom: { fontSize: 10, fontWeight: '600' },
	evolutionCard: { width: '100%', minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: Spacing.two, borderWidth: 1, borderRadius: 6, padding: Spacing.two },
	evolutionSprite: { width: 56, height: 56 },
	evolutionSpriteFallback: { width: 56, height: 56, alignItems: 'center', justifyContent: 'center' },
	currentNodeLabel: { fontSize: 10, fontWeight: '700' },
	emptyState: { fontSize: 14, lineHeight: 21, paddingVertical: Spacing.two },
	listRow: { minHeight: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two, borderBottomWidth: StyleSheet.hairlineWidth, paddingVertical: Spacing.two },
	listCopy: { flex: 1, gap: Spacing.one },
	rowTitle: { fontSize: 14, fontWeight: '700', textTransform: 'capitalize' },
	rowDetail: { fontSize: 12, lineHeight: 17 },
	rowId: { fontSize: 11 },
	methodFilter: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.one },
	methodFilterButton: { minHeight: 32, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.two, borderWidth: 1, borderRadius: 4 },
	methodFilterText: { fontSize: 11, fontWeight: '700' },
	dexNavigation: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, borderTopWidth: StyleSheet.hairlineWidth, paddingTop: Spacing.three },
	dexNavButton: { flex: 1, minWidth: 0, minHeight: 48, justifyContent: 'center', gap: Spacing.one },
	dexNavEnd: { alignItems: 'flex-end' },
	dexNavLabel: { fontSize: 9, fontWeight: '700' },
	dexNavName: { maxWidth: '100%', fontSize: 12, fontWeight: '700', textTransform: 'capitalize' },
	dexListButton: { minHeight: 38, justifyContent: 'center', paddingHorizontal: Spacing.two, borderRadius: 5 },
	dexListButtonText: { fontSize: 11, fontWeight: '700' },
	moveMeta: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: Spacing.two },
	moveType: { overflow: 'hidden', paddingHorizontal: Spacing.two, paddingVertical: Spacing.one, borderRadius: 3, fontSize: 10, fontWeight: '700' },
	rowChevron: { fontSize: 24, lineHeight: 28 },
	modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.48)' },
	modalSheet: { width: '100%', maxWidth: 680, maxHeight: '82%', alignSelf: 'center', borderWidth: 1, borderTopLeftRadius: 12, borderTopRightRadius: 12, overflow: 'hidden' },
	typeModalSheet: { width: '100%', maxWidth: 680, maxHeight: '88%', alignSelf: 'center', gap: Spacing.two, borderWidth: 1, borderTopLeftRadius: 12, borderTopRightRadius: 12, padding: Spacing.three, overflow: 'hidden' },
	modalContent: { padding: Spacing.three, gap: Spacing.three },
	modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: Spacing.two },
	modalTitle: { fontSize: 23, lineHeight: 29, fontWeight: '700', textTransform: 'capitalize' },
	closeButton: { minHeight: 38, justifyContent: 'center', paddingHorizontal: Spacing.two, borderRadius: 5 },
	closeText: { fontSize: 13, fontWeight: '700' },
	moveFacts: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
	moveFact: { flexGrow: 1, minWidth: 96, minHeight: 60, justifyContent: 'center', gap: Spacing.one, padding: Spacing.two, borderRadius: 5 },
	factLabel: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
	factValue: { fontSize: 14, fontWeight: '700' },
	effectBox: { gap: Spacing.two, padding: Spacing.three, borderRadius: 5 },
	effectText: { fontSize: 14, lineHeight: 21 },
});