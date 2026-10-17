import React, { useState, useMemo } from 'react';
import { Image } from 'expo-image';
import { Pressable, View, Text, Modal, StyleSheet, FlatList } from 'react-native';
import { router } from 'expo-router';
import { useAppContext } from '../../context/AppContext';
import { useTheme } from '../hooks/use-theme';
import { GAMES, GAME_IDS, type GameId } from '../../constants/games';
import pokemonData from '../../assets/data/pokemon.json';

// Build sprite map similar to the main list component
const spriteContext = require.context('../../assets/sprites', false, /\.png$/);
const SPRITE_BY_ID = new Map<number, any>();
for (const assetPath of spriteContext.keys()) {
  const spriteId = Number(assetPath.match(/(\d+)\.png$/)?.[1]);
  if (Number.isInteger(spriteId)) {
    SPRITE_BY_ID.set(spriteId, spriteContext(assetPath));
  }
}

type PokemonRecord = {
  id: number;
  name: string;
  localDexNumbers: Record<string, number>;
};
const POKEMON_MAP: Record<number, PokemonRecord> = (pokemonData as unknown as PokemonRecord[]).reduce(
  (acc, rec) => {
    acc[rec.id] = rec;
    return acc;
  },
  {} as Record<number, PokemonRecord>
);

export default function TeamQuickMenu() {
  const theme = useTheme();
  const { favoritesMap, activeGame } = useAppContext();
  const [modalVisible, setModalVisible] = useState(false);

  // Resolve current game object
  const validGameId = GAME_IDS.find((id: GameId) => id === activeGame) ?? 'soulsilver';
  const game = GAMES[validGameId];
  const favoriteIds = favoritesMap[game.versionGroupEngineKey] ?? [];

  const favoriteRecords = useMemo(() => {
    return favoriteIds.map((id: number) => POKEMON_MAP[id]).filter(Boolean);
  }, [favoriteIds]);

  const openPokemon = (id: number) => {
    setModalVisible(false);
    router.push({
      pathname: '/pokemon/[id]',
      params: { id: String(id), listMode: 'favorites' },
    });
  };

  return (
    <View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Team favorites, ${favoriteIds.length} Pokémon`}
        onPress={() => setModalVisible(true)}
        style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
      >
        {/* Simple Pokéball emoji as icon */}
        <Text style={{ fontSize: 24, color: theme.text }}>{'⚪'}</Text>
        {favoriteIds.length > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{favoriteIds.length}</Text>
          </View>
        )}
      </Pressable>
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalContent, { backgroundColor: theme.background }]}>
            <View style={styles.header}>
              <Text style={[styles.title, { color: theme.text }]}>Team Favorites</Text>
              <Pressable onPress={() => setModalVisible(false)}>
                <Text style={[styles.close, { color: theme.text }]}>✕</Text>
              </Pressable>
            </View>
            <FlatList
              data={favoriteRecords}
              keyExtractor={(item) => String(item.id)}
              renderItem={({ item }) => {
                const sprite = SPRITE_BY_ID.get(item.id);
                return (
                  <Pressable onPress={() => openPokemon(item.id)} style={styles.row}>
                    {sprite ? (
                      <Image source={sprite} style={styles.sprite} />
                    ) : (
                      <Text style={[styles.fallback, { color: theme.textSecondary }]}>{item.id}</Text>
                    )}
                    <Text style={[styles.name, { color: theme.text }]}>{item.name}</Text>
                  </Pressable>
                );
              }}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#F59E0B',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.48)',
    padding: 12,
  },
  modalContent: {
    maxHeight: '80%',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    padding: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  close: {
    fontSize: 18,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  sprite: {
    width: 40,
    height: 40,
    marginRight: 12,
  },
  fallback: {
    width: 40,
    height: 40,
    textAlign: 'center',
    lineHeight: 40,
    marginRight: 12,
  },
  name: {
    fontSize: 16,
  },
});
