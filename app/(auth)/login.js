import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { auth } from '../../src/lib/supabase';

const DEMO_ACCOUNTS = [
  { label: 'GoGenie Staff', email: 'staff@gogenie.com', password: 'demo1234', color: '#0984e3' },
];

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingDemo, setLoadingDemo] = useState(null);

  const handleLogin = async (loginEmail, loginPassword) => {
    const e = (loginEmail || email).trim();
    const p = loginPassword || password;
    if (!e || !p) {
      Alert.alert('Error', 'Please enter email and password.');
      return;
    }
    setLoading(true);
    const { error } = await auth.signInWithPassword({ email: e, password: p });
    setLoading(false);
    if (error) Alert.alert('Login Failed', error.message);
  };

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
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.inner}>
        <Text style={styles.title}>Staff Onboarding</Text>
        <Text style={styles.subtitle}>Sign in to continue</Text>

        <TextInput
          style={styles.input}
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry={true}
        />

        <TouchableOpacity style={[styles.button, loading && { opacity: 0.6 }]} onPress={() => handleLogin()} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Sign In</Text>}
        </TouchableOpacity>

        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>Demo Accounts</Text>
          <View style={styles.dividerLine} />
        </View>

        {DEMO_ACCOUNTS.map((account) => (
          <TouchableOpacity
            key={account.email}
            style={[styles.demoButton, { borderColor: account.color }, loadingDemo === account.email && { opacity: 0.6 }]}
            onPress={() => handleDemoLogin(account)}
            disabled={loadingDemo !== null}
          >
            {loadingDemo === account.email ? (
              <ActivityIndicator color={account.color} />
            ) : (
              <View style={styles.demoButtonInner}>
                <View style={[styles.demoDot, { backgroundColor: account.color }]} />
                <View>
                  <Text style={[styles.demoLabel, { color: account.color }]}>{account.label}</Text>
                  <Text style={styles.demoEmail}>{account.email}</Text>
                </View>
                <Text style={[styles.demoTap, { color: account.color }]}>Tap to login</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f6fa' },
  inner: { flex: 1, justifyContent: 'center', padding: 24 },
  title: { fontSize: 30, fontWeight: '800', color: '#2c3e50', marginBottom: 4 },
  subtitle: { fontSize: 15, color: '#7f8c8d', marginBottom: 32 },
  input: {
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#dfe6e9',
  },
  button: {
    backgroundColor: '#0984e3',
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 24 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#dfe6e9' },
  dividerText: { marginHorizontal: 12, fontSize: 12, color: '#b2bec3', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  demoButton: {
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1.5,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  demoButtonInner: { flexDirection: 'row', alignItems: 'center' },
  demoDot: { width: 10, height: 10, borderRadius: 5, marginRight: 12 },
  demoLabel: { fontSize: 14, fontWeight: '700' },
  demoEmail: { fontSize: 12, color: '#7f8c8d', marginTop: 1 },
  demoTap: { marginLeft: 'auto', fontSize: 12, fontWeight: '600' },
});
