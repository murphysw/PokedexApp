import { useState } from 'react';
import {
	Pressable,
	ScrollView,
	StyleSheet,
	Text,
	View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Fonts, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

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
export type TypeSelection = readonly [PokemonType] | readonly [PokemonType, PokemonType];
export type MatchupMode = 'defense' | 'offense';

type TypeEffectiveness = 0 | 0.25 | 0.5 | 1 | 2 | 4;
type MatchupEntry = {
	type: PokemonType;
	multiplier: TypeEffectiveness;
	moveType?: PokemonType;
	targetTypes?: readonly [PokemonType, PokemonType];
};

const TYPE_COLORS: Record<PokemonType, string> = {
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
	ghost: '#5D568A',
	dragon: '#4F5C9E',
	dark: '#514743',
	steel: '#667780',
	fairy: '#A34F80',
};

const ATTACK_CHART: Record<PokemonType, Partial<Record<PokemonType, TypeEffectiveness>>> = {
	normal: { rock: 0.5, ghost: 0, steel: 0.5 },
	fire: { fire: 0.5, water: 0.5, grass: 2, ice: 2, bug: 2, rock: 0.5, dragon: 0.5, steel: 2 },
	water: { fire: 2, water: 0.5, grass: 0.5, ground: 2, rock: 2, dragon: 0.5 },
	electric: { water: 2, electric: 0.5, grass: 0.5, ground: 0, flying: 2, dragon: 0.5 },
	grass: { fire: 0.5, water: 2, grass: 0.5, poison: 0.5, ground: 2, flying: 0.5, bug: 0.5, rock: 2, dragon: 0.5, steel: 0.5 },
	ice: { fire: 0.5, water: 0.5, grass: 2, ice: 0.5, ground: 2, flying: 2, dragon: 2, steel: 0.5 },
	fighting: { normal: 2, ice: 2, poison: 0.5, flying: 0.5, psychic: 0.5, bug: 0.5, rock: 2, ghost: 0, dark: 2, steel: 2, fairy: 0.5 },
	poison: { grass: 2, poison: 0.5, ground: 0.5, rock: 0.5, ghost: 0.5, steel: 0, fairy: 2 },
	ground: { fire: 2, electric: 2, grass: 0.5, poison: 2, flying: 0, bug: 0.5, rock: 2, steel: 2 },
	flying: { electric: 0.5, grass: 2, fighting: 2, bug: 2, rock: 0.5, steel: 0.5 },
	psychic: { fighting: 2, poison: 2, psychic: 0.5, dark: 0, steel: 0.5 },
	bug: { fire: 0.5, grass: 2, fighting: 0.5, poison: 0.5, flying: 0.5, psychic: 2, ghost: 0.5, dark: 2, steel: 0.5, fairy: 0.5 },
	rock: { fire: 2, ice: 2, fighting: 0.5, ground: 0.5, flying: 2, bug: 2, steel: 0.5 },
	ghost: { normal: 0, psychic: 2, ghost: 2, dark: 0.5 },
	dragon: { dragon: 2, steel: 0.5, fairy: 0 },
	dark: { fighting: 0.5, psychic: 2, ghost: 2, dark: 0.5, fairy: 0.5 },
	steel: { fire: 0.5, water: 0.5, electric: 0.5, ice: 2, rock: 2, steel: 0.5, fairy: 2 },
	fairy: { fire: 0.5, fighting: 2, poison: 0.5, dragon: 2, dark: 2, steel: 0.5 },
};

export function calculateTypeMatchups(types: TypeSelection, mode: MatchupMode = 'defense') {
	const selectedTypes = [...new Set(types)];
	const entries: MatchupEntry[] = mode === 'defense'
		? POKEMON_TYPES.map((attackingType) => ({
			type: attackingType,
			multiplier: selectedTypes.reduce<TypeEffectiveness>(
				(multiplier, defendingType) =>
					(multiplier * (ATTACK_CHART[attackingType][defendingType] ?? 1)) as TypeEffectiveness,
				1,
			),
		}))
		: POKEMON_TYPES.map((targetType) => {
			let bestMoveType = selectedTypes[0];
			let bestMultiplier = ATTACK_CHART[bestMoveType][targetType] ?? 1;
			for (const moveType of selectedTypes.slice(1)) {
				const multiplier = ATTACK_CHART[moveType][targetType] ?? 1;
				if (multiplier > bestMultiplier) {
					bestMoveType = moveType;
					bestMultiplier = multiplier;
				}
			}
			return { type: targetType, multiplier: bestMultiplier, moveType: bestMoveType };
		});

	const quadWeaknesses = mode === 'defense'
		? entries.filter((entry) => entry.multiplier === 4)
		: [];
	if (mode === 'offense') {
		for (let firstIndex = 0; firstIndex < POKEMON_TYPES.length; firstIndex++) {
			for (let secondIndex = firstIndex + 1; secondIndex < POKEMON_TYPES.length; secondIndex++) {
				const firstType = POKEMON_TYPES[firstIndex];
				const secondType = POKEMON_TYPES[secondIndex];
				let bestMoveType = selectedTypes[0];
				let bestMultiplier = 0;
				for (const moveType of selectedTypes) {
					const multiplier =
						(ATTACK_CHART[moveType][firstType] ?? 1) *
						(ATTACK_CHART[moveType][secondType] ?? 1);
					if (multiplier > bestMultiplier) {
						bestMoveType = moveType;
						bestMultiplier = multiplier;
					}
				}
				if (bestMultiplier === 4) {
					quadWeaknesses.push({
						type: firstType,
						targetTypes: [firstType, secondType],
						multiplier: 4,
						moveType: bestMoveType,
					});
				}
			}
		}
	}

	return {
		doubleWeaknesses: entries.filter((entry) => entry.multiplier === 2),
		quadWeaknesses,
		resistances: entries.filter((entry) => entry.multiplier === 0.5 || entry.multiplier === 0.25),
		immunities: entries.filter((entry) => entry.multiplier === 0),
	};
}

function formatMultiplier(multiplier: TypeEffectiveness) {
	if (multiplier === 0.25) return '¼×';
	if (multiplier === 0.5) return '½×';
	return `${multiplier}×`;
}

function TypeSwatch({ type, selected, onPress }: { type: PokemonType; selected: boolean; onPress: () => void }) {
	return (
		<Pressable
			accessibilityRole="button"
			accessibilityState={{ selected }}
			accessibilityLabel={`${type} type${selected ? ', selected' : ''}`}
			onPress={onPress}
			style={({ pressed }) => [
				styles.typeSwatch,
				{ backgroundColor: TYPE_COLORS[type], opacity: pressed ? 0.76 : 1 },
				selected && styles.typeSwatchSelected,
			]}>
			<Text style={styles.typeSwatchText}>{type}</Text>
		</Pressable>
	);
}

function ResultTypes({ entries }: { entries: MatchupEntry[] }) {
	return (
		<View style={styles.resultTypes}>
			{entries.length ? entries.map((entry) => {
				const label = entry.targetTypes?.join(' / ') ?? entry.type;
				return (
					<View key={label} style={[styles.resultTag, { backgroundColor: TYPE_COLORS[entry.type] }]}>
						<Text style={styles.resultTagType}>{label}</Text>
						<Text style={styles.resultTagMultiplier}>{formatMultiplier(entry.multiplier)}</Text>
						{entry.moveType && <Text style={styles.resultTagMove}>via {entry.moveType}</Text>}
					</View>
				);
			}) : <Text style={styles.noneText}>None</Text>}
		</View>
	);
}

export function TypeMatchupCard({
	types,
	mode = 'defense',
	title,
}: {
	types: TypeSelection;
	mode?: MatchupMode;
	title?: string;
}) {
	const theme = useTheme();
	const matchups = calculateTypeMatchups(types, mode);
	const sections = [
		{
			title: mode === 'defense' ? 'Your Pokémon takes 2× from' : 'Single-type targets take 2×',
			entries: matchups.doubleWeaknesses,
			color: '#C34B3F',
		},
		{
			title: mode === 'defense' ? 'Your Pokémon takes 4× from' : 'Dual-type targets take 4× from',
			entries: matchups.quadWeaknesses,
			color: '#8F2634',
		},
		{
			title: mode === 'defense' ? 'Your Pokémon takes reduced damage from' : 'Single-type targets resist',
			entries: matchups.resistances,
			color: '#347D69',
		},
		{
			title: mode === 'defense' ? 'Your Pokémon takes no damage from' : 'No effect on single-type targets',
			entries: matchups.immunities,
			color: '#416984',
		},
	];

	return (
		<View style={[styles.resultCard, { backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected }]}>
			<View style={styles.resultCardHeader}>
				<View>
					<Text style={[styles.eyebrow, { color: theme.textSecondary }]}>
						{title ?? (mode === 'defense' ? 'DAMAGE TAKEN' : 'DAMAGE DEALT')}
					</Text>
					<Text style={[styles.resultTypesTitle, { color: theme.text }]}>{types.join(' / ')}</Text>
					<Text style={[styles.directionText, { color: theme.textSecondary }]}>
						{mode === 'defense'
							? 'Incoming attack types'
							: 'Best selected move type against each target'}
					</Text>
				</View>
				<Text style={[styles.chartLabel, { color: theme.textSecondary }]}>GEN VI-VII</Text>
			</View>
			{sections.map((section) => (
				<View key={section.title} style={[styles.resultSection, { borderTopColor: theme.backgroundSelected }]}>
					<Text style={[styles.resultSectionTitle, { color: section.color }]}>{section.title}</Text>
					<ResultTypes entries={section.entries} />
				</View>
			))}
		</View>
	);
}

export default function TypeMatchupScreen() {
	const theme = useTheme();
	const [mode, setMode] = useState<MatchupMode>('defense');
	const [primaryType, setPrimaryType] = useState<PokemonType>('fire');
	const [secondaryType, setSecondaryType] = useState<PokemonType>('water');
	const [isDualType, setIsDualType] = useState(false);
	const [activeSlot, setActiveSlot] = useState<'primary' | 'secondary'>('primary');
	const selectedTypes: TypeSelection = isDualType ? [primaryType, secondaryType] : [primaryType];

	const selectType = (type: PokemonType) => {
		if (activeSlot === 'primary') {
			setPrimaryType(type);
			if (type === secondaryType) setSecondaryType(POKEMON_TYPES.find((candidate) => candidate !== type)!);
			return;
		}
		if (type === primaryType) {
			setSecondaryType(POKEMON_TYPES.find((candidate) => candidate !== type)!);
			return;
		}
		setSecondaryType(type);
	};

	const selectionButtonStyle = (pressed: boolean, active: boolean) => [
		styles.selectionButton,
		{ backgroundColor: active ? theme.text : theme.backgroundElement, opacity: pressed ? 0.76 : 1 },
	];

	return (
		<SafeAreaView edges={['top']} style={[styles.screen, { backgroundColor: theme.background }]}>
			<ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
				<View style={styles.heading}>
					<Text style={[styles.eyebrow, { color: theme.textSecondary }]}>BATTLE TOOLS</Text>
					<Text style={[styles.title, { color: theme.text }]}>Type matchup</Text>
					<Text style={[styles.subtitle, { color: theme.textSecondary }]}>See damage your Pokémon takes and deals.</Text>
				</View>

				<View style={[styles.modeRow, { backgroundColor: theme.backgroundElement }]} accessibilityRole="radiogroup" accessibilityLabel="Damage direction">
					{([
						{ mode: 'defense', label: 'Damage taken' },
						{ mode: 'offense', label: 'Damage dealt' },
					] as const).map((option) => (
						<Pressable
							key={option.mode}
							accessibilityRole="radio"
							accessibilityState={{ checked: mode === option.mode }}
							onPress={() => setMode(option.mode)}
							style={({ pressed }) => [
								styles.modeButton,
								{ backgroundColor: mode === option.mode ? theme.text : theme.backgroundElement, opacity: pressed ? 0.76 : 1 },
							]}>
							<Text style={[styles.modeButtonText, { color: mode === option.mode ? theme.background : theme.text }]}>
								{option.label}
							</Text>
						</Pressable>
					))}
				</View>

				<View style={[styles.modeRow, { backgroundColor: theme.backgroundElement }]} accessibilityRole="radiogroup" accessibilityLabel="Number of Pokémon types">
					{([false, true] as const).map((dual) => (
						<Pressable
							key={String(dual)}
							accessibilityRole="radio"
							accessibilityState={{ checked: isDualType === dual }}
							onPress={() => {
								setIsDualType(dual);
								if (!dual) setActiveSlot('primary');
							}}
							style={({ pressed }) => [
								styles.modeButton,
								{ backgroundColor: isDualType === dual ? theme.text : theme.backgroundElement, opacity: pressed ? 0.76 : 1 },
							]}>
							<Text style={[styles.modeButtonText, { color: isDualType === dual ? theme.background : theme.text }]}>
								{dual ? 'Dual type' : 'Single type'}
							</Text>
						</Pressable>
					))}
				</View>

				<View style={styles.selectionRow}>
					<Pressable
						accessibilityRole="button"
						accessibilityState={{ selected: activeSlot === 'primary' }}
						onPress={() => setActiveSlot('primary')}
						style={({ pressed }) => selectionButtonStyle(pressed, activeSlot === 'primary')}>
						<Text style={[styles.selectionLabel, { color: activeSlot === 'primary' ? theme.background : theme.textSecondary }]}>PRIMARY</Text>
						<Text style={[styles.selectionValue, { color: activeSlot === 'primary' ? theme.background : theme.text }]}>{primaryType}</Text>
					</Pressable>
					{isDualType && (
						<Pressable
							accessibilityRole="button"
							accessibilityState={{ selected: activeSlot === 'secondary' }}
							onPress={() => setActiveSlot('secondary')}
							style={({ pressed }) => selectionButtonStyle(pressed, activeSlot === 'secondary')}>
							<Text style={[styles.selectionLabel, { color: activeSlot === 'secondary' ? theme.background : theme.textSecondary }]}>SECONDARY</Text>
							<Text style={[styles.selectionValue, { color: activeSlot === 'secondary' ? theme.background : theme.text }]}>{secondaryType}</Text>
						</Pressable>
					)}
				</View>

				<View style={styles.typeGrid} accessibilityRole="radiogroup" accessibilityLabel={`Choose ${activeSlot} type`}>
					{POKEMON_TYPES.map((type) => (
						<TypeSwatch
							key={type}
							type={type}
							selected={activeSlot === 'primary' ? primaryType === type : secondaryType === type}
							onPress={() => selectType(type)}
						/>
					))}
				</View>

				<TypeMatchupCard types={selectedTypes} mode={mode} />
			</ScrollView>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	screen: { flex: 1 },
	content: {
		width: '100%',
		maxWidth: MaxContentWidth,
		alignSelf: 'center',
		paddingHorizontal: Spacing.three,
		paddingTop: Spacing.three,
		paddingBottom: Spacing.six,
		gap: Spacing.three,
	},
	heading: { gap: Spacing.one, paddingBottom: Spacing.one },
	eyebrow: { fontSize: 11, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase' },
	title: { fontSize: 32, lineHeight: 38, fontWeight: '700' },
	subtitle: { fontSize: 15, lineHeight: 21 },
	modeRow: { flexDirection: 'row', gap: Spacing.two, padding: Spacing.one, borderRadius: 8 },
	modeButton: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 42, paddingHorizontal: Spacing.two, borderRadius: 5 },
	modeButtonText: { fontSize: 14, fontWeight: '700' },
	selectionRow: { flexDirection: 'row', gap: Spacing.two },
	selectionButton: { flex: 1, minHeight: 68, justifyContent: 'center', paddingHorizontal: Spacing.three, borderRadius: 6 },
	selectionLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 0.8 },
	selectionValue: { fontSize: 18, fontWeight: '700', textTransform: 'capitalize' },
	typeGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: Spacing.two },
	typeSwatch: { width: '23%', minWidth: 66, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 5 },
	typeSwatchSelected: { borderColor: '#1D2722', borderWidth: 3 },
	typeSwatchText: { color: '#FFFFFF', fontFamily: Fonts.sans, fontSize: 12, fontWeight: '700', textTransform: 'capitalize' },
	resultCard: { borderWidth: 1, borderRadius: 7, padding: Spacing.three },
	resultCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', paddingBottom: Spacing.two },
	resultTypesTitle: { marginTop: Spacing.one, fontSize: 20, fontWeight: '700', textTransform: 'capitalize' },
	directionText: { marginTop: Spacing.one, fontSize: 12, lineHeight: 17 },
	chartLabel: { fontSize: 10, fontWeight: '700' },
	resultSection: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: Spacing.two, paddingBottom: Spacing.two, gap: Spacing.two },
	resultSectionTitle: { fontSize: 13, fontWeight: '700' },
	resultTypes: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: Spacing.two, minHeight: 28 },
	resultTag: { minHeight: 28, flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: Spacing.two, paddingHorizontal: Spacing.two, borderRadius: 4 },
	resultTagType: { color: '#FFFFFF', fontSize: 12, fontWeight: '700', textTransform: 'capitalize' },
	resultTagMultiplier: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
	resultTagMove: { color: '#FFFFFF', fontSize: 10, fontWeight: '600', textTransform: 'capitalize' },
	noneText: { color: '#747A75', fontSize: 13 },
});
