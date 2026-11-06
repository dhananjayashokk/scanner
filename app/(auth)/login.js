import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, TextInput, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { auth } from '../../src/lib/api';

export default function LoginScreen() {
  const [step, setStep] = useState('phone'); // 'phone' | 'otp'
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState([]);

  const isPhoneValid = /^\d{10}$/.test(phone);

  useEffect(() => {
    auth.getQuickAccessAccounts().then(({ accounts }) => setAccounts(accounts));
  }, []);

  // Staff phones are stored with the +91 prefix; quick-access rows already carry it.
  const requestOtpFor = async (fullPhone) => {
    setLoading(true);
    const { error } = await auth.requestOtp({ phone: fullPhone });
    setLoading(false);
    if (error) {
      Alert.alert('Error', error.message);
      return;
    }
    setPhone(fullPhone);
    setStep('otp');
  };

  // One-tap login for a listed staff account (dev OTP = last 4 digits of phone).
  const quickLogin = async (fullPhone) => {
    setLoading(true);
    const { error } = await auth.verifyOtp({ phone: fullPhone, otp: fullPhone.slice(-4) });
    setLoading(false);
    if (error) Alert.alert('Login failed', error.message);
    // On success, _layout.js auth listener navigates automatically
  };

  const handleRequestOtp = () => {
    if (!isPhoneValid) {
      Alert.alert('Enter Phone', 'Please enter a valid 10-digit mobile number.');
      return;
    }
    requestOtpFor(`+91${phone}`);
  };

  const handleVerifyOtp = async () => {
    if (!otp.trim()) {
      Alert.alert('Enter OTP', 'Please enter the OTP.');
      return;
    }
    setLoading(true);
    const { error } = await auth.verifyOtp({ phone: phone.trim(), otp: otp.trim() });
    setLoading(false);
    if (error) {
      Alert.alert('Invalid OTP', error.message);
    }
    // On success, _layout.js auth listener navigates automatically
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView style={styles.flex} behavior="padding">
      <ScrollView
        contentContainerStyle={styles.inner}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Brand */}
        <View style={styles.brandSection}>
          <View style={styles.logoBox}>
            <Text style={styles.logoText}>G</Text>
          </View>
          <Text style={styles.brandName}>GoGenie</Text>
          <Text style={styles.tagline}>Staff Portal</Text>
        </View>

        {step === 'phone' ? (
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>Enter your mobile number *</Text>
            <TextInput
              style={styles.input}
              placeholder="10-digit mobile number"
              placeholderTextColor="#94A3B8"
              value={phone}
              onChangeText={(v) => setPhone(v.replace(/\D/g, '').slice(0, 10))}
              keyboardType="number-pad"
              maxLength={10}
              autoCorrect={false}
              autoCapitalize="none"
            />
            {phone.length > 0 && !isPhoneValid && (
              <Text style={styles.errorText}>Mobile number must be exactly 10 digits</Text>
            )}
            <TouchableOpacity
              style={[styles.primaryButton, (loading || !isPhoneValid) && { opacity: 0.6 }]}
              onPress={handleRequestOtp}
              disabled={loading || !isPhoneValid}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryButtonText}>Send OTP</Text>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>Enter OTP</Text>
            <Text style={styles.formSubtitle}>Sent to {phone}</Text>
            <TextInput
              style={[styles.input, styles.otpInput]}
              placeholder="4-digit OTP"
              placeholderTextColor="#94A3B8"
              value={otp}
              onChangeText={setOtp}
              keyboardType="number-pad"
              maxLength={4}
              autoFocus
            />
            <Text style={styles.devHint}>Dev: use last 4 digits of your phone number</Text>
            <TouchableOpacity
              style={[styles.primaryButton, (loading || !otp.trim()) && { opacity: 0.6 }]}
              onPress={handleVerifyOtp}
              disabled={loading || !otp.trim()}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryButtonText}>Verify OTP</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => { setStep('phone'); setOtp(''); }}
              disabled={loading}
            >
              <Text style={styles.backButtonText}>Change number</Text>
            </TouchableOpacity>
          </View>
        )}

        {step === 'phone' && accounts.length > 0 && (
          <View style={styles.quickSection}>
            <View style={styles.quickDivider}>
              <View style={styles.quickLine} />
              <Text style={styles.quickLabel}>QUICK ACCESS</Text>
              <View style={styles.quickLine} />
            </View>
            {accounts.map((account) => (
              <TouchableOpacity
                key={account.id}
                style={styles.quickCard}
                onPress={() => quickLogin(account.phone)}
                disabled={loading}
                activeOpacity={0.75}
              >
                <View style={styles.quickAvatar}>
                  <Text style={styles.quickAvatarText}>{account.name?.[0]?.toUpperCase() || 'G'}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.quickName}>{account.name}</Text>
                  <Text style={styles.quickPhone}>{account.phone}</Text>
                </View>
                <View style={styles.quickButton}>
                  <Text style={styles.quickButtonText}>Login</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  flex: { flex: 1 },
  inner: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 24 },

  brandSection: { alignItems: 'center', marginBottom: 40 },
  logoBox: {
    width: 72, height: 72, borderRadius: 20, backgroundColor: '#4F46E5',
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
    shadowColor: '#4F46E5', shadowOpacity: 0.35, shadowRadius: 16, shadowOffset: { width: 0, height: 6 },
    elevation: 10,
  },
  logoText: { fontSize: 34, fontWeight: '800', color: '#fff' },
  brandName: { fontSize: 30, fontWeight: '800', color: '#0F172A', letterSpacing: -0.5 },
  tagline: { fontSize: 14, color: '#64748B', marginTop: 4, fontWeight: '500' },

  formCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  formTitle: { fontSize: 17, fontWeight: '700', color: '#0F172A', marginBottom: 6 },
  formSubtitle: { fontSize: 13, color: '#64748B', marginBottom: 16 },

  input: {
    borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 16, color: '#0F172A', backgroundColor: '#F8FAFC',
    marginBottom: 16,
  },
  otpInput: {
    fontSize: 24, fontWeight: '700', letterSpacing: 8, textAlign: 'center',
  },
  devHint: {
    fontSize: 11, color: '#94A3B8', textAlign: 'center', marginBottom: 16, fontStyle: 'italic',
  },

  primaryButton: {
    backgroundColor: '#4F46E5', borderRadius: 12,
    paddingVertical: 15, alignItems: 'center',
  },
  primaryButtonText: { color: '#fff', fontWeight: '700', fontSize: 16 },

  errorText: { fontSize: 12, color: '#EF4444', marginTop: -10, marginBottom: 12 },

  quickSection: { marginTop: 28 },
  quickDivider: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  quickLine: { flex: 1, height: 1, backgroundColor: '#E2E8F0' },
  quickLabel: { marginHorizontal: 12, fontSize: 12, fontWeight: '700', color: '#94A3B8', letterSpacing: 1 },
  quickCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 10,
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: '#F1F5F9',
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  quickAvatar: {
    width: 44, height: 44, borderRadius: 12, backgroundColor: '#EEF2FF',
    alignItems: 'center', justifyContent: 'center', marginRight: 14,
  },
  quickAvatarText: { fontSize: 18, fontWeight: '800', color: '#4F46E5' },
  quickName: { fontSize: 16, fontWeight: '700', color: '#0F172A' },
  quickPhone: { fontSize: 13, color: '#94A3B8', marginTop: 2 },
  quickButton: { backgroundColor: '#4F46E5', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 9, marginLeft: 8 },
  quickButtonText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  backButton: { marginTop: 14, alignItems: 'center' },
  backButtonText: { fontSize: 14, color: '#64748B', fontWeight: '500' },
});
