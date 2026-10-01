import { useMemo, useState } from 'react';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import {
	FlatList,
	Modal,
	Pressable,
	StyleSheet,
	Text,
	TextInput,
	View,
	type ImageSourcePropType,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import pokemonData from '../assets/data/pokemon.json';
import { GAMES, GAME_IDS, getRegionalDexKeys, type GameId } from '../constants/games';
import { useAppContext, type StatusFilter } from '../context/AppContext';
import { MaxContentWidth, Spacing } from '../src/constants/theme';
import { useTheme } from '../src/hooks/use-theme';

type PokemonRecord = {
	id: number;
	name: string;
	nationalNo: number;
	localDexNumbers: Record<string, number>;
	types: string[];
};

type ListMode = 'local' | 'national';

const POKEMON_RECORDS = pokemonData as unknown as PokemonRecord[];
const spriteContext = require.context('../assets/sprites', false, /\.png$/);
const SPRITE_BY_ID = new Map<number, ImageSourcePropType>();

for (const assetPath of spriteContext.keys()) {
	const spriteId = Number(assetPath.match(/(\d+)\.png$/)?.[1]);
	if (Number.isInteger(spriteId)) {
		SPRITE_BY_ID.set(spriteId, spriteContext(assetPath) as ImageSourcePropType);
	}
}

function titleCase(value: string) {
	return value
		.split('-')
		.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
		.join(' ');
}

export default function PokedexListScreen() {
	const theme = useTheme();
	const {
		activeGame,
		caughtMap,
		livingDexMap,
		listFilters,
		setActiveGame,
		setListFilters,
		toggleCaught,
		toggleLivingDex,
		batchUpdateStatus,
	} = useAppContext();
	const [mode, setMode] = useState<ListMode>('local');
	const [query, setQuery] = useState('');
	const [bulkEdit, setBulkEdit] = useState(false);
	const [filtersVisible, setFiltersVisible] = useState(false);
	const [selectedIds, setSelectedIds] = useState<Set<number>>(() => new Set());
	const [gamePickerVisible, setGamePickerVisible] = useState(false);
	const [feedback, setFeedback] = useState('');
	const [saving, setSaving] = useState(false);
	const validGameId = GAME_IDS.find((gameId) => gameId === activeGame) ?? 'soulsilver';
	const game = GAMES[validGameId];
	const regionalKeys = getRegionalDexKeys(game);

	const roster = useMemo(() => {
		const records = mode === 'national'
			? [...POKEMON_RECORDS]
			: POKEMON_RECORDS.filter((pokemon) =>
				regionalKeys.some((key) => pokemon.localDexNumbers[key] !== undefined),
			);
		return records.sort((first, second) => {
			if (mode === 'national') return first.nationalNo - second.nationalNo;
			const firstKey = regionalKeys.find((key) => first.localDexNumbers[key] !== undefined);
			const secondKey = regionalKeys.find((key) => second.localDexNumbers[key] !== undefined);
			return (firstKey ? first.localDexNumbers[firstKey] : first.nationalNo)
				- (secondKey ? second.localDexNumbers[secondKey] : second.nationalNo);
		});
	}, [mode, regionalKeys]);

	const statusFilteredRecords = useMemo(() => roster.filter((pokemon) => {
		const caught = Boolean(caughtMap[`${validGameId}_${pokemon.id}`]);
		const livingDex = Boolean(livingDexMap[`${validGameId}_${pokemon.id}`]);
		const matchesCaught = listFilters.caught === 'all'
			|| (listFilters.caught === 'marked' && caught)
			|| (listFilters.caught === 'unmarked' && !caught);
		const matchesLivingDex = listFilters.livingDex === 'all'
			|| (listFilters.livingDex === 'marked' && livingDex)
			|| (listFilters.livingDex === 'unmarked' && !livingDex);
		return matchesCaught && matchesLivingDex;
	}), [roster, caughtMap, livingDexMap, validGameId, listFilters]);

	const visibleRecords = useMemo(() => {
		const normalizedQuery = query.trim().toLowerCase();
		if (!normalizedQuery) return statusFilteredRecords;
		const numericQuery = normalizedQuery.replace(/^#/, '');
		if (/^\d+$/.test(numericQuery)) {
			const ranked = statusFilteredRecords.flatMap((pokemon) => {
				const nationalNumber = String(pokemon.nationalNo);
				const localNumbers = mode === 'local'
					? regionalKeys.map((key) => pokemon.localDexNumbers[key]).filter((value) => value !== undefined).map(String)
					: [];
				let rank: number | undefined;
				if (localNumbers.some((value) => value === numericQuery)) rank = 0;
				else if (nationalNumber === numericQuery) rank = 1;
				else if (localNumbers.some((value) => value.startsWith(numericQuery))) rank = 2;
				else if (nationalNumber.startsWith(numericQuery)) rank = 3;
				return rank === undefined ? [] : [{ pokemon, rank }];
			});
		return ranked.sort((first, second) => first.rank - second.rank).map(({ pokemon }) => pokemon);
		}
		return statusFilteredRecords
			.filter((pokemon) => pokemon.name.includes(normalizedQuery))
			.sort((first, second) => {
				const rank = (pokemon: PokemonRecord) => pokemon.name === normalizedQuery ? 0 : pokemon.name.startsWith(normalizedQuery) ? 1 : 2;
				return rank(first) - rank(second);
			});
	}, [query, statusFilteredRecords, mode, regionalKeys]);

	const statusKey = (pokemonId: number) => `${validGameId}_${pokemonId}`;
	const caughtCount = roster.filter((pokemon) => caughtMap[statusKey(pokemon.id)]).length;
	const livingDexCount = roster.filter((pokemon) => livingDexMap[statusKey(pokemon.id)]).length;
	const allVisibleSelected = visibleRecords.length > 0
		&& visibleRecords.every((pokemon) => selectedIds.has(pokemon.id));
	const activeFilterCount = Number(listFilters.caught !== 'all') + Number(listFilters.livingDex !== 'all');

	const changeMode = (nextMode: ListMode) => {
		setMode(nextMode);
		setSelectedIds(new Set());
		setFeedback('');
	};

	const changeGame = (gameId: GameId) => {
		setGamePickerVisible(false);
		setSelectedIds(new Set());
		void setActiveGame(gameId)
			.then(() => setFeedback(''))
			.catch(() => setFeedback('Could not save the active game. Try again.'));
	};

	const updateFilter = (key: 'caught' | 'livingDex', value: StatusFilter) => {
		void setListFilters({ [key]: value });
		setSelectedIds(new Set());
		setFeedback('');
	};

	const toggleSelectAll = () => {
		if (allVisibleSelected) {
			setSelectedIds(new Set());
			return;
		}
		setSelectedIds(new Set(visibleRecords.map((pokemon) => pokemon.id)));
	};

	const toggleSelection = (pokemonId: number) => {
		setSelectedIds((current) => {
			const next = new Set(current);
			if (next.has(pokemonId)) next.delete(pokemonId);
			else next.add(pokemonId);
			return next;
		});
	};

	const updateSelected = async (statusType: 'caught' | 'livingDex', value: boolean) => {
		const pokemonIds = Array.from(selectedIds);
		if (!pokemonIds.length || saving) return;
		setSaving(true);
		try {
			await batchUpdateStatus(validGameId, pokemonIds, statusType, value);
			const statusLabel = statusType === 'caught' ? 'Caught' : 'Living Dex';
			setFeedback(`${pokemonIds.length} Pokémon ${value ? 'marked' : 'cleared'} ${statusLabel}.`);
			setSelectedIds(new Set());
		} catch {
			setFeedback('Could not save those updates. Try again.');
		} finally {
			setSaving(false);
		}
	};

	const renderPokemon = ({ item }: { item: PokemonRecord }) => {
		const key = statusKey(item.id);
		const isCaught = Boolean(caughtMap[key]);
		const isLivingDex = Boolean(livingDexMap[key]);
		const localDexKey = regionalKeys.find((dexKey) => item.localDexNumbers[dexKey] !== undefined);
		const localDexNumber = localDexKey ? item.localDexNumbers[localDexKey] : item.nationalNo;
		const isExclusive = mode === 'local' && game.exclusivePokemonIds.includes(item.id);
		const sprite = SPRITE_BY_ID.get(item.id);

		return (
			<View style={[styles.pokemonRow, { borderBottomColor: theme.backgroundSelected }]}>
				{bulkEdit && (
					<SelectionCheckbox
						checked={selectedIds.has(item.id)}
						label={`Select ${titleCase(item.name)}`}
						onPress={() => toggleSelection(item.id)}
						theme={theme}
					/>
				)}
				<Pressable
					accessibilityRole="link"
					accessibilityLabel={`Open ${titleCase(item.name)}, National number ${item.nationalNo}`}
					onPress={() => router.push({
						pathname: '/pokemon/[id]',
						params: { id: String(item.id), listMode: mode, regionKey: mode === 'local' ? localDexKey ?? '' : '' },
					})}
					style={({ pressed }) => [styles.pokemonMain, { opacity: pressed ? 0.72 : 1 }]}>
					<View style={[styles.spriteFrame, { backgroundColor: theme.backgroundElement }]}>
						{sprite ? (
							<Image source={sprite} style={styles.sprite} contentFit="contain" accessibilityLabel={`${titleCase(item.name)} sprite`} />
						) : <Text style={[styles.spriteFallback, { color: theme.textSecondary }]}>{item.nationalNo}</Text>}
					</View>
					<View style={styles.pokemonCopy}>
						<View style={styles.nameLine}>
							<Text style={[styles.pokemonName, { color: theme.text }]} numberOfLines={1}>{titleCase(item.name)}</Text>
							{isExclusive && <Text style={styles.exclusiveBadge}>EXCLUSIVE</Text>}
						</View>
						<Text style={[styles.dexNumber, { color: theme.textSecondary }]}>
							{mode === 'national' || !localDexKey
								? `National #${String(item.nationalNo).padStart(3, '0')}`
								: `${titleCase(localDexKey)} #${String(localDexNumber).padStart(3, '0')}`}
						</Text>
						<View style={styles.typeList}>
							{item.types.map((type) => <Text key={type} style={[styles.typeText, { color: theme.textSecondary }]}>{titleCase(type)}</Text>)}
						</View>
					</View>
				</Pressable>
				{bulkEdit ? (
					<View style={styles.statusSummary}>
						<Text style={[styles.statusMiniValue, { color: isCaught ? '#338064' : theme.textSecondary }]}>{isCaught ? 'Caught' : 'Not caught'}</Text>
						<Text style={[styles.statusMiniValue, { color: isLivingDex ? '#426D88' : theme.textSecondary }]}>{isLivingDex ? 'Living Dex' : 'Not living'}</Text>
					</View>
				) : (
					<View style={styles.rowActions}>
						<StatusCheckbox label="Caught" checked={isCaught} onPress={() => void toggleCaught(validGameId, item.id)} theme={theme} />
						<StatusCheckbox label="Living Dex" checked={isLivingDex} onPress={() => void toggleLivingDex(validGameId, item.id)} theme={theme} />
					</View>
				)}
			</View>
		);
	};

	return (
		<SafeAreaView edges={['top', 'bottom']} style={[styles.screen, { backgroundColor: theme.background }]}>
			<View style={styles.page}>
				<View style={styles.header}>
					<View style={styles.titleRow}>
						<View style={styles.titleCopy}>
							<Text style={[styles.eyebrow, { color: theme.textSecondary }]}>{mode === 'local' ? 'LOCAL POKÉDEX' : 'NATIONAL POKÉDEX'}</Text>
							<Text style={[styles.title, { color: theme.text }]}>{mode === 'local' ? game.displayName : 'All Pokémon'}</Text>
						</View>
						{mode === 'local' && (
							<Pressable
								accessibilityRole="button"
								accessibilityLabel={`Choose active game. Current game: ${game.displayName}`}
								onPress={() => setGamePickerVisible(true)}
								style={({ pressed }) => [styles.gameButton, { backgroundColor: theme.backgroundElement, opacity: pressed ? 0.74 : 1 }]}>
								<Text style={[styles.gameButtonText, { color: theme.text }]}>Change</Text>
							</Pressable>
						)}
					</View>
					<View style={styles.progressLine}>
						<Text style={[styles.progressText, { color: theme.textSecondary }]}>
							{caughtCount}/{roster.length} caught · {livingDexCount}/{roster.length} Living Dex
						</Text>
						<Pressable
							accessibilityRole="checkbox"
							accessibilityState={{ checked: bulkEdit }}
							onPress={() => {
								setBulkEdit((current) => !current);
								setSelectedIds(new Set());
								setFeedback('');
							}}
							style={[styles.bulkToggle, { backgroundColor: bulkEdit ? theme.text : theme.backgroundElement }]}>
							<CheckboxMark checked={bulkEdit} inverse={bulkEdit} theme={theme} />
							<Text style={[styles.bulkToggleText, { color: bulkEdit ? theme.background : theme.text }]}>Bulk Edit</Text>
						</Pressable>
					</View>
					<View style={styles.toolbar}>
						<View style={[styles.modeSwitch, { backgroundColor: theme.backgroundElement }]} accessibilityRole="radiogroup" accessibilityLabel="Dex view">
							{(['local', 'national'] as const).map((nextMode) => (
								<Pressable
									key={nextMode}
									accessibilityRole="radio"
									accessibilityState={{ checked: mode === nextMode }}
									onPress={() => changeMode(nextMode)}
									style={[styles.modeButton, { backgroundColor: mode === nextMode ? theme.text : 'transparent' }]}>
									<Text style={[styles.modeText, { color: mode === nextMode ? theme.background : theme.textSecondary }]}>
										{nextMode === 'local' ? 'Local' : 'National'}
									</Text>
								</Pressable>
							))}
						</View>
						<TextInput
							accessibilityLabel="Search Pokémon"
							placeholder="Search Pokémon or number"
							placeholderTextColor={theme.textSecondary}
							value={query}
							onChangeText={(value) => {
								setQuery(value);
								setSelectedIds(new Set());
							}}
							style={[styles.searchInput, { color: theme.text, backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected }]}
						/>
					</View>
					<View style={styles.filterToggleRow}>
						<Pressable
							accessibilityRole="button"
							accessibilityState={{ expanded: filtersVisible }}
							onPress={() => setFiltersVisible((current) => !current)}
							style={({ pressed }) => [styles.filterToggle, { backgroundColor: theme.backgroundElement, opacity: pressed ? 0.72 : 1 }]}>
							<Text style={[styles.filterToggleText, { color: theme.text }]}>Filters{activeFilterCount ? ` · ${activeFilterCount}` : ''}</Text>
							<Text style={[styles.filterToggleArrow, { color: theme.textSecondary }]}>{filtersVisible ? '−' : '+'}</Text>
						</Pressable>
						<Text style={[styles.resultsCount, { color: theme.textSecondary }]}>{visibleRecords.length} results</Text>
					</View>
					{filtersVisible && (
						<View style={[styles.filtersPanel, { backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected }]}>
							<FilterGroup label="Caught" value={listFilters.caught} onChange={(value) => updateFilter('caught', value)} theme={theme} />
							<FilterGroup label="Living Dex" value={listFilters.livingDex} onChange={(value) => updateFilter('livingDex', value)} theme={theme} />
						</View>
					)}
					{bulkEdit && (
						<Pressable
							accessibilityRole="checkbox"
							accessibilityState={{ checked: allVisibleSelected }}
							onPress={toggleSelectAll}
							style={styles.selectAllRow}>
							<CheckboxMark checked={allVisibleSelected} theme={theme} />
							<Text style={[styles.selectAllText, { color: theme.text }]}>Select All</Text>
							<Text style={[styles.selectAllCount, { color: theme.textSecondary }]}>{visibleRecords.length} results</Text>
						</Pressable>
					)}
				</View>

				<FlatList
					data={visibleRecords}
					keyExtractor={(item) => String(item.id)}
					renderItem={renderPokemon}
					keyboardShouldPersistTaps="handled"
					initialNumToRender={14}
					maxToRenderPerBatch={16}
					windowSize={9}
					contentContainerStyle={styles.listContent}
					ListEmptyComponent={<Text style={[styles.emptyList, { color: theme.textSecondary }]}>No Pokémon match this search.</Text>}
				/>

				{bulkEdit && (
					<View style={[styles.bulkFooter, { backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected }]}>
						<View style={styles.bulkFooterHeading}>
							<Text style={[styles.footerCount, { color: theme.text }]}>{selectedIds.size} selected</Text>
							{feedback ? <Text style={[styles.feedback, { color: theme.textSecondary }]} numberOfLines={1}>{feedback}</Text> : null}
						</View>
						<View style={styles.bulkFooterActions}>
							<View style={styles.footerActionGroup}>
								<Text style={[styles.footerGroupLabel, { color: theme.textSecondary }]}>CAUGHT</Text>
								<View style={styles.footerButtons}>
									<BulkAction label="Set" accessibilityLabel="Set selected as Caught" color="#34785F" disabled={!selectedIds.size || saving} onPress={() => void updateSelected('caught', true)} />
									<BulkAction label="Clear" accessibilityLabel="Clear Caught for selected" color="#766B5C" disabled={!selectedIds.size || saving} onPress={() => void updateSelected('caught', false)} />
								</View>
							</View>
							<View style={styles.footerActionGroup}>
								<Text style={[styles.footerGroupLabel, { color: theme.textSecondary }]}>LIVING DEX</Text>
								<View style={styles.footerButtons}>
									<BulkAction label="Set" accessibilityLabel="Set selected as Living Dex" color="#426D88" disabled={!selectedIds.size || saving} onPress={() => void updateSelected('livingDex', true)} />
									<BulkAction label="Clear" accessibilityLabel="Clear Living Dex for selected" color="#766B5C" disabled={!selectedIds.size || saving} onPress={() => void updateSelected('livingDex', false)} />
								</View>
							</View>
						</View>
					</View>
				)}
			</View>

			<GamePickerModal
				visible={gamePickerVisible}
				activeGame={validGameId}
				onSelect={(gameId) => void changeGame(gameId)}
				onClose={() => setGamePickerVisible(false)}
			/>
		</SafeAreaView>
	);
}

function CheckboxMark({ checked, inverse = false, theme }: { checked: boolean; inverse?: boolean; theme: ReturnType<typeof useTheme> }) {
	return (
		<View style={[styles.checkbox, { borderColor: inverse ? theme.background : theme.textSecondary, backgroundColor: checked ? (inverse ? theme.background : theme.text) : 'transparent' }]}>
			{checked && <Text style={[styles.checkboxTick, { color: inverse ? theme.text : theme.background }]}>✓</Text>}
		</View>
	);
}

function SelectionCheckbox({ checked, label, onPress, theme }: { checked: boolean; label: string; onPress: () => void; theme: ReturnType<typeof useTheme> }) {
	return (
		<Pressable accessibilityRole="checkbox" accessibilityState={{ checked }} accessibilityLabel={label} onPress={onPress} hitSlop={6}>
			<CheckboxMark checked={checked} theme={theme} />
		</Pressable>
	);
}

function StatusCheckbox({ label, checked, onPress, theme }: { label: string; checked: boolean; onPress: () => void; theme: ReturnType<typeof useTheme> }) {
	return (
		<Pressable
			accessibilityRole="checkbox"
			accessibilityState={{ checked }}
			accessibilityLabel={`${label}${checked ? ', marked' : ', not marked'}`}
			onPress={onPress}
			style={styles.statusButton}>
			<CheckboxMark checked={checked} theme={theme} />
			<Text style={[styles.statusLabel, { color: checked ? theme.text : theme.textSecondary }]}>{label}</Text>
		</Pressable>
	);
}

function FilterGroup({
	label,
	value,
	onChange,
	theme,
}: {
	label: string;
	value: StatusFilter;
	onChange: (value: StatusFilter) => void;
	theme: ReturnType<typeof useTheme>;
}) {
	const options: { value: StatusFilter; label: string }[] = [
		{ value: 'all', label: 'All' },
		{ value: 'marked', label: label === 'Caught' ? 'Caught' : 'Living' },
		{ value: 'unmarked', label: label === 'Caught' ? 'Uncaught' : 'Not living' },
	];
	return (
		<View style={styles.filterGroup}>
			<Text style={[styles.filterLabel, { color: theme.textSecondary }]}>{label}</Text>
			<View style={styles.filterOptions} accessibilityRole="radiogroup" accessibilityLabel={`${label} filter`}>
				{options.map((option) => {
					const selected = value === option.value;
					return (
						<Pressable
							key={option.value}
							accessibilityRole="radio"
							accessibilityState={{ checked: selected }}
							onPress={() => onChange(option.value)}
							style={[styles.filterOption, { backgroundColor: selected ? theme.text : theme.background, borderColor: selected ? theme.text : theme.backgroundSelected }]}>
							<Text style={[styles.filterOptionText, { color: selected ? theme.background : theme.text }]}>{option.label}</Text>
						</Pressable>
					);
				})}
			</View>
		</View>
	);
}

function BulkAction({
	label,
	accessibilityLabel,
	color,
	disabled,
	onPress,
}: {
	label: string;
	accessibilityLabel: string;
	color: string;
	disabled: boolean;
	onPress: () => void;
}) {
	return (
		<Pressable
			accessibilityRole="button"
			accessibilityLabel={accessibilityLabel}
			disabled={disabled}
			onPress={onPress}
			style={({ pressed }) => [styles.footerAction, { backgroundColor: color, opacity: disabled ? 0.45 : pressed ? 0.78 : 1 }]}>
			<Text style={styles.footerActionText}>{label}</Text>
		</Pressable>
	);
}

function GamePickerModal({
	visible,
	activeGame,
	onSelect,
	onClose,
}: {
	visible: boolean;
	activeGame: GameId;
	onSelect: (gameId: GameId) => void;
	onClose: () => void;
}) {
	const theme = useTheme();
	return (
		<Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
			<View style={styles.modalBackdrop}>
				<Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close game picker" />
				<View style={[styles.gameSheet, { backgroundColor: theme.background, borderColor: theme.backgroundSelected }]}>
					<View style={styles.gameModalHeader}>
						<View>
							<Text style={[styles.eyebrow, { color: theme.textSecondary }]}>ACTIVE GAME</Text>
							<Text style={[styles.gameModalTitle, { color: theme.text }]}>Choose a game</Text>
						</View>
						<Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close game picker" style={[styles.modalCloseButton, { backgroundColor: theme.backgroundElement }]}>
							<Text style={[styles.modalCloseText, { color: theme.text }]}>Close</Text>
						</Pressable>
					</View>
					<FlatList
						data={GAME_IDS}
							keyExtractor={(gameId) => gameId}
							renderItem={({ item }) => {
							const selected = item === activeGame;
							return (
								<Pressable
									accessibilityRole="radio"
									accessibilityState={{ checked: selected }}
									onPress={() => onSelect(item)}
									style={[styles.gameOption, { borderBottomColor: theme.backgroundSelected }]}>
									<Text style={[styles.gameOptionText, { color: selected ? theme.text : theme.textSecondary, fontWeight: selected ? '700' : '500' }]}>{GAMES[item].displayName}</Text>
									<Text style={[styles.gameOptionGeneration, { color: theme.textSecondary }]}>GEN {GAMES[item].generation}</Text>
								</Pressable>
							);
						}}
						/>
				</View>
			</View>
		</Modal>
	);
}

const styles = StyleSheet.create({
	screen: { flex: 1 },
	page: { flex: 1, width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center' },
	header: { paddingHorizontal: Spacing.three, paddingTop: Spacing.two, paddingBottom: Spacing.two, gap: Spacing.two },
	titleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
	titleCopy: { flex: 1, gap: Spacing.one },
	eyebrow: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
	title: { fontSize: 24, lineHeight: 30, fontWeight: '700' },
	gameButton: { minHeight: 38, justifyContent: 'center', paddingHorizontal: Spacing.two, borderRadius: 5 },
	gameButtonText: { fontSize: 12, fontWeight: '700' },
	progressLine: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: Spacing.two },
	progressText: { flex: 1, fontSize: 11 },
	bulkToggle: { minHeight: 36, flexDirection: 'row', alignItems: 'center', gap: Spacing.one, paddingHorizontal: Spacing.two, borderRadius: 5 },
	bulkToggleText: { fontSize: 12, fontWeight: '700' },
	checkbox: { width: 20, height: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderRadius: 4 },
	checkboxTick: { fontSize: 14, lineHeight: 17, fontWeight: '800' },
	toolbar: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
	modeSwitch: { flexDirection: 'row', padding: 3, borderRadius: 6 },
	modeButton: { minHeight: 34, justifyContent: 'center', paddingHorizontal: Spacing.two, borderRadius: 4 },
	modeText: { fontSize: 12, fontWeight: '700' },
	searchInput: { flex: 1, minWidth: 0, height: 40, borderWidth: 1, borderRadius: 5, paddingHorizontal: Spacing.two, fontSize: 14 },
	filterToggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 36 },
	filterToggle: { minHeight: 34, flexDirection: 'row', alignItems: 'center', gap: Spacing.two, paddingHorizontal: Spacing.two, borderRadius: 5 },
	filterToggleText: { fontSize: 12, fontWeight: '700' },
	filterToggleArrow: { fontSize: 16, fontWeight: '700' },
	resultsCount: { fontSize: 11 },
	filtersPanel: { gap: Spacing.two, borderWidth: 1, borderRadius: 5, padding: Spacing.two },
	filterGroup: { gap: Spacing.one },
	filterLabel: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
	filterOptions: { flexDirection: 'row', gap: Spacing.one },
	filterOption: { minHeight: 34, flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.one, borderWidth: 1, borderRadius: 4 },
	filterOptionText: { fontSize: 11, fontWeight: '700' },
	selectAllRow: { minHeight: 42, flexDirection: 'row', alignItems: 'center', gap: Spacing.two, paddingHorizontal: Spacing.three },
	selectAllText: { fontSize: 13, fontWeight: '700' },
	selectAllCount: { marginLeft: 'auto', fontSize: 11 },
	listContent: { paddingHorizontal: Spacing.three, paddingBottom: Spacing.three },
	pokemonRow: { minHeight: 88, flexDirection: 'row', alignItems: 'center', gap: Spacing.two, borderBottomWidth: StyleSheet.hairlineWidth, paddingVertical: Spacing.two },
	pokemonMain: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
	spriteFrame: { width: 64, height: 64, alignItems: 'center', justifyContent: 'center', borderRadius: 6 },
	sprite: { width: 60, height: 60 },
	spriteFallback: { fontSize: 13, fontWeight: '700' },
	pokemonCopy: { flex: 1, minWidth: 0, gap: Spacing.one },
	nameLine: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
	pokemonName: { flexShrink: 1, fontSize: 14, fontWeight: '700', textTransform: 'capitalize' },
	exclusiveBadge: { overflow: 'hidden', paddingHorizontal: 5, paddingVertical: 2, borderRadius: 3, backgroundColor: '#B94C3D', color: '#FFFFFF', fontSize: 8, fontWeight: '800' },
	dexNumber: { fontSize: 10 },
	typeList: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
	typeText: { fontSize: 10 },
	rowActions: { width: 90, gap: Spacing.one },
	statusButton: { minHeight: 28, flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
	statusLabel: { fontSize: 9 },
	statusSummary: { alignItems: 'center', gap: Spacing.one },
	statusMiniValue: { fontSize: 9, fontWeight: '700' },
	emptyList: { paddingVertical: Spacing.five, textAlign: 'center', fontSize: 14 },
	bulkFooter: { gap: Spacing.two, borderTopWidth: 1, paddingHorizontal: Spacing.two, paddingVertical: Spacing.two },
	bulkFooterHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two },
	bulkFooterActions: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.two },
	footerActionGroup: { flex: 1, gap: Spacing.one },
	footerGroupLabel: { fontSize: 9, fontWeight: '700' },
	footerButtons: { flexDirection: 'row', gap: Spacing.one },
	footerCount: { fontSize: 12, fontWeight: '700' },
	feedback: { flex: 1, fontSize: 9, textAlign: 'right' },
	footerAction: { flex: 1, minHeight: 38, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.one, borderRadius: 5 },
	footerActionText: { color: '#FFFFFF', fontSize: 10, fontWeight: '700' },
	modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.48)' },
	gameSheet: { width: '100%', maxWidth: 560, height: '82%', alignSelf: 'center', borderWidth: 1, borderTopLeftRadius: 12, borderTopRightRadius: 12, paddingTop: Spacing.three },
	gameModalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two, paddingHorizontal: Spacing.three, paddingBottom: Spacing.two },
	gameModalTitle: { marginTop: Spacing.one, fontSize: 20, fontWeight: '700' },
	modalCloseButton: { minHeight: 36, justifyContent: 'center', paddingHorizontal: Spacing.two, borderRadius: 5 },
	modalCloseText: { fontSize: 12, fontWeight: '700' },
	gameOption: { minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two, paddingHorizontal: Spacing.three, borderBottomWidth: StyleSheet.hairlineWidth },
	gameOptionText: { fontSize: 14 },
	gameOptionGeneration: { fontSize: 10, fontWeight: '700' },
});
