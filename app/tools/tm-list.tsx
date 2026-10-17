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

import tmsData from '../../assets/data/tms.json';
import { GAMES, GAME_IDS, type GameId } from '../../constants/games';
import { TYPE_COLORS } from '../../constants/types';
import { useAppContext } from '../../context/AppContext';
import { GamePickerModal } from '../../src/components/game-picker-modal';
import { MoveModal, titleCase, type MoveModalData } from '../../src/components/move-modal';
import { MaxContentWidth, Spacing } from '../../src/constants/theme';
import { useTheme } from '../../src/hooks/use-theme';

export type TMItem = {
	machine: string;
	number: number;
	isHm: boolean;
	moveId: number;
	moveName: string;
	moveType: string;
	category: string;
	power: number | null;
	accuracy: number | null;
	pp: number | null;
	description: string;
	location?: string | null;
	pokemonIds: number[];
};

export default function TMList() {
	const theme = useTheme();
	const { activeGame, setActiveGame, showLoading, hideLoading } = useAppContext();
	const [search, setSearch] = useState('');
	const [selectedMove, setSelectedMove] = useState<MoveModalData | null>(null);
	const [gamePickerVisible, setGamePickerVisible] = useState(false);

	const validGameId: GameId = (GAME_IDS.includes(activeGame as GameId) ? activeGame : 'soulsilver') as GameId;
	const currentGame = GAMES[validGameId] ?? GAMES['soulsilver'];
	const versionGroup = currentGame.versionGroupEngineKey;

	const tmsForGame: TMItem[] = useMemo(() => {
		const list = (tmsData as Record<string, TMItem[]>)[versionGroup] ?? [];
		return list;
	}, [versionGroup]);

	const filteredList = useMemo(() => {
		if (!search.trim()) return tmsForGame;
		const query = search.trim().toLowerCase();
		return tmsForGame.filter((item) => {
			const machineLower = item.machine.toLowerCase();
			const numStr = String(item.number);
			const nameLower = item.moveName.toLowerCase();
			const typeLower = item.moveType.toLowerCase();
			return (
				machineLower.includes(query) ||
				numStr.includes(query) ||
				nameLower.includes(query) ||
				typeLower.includes(query)
			);
		});
	}, [tmsForGame, search]);

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

	const toModalData = (item: TMItem): MoveModalData => ({
		id: item.moveId,
		name: item.moveName,
		type: item.moveType,
		category: item.category,
		power: item.power,
		accuracy: item.accuracy,
		pp: item.pp,
		description: item.description,
		machine: item.machine,
		location: item.location ?? null,
		pokemonIds: item.pokemonIds,
	});

	const renderItem = ({ item }: { item: TMItem }) => {
		const typeColor = TYPE_COLORS[item.moveType.toLowerCase()] ?? '#77766C';
		return (
			<Pressable
				onPress={() => setSelectedMove(toModalData(item))}
				style={({ pressed }) => [
					styles.row,
					{
						backgroundColor: pressed ? theme.backgroundSelected : theme.background,
						borderBottomColor: theme.backgroundSelected,
					},
				]}
				accessibilityRole="button"
				accessibilityLabel={`${item.machine} ${titleCase(item.moveName)}`}
			>
				<View style={styles.rowLeft}>
					<View style={[styles.badge, item.isHm ? styles.hmBadge : styles.tmBadge]}>
						<Text style={[styles.badgeText, { color: item.isHm ? '#FFFFFF' : '#60A5FA' }]}>
							{item.machine}
						</Text>
					</View>
					<View style={styles.moveInfo}>
						<Text style={[styles.moveName, { color: theme.text }]} numberOfLines={1}>
							{titleCase(item.moveName)}
						</Text>
						<View style={styles.tagRow}>
							<View style={[styles.typePill, { backgroundColor: typeColor }]}>
								<Text style={styles.typePillText}>{item.moveType.toUpperCase()}</Text>
							</View>
							<Text style={[styles.categoryText, { color: theme.textSecondary }]}>
								{titleCase(item.category)}
							</Text>
						</View>
					</View>
				</View>
				<View style={styles.rowRight}>
					<Text style={[styles.statText, { color: theme.textSecondary }]}>
						{item.power !== null ? `PWR ${item.power}` : 'PWR —'}
					</Text>
					<Text style={[styles.statText, { color: theme.textSecondary }]}>
						{item.accuracy !== null ? `ACC ${item.accuracy}%` : 'ACC —'}
					</Text>
				</View>
			</Pressable>
		);
	};

	return (
		<SafeAreaView edges={['top']} style={[styles.screen, { backgroundColor: theme.background }]}>
			<View style={styles.container}>
				{/* Screen Header with Game Switcher */}
				<View style={styles.header}>
					<View style={styles.headerTitles}>
						<Text style={[styles.eyebrow, { color: theme.textSecondary }]}>TOOLS</Text>
						<Text style={[styles.headerTitle, { color: theme.text }]}>TM / HM List</Text>
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
						accessibilityLabel={`Active game: ${currentGame.displayName}. Tap to change.`}
					>
						<Text style={[styles.gameButtonEyebrow, { color: theme.textSecondary }]}>GAME</Text>
						<Text style={[styles.gameButtonName, { color: theme.text }]} numberOfLines={1}>
							{currentGame.displayName} ▾
						</Text>
					</Pressable>
				</View>

				{/* Search Input */}
				<View style={[styles.searchBox, { backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected }]}>
					<TextInput
						placeholder="Search by TM, move name, or type…"
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

				{/* TM / HM FlatList */}
				<FlatList
					data={filteredList}
					keyExtractor={(item) => item.machine}
					renderItem={renderItem}
					contentContainerStyle={styles.listContent}
					keyboardShouldPersistTaps="handled"
					windowSize={5}
					initialNumToRender={14}
					maxToRenderPerBatch={16}
					removeClippedSubviews={true}
					ListEmptyComponent={
						<View style={styles.emptyContainer}>
							<Text style={[styles.emptyText, { color: theme.textSecondary }]}>
								No TMs found matching &ldquo;{search}&rdquo;
							</Text>
						</View>
					}
				/>
			</View>

			{/* Move Details Modal */}
			<MoveModal
				move={selectedMove}
				onClose={() => setSelectedMove(null)}
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

const styles = StyleSheet.create({
	screen: {
		flex: 1,
	},
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
	headerTitles: {
		flex: 1,
	},
	eyebrow: {
		fontSize: 10,
		fontWeight: '700',
		textTransform: 'uppercase',
		letterSpacing: 0.5,
	},
	headerTitle: {
		fontSize: 22,
		fontWeight: '800',
	},
	gameButton: {
		paddingHorizontal: Spacing.two,
		paddingVertical: Spacing.one,
		borderRadius: 8,
		borderWidth: 1,
		alignItems: 'flex-end',
		maxWidth: 200,
	},
	gameButtonEyebrow: {
		fontSize: 9,
		fontWeight: '700',
		letterSpacing: 0.5,
	},
	gameButtonName: {
		fontSize: 13,
		fontWeight: '600',
	},
	searchBox: {
		flexDirection: 'row',
		alignItems: 'center',
		borderRadius: 8,
		borderWidth: 1,
		paddingHorizontal: Spacing.two,
		marginBottom: Spacing.two,
		minHeight: 40,
	},
	searchInput: {
		flex: 1,
		fontSize: 14,
		paddingVertical: Spacing.one,
	},
	clearBtn: {
		padding: Spacing.half,
	},
	clearBtnText: {
		fontSize: 14,
		fontWeight: '700',
	},
	listContent: {
		paddingBottom: Spacing.six,
	},
	row: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingVertical: Spacing.two,
		paddingHorizontal: Spacing.two,
		borderBottomWidth: StyleSheet.hairlineWidth,
		gap: Spacing.two,
	},
	rowLeft: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: Spacing.two,
		flex: 1,
	},
	badge: {
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderRadius: 6,
		minWidth: 54,
		alignItems: 'center',
		justifyContent: 'center',
	},
	tmBadge: {
		backgroundColor: '#1E293B',
		borderWidth: 1,
		borderColor: '#334155',
	},
	hmBadge: {
		backgroundColor: '#7F1D1D',
		borderWidth: 1,
		borderColor: '#991B1B',
	},
	badgeText: {
		fontSize: 12,
		fontWeight: '800',
		letterSpacing: 0.5,
	},
	moveInfo: {
		flex: 1,
		gap: 2,
	},
	moveName: {
		fontSize: 15,
		fontWeight: '700',
	},
	tagRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
	},
	typePill: {
		paddingHorizontal: 6,
		paddingVertical: 1,
		borderRadius: 4,
	},
	typePillText: {
		color: '#FFFFFF',
		fontSize: 9,
		fontWeight: '800',
		letterSpacing: 0.5,
	},
	categoryText: {
		fontSize: 11,
		fontWeight: '500',
	},
	rowRight: {
		alignItems: 'flex-end',
		gap: 2,
	},
	statText: {
		fontSize: 11,
		fontWeight: '600',
	},
	emptyContainer: {
		padding: Spacing.four,
		alignItems: 'center',
		justifyContent: 'center',
	},
	emptyText: {
		fontSize: 14,
	},
});
