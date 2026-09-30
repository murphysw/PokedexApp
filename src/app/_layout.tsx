import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { useColorScheme } from 'react-native';

import { AppProvider } from '../../context/AppContext';
import AppNavigationMenu from '@/components/app-navigation-menu';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? DarkTheme : DefaultTheme;
  return (
    <AppProvider>
      <ThemeProvider value={theme}>
        <Stack
          initialRouteName="(tabs)"
          screenOptions={{
            headerShown: true,
            headerLeft: () => <AppNavigationMenu />,
            headerStyle: { backgroundColor: theme.colors.card },
            headerTintColor: theme.colors.text,
            headerShadowVisible: false,
            contentStyle: { backgroundColor: theme.colors.background },
          }}>
          <Stack.Screen name="(tabs)" options={{ title: 'Pokédex' }} />
          <Stack.Screen name="pokemon/[id]" options={{ title: 'Pokémon' }} />
        </Stack>
      </ThemeProvider>
    </AppProvider>
  );
}
