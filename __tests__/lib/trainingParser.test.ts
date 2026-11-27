import { WORKOUTS } from '../../src/data/workouts';
import {
  buildTrainingCatalog,
  demoParseTraining,
  validateParsedWorkouts
} from '../../src/lib/trainingParser';

describe('buildTrainingCatalog', () => {
  it('lists every workout with its focus ids', () => {
    const catalog = buildTrainingCatalog();

    expect(catalog.map((entry) => entry.type)).toEqual(WORKOUTS.map((workout) => workout.type));
    expect(catalog.find((entry) => entry.type === 'shooting')?.focus.map((item) => item.id)).toContain(
      'threePointers'
    );
  });
});

describe('validateParsedWorkouts', () => {
  it('keeps only what the game understands', () => {
    expect(
      validateParsedWorkouts([
        { workoutType: 'shooting', intensity: 'hard', focus: ['midRange', 'perimeter', 7], note: 'x' },
        { workoutType: 'yoga', intensity: 'hard', focus: [], note: '' },
        { workoutType: 'shooting', intensity: 'light', focus: [], note: 'again' },
        { workoutType: 'game', intensity: 'insane', focus: ['midRange'] },
        null
      ])
    ).toEqual([
      // a focus id of another workout is dropped
      { workoutType: 'shooting', intensity: 'hard', focus: ['midRange'], note: 'x' },
      // unknown intensity becomes medium, the game has no focus
      { workoutType: 'game', intensity: 'medium', focus: [], note: '' }
    ]);
  });

  it('returns nothing for anything that is not a list', () => {
    expect(validateParsedWorkouts({ workoutType: 'shooting' })).toEqual([]);
    expect(validateParsedWorkouts(undefined)).toEqual([]);
  });

  it('keeps focus in the workout definition order and shortens long notes', () => {
    const [entry] = validateParsedWorkouts([
      { workoutType: 'shooting', intensity: 'medium', focus: ['threePointers', 'midRange'], note: 'n'.repeat(400) }
    ]);

    expect(entry.focus).toEqual(['midRange', 'threePointers']);
    expect(entry.note).toHaveLength(140);
  });
});

describe('demoParseTraining', () => {
  it('finds shooting with its focus and the games in an English description', () => {
    const workouts = demoParseTraining(
      'Today I shot 100 mid-range and 50 threes, then played 3 games to 21. Best on defense.'
    );

    expect(workouts.map((item) => item.workoutType)).toEqual(
      expect.arrayContaining(['shooting', 'game'])
    );
    expect(workouts.find((item) => item.workoutType === 'shooting')?.focus).toEqual([
      'midRange',
      'threePointers'
    ]);
  });

  it('understands a few Serbian words too', () => {
    const workouts = demoParseTraining('danas sut: 100 poludistanca i 50 trojki, pa odigrao 3 basketa');

    expect(workouts.map((item) => item.workoutType)).toEqual(['shooting', 'game']);
  });

  it('finds nothing in text about something else', () => {
    expect(demoParseTraining('Went to the cinema and had pizza')).toEqual([]);
  });

  it('reads intensity words', () => {
    expect(demoParseTraining('hard shooting session')[0].intensity).toBe('hard');
    expect(demoParseTraining('easy shooting')[0].intensity).toBe('light');
    expect(demoParseTraining('shooting')[0].intensity).toBe('medium');
  });
});
