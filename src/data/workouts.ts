import { WorkoutDefinition } from '../types';
import { colors } from '../theme/theme';

export const WORKOUTS: WorkoutDefinition[] = [
  {
    type: 'shooting',
    title: 'Shooting Workout',
    description: 'Form shooting, game-speed reps, free throws, and range work.',
    accentColor: colors.green,
    icon: 'radio-button-on',
    effects: [
      { attribute: 'midRangeShot', weight: 1 },
      { attribute: 'threePointShot', weight: 1 },
      { attribute: 'freeThrow', weight: 0.75 },
      { attribute: 'closeShot', weight: 0.35 }
    ]
  },
  {
    type: 'ballHandling',
    title: 'Ball Handling Workout',
    description: 'Control, counters, passing reads, and speed with the ball.',
    accentColor: colors.orange,
    icon: 'sync-circle',
    effects: [
      { attribute: 'ballHandle', weight: 1 },
      { attribute: 'passAccuracy', weight: 0.85 },
      { attribute: 'speedWithBall', weight: 0.85 }
    ]
  },
  {
    type: 'finishing',
    title: 'Finishing Workout',
    description: 'Rim craft, layups, contact finishes, dunks, and post touch.',
    accentColor: colors.blue,
    icon: 'arrow-up-circle',
    effects: [
      { attribute: 'closeShot', weight: 1 },
      { attribute: 'drivingLayup', weight: 1 },
      { attribute: 'drivingDunk', weight: 0.8 },
      { attribute: 'standingDunk', weight: 0.55 },
      { attribute: 'postControl', weight: 0.65 }
    ]
  },
  {
    type: 'defense',
    title: 'Defense Workout',
    description: 'Footwork, containment, hands, shot contests, and paint stops.',
    accentColor: colors.red,
    icon: 'shield-checkmark',
    effects: [
      { attribute: 'interiorDefense', weight: 0.85 },
      { attribute: 'perimeterDefense', weight: 1 },
      { attribute: 'steal', weight: 0.8 },
      { attribute: 'block', weight: 0.65 }
    ]
  },
  {
    type: 'rebounding',
    title: 'Rebounding Workout',
    description: 'Box outs, pursuit angles, second jumps, and contact boards.',
    accentColor: colors.purple,
    icon: 'resize',
    effects: [
      { attribute: 'offensiveRebound', weight: 1 },
      { attribute: 'defensiveRebound', weight: 1 },
      { attribute: 'strength', weight: 0.45 }
    ]
  },
  {
    type: 'athletic',
    title: 'Athletic Workout',
    description: 'Sprint mechanics, burst, jumping, conditioning, and repeat effort.',
    accentColor: colors.yellow,
    icon: 'flash',
    effects: [
      { attribute: 'speed', weight: 0.85 },
      { attribute: 'acceleration', weight: 1 },
      { attribute: 'vertical', weight: 0.85 },
      { attribute: 'stamina', weight: 1 }
    ]
  },
  {
    type: 'strength',
    title: 'Strength Workout',
    description: 'Core strength, contact balance, lower body power, and glass work.',
    accentColor: colors.court,
    icon: 'barbell',
    effects: [
      { attribute: 'strength', weight: 1 },
      { attribute: 'interiorDefense', weight: 0.55 },
      { attribute: 'standingDunk', weight: 0.45 },
      { attribute: 'offensiveRebound', weight: 0.5 },
      { attribute: 'defensiveRebound', weight: 0.5 }
    ]
  }
];
