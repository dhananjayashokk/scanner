import { useEffect, useState } from 'react';
import { Stack, useRouter, usePathname } from 'expo-router';
import { auth } from '../src/lib/api';

export default function RootLayout() {
  const [user, setUser] = useState(undefined); // undefined = auth not yet determined
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    return auth.onAuthStateChange((currentUser) => {
      setUser(currentUser ?? null);
      if (currentUser) {
        router.replace('/(app)/organizations');
      }
    });
  }, []);

  useEffect(() => {
    if (user === undefined) return; // wait for auth state to be determined
    if (!user && pathname !== '/login') {
      router.replace('/(auth)/login');
    }
  }, [user, pathname]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(app)" />
    </Stack>
  );
}
