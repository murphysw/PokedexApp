import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';

import moveData from '../../assets/data/moves.json';
import pokemonData from '../../assets/data/pokemon.json';
import { GAMES, GAME_IDS } from '../../constants/games';
import { useAppContext } from '../../context/AppContext';
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
	types: string[];
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

type SectionKey = 'stats' | 'forms' | 'evolution' | 'locations' | 'moves';
type LearnableMove = {
	move: MoveRecord;
	detail: MoveRecord['learnedBy'][number]['versionGroupDetails'][number];
};

const POKEMON_RECORDS = pokemonData as unknown as PokemonRecord[];
const MOVE_RECORDS = moveData as unknown as MoveRecord[];
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
	const { id } = useLocalSearchParams<{ id?: string | string[] }>();
	const routeId = Array.isArray(id) ? id[0] : id;
	const pokemonId = Number(routeId);
	const pokemon = Number.isInteger(pokemonId)
		? POKEMON_RECORDS.find((record) => record.id === pokemonId)
		: undefined;
	const validGameId = GAME_IDS.find((gameId) => gameId === activeGame) ?? 'soulsilver';
	const game = GAMES[validGameId];
	const [section, setSection] = useState<SectionKey>('stats');
	const [selectedMegaId, setSelectedMegaId] = useState<number | null>(null);
	const [selectedMove, setSelectedMove] = useState<LearnableMove | null>(null);
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
				<View style={styles.header}>
					<Text style={[styles.eyebrow, { color: theme.textSecondary }]}>{game.displayName} · #{String(pokemon.nationalNo).padStart(3, '0')}</Text>
					<Text style={[styles.title, { color: theme.text }]}>{titleCase(pokemon.name)}</Text>
					<View style={styles.typeRow}>
						{pokemon.types.map((type) => (
							<View key={type} style={[styles.typePill, { backgroundColor: theme.backgroundElement }]}>
								<Text style={[styles.typePillText, { color: theme.text }]}>{titleCase(type)}</Text>
							</View>
						))}
					</View>
				</View>

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
									<StatBars stats={displayedStats} baseStats={pokemon.baseStats} theme={theme} />
								</>
							) : <EmptyState text="This Pokémon has no Mega Evolutions." theme={theme} />}
						</View>
					)}

					{section === 'evolution' && (
						<View style={styles.sectionContent}>
							<SectionHeading title="Evolution line" detail="Conditions shown from the source data" theme={theme} />
							{pokemon.evolvesFrom && (
								<EvolutionNode title={`Evolves from ${titleCase(pokemon.evolvesFrom.name)}`} details={pokemon.evolutionDetails} theme={theme} />
							)}
							<View style={[styles.currentNode, { borderColor: theme.text }]}>
								<Text style={[styles.currentNodeLabel, { color: theme.textSecondary }]}>CURRENT POKÉMON</Text>
								<Text style={[styles.currentNodeName, { color: theme.text }]}>{titleCase(pokemon.name)}</Text>
							</View>
							{pokemon.evolutions.map((evolution) => (
								<EvolutionNode key={evolution.id} title={`Evolves into ${titleCase(evolution.name)}`} details={evolution.details} theme={theme} />
							))}
							{!pokemon.evolvesFrom && !pokemon.evolutions.length && <EmptyState text="No other species are listed in this evolution line." theme={theme} />}
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
							{learnableMoves.length ? learnableMoves.map((learnable, index) => (
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
							)) : <EmptyState text={`No ${game.versionGroupEngineKey} moves are listed for this Pokémon.`} theme={theme} />}
						</View>
					)}
				</View>
			</ScrollView>

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

function EvolutionNode({ title, details, theme }: { title: string; details: EvolutionDetail[]; theme: ReturnType<typeof useTheme> }) {
	return (
		<View style={[styles.evolutionNode, { borderColor: theme.backgroundSelected }]}>
			<Text style={[styles.rowTitle, { color: theme.text }]}>{title}</Text>
			{details.length ? details.map((detail, index) => (
				<Text key={`${detail.trigger}-${detail.version_group}-${index}`} style={[styles.rowDetail, { color: theme.textSecondary }]}>
					{describeEvolution(detail)}
				</Text>
			)) : <Text style={[styles.rowDetail, { color: theme.textSecondary }]}>No additional condition listed</Text>}
		</View>
	);
}

function EmptyState({ text, theme }: { text: string; theme: ReturnType<typeof useTheme> }) {
	return <Text style={[styles.emptyState, { color: theme.textSecondary }]}>{text}</Text>;
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
	header: { gap: Spacing.one, paddingBottom: Spacing.one },
	eyebrow: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
	title: { fontSize: 30, lineHeight: 38, fontWeight: '700' },
	body: { fontSize: 15, lineHeight: 22, textAlign: 'center' },
	typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two, marginTop: Spacing.one },
	typePill: { paddingHorizontal: Spacing.two, paddingVertical: Spacing.one, borderRadius: 4 },
	typePillText: { fontSize: 12, fontWeight: '700' },
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
	evolutionNode: { gap: Spacing.two, borderLeftWidth: 3, paddingVertical: Spacing.two, paddingLeft: Spacing.three },
	currentNode: { gap: Spacing.one, borderWidth: 1, borderRadius: 5, padding: Spacing.three },
	currentNodeLabel: { fontSize: 10, fontWeight: '700' },
	currentNodeName: { fontSize: 18, fontWeight: '700' },
	emptyState: { fontSize: 14, lineHeight: 21, paddingVertical: Spacing.two },
	listRow: { minHeight: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two, borderBottomWidth: StyleSheet.hairlineWidth, paddingVertical: Spacing.two },
	listCopy: { flex: 1, gap: Spacing.one },
	rowTitle: { fontSize: 14, fontWeight: '700', textTransform: 'capitalize' },
	rowDetail: { fontSize: 12, lineHeight: 17 },
	rowId: { fontSize: 11 },
	moveMeta: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: Spacing.two },
	moveType: { overflow: 'hidden', paddingHorizontal: Spacing.two, paddingVertical: Spacing.one, borderRadius: 3, fontSize: 10, fontWeight: '700' },
	rowChevron: { fontSize: 24, lineHeight: 28 },
	modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.48)' },
	modalSheet: { width: '100%', maxWidth: 680, maxHeight: '82%', alignSelf: 'center', borderWidth: 1, borderTopLeftRadius: 12, borderTopRightRadius: 12, overflow: 'hidden' },
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