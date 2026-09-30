import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

type StatusMap = Record<string, boolean>;
type StatusType = 'caught' | 'livingDex';

type AppContextValue = {
	activeGame: string;
	caughtMap: StatusMap;
	livingDexMap: StatusMap;
	setActiveGame: (gameId: string) => Promise<void>;
	toggleCaught: (gameId: string, pokemonId: number) => Promise<void>;
	toggleLivingDex: (gameId: string, pokemonId: number) => Promise<void>;
	batchUpdateStatus: (gameId: string, pokemonIds: number[], statusType: StatusType, value: boolean) => Promise<void>;
};

const STORAGE_KEYS = {
	activeGame: '@pokedex/activeGame',
	caughtMap: '@pokedex/caughtMap',
	livingDexMap: '@pokedex/livingDexMap',
} as const;

const AppContext = createContext<AppContextValue | undefined>(undefined);

function parseStatusMap(value: string | null): StatusMap {
	if (!value) return {};

	try {
		const parsed: unknown = JSON.parse(value);
		if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return {};
		return Object.fromEntries(
			Object.entries(parsed).filter((entry): entry is [string, boolean] => typeof entry[1] === 'boolean'),
		);
	} catch {
		return {};
	}
}

export function AppProvider({ children }: { children: ReactNode }) {
	const [activeGame, setActiveGameState] = useState('soulsilver');
	const [caughtMap, setCaughtMap] = useState<StatusMap>({});
	const [livingDexMap, setLivingDexMap] = useState<StatusMap>({});
	const activeGameRef = useRef(activeGame);
	const caughtMapRef = useRef(caughtMap);
	const livingDexMapRef = useRef(livingDexMap);
	const hydrationRef = useRef<Promise<void> | null>(null);
	const mountedRef = useRef(true);
	const writeQueueRef = useRef<Promise<void>>(Promise.resolve());

	const ensureHydrated = useCallback(() => {
		if (!hydrationRef.current) {
			hydrationRef.current = Promise.all([
				AsyncStorage.getItem(STORAGE_KEYS.activeGame),
				AsyncStorage.getItem(STORAGE_KEYS.caughtMap),
				AsyncStorage.getItem(STORAGE_KEYS.livingDexMap),
			]).then(([storedGame, storedCaught, storedLivingDex]) => {
				if (!mountedRef.current) return;
				const nextGame = storedGame || 'soulsilver';
				const nextCaught = parseStatusMap(storedCaught);
				const nextLivingDex = parseStatusMap(storedLivingDex);
				activeGameRef.current = nextGame;
				caughtMapRef.current = nextCaught;
				livingDexMapRef.current = nextLivingDex;
				setActiveGameState(nextGame);
				setCaughtMap(nextCaught);
				setLivingDexMap(nextLivingDex);
			}).catch(() => undefined);
		}
		return hydrationRef.current;
	}, []);

	useEffect(() => {
		mountedRef.current = true;
		void ensureHydrated();
		return () => {
			mountedRef.current = false;
		};
	}, [ensureHydrated]);

	const persist = useCallback((key: string, value: string) => {
		const write = writeQueueRef.current.then(() => AsyncStorage.setItem(key, value));
		writeQueueRef.current = write.catch(() => undefined);
		return write;
	}, []);

	const setActiveGame = useCallback(async (gameId: string) => {
		await ensureHydrated();
		activeGameRef.current = gameId;
		setActiveGameState(gameId);
		await persist(STORAGE_KEYS.activeGame, gameId);
	}, [ensureHydrated, persist]);

	const updateStatus = useCallback(async (
		gameId: string,
		pokemonIds: number[],
		statusType: StatusType,
		value: boolean,
		toggle: boolean,
	) => {
		await ensureHydrated();
		const mapRef = statusType === 'caught' ? caughtMapRef : livingDexMapRef;
		const setMap = statusType === 'caught' ? setCaughtMap : setLivingDexMap;
		const storageKey = statusType === 'caught' ? STORAGE_KEYS.caughtMap : STORAGE_KEYS.livingDexMap;
		const nextMap = { ...mapRef.current };

		for (const pokemonId of pokemonIds) {
			const key = `${gameId}_${pokemonId}`;
			nextMap[key] = toggle ? !nextMap[key] : value;
		}

		mapRef.current = nextMap;
		setMap(nextMap);
		await persist(storageKey, JSON.stringify(nextMap));
	}, [ensureHydrated, persist]);

	const toggleCaught = useCallback(
		(gameId: string, pokemonId: number) => updateStatus(gameId, [pokemonId], 'caught', false, true),
		[updateStatus],
	);

	const toggleLivingDex = useCallback(
		(gameId: string, pokemonId: number) => updateStatus(gameId, [pokemonId], 'livingDex', false, true),
		[updateStatus],
	);

	const batchUpdateStatus = useCallback(
		(gameId: string, pokemonIds: number[], statusType: StatusType, value: boolean) =>
			updateStatus(gameId, pokemonIds, statusType, value, false),
		[updateStatus],
	);

	return (
		<AppContext.Provider
			value={{ activeGame, caughtMap, livingDexMap, setActiveGame, toggleCaught, toggleLivingDex, batchUpdateStatus }}
		>
			{children}
		</AppContext.Provider>
	);
}

export function useAppContext() {
	const context = useContext(AppContext);
	if (!context) throw new Error('useAppContext must be used within an AppProvider');
	return context;
}
