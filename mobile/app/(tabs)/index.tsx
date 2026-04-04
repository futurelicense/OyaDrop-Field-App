import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text as ThemedText, View as ThemedView } from '@/components/Themed';
import { useProviderApi } from '@/hooks/useProviderApi';
import {
  normalizeOrderList,
  orderCustomerLabel,
  orderDisplayId,
  orderStatusLabel,
  type UnknownObject,
} from '@/lib/oyadrop-api';

export default function RequestsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { api, canCallApis, manualLoaded } = useProviderApi();
  const [orders, setOrders] = useState<UnknownObject[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!canCallApis) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api('/order-requests/available');
      setOrders(normalizeOrderList(data));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Request failed');
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [api, canCallApis]);

  useEffect(() => {
    if (manualLoaded && canCallApis) {
      void load();
    }
  }, [manualLoaded, canCallApis, load]);

  if (!manualLoaded) {
    return (
      <ThemedView style={[styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" />
      </ThemedView>
    );
  }

  if (!canCallApis) {
    return (
      <ThemedView style={[styles.center, styles.pad, { paddingTop: insets.top + 24 }]}>
        <ThemedText style={styles.hero}>Open Account</ThemedText>
        <ThemedText style={styles.muted}>
          Sign in with Clerk or save a bearer token to load delivery requests.
        </ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.headerRow}>
        <ThemedText style={styles.title}>Available requests</ThemedText>
        <Pressable
          onPress={() => load()}
          style={({ pressed }) => [
            styles.refreshBtn,
            { opacity: pressed ? 0.7 : 1 },
          ]}
        >
          {loading ? (
            <ActivityIndicator color="#059669" />
          ) : (
            <Text style={styles.refreshLabel}>Refresh</Text>
          )}
        </Pressable>
      </View>

      {error ? (
        <View style={styles.banner}>
          <Text style={styles.bannerText}>{error}</Text>
        </View>
      ) : null}

      <FlatList
        data={orders}
        keyExtractor={(item, index) => `${orderDisplayId(item)}-${index}`}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={load} tintColor="#059669" />
        }
        contentContainerStyle={
          orders.length === 0 ? styles.emptyList : styles.list
        }
        ListEmptyComponent={
          !loading ? (
            <ThemedText style={styles.muted}>
              No open requests. Pull to refresh.
            </ThemedText>
          ) : null
        }
        renderItem={({ item }) => {
          const id = orderDisplayId(item);
          return (
            <Pressable
              onPress={() => router.push(`/order/${encodeURIComponent(id)}`)}
              style={({ pressed }) => [
                styles.card,
                { opacity: pressed ? 0.85 : 1 },
              ]}
            >
              <Text style={styles.cardTitle}>#{id}</Text>
              <Text style={styles.cardLine}>{orderCustomerLabel(item)}</Text>
              <Text style={styles.cardMeta}>{orderStatusLabel(item)}</Text>
            </Pressable>
          );
        }}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pad: {
    paddingHorizontal: 24,
  },
  hero: {
    fontSize: 22,
    fontWeight: '600',
    marginBottom: 8,
  },
  muted: {
    fontSize: 15,
    opacity: 0.7,
    textAlign: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingVertical: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
  },
  refreshBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  refreshLabel: {
    color: '#059669',
    fontWeight: '600',
    fontSize: 16,
  },
  banner: {
    backgroundColor: 'rgba(220, 38, 38, 0.12)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  bannerText: {
    color: '#b91c1c',
    fontSize: 14,
  },
  list: {
    paddingBottom: 32,
    gap: 10,
  },
  emptyList: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 48,
  },
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(128,128,128,0.35)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 4,
  },
  cardLine: {
    fontSize: 15,
    opacity: 0.85,
  },
  cardMeta: {
    fontSize: 13,
    opacity: 0.55,
    marginTop: 6,
  },
});
