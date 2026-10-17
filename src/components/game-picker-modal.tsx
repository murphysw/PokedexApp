import { FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { GAMES, GAME_IDS, type GameId } from '../../constants/games';
import { Spacing } from '../../src/constants/theme';
import { useTheme } from '../../src/hooks/use-theme';

export function GamePickerModal({
	visible,
	activeGame,
	onSelect,
	onClose,
}: {
	visible: boolean;
	activeGame: string;
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
									<Text style={[styles.gameOptionText, { color: selected ? theme.text : theme.textSecondary, fontWeight: selected ? '700' : '500' }]}>
										{GAMES[item].displayName}
									</Text>
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
	modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.48)' },
	gameSheet: { width: '100%', maxWidth: 680, maxHeight: '70%', alignSelf: 'center', borderWidth: 1, borderTopLeftRadius: 12, borderTopRightRadius: 12, padding: Spacing.three, overflow: 'hidden' },
	gameModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.two },
	eyebrow: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
	gameModalTitle: { fontSize: 20, fontWeight: '700' },
	modalCloseButton: { minHeight: 38, justifyContent: 'center', paddingHorizontal: Spacing.two, borderRadius: 5 },
	modalCloseText: { fontSize: 12, fontWeight: '700' },
	gameOption: { minHeight: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, paddingVertical: Spacing.one },
	gameOptionText: { fontSize: 14 },
	gameOptionGeneration: { fontSize: 11, fontWeight: '700' },
});

