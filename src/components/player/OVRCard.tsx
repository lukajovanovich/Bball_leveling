import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, fonts, radii, spacing } from '../../theme/theme';

interface OVRCardProps {
  ovr: number;
  level: number;
  name: string;
  position: string;
  archetype: string;
}

// The one loud element in the app: the rating set like a jersey number, sitting
// on a faint half-court (three-point arc and restricted-area circle).
export const OVRCard = ({
  ovr,
  level,
  name,
  position,
  archetype
}: OVRCardProps) => (
  <View style={styles.card}>
    <View pointerEvents="none" style={styles.court}>
      <View style={styles.threePointArc} />
      <View style={styles.restrictedArc} />
    </View>

    <View style={styles.topRow}>
      <View style={styles.identity}>
        <Text style={styles.name}>{name}</Text>
        <Text style={styles.meta}>{position}</Text>
        <Text style={styles.meta}>{archetype}</Text>
      </View>
      <View style={styles.levelBlock}>
        <Text style={styles.levelLabel}>Level</Text>
        <Text style={styles.level}>{level}</Text>
      </View>
    </View>

    <View style={styles.ratingRow}>
      <Text style={styles.ovr}>{ovr}</Text>
      <Text style={styles.ovrLabel}>OVR</Text>
    </View>
  </View>
);

const ARC_SIZE = 420;
const RESTRICTED_SIZE = 150;

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.panel,
    padding: spacing.xl,
    paddingBottom: spacing.lg,
    gap: spacing.md,
    overflow: 'hidden'
  },
  court: {
    ...StyleSheet.absoluteFillObject
  },
  threePointArc: {
    position: 'absolute',
    width: ARC_SIZE,
    height: ARC_SIZE,
    borderRadius: ARC_SIZE / 2,
    borderWidth: 1.5,
    borderColor: 'rgba(224,123,57,0.22)',
    right: -ARC_SIZE / 2 + 40,
    bottom: -ARC_SIZE / 2 - 30
  },
  restrictedArc: {
    position: 'absolute',
    width: RESTRICTED_SIZE,
    height: RESTRICTED_SIZE,
    borderRadius: RESTRICTED_SIZE / 2,
    borderWidth: 1.5,
    borderColor: 'rgba(224,123,57,0.14)',
    right: 40 - RESTRICTED_SIZE / 2,
    bottom: -RESTRICTED_SIZE / 2 - 30
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.lg
  },
  identity: {
    flex: 1,
    gap: 2
  },
  name: {
    color: colors.text,
    fontFamily: fonts.displayBold,
    fontSize: 30,
    lineHeight: 34,
    marginBottom: spacing.xs
  },
  meta: {
    color: colors.textMuted,
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 19
  },
  levelBlock: {
    alignItems: 'flex-end'
  },
  levelLabel: {
    color: colors.textMuted,
    fontFamily: fonts.bodyMedium,
    fontSize: 13
  },
  level: {
    color: colors.gold,
    fontFamily: fonts.displayBold,
    fontSize: 34,
    lineHeight: 38
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm
  },
  ovr: {
    color: colors.text,
    fontFamily: fonts.displayBold,
    fontSize: 120,
    lineHeight: 120,
    letterSpacing: -2,
    fontVariant: ['tabular-nums']
  },
  ovrLabel: {
    color: colors.court,
    fontFamily: fonts.displayBold,
    fontSize: 22,
    marginBottom: 18
  }
});
