import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

type StatusMap = Record<string, boolean>;
type StatusType = 'caught' | 'livingDex';

function migrateLivingDexMap(statusMap: StatusMap): StatusMap {
	const globalMap: StatusMap = {};
	for (const [key, marked] of Object.entries(statusMap)) {
		const suffix = key.slice(key.lastIndexOf('_') + 1);
		const globalKey = /^\d+$/.test(suffix) ? suffix : key;
		globalMap[globalKey] = Boolean(globalMap[globalKey] || marked);
	}
	return globalMap;
}
export type StatusFilter = 'all' | 'marked' | 'unmarked';
export type ListFilterSettings = { caught: StatusFilter; livingDex: StatusFilter };

const DEFAULT_LIST_FILTERS: ListFilterSettings = { caught: 'all', livingDex: 'all' };

export type LoadingContextValue = {
	loadingMessage: string | null;
	showLoading: (message: string) => void;
	hideLoading: () => void;
};

type AppContextValue = {
	activeGame: string;
	caughtMap: StatusMap;
	livingDexMap: StatusMap;
	listFilters: ListFilterSettings;
	loadingMessage?: string | null;
	showLoading: (message: string) => void;
	hideLoading: () => void;
	setActiveGame: (gameId: string) => Promise<void>;
	setListFilters: (filters: Partial<ListFilterSettings>) => Promise<void>;
	toggleCaught: (gameId: string, pokemonId: number) => Promise<void>;
	toggleLivingDex: (gameId: string, pokemonId: number) => Promise<void>;
	batchUpdateStatus: (gameId: string, pokemonIds: number[], statusType: StatusType, value: boolean) => Promise<void>;
};

const STORAGE_KEYS = {
	activeGame: '@pokedex/activeGame',
	caughtMap: '@pokedex/caughtMap',
	livingDexMap: '@pokedex/livingDexMap',
	listFilters: '@pokedex/listFilters',
} as const;

const LoadingContext = createContext<LoadingContextValue>({
	loadingMessage: null,
	showLoading: () => {},
	hideLoading: () => {},
});

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

function parseListFilters(value: string | null): ListFilterSettings {
	if (!value) return DEFAULT_LIST_FILTERS;
	try {
		const parsed: unknown = JSON.parse(value);
		if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return DEFAULT_LIST_FILTERS;
		const filters = parsed as Partial<ListFilterSettings>;
		const validFilter = (filter: unknown): filter is StatusFilter =>
			filter === 'all' || filter === 'marked' || filter === 'unmarked';
		return {
			caught: validFilter(filters.caught) ? filters.caught : 'all',
			livingDex: validFilter(filters.livingDex) ? filters.livingDex : 'all',
		};
	} catch {
		return DEFAULT_LIST_FILTERS;
	}
}

export function LoadingProvider({ children }: { children: ReactNode }) {
	const [loadingMessage, setLoadingMessage] = useState<string | null>(null);
	const loadingMessageRef = useRef<string | null>(null);
	const showTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const showLoading = useCallback((message: string) => {
		if (showTimerRef.current) clearTimeout(showTimerRef.current);
		if (loadingMessageRef.current !== null) {
			loadingMessageRef.current = message;
			setLoadingMessage(message);
			return;
		}
		// Debounce by 100ms so operations completing rapidly don't flicker the spinner
		showTimerRef.current = setTimeout(() => {
			showTimerRef.current = null;
			loadingMessageRef.current = message;
			setLoadingMessage(message);
		}, 100);
	}, []);

	const hideLoading = useCallback(() => {
		if (showTimerRef.current) {
			clearTimeout(showTimerRef.current);
			showTimerRef.current = null;
		}
		if (loadingMessageRef.current !== null) {
			loadingMessageRef.current = null;
			setLoadingMessage(null);
		}
	}, []);

	useEffect(() => {
		return () => {
			if (showTimerRef.current) clearTimeout(showTimerRef.current);
		};
	}, []);

	const value = useMemo(
		() => ({ loadingMessage, showLoading, hideLoading }),
		[loadingMessage, showLoading, hideLoading],
	);

	return <LoadingContext.Provider value={value}>{children}</LoadingContext.Provider>;
}

export function useLoading() {
	return useContext(LoadingContext);
}

function AppDataProvider({ children }: { children: ReactNode }) {
	const { showLoading, hideLoading } = useLoading();
	const [activeGame, setActiveGameState] = useState('soulsilver');
	const [caughtMap, setCaughtMap] = useState<StatusMap>({});
	const [livingDexMap, setLivingDexMap] = useState<StatusMap>({});
	const [listFilters, setListFiltersState] = useState<ListFilterSettings>(DEFAULT_LIST_FILTERS);

	const activeGameRef = useRef(activeGame);
	const caughtMapRef = useRef(caughtMap);
	const livingDexMapRef = useRef(livingDexMap);
	const listFiltersRef = useRef(listFilters);
	const hydrationRef = useRef<Promise<void> | null>(null);
	const mountedRef = useRef(true);
	const writeQueueRef = useRef<Promise<void>>(Promise.resolve());

	const ensureHydrated = useCallback(() => {
		if (!hydrationRef.current) {
			hydrationRef.current = Promise.all([
				AsyncStorage.getItem(STORAGE_KEYS.activeGame),
				AsyncStorage.getItem(STORAGE_KEYS.caughtMap),
				AsyncStorage.getItem(STORAGE_KEYS.livingDexMap),
				AsyncStorage.getItem(STORAGE_KEYS.listFilters),
			]).then(([storedGame, storedCaught, storedLivingDex, storedFilters]) => {
				if (!mountedRef.current) return;
				const nextGame = storedGame || 'soulsilver';
				const nextCaught = parseStatusMap(storedCaught);
				const nextLivingDex = migrateLivingDexMap(parseStatusMap(storedLivingDex));
				const nextFilters = parseListFilters(storedFilters);
				activeGameRef.current = nextGame;
				caughtMapRef.current = nextCaught;
				livingDexMapRef.current = nextLivingDex;
				listFiltersRef.current = nextFilters;
				setActiveGameState(nextGame);
				setCaughtMap(nextCaught);
				setLivingDexMap(nextLivingDex);
				setListFiltersState(nextFilters);
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

	const setListFilters = useCallback(async (filters: Partial<ListFilterSettings>) => {
		await ensureHydrated();
		const nextFilters = { ...listFiltersRef.current, ...filters };
		listFiltersRef.current = nextFilters;
		setListFiltersState(nextFilters);
		await persist(STORAGE_KEYS.listFilters, JSON.stringify(nextFilters));
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
			const key = statusType === 'caught' ? `${gameId}_${pokemonId}` : String(pokemonId);
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

	const value = useMemo(
		() => ({
			activeGame,
			caughtMap,
			livingDexMap,
			listFilters,
			showLoading,
			hideLoading,
			setActiveGame,
			setListFilters,
			toggleCaught,
			toggleLivingDex,
			batchUpdateStatus,
		}),
		[
			activeGame,
			caughtMap,
			livingDexMap,
			listFilters,
			showLoading,
			hideLoading,
			setActiveGame,
			setListFilters,
			toggleCaught,
			toggleLivingDex,
			batchUpdateStatus,
		],
	);

	return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function AppProvider({ children }: { children: ReactNode }) {
	return (
		<LoadingProvider>
			<AppDataProvider>{children}</AppDataProvider>
		</LoadingProvider>
	);
}

export function useAppContext() {
	const context = useContext(AppContext);
	if (!context) throw new Error('useAppContext must be used within an AppProvider');
	return context;
}
