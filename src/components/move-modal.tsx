import { router } from 'expo-router';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import pokemonData from '../../assets/data/pokemon.json';
import { TYPE_COLORS } from '../../constants/types';
import { Spacing } from '../../src/constants/theme';
import type { useTheme } from '../../src/hooks/use-theme';

export type MoveModalData = {
	id: number;
	name: string;
	type: string;
	category: string;
	power: number | null;
	accuracy: number | null;
	pp: number | null;
	description?: string | null;
	machine?: string | null;
	pokemonIds?: readonly number[] | null;
};

export function titleCase(value: string) {
	return value
		.split('-')
		.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
		.join(' ');
}

// Lightweight lookup map for Pokemon basic info (id -> { name, nationalNo })
const POKEMON_LOOKUP = new Map<number, { name: string; nationalNo: number }>();
for (const p of pokemonData as { id: number; name: string; nationalNo: number }[]) {
	POKEMON_LOOKUP.set(p.id, { name: p.name, nationalNo: p.nationalNo });
}

export function MoveModal({
	move,
	onClose,
	theme,
}: {
	move: MoveModalData | null;
	onClose: () => void;
	theme: ReturnType<typeof useTheme>;
}) {
	const effectDescription = move?.description || 'No effect description is available.';
	const typeColor = move?.type ? (TYPE_COLORS[move.type.toLowerCase()] ?? theme.backgroundSelected) : theme.backgroundSelected;

	return (
		<Modal visible={move !== null} transparent animationType="slide" onRequestClose={onClose}>
			<View style={styles.modalBackdrop}>
				<Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close move details" />
				<View style={[styles.modalSheet, { backgroundColor: theme.background, borderColor: theme.backgroundSelected }]}>
					{move && (
						<ScrollView contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
							<View style={styles.modalHeader}>
								<View style={styles.listCopy}>
									<Text style={[styles.eyebrow, { color: theme.textSecondary }]}>
										{move.machine ? `${move.machine} • MOVE DETAILS` : 'MOVE DETAILS'}
									</Text>
									<Text style={[styles.modalTitle, { color: theme.text }]}>{titleCase(move.name)}</Text>
								</View>
								<Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close move details" style={[styles.closeButton, { backgroundColor: theme.backgroundElement }]}>
									<Text style={[styles.closeText, { color: theme.text }]}>Close</Text>
								</Pressable>
							</View>

							<View style={styles.moveFacts}>
								<View style={[styles.moveFact, { backgroundColor: theme.backgroundElement }]}>
									<Text style={[styles.factLabel, { color: theme.textSecondary }]}>TYPE</Text>
									<View style={styles.typeBadgeRow}>
										<View style={[styles.typeColorDot, { backgroundColor: typeColor }]} />
										<Text style={[styles.factValue, { color: theme.text }]}>{titleCase(move.type)}</Text>
									</View>
								</View>
								<MoveFact label="Category" value={titleCase(move.category)} theme={theme} />
								<MoveFact label="Power" value={move.power === null ? '—' : String(move.power)} theme={theme} />
								<MoveFact label="Accuracy" value={move.accuracy === null ? '—' : `${move.accuracy}%`} theme={theme} />
								<MoveFact label="PP" value={move.pp === null ? '—' : String(move.pp)} theme={theme} />
							</View>

							<View style={[styles.effectBox, { backgroundColor: theme.backgroundElement }]}>
								<Text style={[styles.factLabel, { color: theme.textSecondary }]}>EFFECT</Text>
								<Text style={[styles.effectText, { color: theme.text }]}>{effectDescription}</Text>
							</View>

							{move.pokemonIds && move.pokemonIds.length > 0 && (
								<View style={styles.learnersSection}>
									<Text style={[styles.factLabel, { color: theme.textSecondary, marginBottom: Spacing.two }]}>
										CAN LEARN THIS TM ({move.pokemonIds.length})
									</Text>
									<View style={styles.learnerChips}>
										{move.pokemonIds.map((pokemonId) => {
											const poke = POKEMON_LOOKUP.get(pokemonId);
											const pokeName = poke ? titleCase(poke.name) : `Pokémon #${pokemonId}`;
											const dexNo = poke ? `#${String(poke.nationalNo).padStart(3, '0')}` : `#${pokemonId}`;
											return (
												<Pressable
													key={pokemonId}
													accessibilityRole="button"
													accessibilityLabel={`Open details for ${pokeName}`}
													onPress={() => {
														onClose();
														router.push(`/pokemon/${pokemonId}`);
													}}
													style={({ pressed }) => [
														styles.learnerChip,
														{ backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected, opacity: pressed ? 0.65 : 1 },
													]}>
													<Text style={[styles.learnerDex, { color: theme.textSecondary }]}>{dexNo}</Text>
													<Text style={[styles.learnerName, { color: theme.text }]}>{pokeName}</Text>
												</Pressable>
											);
										})}
									</View>
								</View>
							)}
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
	modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.48)' },
	modalSheet: { width: '100%', maxWidth: 680, maxHeight: '85%', alignSelf: 'center', borderWidth: 1, borderTopLeftRadius: 12, borderTopRightRadius: 12, overflow: 'hidden' },
	modalContent: { padding: Spacing.three, gap: Spacing.three },
	modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: Spacing.two },
	listCopy: { flex: 1, gap: Spacing.one },
	eyebrow: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
	modalTitle: { fontSize: 23, lineHeight: 29, fontWeight: '700', textTransform: 'capitalize' },
	closeButton: { minHeight: 38, justifyContent: 'center', paddingHorizontal: Spacing.two, borderRadius: 5 },
	closeText: { fontSize: 13, fontWeight: '700' },
	moveFacts: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
	moveFact: { flexGrow: 1, minWidth: 96, minHeight: 60, justifyContent: 'center', gap: Spacing.one, padding: Spacing.two, borderRadius: 5 },
	typeBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
	typeColorDot: { width: 8, height: 8, borderRadius: 4 },
	factLabel: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
	factValue: { fontSize: 14, fontWeight: '700' },
	effectBox: { gap: Spacing.two, padding: Spacing.three, borderRadius: 5 },
	effectText: { fontSize: 14, lineHeight: 21 },
	learnersSection: { gap: Spacing.one, marginTop: Spacing.one },
	learnerChips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
	learnerChip: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one, paddingHorizontal: Spacing.two, paddingVertical: 6, borderRadius: 6, borderWidth: 1 },
	learnerDex: { fontSize: 11, fontWeight: '700' },
	learnerName: { fontSize: 12, fontWeight: '600' },
});
