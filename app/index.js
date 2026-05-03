import { View, ActivityIndicator } from 'react-native';

// Root index — the _layout.js auth guard handles all redirects.
// This just prevents Expo Router's "Unmatched Route" error at /.
export default function Index() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
      <ActivityIndicator size="large" color="#4F46E5" />
    </View>
  );
}
