import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';

import { useLoading } from '../../context/AppContext';
import { useTheme } from '../hooks/use-theme';

export default function LoadingOverlay() {
	const { loadingMessage, hideLoading } = useLoading();
	const theme = useTheme();
	const [failedMessage, setFailedMessage] = useState<string | null>(null);
	const imageFailed = failedMessage === loadingMessage;

	if (!loadingMessage) return null;

	return (
		<View style={styles.backdrop} pointerEvents="auto" accessibilityViewIsModal>
			<Pressable
				style={StyleSheet.absoluteFill}
				onPress={hideLoading}
				accessibilityRole="button"
				accessibilityLabel="Dismiss loading overlay"
			/>
			<View
				style={[
					styles.content,
					{ backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected },
				]}
				accessibilityRole="progressbar"
				accessibilityLabel={loadingMessage}>
				{imageFailed ? (
					<ActivityIndicator size="large" color={theme.text} />
				) : (
					<Image
						source={require('../../assets/images/pokeball load.gif')}
						style={styles.image}
						contentFit="contain"
						autoplay
						accessibilityLabel="Poké Ball loading animation"
						onError={() => setFailedMessage(loadingMessage)}
					/>
				)}
				<Text style={[styles.label, { color: theme.text }]}>{loadingMessage}</Text>
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	backdrop: {
		position: 'absolute',
		top: 0,
		left: 0,
		right: 0,
		bottom: 0,
		zIndex: 99999,
		elevation: 99999,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: 'rgba(0, 0, 0, 0.45)',
	},
	content: {
		alignItems: 'center',
		justifyContent: 'center',
		gap: 12,
		paddingHorizontal: 24,
		paddingVertical: 20,
		borderRadius: 16,
		borderWidth: 1,
		minWidth: 180,
		maxWidth: 280,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.25,
		shadowRadius: 8,
		elevation: 10,
	},
	image: { width: 72, height: 72 },
	label: { fontSize: 13, fontWeight: '600', textAlign: 'center' },
});