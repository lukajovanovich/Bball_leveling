import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { PrimaryButton } from '../../src/components/ui/PrimaryButton';
import { ScreenContainer } from '../../src/components/ui/ScreenContainer';
import { SectionHeader } from '../../src/components/ui/SectionHeader';
import { StatPill } from '../../src/components/ui/StatPill';
import { XPBar } from '../../src/components/ui/XPBar';
import { colors } from '../../src/theme/theme';

const fillWidth = (testID: string) =>
  StyleSheet.flatten(screen.getByTestId(testID).props.style).width;

describe('PrimaryButton', () => {
  it('shows its label and reacts to a press', async () => {
    const onPress = jest.fn();
    await render(<PrimaryButton label="Log a workout" onPress={onPress} />);

    await fireEvent.press(screen.getByRole('button', { name: 'Log a workout' }));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('ignores presses while disabled', async () => {
    const onPress = jest.fn();
    await render(<PrimaryButton label="Sign in" onPress={onPress} disabled />);

    const button = screen.getByRole('button', { name: 'Sign in' });
    await fireEvent.press(button);

    expect(button).toBeDisabled();
    expect(onPress).not.toHaveBeenCalled();
  });

  it('renders with and without an icon', async () => {
    const { rerender } = await render(
      <PrimaryButton label="Save" icon="save" onPress={jest.fn()} />
    );
    expect(screen.getByText('Save')).toBeOnTheScreen();

    await rerender(<PrimaryButton label="Save" onPress={jest.fn()} />);
    expect(screen.getByText('Save')).toBeOnTheScreen();
  });
});

describe('XPBar', () => {
  it('shows rounded current and target XP with the default label', async () => {
    await render(<XPBar current={120.4} target={250} />);

    expect(screen.getByText('Progress to next level')).toBeOnTheScreen();
    expect(screen.getByText('120 / 250 XP')).toBeOnTheScreen();
  });

  it('uses a custom label', async () => {
    await render(<XPBar current={1} target={2} label="Level 3 progress" />);

    expect(screen.getByText('Level 3 progress')).toBeOnTheScreen();
  });

  it('fills the bar in proportion to progress', async () => {
    await render(<XPBar current={125} target={250} />);

    expect(fillWidth('xp-bar-fill')).toBe('50%');
  });

  it('never overflows past 100%', async () => {
    await render(<XPBar current={900} target={250} />);

    expect(fillWidth('xp-bar-fill')).toBe('100%');
  });

  it('never shows a negative or broken width', async () => {
    const { rerender } = await render(<XPBar current={-50} target={250} />);
    expect(fillWidth('xp-bar-fill')).toBe('0%');

    await rerender(<XPBar current={10} target={0} />);
    expect(fillWidth('xp-bar-fill')).toBe('0%');

    await rerender(<XPBar current={Number.NaN} target={250} />);
    expect(fillWidth('xp-bar-fill')).toBe('0%');
  });

  it('can hide the XP text for bars that do not measure XP', async () => {
    await render(<XPBar current={1} target={2} label="1 / 2" showValue={false} />);

    expect(screen.getByText('1 / 2')).toBeOnTheScreen();
    expect(screen.queryByText('1 / 2 XP')).not.toBeOnTheScreen();
    expect(fillWidth('xp-bar-fill')).toBe('50%');
  });

  it('uses the given color', async () => {
    await render(<XPBar current={1} target={2} color={colors.success} />);

    expect(screen.getByTestId('xp-bar-fill')).toHaveStyle({
      backgroundColor: colors.success
    });
  });
});

describe('StatPill', () => {
  it('shows text and numeric values', async () => {
    await render(
      <>
        <StatPill label="Position" value="Center" />
        <StatPill label="OVR" value={0} />
      </>
    );

    expect(screen.getByText('Position')).toBeOnTheScreen();
    expect(screen.getByText('Center')).toBeOnTheScreen();
    // 0 must render as "0", not disappear
    expect(screen.getByText('0')).toBeOnTheScreen();
  });
});

describe('SectionHeader', () => {
  it('shows the title and optional subtitle', async () => {
    const { rerender } = await render(
      <SectionHeader title="Daily quests" subtitle="Quick XP" />
    );

    expect(screen.getByText('Daily quests')).toBeOnTheScreen();
    expect(screen.getByText('Quick XP')).toBeOnTheScreen();

    await rerender(<SectionHeader title="Intensity" />);

    expect(screen.getByText('Intensity')).toBeOnTheScreen();
    expect(screen.queryByText('Quick XP')).not.toBeOnTheScreen();
  });
});

describe('ScreenContainer', () => {
  it('renders its children in both scrolling and fixed layouts', async () => {
    const { rerender } = await render(
      <ScreenContainer>
        <Text>Scrollable content</Text>
      </ScreenContainer>
    );
    expect(screen.getByText('Scrollable content')).toBeOnTheScreen();

    await rerender(
      <ScreenContainer scroll={false}>
        <Text>Fixed content</Text>
      </ScreenContainer>
    );
    expect(screen.getByText('Fixed content')).toBeOnTheScreen();
  });
});
