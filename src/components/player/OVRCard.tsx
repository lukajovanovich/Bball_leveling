import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, radii, shadows, spacing } from '../../theme/theme';

interface OVRCardProps {
  ovr: number;
  level: number;
  name: string;
  position: string;
  archetype: string;
}

export const OVRCard = ({
  ovr,
  level,
  name,
  position,
  archetype
}: OVRCardProps) => (
  <LinearGradient
    colors={[colors.panelElevated, '#171322', colors.panel]}
    start={{ x: 0, y: 0 }}
    end={{ x: 1, y: 1 }}
    style={styles.card}
  >
    <View style={styles.topRow}>
      <View style={styles.identity}>
        <Text style={styles.kicker}>MyPlayer</Text>
        <Text style={styles.name}>{name}</Text>
        <Text style={styles.meta}>
          {position} · {archetype}
        </Text>
      </View>
      <View style={styles.levelBadge}>
        <Text style={styles.levelLabel}>LVL</Text>
        <Text style={styles.level}>{level}</Text>
      </View>
    </View>
    <View style={styles.ratingRow}>
      <View>
        <Text style={styles.ovr}>{ovr}</Text>
        <Text style={styles.ovrLabel}>OVR</Text>
      </View>
      <View style={styles.ratingCopy}>
        <Text style={styles.ratingTitle}>Live build rating</Text>
        <Text style={styles.ratingText}>
          Train in real life, convert reps into XP, and grow the ratings that
          define your player.
        </Text>
      </View>
    </View>
  </LinearGradient>
);

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    padding: spacing.xl,
    gap: spacing.xl,
    overflow: 'hidden',
    ...shadows.card
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.lg
  },
  identity: {
    flex: 1,
    gap: spacing.xs
  },
  kicker: {
    color: colors.gold,
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase'
  },
  name: {
    color: colors.text,
    fontSize: 27,
    lineHeight: 32,
    fontWeight: '900'
  },
  meta: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700'
  },
  levelBadge: {
    width: 62,
    height: 62,
    borderRadius: radii.lg,
    backgroundColor: 'rgba(248,214,109,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(248,214,109,0.35)',
    alignItems: 'center',
    justifyContent: 'center'
  },
  levelLabel: {
    color: colors.gold,
    fontSize: 11,
    fontWeight: '900'
  },
  level: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '900'
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xl
  },
  ovr: {
    color: colors.text,
    fontSize: 64,
    lineHeight: 68,
    fontWeight: '900'
  },
  ovrLabel: {
    color: colors.gold,
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0
  },
  ratingCopy: {
    flex: 1,
    gap: spacing.xs
  },
  ratingTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '900'
  },
  ratingText: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '600'
  }
});
