import { Stack } from 'expo-router';
import { TouchableOpacity, Text } from 'react-native';
import { auth } from '../../src/lib/supabase';

export default function AppLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#0984e3' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '700' },
        headerRight: () => (
          <TouchableOpacity onPress={() => auth.signOut()} style={{ marginRight: 4 }}>
            <Text style={{ color: '#fff', fontWeight: '600' }}>Sign Out</Text>
          </TouchableOpacity>
        ),
      }}
    />
  );
}
