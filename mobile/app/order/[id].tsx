import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useProviderApi } from '@/hooks/useProviderApi';

export default function OrderDetailScreen() {
  const { id: rawId } = useLocalSearchParams<{ id: string }>();
  const id = useMemo(
    () => (typeof rawId === 'string' ? decodeURIComponent(rawId) : ''),
    [rawId]
  );
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { api, canCallApis, manualLoaded } = useProviderApi();
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const [detail, setDetail] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!canCallApis || !id) return;
    setBusy(true);
    try {
      const data = await api(`/order-requests/${id}`);
      setDetail(JSON.stringify(data, null, 2));
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }, [api, canCallApis, id]);

  const run = async (label: string, fn: () => Promise<void>) => {
    if (!canCallApis || !id) return;
    setBusy(true);
    try {
      await fn();
      Alert.alert(label, 'OK');
      await load();
    } catch (e) {
      Alert.alert(label + ' failed', e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  if (!manualLoaded) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!canCallApis) {
    return (
      <View style={[styles.center, styles.pad, { paddingTop: insets.top }]}>
        <Text style={styles.muted}>Sign in or add a token in Account.</Text>
        <Pressable onPress={() => router.back()} style={styles.linkBtn}>
          <Text style={styles.link}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={[
        styles.scroll,
        { paddingTop: 12, paddingBottom: insets.bottom + 24 },
      ]}
    >
      <Text style={styles.title}>Request #{id || '—'}</Text>

      <View style={styles.row}>
        <Pressable
          style={[styles.btn, styles.secondary, busy && styles.disabled]}
          onPress={() => load()}
          disabled={busy || !id}
        >
          <Text style={styles.secondaryText}>Refresh</Text>
        </Pressable>
        <Pressable
          style={[styles.btn, styles.secondary, busy && styles.disabled]}
          onPress={() => router.back()}
        >
          <Text style={styles.secondaryText}>Close</Text>
        </Pressable>
      </View>

      <Text style={styles.section}>Actions</Text>
      <View style={styles.grid}>
        <ActionButton
          title="Start"
          disabled={busy}
          onPress={() =>
            run('Start', async () => {
              await api(`/order-requests/${id}/start`, 'POST');
            })
          }
        />
        <ActionButton
          title="Contact"
          disabled={busy}
          onPress={() =>
            run('Contact', async () => {
              await api(`/order-requests/${id}/contact`);
            })
          }
        />
        <ActionButton
          title="Cancel"
          disabled={busy}
          onPress={() =>
            run('Cancel', async () => {
              await api(`/order-requests/${id}/cancel`, 'POST');
            })
          }
        />
        <ActionButton
          title="Reject"
          disabled={busy}
          onPress={() =>
            run('Reject', async () => {
              await api('/order-requests/reject', 'POST', { id });
            })
          }
        />
        <ActionButton
          title="Notify"
          disabled={busy}
          onPress={() =>
            run('Notify', async () => {
              await api('/order-requests/notify', 'POST', { id });
            })
          }
        />
      </View>

      <Text style={styles.section}>Update status</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. arrived"
        placeholderTextColor="#888"
        value={status}
        onChangeText={setStatus}
      />
      <Pressable
        style={[styles.btn, styles.primary, (busy || !status.trim()) && styles.disabled]}
        disabled={busy || !status.trim()}
        onPress={() =>
          run('Status', async () => {
            await api(`/order-requests/${id}/status`, 'POST', {
              status: status.trim(),
            });
          })
        }
      >
        <Text style={styles.primaryText}>Send status</Text>
      </Pressable>

      {detail ? (
        <>
          <Text style={styles.section}>Details</Text>
          <Text selectable style={styles.json}>
            {detail}
          </Text>
        </>
      ) : (
        <Pressable style={styles.loadHint} onPress={() => load()}>
          <Text style={styles.muted}>Tap Refresh to load request details</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

function ActionButton({
  title,
  onPress,
  disabled,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      style={[styles.action, disabled && styles.disabled]}
      onPress={onPress}
      disabled={disabled}
    >
      <Text style={styles.actionText}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pad: {
    paddingHorizontal: 24,
  },
  scroll: {
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 16,
  },
  section: {
    fontSize: 13,
    fontWeight: '600',
    opacity: 0.65,
    marginTop: 20,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 8,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  btn: {
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: {
    backgroundColor: '#059669',
    marginTop: 8,
  },
  primaryText: {
    color: '#ecfdf5',
    fontWeight: '600',
    fontSize: 16,
  },
  secondary: {
    flex: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(128,128,128,0.4)',
  },
  secondaryText: {
    fontWeight: '600',
    fontSize: 15,
  },
  action: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(128,128,128,0.35)',
    backgroundColor: 'rgba(5, 150, 105, 0.08)',
  },
  actionText: {
    fontWeight: '600',
    fontSize: 14,
    color: '#047857',
  },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(128,128,128,0.45)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
  },
  json: {
    fontSize: 11,
    fontFamily: Platform.select({
      ios: 'Menlo',
      android: 'monospace',
      default: 'monospace',
    }),
  },
  muted: {
    fontSize: 15,
    opacity: 0.65,
    textAlign: 'center',
  },
  linkBtn: {
    marginTop: 16,
  },
  link: {
    color: '#059669',
    fontWeight: '600',
    fontSize: 16,
  },
  loadHint: {
    marginTop: 24,
    padding: 16,
  },
  disabled: {
    opacity: 0.45,
  },
});
