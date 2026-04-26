import { Stack } from 'expo-router';
import { TouchableOpacity, Text, View, StyleSheet } from 'react-native';
import { auth } from '../../src/lib/api';

export default function AppLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#4F46E5' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '700', fontSize: 17 },
        headerShadowVisible: false,
        headerRight: () => (
          <TouchableOpacity onPress={() => auth.signOut()} style={styles.signOutBtn}>
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        ),
      }}
    />
  );
}

const styles = StyleSheet.create({
  signOutBtn: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  signOutText: { color: '#fff', fontWeight: '600', fontSize: 13 },
});
