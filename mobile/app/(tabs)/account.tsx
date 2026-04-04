import { useClerk, useSignIn, useUser } from '@clerk/clerk-expo';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text as ThemedText } from '@/components/Themed';
import { useProviderApi } from '@/hooks/useProviderApi';
import { getResolvedBaseUrl } from '@/lib/oyadrop-api';

export default function AccountScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useUser();
  const { signOut } = useClerk();
  const { signIn, setActive, isLoaded } = useSignIn();
  const {
    api,
    manualToken,
    setManualToken,
    saveManualToken,
    clearManualToken,
    isSignedIn,
    canCallApis,
  } = useProviderApi();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [profileJson, setProfileJson] = useState<string | null>(null);

  const baseUrl = getResolvedBaseUrl();

  const onClerkSignIn = async () => {
    if (!isLoaded || !signIn || !setActive) return;
    const id = email.trim();
    if (!id || !password) {
      Alert.alert('Missing fields', 'Enter email and password.');
      return;
    }
    setBusy(true);
    try {
      const result = await signIn.create({
        identifier: id,
        password,
      });
      if (result.status === 'complete' && result.createdSessionId) {
        await setActive({ session: result.createdSessionId });
        setPassword('');
      } else {
        Alert.alert(
          'Sign in',
          'Additional verification may be required in the Clerk dashboard for this account.'
        );
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      Alert.alert('Sign in failed', msg);
    } finally {
      setBusy(false);
    }
  };

  const onSyncUser = async () => {
    if (!canCallApis) return;
    setBusy(true);
    try {
      await api('/sync-user', 'POST');
      Alert.alert('Synced', 'User synced with OyaDrop provider API.');
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const onLoadProfile = async () => {
    if (!canCallApis) return;
    setBusy(true);
    try {
      const data = await api('/providers/me');
      setProfileJson(JSON.stringify(data, null, 2));
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 24 },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <ThemedText style={styles.title}>Account</ThemedText>
        <ThemedText style={styles.sub}>
          API base:{' '}
          <ThemedText style={styles.mono}>{baseUrl}</ThemedText>
        </ThemedText>

        {isSignedIn && user ? (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Signed in</Text>
            <Text style={styles.cardValue}>
              {user.primaryEmailAddress?.emailAddress ?? user.username ?? user.id}
            </Text>
            <Pressable
              style={[styles.btn, styles.btnOutline]}
              onPress={() => signOut()}
            >
              <Text style={styles.btnOutlineText}>Sign out</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Clerk sign in</Text>
            <TextInput
              style={styles.input}
              placeholder="Email or username"
              placeholderTextColor="#888"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor="#888"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
            <Pressable
              style={[styles.btn, styles.btnPrimary, busy && styles.disabled]}
              onPress={onClerkSignIn}
              disabled={busy || !isLoaded}
            >
              {busy ? (
                <ActivityIndicator color="#022c22" />
              ) : (
                <Text style={styles.btnPrimaryText}>Sign in</Text>
              )}
            </Pressable>
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.cardLabel}>Bearer token (fallback)</Text>
          <Text style={styles.hint}>
            Same as the web console: paste a JWT if you are not using Clerk on
            this device.
          </Text>
          <TextInput
            style={styles.input}
            placeholder="Optional manual token"
            placeholderTextColor="#888"
            secureTextEntry
            value={manualToken}
            onChangeText={setManualToken}
          />
          <View style={styles.row}>
            <Pressable
              style={[styles.btnSmall, styles.btnPrimary]}
              onPress={() => {
                void saveManualToken();
                Alert.alert('Saved', 'Token stored securely on device.');
              }}
            >
              <Text style={styles.btnPrimaryText}>Save</Text>
            </Pressable>
            <Pressable
              style={[styles.btnSmall, styles.btnOutline]}
              onPress={() => {
                void clearManualToken();
              }}
            >
              <Text style={styles.btnOutlineText}>Clear</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>Provider</Text>
          <Pressable
            style={[styles.btn, styles.btnPrimary, (!canCallApis || busy) && styles.disabled]}
            onPress={onSyncUser}
            disabled={!canCallApis || busy}
          >
            <Text style={styles.btnPrimaryText}>Sync user</Text>
          </Pressable>
          <Pressable
            style={[styles.btn, styles.btnOutline, (!canCallApis || busy) && styles.disabled]}
            onPress={onLoadProfile}
            disabled={!canCallApis || busy}
          >
            <Text style={styles.btnOutlineText}>Load provider profile</Text>
          </Pressable>
          {profileJson ? (
            <Text selectable style={styles.profileBlock}>
              {profileJson}
            </Text>
          ) : null}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 4,
  },
  sub: {
    fontSize: 13,
    opacity: 0.65,
    marginBottom: 20,
  },
  mono: {
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
    fontSize: 12,
  },
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(128,128,128,0.35)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    gap: 10,
  },
  cardLabel: {
    fontSize: 13,
    fontWeight: '600',
    opacity: 0.7,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cardValue: {
    fontSize: 16,
    fontWeight: '500',
  },
  hint: {
    fontSize: 13,
    opacity: 0.65,
  },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(128,128,128,0.45)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 12 : 8,
    fontSize: 16,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  btn: {
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  btnSmall: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  btnPrimary: {
    backgroundColor: '#059669',
  },
  btnPrimaryText: {
    color: '#ecfdf5',
    fontWeight: '600',
    fontSize: 16,
  },
  btnOutline: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(128,128,128,0.45)',
  },
  btnOutlineText: {
    fontWeight: '600',
    fontSize: 16,
  },
  disabled: {
    opacity: 0.45,
  },
  profileBlock: {
    marginTop: 8,
    fontSize: 11,
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
  },
});
