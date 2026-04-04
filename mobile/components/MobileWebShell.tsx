import { ReactNode } from 'react';
import {
  Dimensions,
  Platform,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';

const MAX_CONTENT_WIDTH = 520;

/**
 * On desktop browsers, keeps a phone-sized column so the app feels like mobile web / PWA.
 */
export function MobileWebShell({ children }: { children: ReactNode }) {
  const { width } = useWindowDimensions();
  const fallbackW = Dimensions.get('window').width;

  if (Platform.OS !== 'web') {
    return <>{children}</>;
  }

  // First paint on web can report width 0 — a 0-width column looks like a blank screen.
  const effectiveW = width > 0 ? width : fallbackW > 0 ? fallbackW : 375;
  const contentWidth = Math.min(effectiveW, MAX_CONTENT_WIDTH);

  return (
    <View style={styles.outer}>
      <View style={[styles.inner, { width: contentWidth, maxWidth: MAX_CONTENT_WIDTH }]}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    flex: 1,
    width: '100%',
    minHeight: '100%',
    alignItems: 'center',
    backgroundColor: '#f4f4f5',
  },
  inner: {
    flex: 1,
    minHeight: '100%',
    backgroundColor: '#fff',
  },
});
