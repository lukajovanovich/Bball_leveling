import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ATTRIBUTE_MAX, ATTRIBUTE_MIN } from '../../lib/progression';
import { colors, radii, spacing } from '../../theme/theme';

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
        <Text style={[styles.value, { color }]}>{value}</Text>
      </View>
      <View style={styles.track}>
        <View
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
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md
  },
  name: {
    flex: 1,
    color: colors.text,
    fontSize: 14,
    fontWeight: '800'
  },
  value: {
    width: 34,
    textAlign: 'right',
    fontSize: 15,
    fontWeight: '900'
  },
  track: {
    height: 9,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden'
  },
  fill: {
    height: '100%',
    borderRadius: radii.pill
  }
});
