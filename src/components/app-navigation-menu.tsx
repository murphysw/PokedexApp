import { useState } from 'react';
import { router, type Href } from 'expo-router';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const DESTINATIONS: { label: string; href: Href }[] = [
  { label: 'Pokédex', href: '/' as Href },
  { label: 'Type Matchup', href: '/tools/type-matchup' },
];

export default function AppNavigationMenu() {
  const theme = useTheme();
  const [visible, setVisible] = useState(false);

  const navigate = (href: Href) => {
    setVisible(false);
    router.replace(href);
  };

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Open navigation menu"
        accessibilityState={{ expanded: visible }}
        onPress={() => setVisible(true)}
        hitSlop={8}
        style={({ pressed }) => [styles.menuButton, { opacity: pressed ? 0.65 : 1 }]}>
        <View style={[styles.menuLine, { backgroundColor: theme.text }]} />
        <View style={[styles.menuLine, { backgroundColor: theme.text }]} />
        <View style={[styles.menuLine, { backgroundColor: theme.text }]} />
      </Pressable>

      <Modal visible={visible} transparent animationType="fade" onRequestClose={() => setVisible(false)}>
        <View style={styles.overlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setVisible(false)} accessibilityRole="button" accessibilityLabel="Close navigation menu" />
          <View style={[styles.menuPanel, { backgroundColor: theme.background, borderColor: theme.backgroundSelected }]}>
            <Text style={[styles.menuEyebrow, { color: theme.textSecondary }]}>NAVIGATE</Text>
            {DESTINATIONS.map((destination) => (
              <Pressable
                key={destination.label}
                accessibilityRole="link"
                onPress={() => navigate(destination.href)}
                style={({ pressed }) => [styles.menuItem, { borderBottomColor: theme.backgroundSelected, opacity: pressed ? 0.68 : 1 }]}>
                <Text style={[styles.menuItemText, { color: theme.text }]}>{destination.label}</Text>
                <Text style={[styles.menuArrow, { color: theme.textSecondary }]}>›</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  menuButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', gap: 4 },
  menuLine: { width: 19, height: 2, borderRadius: 1 },
  overlay: { flex: 1, paddingTop: 58, paddingHorizontal: Spacing.three, alignItems: 'flex-start', backgroundColor: 'rgba(0,0,0,0.28)' },
  menuPanel: { width: 240, borderWidth: 1, borderRadius: 7, paddingHorizontal: Spacing.three, paddingTop: Spacing.three, elevation: 5 },
  menuEyebrow: { paddingBottom: Spacing.two, fontSize: 10, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' },
  menuItem: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: StyleSheet.hairlineWidth },
  menuItemText: { fontSize: 15, fontWeight: '600' },
  menuArrow: { fontSize: 22 },
});