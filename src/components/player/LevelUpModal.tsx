import React from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useProgress } from '../../store/ProgressContext';
import { colors, radii, shadows, spacing } from '../../theme/theme';
import { PrimaryButton } from '../ui/PrimaryButton';

export const LevelUpModal = () => {
  const { state, dismissLevelUp } = useProgress();
  const levelUp = state.lastLevelUp;

  return (
    <Modal visible={Boolean(levelUp)} transparent animationType="fade">
      <View style={styles.overlay}>
        <LinearGradient
          colors={[colors.panelElevated, '#1A1320', colors.panel]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.card}
        >
          <View style={styles.iconShell}>
            <Ionicons name="star" size={32} color={colors.black} />
          </View>
          <Text style={styles.kicker}>Level Up</Text>
          <Text style={styles.level}>Level {levelUp?.level}</Text>
          <Text style={styles.copy}>
            Your real work paid off. Your player profile just jumped from Level{' '}
            {levelUp?.previousLevel}.
          </Text>
          <PrimaryButton label="Keep Grinding" icon="arrow-forward" onPress={dismissLevelUp} />
        </LinearGradient>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    backgroundColor: 'rgba(0,0,0,0.72)'
  },
  card: {
    width: '100%',
    maxWidth: 420,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.lg,
    ...shadows.card
  },
  iconShell: {
    width: 72,
    height: 72,
    borderRadius: radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.gold
  },
  kicker: {
    color: colors.gold,
    fontSize: 13,
    fontWeight: '900',
    textTransform: 'uppercase'
  },
  level: {
    color: colors.text,
    fontSize: 42,
    lineHeight: 46,
    fontWeight: '900'
  },
  copy: {
    color: colors.textMuted,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    fontWeight: '600'
  }
});
