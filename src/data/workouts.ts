import { AttributeKey, WorkoutDefinition } from '../types';
import { colors } from '../theme/theme';
import { ATTRIBUTE_CATEGORIES } from './attributes';

// Focus effects are always a subset of the workout's own effects. Their
// weights decide how a focused session's points are shared out; the total is
// capped by the general session (see calculateWorkoutResult).

const ALL_ATTRIBUTE_KEYS: AttributeKey[] = ATTRIBUTE_CATEGORIES.flatMap((category) =>
  category.attributes.map((attribute) => attribute.key)
);

export const WORKOUTS: WorkoutDefinition[] = [
  {
    type: 'shooting',
    title: 'Shooting Workout',
    description: 'Form shooting, game-speed reps, free throws, and range work.',
    accentColor: colors.green,
    icon: 'locate-outline',
    effects: [
      { attribute: 'midRangeShot', weight: 1 },
      { attribute: 'threePointShot', weight: 1 },
      { attribute: 'freeThrow', weight: 0.75 },
      { attribute: 'fadeaway', weight: 0.5 },
      { attribute: 'closeShot', weight: 0.35 }
    ],
    focusOptions: [
      { id: 'midRange', label: 'Mid-range', effects: [{ attribute: 'midRangeShot', weight: 1 }] },
      {
        id: 'threePointers',
        label: 'Three-pointers',
        effects: [{ attribute: 'threePointShot', weight: 1 }]
      },
      { id: 'freeThrows', label: 'Free throws', effects: [{ attribute: 'freeThrow', weight: 1 }] },
      {
        id: 'catchAndShoot',
        label: 'Catch and shoot',
        effects: [
          { attribute: 'threePointShot', weight: 1 },
          { attribute: 'midRangeShot', weight: 0.6 }
        ]
      },
      {
        id: 'offDribble',
        label: 'Off the dribble / fadeaways',
        effects: [
          { attribute: 'fadeaway', weight: 1 },
          { attribute: 'midRangeShot', weight: 0.4 }
        ]
      }
    ]
  },
  {
    type: 'ballHandling',
    title: 'Ball Handling Workout',
    description: 'Control, counters, passing reads, and speed with the ball.',
    accentColor: colors.orange,
    icon: 'repeat-outline',
    effects: [
      { attribute: 'ballHandle', weight: 1 },
      { attribute: 'passAccuracy', weight: 0.85 },
      { attribute: 'speedWithBall', weight: 0.85 }
    ],
    focusOptions: [
      { id: 'handles', label: 'Handles and combos', effects: [{ attribute: 'ballHandle', weight: 1 }] },
      { id: 'passing', label: 'Passing', effects: [{ attribute: 'passAccuracy', weight: 1 }] },
      {
        id: 'speedWithBall',
        label: 'Speed with the ball',
        effects: [
          { attribute: 'speedWithBall', weight: 1 },
          { attribute: 'ballHandle', weight: 0.4 }
        ]
      }
    ]
  },
  {
    type: 'finishing',
    title: 'Finishing Workout',
    description: 'Rim craft, layups, contact finishes, dunks, and post touch.',
    accentColor: colors.blue,
    icon: 'arrow-up-circle-outline',
    effects: [
      { attribute: 'closeShot', weight: 1 },
      { attribute: 'drivingLayup', weight: 1 },
      { attribute: 'drivingDunk', weight: 0.8 },
      { attribute: 'standingDunk', weight: 0.55 },
      { attribute: 'postControl', weight: 0.65 }
    ],
    focusOptions: [
      { id: 'layups', label: 'Layups', effects: [{ attribute: 'drivingLayup', weight: 1 }] },
      {
        id: 'dunks',
        label: 'Dunks',
        effects: [
          { attribute: 'drivingDunk', weight: 1 },
          { attribute: 'standingDunk', weight: 0.8 }
        ]
      },
      {
        id: 'postMoves',
        label: 'Post moves',
        effects: [
          { attribute: 'postControl', weight: 1 },
          { attribute: 'closeShot', weight: 0.4 }
        ]
      },
      {
        id: 'closeShots',
        label: 'Close shots and floaters',
        effects: [{ attribute: 'closeShot', weight: 1 }]
      }
    ]
  },
  {
    type: 'defense',
    title: 'Defense Workout',
    description: 'Footwork, containment, hands, shot contests, and paint stops.',
    accentColor: colors.red,
    icon: 'shield-outline',
    effects: [
      { attribute: 'interiorDefense', weight: 0.85 },
      { attribute: 'perimeterDefense', weight: 1 },
      { attribute: 'steal', weight: 0.8 },
      { attribute: 'block', weight: 0.65 }
    ],
    focusOptions: [
      {
        id: 'perimeter',
        label: 'Perimeter defense',
        effects: [{ attribute: 'perimeterDefense', weight: 1 }]
      },
      { id: 'post', label: 'Post defense', effects: [{ attribute: 'interiorDefense', weight: 1 }] },
      { id: 'steals', label: 'Steals and passing lanes', effects: [{ attribute: 'steal', weight: 1 }] },
      { id: 'blocks', label: 'Shot blocking', effects: [{ attribute: 'block', weight: 1 }] }
    ]
  },
  {
    type: 'rebounding',
    title: 'Rebounding Workout',
    description: 'Box outs, pursuit angles, second jumps, and contact boards.',
    accentColor: colors.purple,
    icon: 'resize-outline',
    effects: [
      { attribute: 'offensiveRebound', weight: 1 },
      { attribute: 'defensiveRebound', weight: 1 },
      { attribute: 'strength', weight: 0.45 }
    ],
    focusOptions: [
      {
        id: 'offensive',
        label: 'Offensive boards',
        effects: [{ attribute: 'offensiveRebound', weight: 1 }]
      },
      {
        id: 'defensive',
        label: 'Defensive boards',
        effects: [{ attribute: 'defensiveRebound', weight: 1 }]
      },
      {
        id: 'boxOuts',
        label: 'Box outs',
        effects: [
          { attribute: 'strength', weight: 1 },
          { attribute: 'defensiveRebound', weight: 0.5 }
        ]
      }
    ]
  },
  {
    type: 'athletic',
    title: 'Athletic Workout',
    description: 'Sprint mechanics, burst, jumping, conditioning, and repeat effort.',
    accentColor: colors.yellow,
    icon: 'flash-outline',
    effects: [
      { attribute: 'speed', weight: 0.85 },
      { attribute: 'acceleration', weight: 1 },
      { attribute: 'vertical', weight: 0.85 },
      { attribute: 'stamina', weight: 1 }
    ],
    focusOptions: [
      { id: 'speed', label: 'Sprint speed', effects: [{ attribute: 'speed', weight: 1 }] },
      {
        id: 'acceleration',
        label: 'First step and acceleration',
        effects: [{ attribute: 'acceleration', weight: 1 }]
      },
      { id: 'vertical', label: 'Vertical jump', effects: [{ attribute: 'vertical', weight: 1 }] },
      { id: 'stamina', label: 'Conditioning', effects: [{ attribute: 'stamina', weight: 1 }] }
    ]
  },
  {
    type: 'strength',
    title: 'Strength Workout',
    description: 'Core strength, contact balance, lower body power, and glass work.',
    accentColor: colors.court,
    icon: 'barbell-outline',
    effects: [
      { attribute: 'strength', weight: 1 },
      { attribute: 'interiorDefense', weight: 0.55 },
      { attribute: 'standingDunk', weight: 0.45 },
      { attribute: 'offensiveRebound', weight: 0.5 },
      { attribute: 'defensiveRebound', weight: 0.5 }
    ],
    focusOptions: [
      { id: 'lifting', label: 'Lifting', effects: [{ attribute: 'strength', weight: 1 }] },
      {
        id: 'contact',
        label: 'Contact and balance',
        effects: [
          { attribute: 'interiorDefense', weight: 1 },
          { attribute: 'strength', weight: 0.5 }
        ]
      },
      {
        id: 'power',
        label: 'Lower body power',
        effects: [
          { attribute: 'standingDunk', weight: 1 },
          { attribute: 'strength', weight: 0.5 }
        ]
      }
    ]
  },
  {
    type: 'game',
    title: 'Pickup Game',
    description: 'Full games, pickup runs, or 3x3. A little bit of everything.',
    // Neutral white: a game belongs to no single category.
    accentColor: colors.text,
    icon: 'basketball-outline',
    // Every rating can move in a game; spreadGains decides how many do.
    effects: ALL_ATTRIBUTE_KEYS.map((attribute) => ({ attribute, weight: 1 })),
    focusOptions: [],
    // A focused workout gives 4-10 points to a few ratings; a game hands out a
    // similar total as +1s, at least one in every category.
    spreadGains: { light: 6, medium: 8, hard: 10 }
  }
];
