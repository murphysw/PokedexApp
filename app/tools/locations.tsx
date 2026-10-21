import React, { useMemo, useState } from 'react';
import {
	FlatList,
	Pressable,
	StyleSheet,
	Text,
	TextInput,
	View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import locationsData from '../../assets/data/locations.json';
import { GAMES, GAME_IDS, type GameId } from '../../constants/games';
import { useAppContext } from '../../context/AppContext';
import { GamePickerModal } from '../../src/components/game-picker-modal';
import { LocationModal, formatLocationName, type LocationEntry, type LocationModalData } from '../../src/components/location-modal';
import { MaxContentWidth, Spacing } from '../../src/constants/theme';
import { useTheme } from '../../src/hooks/use-theme';

const ALL_LOCATIONS = locationsData as LocationEntry[];

export default function LocationsScreen() {
	const theme = useTheme();
	const { activeGame, setActiveGame, showLoading, hideLoading } = useAppContext();
	const [search, setSearch] = useState('');
	const [selectedLocation, setSelectedLocation] = useState<LocationModalData | null>(null);
	const [gamePickerVisible, setGamePickerVisible] = useState(false);

	const validGameId: GameId = (GAME_IDS.includes(activeGame as GameId) ? activeGame : 'soulsilver') as GameId;
	const currentGame = GAMES[validGameId] ?? GAMES['soulsilver'];

	// Filter locations that have any encounter data for the active game version
	const locationsForGame = useMemo(() => {
		return ALL_LOCATIONS
			.filter((loc) =>
				loc.pokemon.some((p) =>
					p.versionDetails.some((vd) => vd.version === validGameId),
				),
			)
			.sort((a, b) => formatLocationName(a.name).localeCompare(formatLocationName(b.name)));
	}, [validGameId]);

	const filteredList = useMemo(() => {
		if (!search.trim()) return locationsForGame;
		const query = search.trim().toLowerCase();
		return locationsForGame.filter((loc) =>
			formatLocationName(loc.name).toLowerCase().includes(query),
		);
	}, [locationsForGame, search]);

	const handleSelectGame = async (gameId: GameId) => {
		setGamePickerVisible(false);
		if (gameId === validGameId) return;
		showLoading('Changing game');
		try {
			await setActiveGame(gameId);
		} finally {
			hideLoading();
		}
	};

	const handleOpenLocation = (location: LocationEntry) => {
		setSelectedLocation({ location, activeVersion: validGameId });
	};

	const renderItem = ({ item }: { item: LocationEntry }) => {
		// Count unique Pokémon available in this location for active game
		const pokemonCount = item.pokemon.filter((p) =>
			p.versionDetails.some((vd) => vd.version === validGameId),
		).length;

		// Collect unique encounter methods for preview badges
		const methods = new Set<string>();
		for (const p of item.pokemon) {
			for (const vd of p.versionDetails) {
				if (vd.version === validGameId) {
					for (const detail of vd.encounterDetails) {
						methods.add(detail.method);
					}
				}
			}
		}

		return (
			<Pressable
				onPress={() => handleOpenLocation(item)}
				style={({ pressed }) => [
					styles.row,
					{
						backgroundColor: pressed ? theme.backgroundSelected : theme.background,
						borderBottomColor: theme.backgroundSelected,
					},
				]}
				accessibilityRole="button"
				accessibilityLabel={`${formatLocationName(item.name)}, ${pokemonCount} Pokémon`}>
				<View style={styles.rowMain}>
					<Text style={[styles.locationName, { color: theme.text }]} numberOfLines={1}>
						{formatLocationName(item.name)}
					</Text>
					<View style={styles.methodRow}>
						{Array.from(methods).map((method) => (
							<View key={method} style={[styles.methodBadge, { backgroundColor: theme.backgroundElement }]}>
								<Text style={[styles.methodBadgeText, { color: theme.textSecondary }]}>
									{formatMethod(method)}
								</Text>
							</View>
						))}
					</View>
				</View>
				<Text style={[styles.pokemonCount, { color: theme.textSecondary }]}>
					{pokemonCount} Pokémon
				</Text>
			</Pressable>
		);
	};

	return (
		<SafeAreaView edges={['top']} style={[styles.screen, { backgroundColor: theme.background }]}>
			<View style={styles.container}>
				{/* Header with Game Switcher */}
				<View style={styles.header}>
					<View style={styles.headerTitles}>
						<Text style={[styles.eyebrow, { color: theme.textSecondary }]}>TOOLS</Text>
						<Text style={[styles.headerTitle, { color: theme.text }]}>Locations</Text>
					</View>
					<Pressable
						onPress={() => setGamePickerVisible(true)}
						style={({ pressed }) => [
							styles.gameButton,
							{
								backgroundColor: theme.backgroundElement,
								borderColor: theme.backgroundSelected,
								opacity: pressed ? 0.75 : 1,
							},
						]}
						accessibilityRole="button"
						accessibilityLabel={`Active game: ${currentGame.displayName}. Tap to change.`}>
						<Text style={[styles.gameButtonEyebrow, { color: theme.textSecondary }]}>GAME</Text>
						<Text style={[styles.gameButtonName, { color: theme.text }]} numberOfLines={1}>
							{currentGame.displayName} ▾
						</Text>
					</Pressable>
				</View>

				{/* Search Input */}
				<View style={[styles.searchBox, { backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected }]}>
					<TextInput
						placeholder="Search by location name…"
						placeholderTextColor={theme.textSecondary}
						style={[styles.searchInput, { color: theme.text }]}
						value={search}
						onChangeText={setSearch}
						autoCapitalize="none"
						autoCorrect={false}
					/>
					{search.length > 0 && (
						<Pressable onPress={() => setSearch('')} hitSlop={8} style={styles.clearBtn}>
							<Text style={[styles.clearBtnText, { color: theme.textSecondary }]}>✕</Text>
						</Pressable>
					)}
				</View>

				{/* Results count */}
				<Text style={[styles.resultsCount, { color: theme.textSecondary }]}>
					{filteredList.length} location{filteredList.length !== 1 ? 's' : ''}
				</Text>

				{/* Location List */}
				<FlatList
					data={filteredList}
					keyExtractor={(item) => String(item.id)}
					renderItem={renderItem}
					contentContainerStyle={styles.listContent}
					keyboardShouldPersistTaps="handled"
					windowSize={5}
					initialNumToRender={16}
					maxToRenderPerBatch={18}
					removeClippedSubviews={true}
					ListEmptyComponent={
						<View style={styles.emptyContainer}>
							<Text style={[styles.emptyText, { color: theme.textSecondary }]}>
								{search.trim()
									? `No locations found matching "${search}"`
									: `No location data available for ${currentGame.displayName}.`}
							</Text>
						</View>
					}
				/>
			</View>

			{/* Location Details Modal */}
			<LocationModal
				data={selectedLocation}
				onClose={() => setSelectedLocation(null)}
				theme={theme}
			/>

			{/* Game Selection Modal */}
			<GamePickerModal
				visible={gamePickerVisible}
				activeGame={validGameId}
				onSelect={(gameId) => void handleSelectGame(gameId)}
				onClose={() => setGamePickerVisible(false)}
			/>
		</SafeAreaView>
	);
}

function formatMethod(method: string): string {
	return method
		.split('-')
		.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
		.join(' ');
}

const styles = StyleSheet.create({
	screen: { flex: 1 },
	container: {
		flex: 1,
		width: '100%',
		maxWidth: MaxContentWidth,
		alignSelf: 'center',
		paddingHorizontal: Spacing.two,
	},
	header: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		paddingVertical: Spacing.two,
		gap: Spacing.two,
	},
	headerTitles: { flex: 1 },
	eyebrow: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
	headerTitle: { fontSize: 22, fontWeight: '800' },
	gameButton: {
		paddingHorizontal: Spacing.two,
		paddingVertical: Spacing.one,
		borderRadius: 8,
		borderWidth: 1,
		alignItems: 'flex-end',
		maxWidth: 200,
	},
	gameButtonEyebrow: { fontSize: 9, fontWeight: '700', letterSpacing: 0.5 },
	gameButtonName: { fontSize: 13, fontWeight: '600' },
	searchBox: {
		flexDirection: 'row',
		alignItems: 'center',
		borderRadius: 8,
		borderWidth: 1,
		paddingHorizontal: Spacing.two,
		marginBottom: Spacing.one,
		minHeight: 40,
	},
	searchInput: { flex: 1, fontSize: 14, paddingVertical: Spacing.one },
	clearBtn: { padding: Spacing.half },
	clearBtnText: { fontSize: 14, fontWeight: '700' },
	resultsCount: { fontSize: 11, marginBottom: Spacing.one },
	listContent: { paddingBottom: Spacing.six },
	row: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingVertical: Spacing.two,
		paddingHorizontal: Spacing.two,
		borderBottomWidth: StyleSheet.hairlineWidth,
		gap: Spacing.two,
	},
	rowMain: { flex: 1, gap: 4 },
	locationName: { fontSize: 15, fontWeight: '700' },
	methodRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
	methodBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
	methodBadgeText: { fontSize: 9, fontWeight: '700', letterSpacing: 0.3, textTransform: 'uppercase' },
	pokemonCount: { fontSize: 11, fontWeight: '600', textAlign: 'right' },
	emptyContainer: { padding: Spacing.four, alignItems: 'center', justifyContent: 'center' },
	emptyText: { fontSize: 14, textAlign: 'center' },
});

