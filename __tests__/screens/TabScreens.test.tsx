import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import RootLayout from '../../app/_layout';
import TabsLayout from '../../app/(tabs)/_layout';
import AttributesScreen from '../../app/(tabs)/attributes';
import HomeScreen from '../../app/(tabs)/home';
import ProfileScreen from '../../app/(tabs)/profile';
import QuestsScreen from '../../app/(tabs)/quests';
import TrainScreen from '../../app/(tabs)/train';
import { LevelUpModal } from '../../src/components/player/LevelUpModal';
import {
  ATTRIBUTE_CATEGORIES,
  ATTRIBUTE_NAME_BY_KEY
} from '../../src/data/attributes';
import { WORKOUTS } from '../../src/data/workouts';
import { NETWORK_ERROR_MESSAGE } from '../../src/lib/authErrors';
import { colors } from '../../src/theme/theme';
import { newPlayerState } from '../helpers/fixtures';
import { AppProviders, readProbe, renderApp } from '../helpers/renderApp';
import { makeSession, mockControls, supabase } from '../helpers/supabaseMock';

jest.mock('../../src/lib/supabase', () => require('../helpers/supabaseMock'));

const signInWith = (state = newPlayerState()) => {
  mockControls.startSignedIn(makeSession('user-1', 'one@example.com'));
  mockControls.setStoredProgress(state);
};

const lastSavedPlayer = () => {
  const calls = mockControls.upsert.mock.calls;

  return calls[calls.length - 1][0].progress_state.player;
};

beforeEach(() => {
  mockControls.reset();
  jest.mocked(router.replace).mockClear();
  jest.mocked(router.push).mockClear();
});

describe('Home screen', () => {
  it('shows the guest sample player overview', async () => {
    await renderApp(<HomeScreen />);

    expect(screen.getByText('Jalen Novak')).toBeOnTheScreen();
    expect(screen.getByText('Shooting Guard')).toBeOnTheScreen();
    expect(screen.getAllByText('Shot-Creating Guard').length).toBeGreaterThan(0);
    expect(screen.getByText('Level 3 progress')).toBeOnTheScreen();
    expect(screen.getByText('270 / 390 XP')).toBeOnTheScreen();
    expect(readProbe()).toMatchObject({ ovr: 63, level: 3 });
  });

  it('shows measurements in the units the player chose', async () => {
    await renderApp(<HomeScreen />);

    expect(screen.getByText('6\'3"')).toBeOnTheScreen();
    expect(screen.getByText('6\'6"')).toBeOnTheScreen();
    expect(screen.getByText('195 lb')).toBeOnTheScreen();
  });

  it('shows metric measurements for a metric player', async () => {
    signInWith(newPlayerState());
    await renderApp(<HomeScreen />);

    expect(screen.getByText('183 cm')).toBeOnTheScreen();
    expect(screen.getByText('193 cm')).toBeOnTheScreen();
    expect(screen.getByText('84 kg')).toBeOnTheScreen();
  });

  it('shows an average for each attribute category', async () => {
    await renderApp(<HomeScreen />);

    ['Finishing', 'Shooting', 'Playmaking', 'Defense', 'Rebounding', 'Physical'].forEach(
      (label) => {
        expect(screen.getByText(label)).toBeOnTheScreen();
      }
    );
  });

  it('lists only daily quests and the recent activity', async () => {
    await renderApp(<HomeScreen />);

    expect(screen.getByText('Complete 1 workout')).toBeOnTheScreen();
    expect(screen.getByText('Complete 1 Defense Workout')).toBeOnTheScreen();
    expect(screen.getByText('Improve Three-Point Shot')).toBeOnTheScreen();
    expect(screen.queryByText('Reach 75 Ball Handle')).not.toBeOnTheScreen();
    expect(screen.getByText('Shooting Workout logged')).toBeOnTheScreen();
    expect(screen.getByText('Ball Handle improved')).toBeOnTheScreen();
  });

  it('opens the Train tab from the Train Now button', async () => {
    await renderApp(<HomeScreen />);

    await fireEvent.press(screen.getByRole('button', { name: 'Log a workout' }));

    expect(router.push).toHaveBeenCalledWith('/train');
  });

  it('shows a signed-in rookie starting from zero', async () => {
    signInWith(newPlayerState());
    await renderApp(<HomeScreen />);

    expect(screen.getByText('Luka Tester')).toBeOnTheScreen();
    expect(screen.getByText('Level 1 progress')).toBeOnTheScreen();
    expect(screen.getByText('0 / 250 XP')).toBeOnTheScreen();
    expect(screen.getByText('New MyPlayer created')).toBeOnTheScreen();
    expect(readProbe()).toMatchObject({ ovr: 0, level: 1, totalXp: 0 });
  });

  it('shows at most five recent activity entries', async () => {
    await renderApp(
      <>
        <TrainScreen />
        <HomeScreen />
      </>
    );

    await fireEvent.press(screen.getByRole('button', { name: 'Log medium workout' }));
    await fireEvent.press(
      screen.getByRole('button', { name: 'Log medium workout with bonus' })
    );

    // newest first: the two fresh workouts push the seeded entries out
    expect(screen.getAllByText('Shooting Workout completed').length).toBeGreaterThan(0);
    expect(screen.queryByText('Shooting Workout logged')).not.toBeOnTheScreen();
  });
});

describe('Build (attributes) screen', () => {
  it('lists every category and every attribute', async () => {
    await renderApp(<AttributesScreen />);

    ATTRIBUTE_CATEGORIES.forEach((category) => {
      expect(screen.getByText(category.title)).toBeOnTheScreen();
    });
    Object.values(ATTRIBUTE_NAME_BY_KEY).forEach((name) => {
      expect(screen.getByText(name)).toBeOnTheScreen();
    });
    expect(screen.getAllByTestId('attribute-bar-fill')).toHaveLength(23);
  });

  it('shows OVR, level, XP and archetype', async () => {
    await renderApp(<AttributesScreen />);

    expect(screen.getByText('Current OVR')).toBeOnTheScreen();
    expect(screen.getByText('270 / 390 XP')).toBeOnTheScreen();
    expect(screen.getByText('Shot-Creating Guard')).toBeOnTheScreen();
    // 63 is both the OVR and the sample Pass Accuracy rating
    expect(screen.getAllByText('63').length).toBeGreaterThanOrEqual(2);
  });

  it('reflects a workout immediately', async () => {
    signInWith(newPlayerState());
    await renderApp(
      <>
        <TrainScreen />
        <AttributesScreen />
      </>
    );

    await fireEvent.press(screen.getByText('Rebounding Workout'));
    await fireEvent.press(screen.getByText('Hard'));
    await fireEvent.press(screen.getByRole('button', { name: 'Log hard workout' }));

    // 190 workout XP + 80 quest XP crosses the 250 XP needed for level 2
    expect(readProbe()).toMatchObject({ level: 2, totalXp: 270 });
    // both rebound ratings went from 0 to 3, so the category average is 3 too
    expect(screen.getAllByText('3').length).toBeGreaterThanOrEqual(3);
  });
});

describe('Train screen', () => {
  it('offers every workout and intensity', async () => {
    await renderApp(<TrainScreen />);

    WORKOUTS.forEach((workout) => {
      expect(screen.getByText(workout.title)).toBeOnTheScreen();
    });
    expect(screen.getByText('+70 XP')).toBeOnTheScreen();
    expect(screen.getByText('+120 XP')).toBeOnTheScreen();
    expect(screen.getByText('+190 XP')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Log medium workout' })).toBeOnTheScreen();
    expect(screen.queryByText('Progress gained')).not.toBeOnTheScreen();
  });

  it('updates the log button when the intensity changes', async () => {
    await renderApp(<TrainScreen />);

    await fireEvent.press(screen.getByText('Light'));
    expect(screen.getByRole('button', { name: 'Log light workout' })).toBeOnTheScreen();

    await fireEvent.press(screen.getByText('Hard'));
    expect(screen.getByRole('button', { name: 'Log hard workout' })).toBeOnTheScreen();
  });

  it('logs the default workout and shows what was gained', async () => {
    await renderApp(<TrainScreen />);

    await fireEvent.press(screen.getByRole('button', { name: 'Log medium workout' }));

    expect(screen.getByText('Progress gained')).toBeOnTheScreen();
    // 120 workout + 80 ("Complete 1 workout") + 90 ("Improve Three-Point Shot")
    expect(screen.getByText('+290 XP')).toBeOnTheScreen();
    expect(screen.getByText('+120')).toBeOnTheScreen();
    expect(screen.getByText('+170')).toBeOnTheScreen();
    expect(screen.getByText('Mid-Range Shot')).toBeOnTheScreen();
    expect(screen.getByText('Three-Point Shot')).toBeOnTheScreen();
    expect(screen.getByText('Free Throw')).toBeOnTheScreen();
    expect(screen.getByText('Fadeaway')).toBeOnTheScreen();
    expect(screen.getByText('Close Shot')).toBeOnTheScreen();
    expect(screen.getByText('Quest completed')).toBeOnTheScreen();
    expect(screen.getByText('Complete 1 workout')).toBeOnTheScreen();
    expect(screen.getByText('+80 XP')).toBeOnTheScreen();
    expect(screen.getByText('Improve Three-Point Shot')).toBeOnTheScreen();
    expect(screen.getByText('+90 XP')).toBeOnTheScreen();
    expect(readProbe()).toMatchObject({ totalXp: 840 + 290, sessions: 1 });
  });

  it('logs the selected workout type', async () => {
    await renderApp(<TrainScreen />);

    await fireEvent.press(screen.getByText('Defense Workout'));
    await fireEvent.press(screen.getByText('Hard'));
    await fireEvent.press(screen.getByRole('button', { name: 'Log hard workout' }));

    expect(screen.getByText('Perimeter Defense')).toBeOnTheScreen();
    expect(screen.getByText('Interior Defense')).toBeOnTheScreen();
    expect(screen.getByText('Steal')).toBeOnTheScreen();
    expect(screen.getByText('Block')).toBeOnTheScreen();
    expect(screen.getByText('Complete 1 Defense Workout')).toBeOnTheScreen();
    expect(screen.getByText('+100 XP')).toBeOnTheScreen();
    expect(screen.queryByText('Mid-Range Shot')).not.toBeOnTheScreen();
  });

  it('pays quest XP only once across repeated workouts', async () => {
    await renderApp(<TrainScreen />);
    await fireEvent.press(screen.getByRole('button', { name: 'Log medium workout' }));
    await fireEvent.press(
      screen.getByRole('button', { name: 'Log medium workout with bonus' })
    );

    // "+120 XP" is the Medium intensity label and now also the result total
    expect(screen.getAllByText('+120 XP')).toHaveLength(2);
    expect(screen.queryByText('+290 XP')).not.toBeOnTheScreen();
    expect(screen.getByText('+0')).toBeOnTheScreen();
    expect(screen.queryByText('Quest completed')).not.toBeOnTheScreen();
    expect(readProbe()).toMatchObject({ totalXp: 840 + 290 + 120, sessions: 2 });
  });

  it('keeps the result card in the logged workout color after selecting another', async () => {
    await renderApp(<TrainScreen />);

    await fireEvent.press(screen.getByRole('button', { name: 'Log medium workout' }));
    await fireEvent.press(screen.getByText('Defense Workout'));

    // Mid-Range and Three-Point both gained +2 from the shooting workout
    screen.getAllByText('+2').forEach((gain) => {
      expect(gain).toHaveStyle({ color: colors.green });
    });
  });

  it('saves the workout for a signed-in player', async () => {
    signInWith(newPlayerState());
    await renderApp(<TrainScreen />);

    await fireEvent.press(screen.getByRole('button', { name: 'Log medium workout' }));

    await waitFor(() => expect(mockControls.upsert).toHaveBeenCalledTimes(1));
    expect(lastSavedPlayer().totalXp).toBe(readProbe().totalXp);
    expect(lastSavedPlayer().attributes.midRangeShot).toBe(2);
  });

  it('shows the level-up popup and closes it', async () => {
    await renderApp(
      <>
        <TrainScreen />
        <LevelUpModal />
      </>
    );

    expect(screen.queryByText('Level up')).not.toBeOnTheScreen();

    // 840 + 290 = 1130 XP takes the sample player from level 3 to 4
    await fireEvent.press(screen.getByRole('button', { name: 'Log medium workout' }));

    expect(screen.getByText('Level up')).toBeOnTheScreen();
    expect(screen.getByTestId('level-up-level')).toHaveTextContent('4');
    expect(screen.getByText(/Up from level\s+3/)).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Keep training' }));

    expect(screen.queryByText('Level up')).not.toBeOnTheScreen();
    expect(readProbe().level).toBe(4);
  });

  it('does not show the popup when the level stays the same', async () => {
    await renderApp(
      <>
        <TrainScreen />
        <LevelUpModal />
      </>
    );

    await fireEvent.press(screen.getByRole('button', { name: 'Log medium workout' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Keep training' }));
    await fireEvent.press(screen.getByText('Light'));
    await fireEvent.press(
      screen.getByRole('button', { name: 'Log light workout with bonus' })
    );

    expect(screen.queryByText('Level up')).not.toBeOnTheScreen();
  });
});

describe('Train screen daily limit', () => {
  it('allows each workout once, then one bonus repeat, then locks it for the day', async () => {
    await renderApp(<TrainScreen />);

    expect(screen.getByText('Available')).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Log medium workout' }));
    expect(screen.getByText('Done today. Your bonus can repeat it.')).toBeOnTheScreen();

    await fireEvent.press(
      screen.getByRole('button', { name: 'Log medium workout with bonus' })
    );
    expect(readProbe().sessions).toBe(2);
    expect(screen.getByText('Used')).toBeOnTheScreen();
    expect(screen.getByText('Done today')).toBeOnTheScreen();

    const lockedButton = screen.getByRole('button', {
      name: 'Shooting Workout done for today'
    });
    expect(lockedButton).toBeDisabled();
    await fireEvent.press(lockedButton);
    expect(readProbe().sessions).toBe(2);
  });

  it('still allows every other workout once after the bonus is used', async () => {
    await renderApp(<TrainScreen />);

    await fireEvent.press(screen.getByRole('button', { name: 'Log medium workout' }));
    await fireEvent.press(
      screen.getByRole('button', { name: 'Log medium workout with bonus' })
    );
    await fireEvent.press(screen.getByText('Defense Workout'));
    await fireEvent.press(screen.getByRole('button', { name: 'Log medium workout' }));

    expect(readProbe().sessions).toBe(3);
    // Defense is now done and there is no bonus left to repeat it
    expect(
      screen.getByRole('button', { name: 'Defense Workout done for today' })
    ).toBeDisabled();
  });
});

describe('Train screen focus areas', () => {
  it('shows the focus areas of the selected workout only, none picked', async () => {
    await renderApp(<TrainScreen />);

    expect(screen.getByRole('checkbox', { name: 'Three-pointers' })).not.toBeChecked();
    expect(
      screen.getByRole('checkbox', { name: 'Off the dribble / fadeaways' })
    ).toBeOnTheScreen();
    expect(
      screen.queryByRole('checkbox', { name: 'Perimeter defense' })
    ).not.toBeOnTheScreen();

    await fireEvent.press(screen.getByText('Defense Workout'));

    expect(screen.getByRole('checkbox', { name: 'Perimeter defense' })).toBeOnTheScreen();
    expect(
      screen.queryByRole('checkbox', { name: 'Three-pointers' })
    ).not.toBeOnTheScreen();
  });

  it('logs only what was worked on', async () => {
    await renderApp(<TrainScreen />);

    await fireEvent.press(screen.getByText('Defense Workout'));
    await fireEvent.press(screen.getByRole('checkbox', { name: 'Perimeter defense' }));
    expect(screen.getByRole('checkbox', { name: 'Perimeter defense' })).toBeChecked();
    await fireEvent.press(screen.getByText('Hard'));
    await fireEvent.press(screen.getByRole('button', { name: 'Log hard workout' }));

    expect(screen.getByText('Defense Workout: perimeter defense')).toBeOnTheScreen();
    expect(screen.getByText('Perimeter Defense')).toBeOnTheScreen();
    expect(screen.queryByText('Interior Defense')).not.toBeOnTheScreen();
    expect(screen.queryByText('Block')).not.toBeOnTheScreen();
    expect(screen.queryByText('Steal')).not.toBeOnTheScreen();
    expect(readProbe().sessions).toBe(1);
  });

  it('lets several focus areas be picked and unpicked', async () => {
    await renderApp(<TrainScreen />);

    await fireEvent.press(screen.getByRole('checkbox', { name: 'Three-pointers' }));
    await fireEvent.press(screen.getByRole('checkbox', { name: 'Free throws' }));
    await fireEvent.press(
      screen.getByRole('checkbox', { name: 'Off the dribble / fadeaways' })
    );
    await fireEvent.press(screen.getByRole('checkbox', { name: 'Free throws' }));
    expect(screen.getByRole('checkbox', { name: 'Free throws' })).not.toBeChecked();

    await fireEvent.press(screen.getByRole('button', { name: 'Log medium workout' }));

    expect(
      screen.getByText('Shooting Workout: three-pointers, off the dribble / fadeaways')
    ).toBeOnTheScreen();
    expect(screen.getByText('Fadeaway')).toBeOnTheScreen();
    expect(screen.getByText('Three-Point Shot')).toBeOnTheScreen();
    expect(screen.queryByText('Free Throw')).not.toBeOnTheScreen();
  });

  it('clears the picked focus when another workout is selected', async () => {
    await renderApp(<TrainScreen />);

    await fireEvent.press(screen.getByRole('checkbox', { name: 'Three-pointers' }));
    await fireEvent.press(screen.getByText('Defense Workout'));
    await fireEvent.press(screen.getByText('Shooting Workout'));

    expect(screen.getByRole('checkbox', { name: 'Three-pointers' })).not.toBeChecked();

    await fireEvent.press(screen.getByRole('button', { name: 'Log medium workout' }));
    // a general session: the result card shows the plain title
    expect(screen.getAllByText('Shooting Workout').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('Free Throw')).toBeOnTheScreen();
  });

  it('logs a pickup game that touches every category, under the same daily limit', async () => {
    signInWith(newPlayerState());
    await renderApp(<TrainScreen />);

    await fireEvent.press(screen.getByText('Pickup Game'));
    expect(screen.queryByRole('checkbox')).not.toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Log medium workout' }));

    await waitFor(() => expect(mockControls.upsert).toHaveBeenCalledTimes(1));
    const attributes = lastSavedPlayer().attributes;

    ATTRIBUTE_CATEGORIES.forEach((category) => {
      expect(
        category.attributes.some((attribute) => attributes[attribute.key] === 1)
      ).toBe(true);
    });
    expect(screen.getByText('Done today. Your bonus can repeat it.')).toBeOnTheScreen();

    await fireEvent.press(
      screen.getByRole('button', { name: 'Log medium workout with bonus' })
    );
    expect(
      screen.getByRole('button', { name: 'Pickup Game done for today' })
    ).toBeDisabled();
  });
});

describe('Quests screen', () => {
  it('lists daily and weekly quests with totals', async () => {
    await renderApp(<QuestsScreen />);

    expect(screen.getByText('Daily')).toBeOnTheScreen();
    expect(screen.getByText('Weekly')).toBeOnTheScreen();
    [
      'Complete 1 workout',
      'Complete 1 Defense Workout',
      'Improve Three-Point Shot',
      'Complete 2 Finishing Workouts',
      'Reach 75 Ball Handle',
      'Improve Stamina this week'
    ].forEach((title) => {
      expect(screen.getByText(title)).toBeOnTheScreen();
    });
    expect(screen.getByText('0/6')).toBeOnTheScreen();
    // 80 + 100 + 90 + 220 + 260 + 180
    expect(screen.getByText('930')).toBeOnTheScreen();
    expect(screen.getByText('71 / 75')).toBeOnTheScreen();
  });

  it('updates progress and remaining XP after a workout', async () => {
    await renderApp(
      <>
        <TrainScreen />
        <QuestsScreen />
      </>
    );

    await fireEvent.press(screen.getByText('Defense Workout'));
    await fireEvent.press(screen.getByRole('button', { name: 'Log medium workout' }));

    expect(screen.getByText('2/6')).toBeOnTheScreen();
    expect(screen.getAllByText('Completed').length).toBeGreaterThanOrEqual(2);
    // the 80 and 100 XP rewards were paid out, so they are no longer available
    expect(screen.getByText('750')).toBeOnTheScreen();
    expect(screen.queryByText('930')).not.toBeOnTheScreen();
  });

  it('shows partial progress on multi-step quests', async () => {
    await renderApp(
      <>
        <TrainScreen />
        <QuestsScreen />
      </>
    );

    await fireEvent.press(screen.getByText('Finishing Workout'));
    await fireEvent.press(screen.getByRole('button', { name: 'Log medium workout' }));

    expect(screen.getByText('1 / 2')).toBeOnTheScreen();
  });
});

describe('Profile screen', () => {
  it('shows the current player in the form', async () => {
    await renderApp(<ProfileScreen />);

    expect(screen.getByPlaceholderText('Player name')).toHaveDisplayValue('Jalen Novak');
    expect(screen.getByPlaceholderText('Main basketball goal')).toHaveDisplayValue(
      'Become a reliable two-way shot creator'
    );
    expect(screen.getByText('6\'3"')).toBeOnTheScreen();
    expect(screen.getByText('195 lb')).toBeOnTheScreen();
  });

  it('labels guests and hides sign out', async () => {
    await renderApp(<ProfileScreen />);

    expect(screen.getByText('Guest')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Sign out' })).not.toBeOnTheScreen();
  });

  it('saves edited details', async () => {
    await renderApp(<ProfileScreen />);

    await fireEvent.changeText(screen.getByPlaceholderText('Player name'), 'Nikola Test');
    await fireEvent.changeText(
      screen.getByPlaceholderText('Main basketball goal'),
      'Lead the league in assists'
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Center' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Stretch Big' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Save profile' }));

    expect(screen.getByRole('button', { name: 'Saved' })).toBeOnTheScreen();
    expect(readProbe()).toMatchObject({
      name: 'Nikola Test',
      mainGoal: 'Lead the league in assists',
      position: 'Center',
      archetype: 'Stretch Big',
      totalXp: 840
    });
  });

  it('does not change the player until Save is pressed', async () => {
    await renderApp(<ProfileScreen />);

    await fireEvent.changeText(screen.getByPlaceholderText('Player name'), 'Draft Only');
    await fireEvent.press(screen.getByRole('button', { name: 'Center' }));

    expect(readProbe()).toMatchObject({
      name: 'Jalen Novak',
      position: 'Shooting Guard'
    });
  });

  it('keeps the old name when the field is left blank', async () => {
    await renderApp(<ProfileScreen />);

    await fireEvent.changeText(screen.getByPlaceholderText('Player name'), '   ');
    await fireEvent.press(screen.getByRole('button', { name: 'Save profile' }));

    expect(readProbe().name).toBe('Jalen Novak');
    expect(screen.getByPlaceholderText('Player name')).toHaveDisplayValue('Jalen Novak');
  });

  it('trims spaces around the name', async () => {
    await renderApp(<ProfileScreen />);

    await fireEvent.changeText(screen.getByPlaceholderText('Player name'), '  Spacey  ');
    await fireEvent.press(screen.getByRole('button', { name: 'Save profile' }));

    expect(readProbe().name).toBe('Spacey');
  });

  it('saves a height picked from the wheel', async () => {
    await renderApp(<ProfileScreen />);

    await fireEvent.press(screen.getAllByText('Tap to edit')[0]);
    await fireEvent.press(screen.getByText('5\'10"'));
    await fireEvent.press(screen.getByRole('button', { name: 'Save profile' }));

    expect(readProbe()).toMatchObject({ heightCm: 177.8, heightUnit: 'in' });
  });

  it('saves a unit change without changing the measurement', async () => {
    await renderApp(<ProfileScreen />);

    await fireEvent.press(screen.getAllByText('Tap to edit')[2]);
    await fireEvent.press(screen.getByText('kg'));
    await fireEvent.press(screen.getByText('Done'));
    await fireEvent.press(screen.getByRole('button', { name: 'Save profile' }));

    expect(readProbe()).toMatchObject({ weightKg: 88.45, weightUnit: 'kg' });
    expect(screen.getByText('88 kg')).toBeOnTheScreen();
  });

  it('moves height and wingspan to metric when weight switches to kg', async () => {
    await renderApp(<ProfileScreen />);

    await fireEvent.press(screen.getAllByText('Tap to edit')[2]);
    await fireEvent.press(screen.getByText('kg'));
    await fireEvent.press(screen.getByText('Done'));
    await fireEvent.press(screen.getByRole('button', { name: 'Save profile' }));

    expect(readProbe()).toMatchObject({
      heightUnit: 'cm',
      wingspanUnit: 'cm',
      weightUnit: 'kg'
    });
  });

  it('moves weight to lb and wingspan to ft/in when height switches to ft/in', async () => {
    await renderApp(<ProfileScreen />);
    // start from metric everywhere, set through the weight picker
    await fireEvent.press(screen.getAllByText('Tap to edit')[2]);
    await fireEvent.press(screen.getByText('kg'));
    await fireEvent.press(screen.getByText('Done'));

    await fireEvent.press(screen.getAllByText('Tap to edit')[0]);
    await fireEvent.press(screen.getByText('ft/in'));
    await fireEvent.press(screen.getByText('Done'));
    await fireEvent.press(screen.getByRole('button', { name: 'Save profile' }));

    expect(readProbe()).toMatchObject({
      heightUnit: 'in',
      wingspanUnit: 'in',
      weightUnit: 'lb'
    });
  });

  it('saves a wingspan picked from the wheel', async () => {
    await renderApp(<ProfileScreen />);

    await fireEvent.press(screen.getAllByText('Tap to edit')[1]);
    await fireEvent.press(screen.getByText('cm'));
    await fireEvent.press(screen.getByText('165 cm'));
    await fireEvent.press(screen.getByRole('button', { name: 'Save profile' }));

    expect(readProbe()).toMatchObject({ wingspanCm: 165, wingspanUnit: 'cm' });
  });

  it('saves a weight picked from the wheel', async () => {
    await renderApp(<ProfileScreen />);

    await fireEvent.press(screen.getAllByText('Tap to edit')[2]);
    await fireEvent.press(screen.getByText('125 lb'));
    await fireEvent.press(screen.getByRole('button', { name: 'Save profile' }));

    expect(readProbe()).toMatchObject({ weightKg: 56.7, weightUnit: 'lb' });
    expect(screen.getByText('125 lb')).toBeOnTheScreen();
  });

  it('returns the button to "Save Profile" after a moment', async () => {
    await renderApp(<ProfileScreen />);
    jest.useFakeTimers();

    try {
      await fireEvent.press(screen.getByRole('button', { name: 'Save profile' }));
      expect(screen.getByRole('button', { name: 'Saved' })).toBeOnTheScreen();

      await act(async () => {
        jest.advanceTimersByTime(1700);
      });

      expect(screen.getByRole('button', { name: 'Save profile' })).toBeOnTheScreen();
    } finally {
      jest.useRealTimers();
    }
  });

  it('writes edits to the cloud for a signed-in player', async () => {
    signInWith(newPlayerState({ speed: 30 }, 500));
    await renderApp(<ProfileScreen />);

    expect(screen.getByText('Connected')).toBeOnTheScreen();

    await fireEvent.changeText(screen.getByPlaceholderText('Player name'), 'Cloud Name');
    await fireEvent.press(screen.getByRole('button', { name: 'Save profile' }));

    await waitFor(() => expect(mockControls.upsert).toHaveBeenCalledTimes(1));
    expect(lastSavedPlayer()).toMatchObject({ name: 'Cloud Name', totalXp: 500 });
    expect(lastSavedPlayer().attributes.speed).toBe(30);
  });

  it('signs out and returns to the login screen', async () => {
    signInWith();
    await renderApp(<ProfileScreen />);

    await fireEvent.press(screen.getByRole('button', { name: 'Sign out' }));

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/'));
    expect(supabase.auth.signOut).toHaveBeenCalledTimes(1);
  });

  it('stays on the profile when sign out fails', async () => {
    signInWith();
    supabase.auth.signOut.mockResolvedValue({ error: { message: 'Failed to fetch' } });
    await renderApp(<ProfileScreen />);

    await fireEvent.press(screen.getByRole('button', { name: 'Sign out' }));

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Sign out' })).toBeEnabled()
    );
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('reports a cloud sync problem', async () => {
    mockControls.startSignedIn();
    mockControls.maybeSingle.mockResolvedValue({
      data: null,
      error: { message: 'Failed to fetch' }
    });
    await renderApp(<ProfileScreen />);

    expect(screen.getByText('Issue')).toBeOnTheScreen();
    expect(screen.getByText(`Sync issue: ${NETWORK_ERROR_MESSAGE}`)).toBeOnTheScreen();
    expect(screen.queryByText('Connected')).not.toBeOnTheScreen();
  });

  it('lists upcoming settings as not available yet', async () => {
    await renderApp(<ProfileScreen />);

    ['Training reminders', 'Season goals', 'Coach sharing'].forEach((setting) => {
      expect(screen.getByText(setting)).toBeOnTheScreen();
    });
    expect(screen.getAllByText('Coming soon')).toHaveLength(3);
  });
});

describe('navigation shells', () => {
  it('shows a loading screen while the session is being restored', async () => {
    supabase.auth.getSession.mockReturnValue(new Promise(() => {}));

    await render(
      <AppProviders>
        <TabsLayout />
      </AppProviders>
    );

    expect(screen.getByText('Loading your player...')).toBeOnTheScreen();
    expect(screen.queryByTestId('tabs')).not.toBeOnTheScreen();
  });

  it('shows a loading screen while the player is being fetched', async () => {
    mockControls.startSignedIn();
    mockControls.maybeSingle.mockReturnValue(new Promise(() => {}));

    await render(
      <AppProviders>
        <TabsLayout />
      </AppProviders>
    );

    expect(await screen.findByText('Loading your player...')).toBeOnTheScreen();
  });

  it('shows the five tabs once loading is done', async () => {
    await renderApp(<TabsLayout />);

    expect(screen.queryByText('Loading your player...')).not.toBeOnTheScreen();
    ['home', 'attributes', 'train', 'quests', 'profile'].forEach((name) => {
      expect(screen.getByTestId(`tab-${name}`)).toBeOnTheScreen();
    });
    ['Home', 'Build', 'Train', 'Quests', 'Profile'].forEach((title) => {
      expect(screen.getByText(title)).toBeOnTheScreen();
    });
  });

  it('mounts the whole app with providers, navigation and a hidden level-up popup', async () => {
    await render(<RootLayout />);

    expect(await screen.findByTestId('stack')).toBeOnTheScreen();
    expect(screen.queryByText('Level up')).not.toBeOnTheScreen();
  });
});
