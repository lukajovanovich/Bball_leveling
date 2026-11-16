import React, { useEffect, useRef, useState } from 'react';
import {
  FlatList,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  StyleSheet,
  Text,
  View
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  MeasurementOption,
  findClosestMeasurementIndex
} from '../../lib/measurements';
import { colors, radii, shadows, spacing } from '../../theme/theme';

interface MeasurementPickerProps {
  label: string;
  helperText?: string;
  valueLabel: string;
  selectedUnit: string;
  unitOptions: ReadonlyArray<{ label: string; value: string }>;
  onUnitChange: (value: string) => void;
  options: MeasurementOption[];
  selectedValue: number;
  onValueChange: (value: number) => void;
}

const OPTION_HEIGHT = 58;
const VISIBLE_ROWS = 5;
const WHEEL_HEIGHT = OPTION_HEIGHT * VISIBLE_ROWS;
const WHEEL_SIDE_PADDING = OPTION_HEIGHT * 2;

export const MeasurementPicker = ({
  label,
  helperText,
  valueLabel,
  selectedUnit,
  unitOptions,
  onUnitChange,
  options,
  selectedValue,
  onValueChange
}: MeasurementPickerProps) => {
  const listRef = useRef<FlatList<MeasurementOption>>(null);
  const [isOpen, setIsOpen] = useState(false);
  const selectedIndex = findClosestMeasurementIndex(options, selectedValue);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const timeoutId = setTimeout(() => {
      listRef.current?.scrollToIndex({
        index: selectedIndex,
        animated: false
      });
    }, 0);

    return () => clearTimeout(timeoutId);
  }, [isOpen, selectedIndex, selectedUnit]);

  const syncSelectionFromOffset = (
    event: NativeSyntheticEvent<NativeScrollEvent>
  ) => {
    const nextIndex = Math.max(
      0,
      Math.min(options.length - 1, Math.round(event.nativeEvent.contentOffset.y / OPTION_HEIGHT))
    );
    const nextValue = options[nextIndex]?.value;

    if (typeof nextValue === 'number' && nextValue !== selectedValue) {
      onValueChange(nextValue);
    }
  };

  return (
    <>
      <Pressable
        accessibilityRole="button"
        onPress={() => setIsOpen(true)}
        style={({ pressed }) => [
          styles.trigger,
          pressed && styles.triggerPressed
        ]}
      >
        <View style={styles.triggerCopy}>
          <Text style={styles.triggerLabel}>{label}</Text>
          <Text style={styles.triggerHint}>Tap to edit</Text>
        </View>
        <View style={styles.triggerValueWrap}>
          <Text style={styles.triggerValue}>{valueLabel}</Text>
          <Ionicons name="chevron-down" size={18} color={colors.textMuted} />
        </View>
      </Pressable>

      <Modal
        animationType="fade"
        onRequestClose={() => setIsOpen(false)}
        transparent
        visible={isOpen}
      >
        <View style={styles.overlay}>
          <Pressable
            onPress={() => setIsOpen(false)}
            style={StyleSheet.absoluteFill}
          />

          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderCopy}>
                <Text style={styles.modalLabel}>{label}</Text>
                {helperText ? (
                  <Text style={styles.modalHelperText}>{helperText}</Text>
                ) : null}
              </View>

              <Pressable
                accessibilityRole="button"
                onPress={() => setIsOpen(false)}
                style={({ pressed }) => [
                  styles.doneButton,
                  pressed && styles.doneButtonPressed
                ]}
              >
                <Text style={styles.doneButtonText}>Done</Text>
              </Pressable>
            </View>

            <View style={styles.unitSwitch}>
              {unitOptions.map((option) => {
                const selected = selectedUnit === option.value;

                return (
                  <Pressable
                    key={option.value}
                    accessibilityRole="button"
                    onPress={() => onUnitChange(option.value)}
                    style={[
                      styles.unitButton,
                      selected && styles.unitButtonSelected
                    ]}
                  >
                    <Text
                      style={[
                        styles.unitButtonText,
                        selected && styles.unitButtonTextSelected
                      ]}
                    >
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.selectedValueWrap}>
              <Text style={styles.selectedValueLabel}>{valueLabel}</Text>
            </View>

            <View style={styles.wheelShell}>
              <View pointerEvents="none" style={styles.selectionHighlight} />

              <FlatList
                ref={listRef}
                testID="measurement-wheel"
                contentContainerStyle={styles.optionsContent}
                data={options}
                decelerationRate="fast"
                getItemLayout={(_, index) => ({
                  length: OPTION_HEIGHT,
                  offset: OPTION_HEIGHT * index,
                  index
                })}
                keyExtractor={(item) => `${item.value}`}
                onMomentumScrollEnd={syncSelectionFromOffset}
                onScrollEndDrag={syncSelectionFromOffset}
                onScrollToIndexFailed={({ index }) => {
                  setTimeout(() => {
                    listRef.current?.scrollToIndex({
                      index,
                      animated: false
                    });
                  }, 80);
                }}
                renderItem={({ item, index }) => {
                  const selected = index === selectedIndex;

                  return (
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => {
                        onValueChange(item.value);
                        setIsOpen(false);
                      }}
                      style={[
                        styles.optionRow,
                        !item.secondaryLabel && styles.optionRowCompact
                      ]}
                    >
                      <Text
                        style={[
                          styles.optionLabel,
                          selected && styles.optionLabelSelected
                        ]}
                      >
                        {item.label}
                      </Text>
                      {item.secondaryLabel ? (
                        <Text
                          style={[
                            styles.optionSecondaryLabel,
                            selected && styles.optionSecondaryLabelSelected
                          ]}
                        >
                          {item.secondaryLabel}
                        </Text>
                      ) : null}
                    </Pressable>
                  );
                }}
                showsVerticalScrollIndicator={false}
                snapToAlignment="start"
                snapToInterval={OPTION_HEIGHT}
                style={styles.wheelList}
              />
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  trigger: {
    minHeight: 58,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.backgroundSoft,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md
  },
  triggerPressed: {
    transform: [{ scale: 0.99 }]
  },
  triggerCopy: {
    flex: 1,
    gap: 2
  },
  triggerLabel: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '900'
  },
  triggerHint: {
    color: colors.textSubtle,
    fontSize: 12,
    fontWeight: '700'
  },
  triggerValueWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm
  },
  triggerValue: {
    color: colors.gold,
    fontSize: 15,
    fontWeight: '900'
  },
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    backgroundColor: 'rgba(0,0,0,0.68)'
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.panelElevated,
    padding: spacing.lg,
    gap: spacing.md,
    ...shadows.card
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md
  },
  modalHeaderCopy: {
    flex: 1,
    gap: spacing.xs
  },
  modalLabel: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '900'
  },
  modalHelperText: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '600'
  },
  doneButton: {
    minHeight: 34,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: 'rgba(248,214,109,0.24)',
    backgroundColor: 'rgba(248,214,109,0.12)',
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center'
  },
  doneButtonPressed: {
    transform: [{ scale: 0.98 }]
  },
  doneButtonText: {
    color: colors.gold,
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase'
  },
  unitSwitch: {
    flexDirection: 'row',
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'rgba(255,255,255,0.03)',
    padding: spacing.xs
  },
  unitButton: {
    flex: 1,
    minHeight: 40,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center'
  },
  unitButtonSelected: {
    backgroundColor: colors.panelHighlight
  },
  unitButtonText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '900'
  },
  unitButtonTextSelected: {
    color: colors.text
  },
  selectedValueWrap: {
    alignItems: 'center'
  },
  selectedValueLabel: {
    color: colors.gold,
    fontSize: 19,
    fontWeight: '900'
  },
  wheelShell: {
    height: WHEEL_HEIGHT,
    justifyContent: 'center'
  },
  selectionHighlight: {
    position: 'absolute',
    top: OPTION_HEIGHT * 2,
    left: 0,
    right: 0,
    height: OPTION_HEIGHT,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: 'rgba(248,214,109,0.2)',
    backgroundColor: 'rgba(248,214,109,0.08)'
  },
  wheelList: {
    flexGrow: 0
  },
  optionsContent: {
    paddingVertical: WHEEL_SIDE_PADDING
  },
  optionRow: {
    height: OPTION_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2
  },
  optionRowCompact: {
    gap: 0
  },
  optionLabel: {
    color: colors.textMuted,
    fontSize: 18,
    fontWeight: '800'
  },
  optionLabelSelected: {
    color: colors.gold,
    fontSize: 22,
    fontWeight: '900'
  },
  optionSecondaryLabel: {
    color: colors.textSubtle,
    fontSize: 12,
    fontWeight: '700'
  },
  optionSecondaryLabelSelected: {
    color: colors.textMuted
  }
});
