import 'react-native-gesture-handler';
import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ProgressProvider } from '../src/store/ProgressContext';
import { AuthProvider } from '../src/store/AuthContext';
import { LevelUpModal } from '../src/components/player/LevelUpModal';

export default function RootLayout() {
  return (
    <AuthProvider>
      <ProgressProvider>
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false }} />
        <LevelUpModal />
      </ProgressProvider>
    </AuthProvider>
  );
}
