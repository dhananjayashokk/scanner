import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert,
} from 'react-native';
import { auth } from '../../src/lib/api';

const DEMO_ACCOUNTS = [
  { label: 'GoGenie Staff', email: 'staff@gogenie.com', password: 'staff123' },
];

export default function LoginScreen() {
  const [loadingDemo, setLoadingDemo] = useState(null);

  const handleDemoLogin = async (account) => {
    setLoadingDemo(account.email);
    const { error } = await auth.signInWithPassword({
      email: account.email,
      password: account.password,
    });
    setLoadingDemo(null);
    if (error) Alert.alert('Login Failed', error.message);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.inner}>
        <View style={styles.brandSection}>
          <View style={styles.logoBox}>
            <Text style={styles.logoText}>G</Text>
          </View>
          <Text style={styles.brandName}>GoGenie</Text>
        </View>

        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>Quick Access</Text>
          <View style={styles.dividerLine} />
        </View>

        {DEMO_ACCOUNTS.map((account) => {
          const isLoading = loadingDemo === account.email;
          return (
            <TouchableOpacity
              key={account.email}
              style={[styles.demoButton, isLoading && { opacity: 0.6 }]}
              onPress={() => handleDemoLogin(account)}
              disabled={loadingDemo !== null}
            >
              {isLoading ? (
                <ActivityIndicator color="#4F46E5" />
              ) : (
                <View style={styles.demoInner}>
                  <View style={styles.demoAvatar}>
                    <Text style={styles.demoAvatarText}>{account.label[0]}</Text>
                  </View>
                  <View style={styles.demoInfo}>
                    <Text style={styles.demoLabel}>{account.label}</Text>
                    <Text style={styles.demoEmail}>{account.email}</Text>
                  </View>
                  <Text style={styles.demoArrow}>›</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  inner: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },

  brandSection: { alignItems: 'center', marginBottom: 48 },
  logoBox: {
    width: 72, height: 72, borderRadius: 20, backgroundColor: '#4F46E5',
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
    shadowColor: '#4F46E5', shadowOpacity: 0.35, shadowRadius: 16, shadowOffset: { width: 0, height: 6 },
    elevation: 10,
  },
  logoText: { fontSize: 34, fontWeight: '800', color: '#fff' },
  brandName: { fontSize: 30, fontWeight: '800', color: '#0F172A', letterSpacing: -0.5 },

  dividerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#E2E8F0' },
  dividerText: { marginHorizontal: 12, fontSize: 12, color: '#94A3B8', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },

  demoButton: {
    backgroundColor: '#fff', borderRadius: 16, paddingVertical: 16, paddingHorizontal: 16, marginBottom: 12,
    borderWidth: 1, borderColor: '#E2E8F0',
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  demoInner: { flexDirection: 'row', alignItems: 'center' },
  demoAvatar: {
    width: 44, height: 44, borderRadius: 13, backgroundColor: '#EEF2FF',
    alignItems: 'center', justifyContent: 'center', marginRight: 14,
  },
  demoAvatarText: { fontSize: 20, fontWeight: '700', color: '#4F46E5' },
  demoInfo: { flex: 1 },
  demoLabel: { fontSize: 16, fontWeight: '700', color: '#0F172A' },
  demoEmail: { fontSize: 13, color: '#94A3B8', marginTop: 2 },
  demoArrow: { fontSize: 22, color: '#CBD5E1' },
});
