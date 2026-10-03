import { DarkTheme, Stack, ThemeProvider, usePathname } from 'expo-router';
import { useEffect } from 'react';

import AppNavigationMenu from '@/components/app-navigation-menu';
import LoadingOverlay from '@/components/loading-overlay';
import { AppProvider, useLoading } from '../../context/AppContext';

export default function RootLayout() {
	return (
		<AppProvider>
			<RootNavigator />
		</AppProvider>
	);
}

function RootNavigator() {
	const pathname = usePathname();
	const { hideLoading } = useLoading();
	const theme = DarkTheme;

	useEffect(() => {
		hideLoading();
	}, [hideLoading, pathname]);

	return (
		<ThemeProvider value={theme}>
			<Stack
				initialRouteName="(tabs)"
				screenOptions={{
					headerShown: true,
					animation: 'none',
					headerLeft: () => <AppNavigationMenu />,
					headerStyle: { backgroundColor: theme.colors.card },
					headerTintColor: theme.colors.text,
					headerShadowVisible: false,
					contentStyle: { backgroundColor: theme.colors.background },
				}}>
				<Stack.Screen name="(tabs)" options={{ title: 'Pokédex' }} />
				<Stack.Screen name="pokemon/[id]" options={{ headerTitle: '', animation: 'none', contentStyle: { backgroundColor: theme.colors.background }} } />
			</Stack>
			<LoadingOverlay />
		</ThemeProvider>
	);
}
