import { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { auth } from '../src/lib/supabase';

export default function RootLayout() {
  const [user, setUser] = useState(undefined);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    setMounted(true);
    const unsubscribe = auth.onAuthStateChange((currentUser) => {
      setUser(currentUser ?? null);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!mounted || user === undefined) return;
    const inAuthGroup = segments[0] === '(auth)';
    if (!user && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (user && inAuthGroup) {
      router.replace('/(app)/stores');
    }
  }, [user, segments, mounted]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(app)" />
    </Stack>
  );
}
