import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, fonts, radii, spacing } from '../../theme/theme';

interface XPBarProps {
  current: number;
  target: number;
  label?: string;
  color?: string;
  /** Hide the "current / target XP" text when the bar does not measure XP. */
  showValue?: boolean;
}

export const XPBar = ({
  current,
  target,
  label = 'Progress to next level',
  color = colors.gold,
  showValue = true
}: XPBarProps) => {
  const ratio = target > 0 ? current / target : 0;
  const progress = Number.isFinite(ratio) ? Math.max(0, Math.min(1, ratio)) : 0;

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Text style={styles.label}>{label}</Text>
        {showValue ? (
          <Text style={styles.value}>
            {Math.round(current)} / {Math.round(target)} XP
          </Text>
        ) : null}
      </View>
      <View style={styles.track}>
        <View
          testID="xp-bar-fill"
          style={[
            styles.fill,
            {
              width: `${progress * 100}%`,
              backgroundColor: color
            }
          ]}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: spacing.md
  },
  label: {
    color: colors.textMuted,
    fontFamily: fonts.bodyMedium,
    fontSize: 13
  },
  value: {
    color: colors.text,
    fontFamily: fonts.display,
    fontSize: 16,
    fontVariant: ['tabular-nums']
  },
  track: {
    height: 6,
    borderRadius: radii.sm,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.08)'
  },
  fill: {
    height: '100%',
    borderRadius: radii.sm
  }
});
