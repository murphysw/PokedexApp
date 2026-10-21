import { Stack } from 'expo-router';

export default function ToolsLayout() {
  return (
    <Stack initialRouteName="type-matchup" screenOptions={{ headerShown: false }}>
      <Stack.Screen name="type-matchup" options={{ headerShown: false, title: 'Type Matchup' }} />
      <Stack.Screen name="tm-list" options={{ headerShown: false, title: 'TM / HM List', animation: 'none' }} />
      <Stack.Screen name="locations" options={{ headerShown: false, title: 'Locations', animation: 'none' }} />
    </Stack>
  );
}