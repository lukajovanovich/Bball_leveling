import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/store/AuthContext';
import { useProgress } from '../../src/store/ProgressContext';
import { colors, fonts, spacing } from '../../src/theme/theme';

export default function TabsLayout() {
  const { isLoading: isAuthLoading } = useAuth();
  const { isHydrating } = useProgress();

  if (isAuthLoading || isHydrating) {
    return (
      <View style={styles.loadingRoot}>
        <ActivityIndicator size="large" color={colors.court} />
        <Text style={styles.loadingTitle}>Loading your player...</Text>
      </View>
    );
  }

  return (
    <Tabs
      initialRouteName="home"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.court,
        tabBarInactiveTintColor: colors.textSubtle,
        tabBarStyle: {
          height: 74,
          paddingTop: 8,
          paddingBottom: 12,
          backgroundColor: colors.background,
          borderTopColor: colors.border,
          borderTopWidth: 1
        },
        tabBarLabelStyle: {
          fontFamily: fonts.bodyMedium,
          fontSize: 12
        }
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          )
        }}
      />
      <Tabs.Screen
        name="attributes"
        options={{
          title: 'Build',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="stats-chart-outline" size={size} color={color} />
          )
        }}
      />
      <Tabs.Screen
        name="train"
        options={{
          title: 'Train',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="basketball-outline" size={size} color={color} />
          )
        }}
      />
      <Tabs.Screen
        name="quests"
        options={{
          title: 'Quests',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="flag-outline" size={size} color={color} />
          )
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size} color={color} />
          )
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  loadingRoot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.xl
  },
  loadingTitle: {
    color: colors.textMuted,
    fontFamily: fonts.bodyMedium,
    fontSize: 15
  }
});
