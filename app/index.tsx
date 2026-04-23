import React from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { colors, radii, shadows, spacing } from '../src/theme/theme';

export default function WelcomeScreen() {
  const { width } = useWindowDimensions();
  const maxWidth = width >= 760 ? 620 : undefined;

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={[colors.background, '#11111E', colors.backgroundSoft]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView style={styles.safeArea}>
        <View style={[styles.content, { maxWidth }]}>
          <View style={styles.brandRow}>
            <View style={styles.brandIcon}>
              <Ionicons name="basketball" size={24} color={colors.black} />
            </View>
            <Text style={styles.brand}>Bball Leveling</Text>
          </View>

          <View style={styles.hero}>
            <Text style={styles.kicker}>Real training. RPG progression.</Text>
            <Text style={styles.title}>
              Upgrade your basketball player by putting in real work.
            </Text>
            <Text style={styles.subtitle}>
              Log workouts, earn XP, complete quests, raise attributes, and watch
              your OVR climb like a living player build.
            </Text>
          </View>

          <LinearGradient
            colors={[colors.panelElevated, '#171321', colors.panel]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.previewCard}
          >
            <View style={styles.previewHeader}>
              <Text style={styles.previewLabel}>Starter Build</Text>
              <Text style={styles.previewOvr}>64 OVR</Text>
            </View>
            <View style={styles.previewBars}>
              {[
                { label: 'Shooting', value: '70%', color: colors.green },
                { label: 'Handle', value: '72%', color: colors.orange },
                { label: 'Athletic', value: '68%', color: colors.yellow }
              ].map((item) => (
                <View key={item.label} style={styles.previewBarGroup}>
                  <View style={styles.previewBarRow}>
                    <Text style={styles.previewBarLabel}>{item.label}</Text>
                    <Text style={[styles.previewBarValue, { color: item.color }]}>
                      {item.value}
                    </Text>
                  </View>
                  <View style={styles.previewTrack}>
                    <View
                      style={[
                        styles.previewFill,
                        {
                          width: item.value as `${number}%`,
                          backgroundColor: item.color
                        }
                      ]}
                    />
                  </View>
                </View>
              ))}
            </View>
          </LinearGradient>

          <Pressable
            accessibilityRole="button"
            onPress={() => router.replace('/home')}
            style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}
          >
            <Text style={styles.ctaText}>Enter MyPlayer</Text>
            <Ionicons name="arrow-forward" size={20} color={colors.black} />
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background
  },
  safeArea: {
    flex: 1,
    justifyContent: 'center'
  },
  content: {
    width: '100%',
    alignSelf: 'center',
    padding: spacing.xl,
    gap: spacing.xxl
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md
  },
  brandIcon: {
    width: 44,
    height: 44,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.gold
  },
  brand: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900'
  },
  hero: {
    gap: spacing.md
  },
  kicker: {
    color: colors.gold,
    fontSize: 13,
    fontWeight: '900',
    textTransform: 'uppercase'
  },
  title: {
    color: colors.text,
    fontSize: 42,
    lineHeight: 46,
    fontWeight: '900'
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '600'
  },
  previewCard: {
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    padding: spacing.xl,
    gap: spacing.xl,
    ...shadows.card
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.lg
  },
  previewLabel: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '900',
    textTransform: 'uppercase'
  },
  previewOvr: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '900'
  },
  previewBars: {
    gap: spacing.lg
  },
  previewBarGroup: {
    gap: spacing.sm
  },
  previewBarRow: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  previewBarLabel: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800'
  },
  previewBarValue: {
    fontSize: 13,
    fontWeight: '900'
  },
  previewTrack: {
    height: 9,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden'
  },
  previewFill: {
    height: '100%',
    borderRadius: radii.pill
  },
  cta: {
    minHeight: 56,
    borderRadius: radii.md,
    backgroundColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing.sm
  },
  ctaPressed: {
    transform: [{ scale: 0.98 }]
  },
  ctaText: {
    color: colors.black,
    fontSize: 16,
    fontWeight: '900'
  }
});
