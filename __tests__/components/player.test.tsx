import React from 'react';
import { StyleSheet } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { ATTRIBUTE_CATEGORIES } from '../../src/data/attributes';
import { createInitialQuests } from '../../src/data/quests';
import { WORKOUTS } from '../../src/data/workouts';
import { ActivityItem } from '../../src/components/player/ActivityItem';
import { AttributeBar } from '../../src/components/player/AttributeBar';
import { AttributeCategoryCard } from '../../src/components/player/AttributeCategoryCard';
import { OVRCard } from '../../src/components/player/OVRCard';
import { QuestCard } from '../../src/components/player/QuestCard';
import { TrainingTypeCard } from '../../src/components/training/TrainingTypeCard';
import { colors } from '../../src/theme/theme';
import { ActivityLogItem, Quest } from '../../src/types';
import { attributesWith } from '../helpers/fixtures';

const widthOf = (testID: string, index = 0) =>
  StyleSheet.flatten(screen.getAllByTestId(testID)[index].props.style).width;

const quest = (overrides: Partial<Quest> = {}): Quest => ({
  ...createInitialQuests(attributesWith())[3],
  ...overrides
});

describe('AttributeBar', () => {
  it('shows the name and rating', async () => {
    await render(<AttributeBar name="Ball Handle" value={71} color={colors.orange} />);

    expect(screen.getByText('Ball Handle')).toBeOnTheScreen();
    expect(screen.getByText('71')).toBeOnTheScreen();
  });

  it('fills the bar relative to the 0-99 scale', async () => {
    const { rerender } = await render(
      <AttributeBar name="Speed" value={0} color={colors.yellow} />
    );
    expect(widthOf('attribute-bar-fill')).toBe('0%');

    await rerender(<AttributeBar name="Speed" value={99} color={colors.yellow} />);
    expect(widthOf('attribute-bar-fill')).toBe('100%');

    await rerender(<AttributeBar name="Speed" value={49.5} color={colors.yellow} />);
    expect(widthOf('attribute-bar-fill')).toBe('50%');
  });

  it('stays inside the track for out-of-range values', async () => {
    const { rerender } = await render(
      <AttributeBar name="Speed" value={140} color={colors.yellow} />
    );
    expect(widthOf('attribute-bar-fill')).toBe('100%');

    await rerender(<AttributeBar name="Speed" value={-10} color={colors.yellow} />);
    expect(widthOf('attribute-bar-fill')).toBe('0%');
  });
});

describe('AttributeCategoryCard', () => {
  it.each(ATTRIBUTE_CATEGORIES.map((category) => [category.id, category] as const))(
    'lists every %s attribute with its rating',
    async (_, category) => {
      const attributes = attributesWith({}, 10);
      category.attributes.forEach((attribute, index) => {
        attributes[attribute.key] = 20 + index;
      });

      await render(<AttributeCategoryCard category={category} attributes={attributes} />);

      expect(screen.getByText(category.title)).toBeOnTheScreen();
      category.attributes.forEach((attribute) => {
        expect(screen.getByText(attribute.name)).toBeOnTheScreen();
      });
      expect(screen.getAllByTestId('attribute-bar-fill')).toHaveLength(
        category.attributes.length
      );
    }
  );

  it('shows the category average', async () => {
    const shooting = ATTRIBUTE_CATEGORIES.find((item) => item.id === 'shooting')!;

    await render(
      <AttributeCategoryCard
        category={shooting}
        attributes={attributesWith({ midRangeShot: 90, threePointShot: 60, freeThrow: 30 })}
      />
    );

    // average of 90, 60, 30 — and 60 is also one of the ratings
    expect(screen.getAllByText('60')).toHaveLength(2);
  });
});

describe('OVRCard', () => {
  it('shows identity, level and rating', async () => {
    await render(
      <OVRCard
        ovr={63}
        level={3}
        name="Jalen Novak"
        position="Shooting Guard"
        archetype="Shot-Creating Guard"
      />
    );

    expect(screen.getByText('Jalen Novak')).toBeOnTheScreen();
    expect(screen.getByText('Shooting Guard')).toBeOnTheScreen();
    expect(screen.getByText('Shot-Creating Guard')).toBeOnTheScreen();
    expect(screen.getByText('63')).toBeOnTheScreen();
    expect(screen.getByText('3')).toBeOnTheScreen();
  });

  it('shows 0 OVR for a brand new player', async () => {
    await render(
      <OVRCard ovr={0} level={1} name="Rookie" position="Center" archetype="Raw Prospect" />
    );

    expect(screen.getByText('0')).toBeOnTheScreen();
    expect(screen.getByText('1')).toBeOnTheScreen();
  });
});

describe('QuestCard', () => {
  it('shows title, description, reward and progress for an open quest', async () => {
    await render(<QuestCard quest={quest({ progress: 1 })} />);

    expect(screen.getByText('Complete 2 Finishing Workouts')).toBeOnTheScreen();
    expect(screen.getByText('Stack rim pressure reps across the week.')).toBeOnTheScreen();
    expect(screen.getByText('+220 XP')).toBeOnTheScreen();
    expect(screen.getByText('1 / 2')).toBeOnTheScreen();
    expect(screen.queryByText('Completed')).not.toBeOnTheScreen();
    expect(widthOf('xp-bar-fill')).toBe('50%');
  });

  it('marks a finished and paid quest as completed', async () => {
    await render(
      <QuestCard quest={quest({ progress: 2, completed: true, claimed: true })} />
    );

    expect(screen.getByText('Completed')).toBeOnTheScreen();
    expect(widthOf('xp-bar-fill')).toBe('100%');
    expect(screen.getByTestId('xp-bar-fill')).toHaveStyle({
      backgroundColor: colors.success
    });
  });

  it('never labels workout counts or ratings as XP', async () => {
    const { rerender } = await render(<QuestCard quest={quest({ progress: 1 })} />);
    expect(screen.queryByText(/\/ 2 XP/)).not.toBeOnTheScreen();

    await rerender(
      <QuestCard quest={quest({ progress: 2, completed: true, claimed: true })} />
    );
    expect(screen.queryByText(/\/ 2 XP/)).not.toBeOnTheScreen();
  });

  it('starts empty', async () => {
    await render(<QuestCard quest={quest()} />);

    expect(screen.getByText('0 / 2')).toBeOnTheScreen();
    expect(widthOf('xp-bar-fill')).toBe('0%');
  });
});

describe('ActivityItem', () => {
  const item = (overrides: Partial<ActivityLogItem> = {}): ActivityLogItem => ({
    id: 'activity-1',
    type: 'workout',
    title: 'Shooting Workout completed',
    description: 'Medium session earned +120 XP.',
    createdAt: '2026-04-22T18:30:00.000Z',
    accentColor: colors.green,
    ...overrides
  });

  it('shows the title, description and a short date', async () => {
    await render(<ActivityItem item={item()} />);

    expect(screen.getByText('Shooting Workout completed')).toBeOnTheScreen();
    expect(screen.getByText('Medium session earned +120 XP.')).toBeOnTheScreen();
    expect(screen.getByText(/22/)).toBeOnTheScreen();
  });

  it.each(['workout', 'quest', 'attribute', 'level'] as const)(
    'renders a %s entry',
    async (type) => {
      await render(<ActivityItem item={item({ type, title: `${type} entry` })} />);

      expect(screen.getByText(`${type} entry`)).toBeOnTheScreen();
    }
  );

  it('does not crash or print "Invalid Date" for a broken timestamp', async () => {
    await render(<ActivityItem item={item({ createdAt: 'not a date' })} />);

    expect(screen.getByText('Shooting Workout completed')).toBeOnTheScreen();
    expect(screen.queryByText(/invalid/i)).not.toBeOnTheScreen();
  });
});

describe('TrainingTypeCard', () => {
  it.each(WORKOUTS.map((workout) => [workout.type, workout] as const))(
    'renders the %s workout and reports presses',
    async (_, workout) => {
      const onPress = jest.fn();
      await render(
        <TrainingTypeCard workout={workout} selected={false} onPress={onPress} />
      );

      expect(screen.getByText(workout.title)).toBeOnTheScreen();
      expect(screen.getByText(workout.description)).toBeOnTheScreen();

      await fireEvent.press(screen.getByRole('button'));

      expect(onPress).toHaveBeenCalledTimes(1);
    }
  );

  it('highlights the selected workout with its accent color', async () => {
    const workout = WORKOUTS[0];
    const { rerender } = await render(
      <TrainingTypeCard workout={workout} selected onPress={jest.fn()} />
    );

    expect(screen.getByRole('button')).toHaveStyle({ borderColor: workout.accentColor });

    await rerender(
      <TrainingTypeCard workout={workout} selected={false} onPress={jest.fn()} />
    );

    expect(screen.getByRole('button')).not.toHaveStyle({
      borderColor: workout.accentColor
    });
  });
});
