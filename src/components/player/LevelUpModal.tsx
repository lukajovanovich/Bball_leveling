import React from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';
import { useProgress } from '../../store/ProgressContext';
import { colors, fonts, radii, spacing } from '../../theme/theme';
import { PrimaryButton } from '../ui/PrimaryButton';

export const LevelUpModal = () => {
  const { state, dismissLevelUp } = useProgress();
  const levelUp = state.lastLevelUp;

  return (
    <Modal visible={Boolean(levelUp)} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.heading}>Level up</Text>
          <Text testID="level-up-level" style={styles.level}>
            {levelUp?.level}
          </Text>
          <Text style={styles.copy}>
            Up from level {levelUp?.previousLevel}. Your training is showing.
          </Text>
          <PrimaryButton
            label="Keep training"
            onPress={dismissLevelUp}
            style={styles.button}
          />
        </View>
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
    backgroundColor: 'rgba(2,4,10,0.82)'
  },
  card: {
    width: '100%',
    maxWidth: 380,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: 'rgba(242,207,107,0.35)',
    backgroundColor: colors.panel,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm
  },
  heading: {
    color: colors.gold,
    fontFamily: fonts.displayBold,
    fontSize: 24
  },
  level: {
    color: colors.text,
    fontFamily: fonts.displayBold,
    fontSize: 120,
    lineHeight: 124
  },
  copy: {
    color: colors.textMuted,
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center'
  },
  button: {
    alignSelf: 'stretch',
    marginTop: spacing.md
  }
});
