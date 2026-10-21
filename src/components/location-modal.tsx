import { router } from 'expo-router';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import pokemonData from '../../assets/data/pokemon.json';
import { Spacing } from '../../src/constants/theme';
import type { useTheme } from '../../src/hooks/use-theme';

export type EncounterDetail = {
	minLevel: number;
	maxLevel: number;
	chance: number;
	method: string;
	conditions: string[];
};

export type PokemonVersionDetail = {
	version: string;
	maxChance: number;
	encounterDetails: EncounterDetail[];
};

export type LocationPokemon = {
	pokemonId: number;
	versionDetails: PokemonVersionDetail[];
};

export type LocationEntry = {
	id: number;
	name: string;
	pokemon: LocationPokemon[];
};

export type LocationModalData = {
	location: LocationEntry;
	activeVersion: string;
};

// Lightweight lookup map: id -> { name, nationalNo }
const POKEMON_LOOKUP = new Map<number, { name: string; nationalNo: number }>();
for (const p of pokemonData as { id: number; name: string; nationalNo: number }[]) {
	POKEMON_LOOKUP.set(p.id, { name: p.name, nationalNo: p.nationalNo });
}

export function formatLocationName(name: string): string {
	return name
		.split('-')
		.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
		.join(' ');
}

export function formatMethod(method: string): string {
	return method
		.split('-')
		.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
		.join(' ');
}

const METHOD_COLORS: Record<string, string> = {
	walk: '#4A7C5A',
	surf: '#3A78B0',
	'old-rod': '#6B5B3E',
	'good-rod': '#8B6E4A',
	'super-rod': '#A0562A',
	'rock-smash': '#8B5E3C',
	'honey-tree': '#B8860B',
	'pokeradar': '#6B3FA0',
	'gift': '#B04060',
};

export function LocationModal({
	data,
	onClose,
	theme,
}: {
	data: LocationModalData | null;
	onClose: () => void;
	theme: ReturnType<typeof useTheme>;
}) {
	if (!data) {
		return (
			<Modal visible={false} transparent animationType="slide" onRequestClose={onClose}>
				<View />
			</Modal>
		);
	}

	const { location, activeVersion } = data;

	// Get Pokémon available in the active version, sorted by best encounter rate desc
	const pokemonForVersion = location.pokemon
		.map((entry) => {
			const vd = entry.versionDetails.find((v) => v.version === activeVersion);
			return vd ? { pokemonId: entry.pokemonId, vd } : null;
		})
		.filter(Boolean) as { pokemonId: number; vd: PokemonVersionDetail }[];

	// Group by encounter method
	type MethodGroup = {
		method: string;
		entries: { pokemonId: number; minLevel: number; maxLevel: number; chance: number }[];
	};
	const methodMap = new Map<string, MethodGroup>();

	for (const { pokemonId, vd } of pokemonForVersion) {
		for (const detail of vd.encounterDetails) {
			if (!methodMap.has(detail.method)) {
				methodMap.set(detail.method, { method: detail.method, entries: [] });
			}
			const group = methodMap.get(detail.method)!;
			// Merge or add entry for this pokemon
			const existing = group.entries.find((e) => e.pokemonId === pokemonId);
			if (existing) {
				existing.minLevel = Math.min(existing.minLevel, detail.minLevel);
				existing.maxLevel = Math.max(existing.maxLevel, detail.maxLevel);
				existing.chance = Math.max(existing.chance, detail.chance);
			} else {
				group.entries.push({
					pokemonId,
					minLevel: detail.minLevel,
					maxLevel: detail.maxLevel,
					chance: detail.chance,
				});
			}
		}
	}

	// Sort entries within each group by chance desc
	const methodGroups = Array.from(methodMap.values()).map((g) => ({
		...g,
		entries: [...g.entries].sort((a, b) => b.chance - a.chance),
	}));

	// Sort method groups: walk first, then fishing rods, then surf, then rest
	const methodOrder = ['walk', 'surf', 'old-rod', 'good-rod', 'super-rod', 'rock-smash', 'honey-tree'];
	methodGroups.sort((a, b) => {
		const ai = methodOrder.indexOf(a.method);
		const bi = methodOrder.indexOf(b.method);
		return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
	});

	return (
		<Modal visible={data !== null} transparent animationType="slide" onRequestClose={onClose}>
			<View style={styles.modalBackdrop}>
				<Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close location details" />
				<View style={[styles.modalSheet, { backgroundColor: theme.background, borderColor: theme.backgroundSelected }]}>
					<ScrollView contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
						{/* Header */}
						<View style={styles.modalHeader}>
							<View style={styles.headerCopy}>
								<Text style={[styles.eyebrow, { color: theme.textSecondary }]}>LOCATION DETAILS</Text>
								<Text style={[styles.modalTitle, { color: theme.text }]}>{formatLocationName(location.name)}</Text>
							</View>
							<Pressable
								onPress={onClose}
								accessibilityRole="button"
								accessibilityLabel="Close location details"
								style={[styles.closeButton, { backgroundColor: theme.backgroundElement }]}>
								<Text style={[styles.closeText, { color: theme.text }]}>Close</Text>
							</Pressable>
						</View>

						{methodGroups.length === 0 ? (
							<View style={[styles.emptyBox, { backgroundColor: theme.backgroundElement }]}>
								<Text style={[styles.emptyText, { color: theme.textSecondary }]}>
									No encounters available for this game version.
								</Text>
							</View>
						) : (
							methodGroups.map((group) => {
								const methodColor = METHOD_COLORS[group.method] ?? '#5A6575';
								return (
									<View key={group.method} style={styles.methodSection}>
										<View style={[styles.methodHeader, { backgroundColor: methodColor }]}>
											<Text style={styles.methodHeaderText}>{formatMethod(group.method)}</Text>
										</View>
										{group.entries.map((entry) => {
											const poke = POKEMON_LOOKUP.get(entry.pokemonId);
											const pokeName = poke
												? entry.pokemonId !== poke.nationalNo
													? poke.name
															.split('-')
															.map((p) => p.charAt(0).toUpperCase() + p.slice(1))
															.join(' ')
													: poke.name
																.split('-')
																.map((p) => p.charAt(0).toUpperCase() + p.slice(1))
																.join(' ')
												: `Pokémon #${entry.pokemonId}`;
											const dexNo = poke
												? `#${String(poke.nationalNo).padStart(3, '0')}`
												: `#${entry.pokemonId}`;
											return (
												<Pressable
													key={entry.pokemonId}
													accessibilityRole="button"
													accessibilityLabel={`Open details for ${pokeName}`}
													onPress={() => {
														onClose();
														router.push(`/pokemon/${entry.pokemonId}`);
													}}
													style={({ pressed }) => [
														styles.encounterRow,
														{
															backgroundColor: pressed ? theme.backgroundSelected : theme.backgroundElement,
															borderBottomColor: theme.backgroundSelected,
														},
													]}>
													<View style={styles.encounterLeft}>
														<Text style={[styles.dexNo, { color: theme.textSecondary }]}>{dexNo}</Text>
														<Text style={[styles.pokeName, { color: theme.text }]}>{pokeName}</Text>
													</View>
													<View style={styles.encounterRight}>
														<Text style={[styles.levelText, { color: theme.textSecondary }]}>
															Lv {entry.minLevel === entry.maxLevel ? entry.minLevel : `${entry.minLevel}–${entry.maxLevel}`}
														</Text>
														<View style={styles.chanceBar}>
															<Text style={[styles.chanceText, { color: theme.text }]}>{entry.chance}%</Text>
														</View>
													</View>
												</Pressable>
											);
										})}
									</View>
								);
							})
						)}
					</ScrollView>
				</View>
			</View>
		</Modal>
	);
}

const styles = StyleSheet.create({
	modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.48)' },
	modalSheet: {
		width: '100%',
		maxWidth: 680,
		maxHeight: '88%',
		alignSelf: 'center',
		borderWidth: 1,
		borderTopLeftRadius: 12,
		borderTopRightRadius: 12,
		overflow: 'hidden',
	},
	modalContent: { padding: Spacing.three, gap: Spacing.three },
	modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: Spacing.two },
	headerCopy: { flex: 1, gap: Spacing.one },
	eyebrow: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
	modalTitle: { fontSize: 21, lineHeight: 27, fontWeight: '700' },
	closeButton: { minHeight: 38, justifyContent: 'center', paddingHorizontal: Spacing.two, borderRadius: 5 },
	closeText: { fontSize: 13, fontWeight: '700' },
	emptyBox: { padding: Spacing.three, borderRadius: 7, alignItems: 'center' },
	emptyText: { fontSize: 14, textAlign: 'center' },
	methodSection: { borderRadius: 7, overflow: 'hidden' },
	methodHeader: { paddingHorizontal: Spacing.two, paddingVertical: 7 },
	methodHeaderText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800', letterSpacing: 0.5, textTransform: 'uppercase' },
	encounterRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: Spacing.two,
		paddingVertical: Spacing.two,
		borderBottomWidth: StyleSheet.hairlineWidth,
	},
	encounterLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
	dexNo: { fontSize: 11, fontWeight: '700', minWidth: 40 },
	pokeName: { fontSize: 14, fontWeight: '700' },
	encounterRight: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
	levelText: { fontSize: 11, fontWeight: '600' },
	chanceBar: { minWidth: 46, alignItems: 'flex-end' },
	chanceText: { fontSize: 12, fontWeight: '800' },
});

