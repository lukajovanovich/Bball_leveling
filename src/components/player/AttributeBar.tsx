import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ATTRIBUTE_MAX, ATTRIBUTE_MIN, displayRating } from '../../lib/progression';
import { colors, fonts, radii, spacing } from '../../theme/theme';

interface AttributeBarProps {
  name: string;
  value: number;
  color: string;
}

export const AttributeBar = ({ name, value, color }: AttributeBarProps) => {
  const progress = Math.max(
    0,
    Math.min(1, (value - ATTRIBUTE_MIN) / (ATTRIBUTE_MAX - ATTRIBUTE_MIN))
  );

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Text style={styles.name}>{name}</Text>
        <Text style={styles.value}>{displayRating(value)}</Text>
      </View>
      <View style={styles.track}>
        <View
          testID="attribute-bar-fill"
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
    gap: 6
  },
  row: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: spacing.md
  },
  name: {
    flex: 1,
    color: colors.text,
    fontFamily: fonts.body,
    fontSize: 14
  },
  value: {
    minWidth: 30,
    textAlign: 'right',
    color: colors.text,
    fontFamily: fonts.displayBold,
    fontSize: 20,
    lineHeight: 22,
    fontVariant: ['tabular-nums']
  },
  track: {
    height: 4,
    borderRadius: radii.sm,
    backgroundColor: 'rgba(255,255,255,0.07)',
    overflow: 'hidden'
  },
  fill: {
    height: '100%',
    borderRadius: radii.sm
  }
});
