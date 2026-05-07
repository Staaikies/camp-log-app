import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { Stack } from 'expo-router';
import React, { useEffect } from 'react';
import { Pressable } from 'react-native';
import { Text } from 'react-native';

import 'react-native-reanimated';

import { DbGate } from '@/providers/DbProvider';

import { useColorScheme } from '@/components/useColorScheme';

import { SQLiteProvider } from 'expo-sqlite';

import { Link } from 'expo-router';

export {
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  initialRouteName: 'index',
};

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return <RootLayoutNav />;
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <SQLiteProvider
        databaseName="camp-log.db"
        options={{
          enableChangeListener: true,
        }}
      >
        <DbGate>
          <Stack>
            <Stack.Screen
              name="index"
              options={{
                title: 'Trip log',
                headerRight: () => (
                  <Link href="/trip/new" asChild>
                    <Pressable accessibilityRole="button" style={{ paddingHorizontal: 14 }}>
                      <Text style={{ color: '#007AFF', fontSize: 16, fontWeight: '600' }}>
                        Add log
                      </Text>
                    </Pressable>
                  </Link>
                ),
              }}
            />
            <Stack.Screen
              name="trip/new"
              options={{
                title: 'Add trip log',
                presentation: 'modal',
              }}
            />
            <Stack.Screen name="trip/[id]" options={{ title: 'Trip details' }} />
          </Stack>
        </DbGate>
      </SQLiteProvider>
    </ThemeProvider>
  );
}
