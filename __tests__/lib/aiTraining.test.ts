jest.mock('../../src/lib/supabase', () => require('../helpers/supabaseMock'));

import { PARSE_TRAINING_FUNCTION, readTrainingDescription } from '../../src/lib/aiTraining';
import { NETWORK_ERROR_MESSAGE } from '../../src/lib/authErrors';
import { mockControls } from '../helpers/supabaseMock';

beforeEach(() => {
  mockControls.reset();
});

describe('readTrainingDescription', () => {
  it('sends the trimmed text with the catalog and checks what comes back', async () => {
    mockControls.invoke.mockResolvedValue({
      data: {
        status: 'ok',
        remainingToday: 9,
        workouts: [
          { workoutType: 'shooting', intensity: 'hard', focus: ['threePointers'], note: '50 threes' },
          { workoutType: 'made-up', intensity: 'hard', focus: [], note: '' }
        ]
      },
      error: null
    });

    const result = await readTrainingDescription('  50 threes  ');

    expect(mockControls.invoke).toHaveBeenCalledWith(PARSE_TRAINING_FUNCTION, {
      body: expect.objectContaining({ text: '50 threes', catalog: expect.any(Array) })
    });
    expect(result).toEqual({
      ok: true,
      demo: false,
      remainingToday: 9,
      workouts: [
        { workoutType: 'shooting', intensity: 'hard', focus: ['threePointers'], note: '50 threes' }
      ]
    });
  });

  it('falls back to the demo reading while the AI is not set up', async () => {
    const result = await readTrainingDescription('shooting and a pickup game');

    expect(result).toMatchObject({ ok: true, demo: true });
    expect(result.ok && result.workouts.map((item) => item.workoutType)).toEqual(['shooting', 'game']);
  });

  it('falls back to the demo reading while the function is not deployed', async () => {
    mockControls.invoke.mockResolvedValue({
      data: null,
      error: { name: 'FunctionsHttpError', message: 'Not found', context: { status: 404 } }
    });

    expect(await readTrainingDescription('shooting')).toMatchObject({ ok: true, demo: true });
  });

  it('explains when the player is not premium or out of reads', async () => {
    mockControls.invoke.mockResolvedValue({ data: { status: 'not_premium' }, error: null });
    expect(await readTrainingDescription('shooting')).toEqual({
      ok: false,
      message: 'Describing your training is part of Premium.'
    });

    mockControls.invoke.mockResolvedValue({ data: { status: 'limit_reached', limit: 10 }, error: null });
    expect(await readTrainingDescription('shooting')).toEqual({
      ok: false,
      message: "You've used all 10 training reads for today. More tomorrow."
    });
  });

  it('turns a network failure into a readable message', async () => {
    mockControls.invoke.mockRejectedValue(new TypeError('Failed to fetch'));

    expect(await readTrainingDescription('shooting')).toEqual({
      ok: false,
      message: NETWORK_ERROR_MESSAGE
    });
  });

  it('does not call the server for empty text', async () => {
    expect(await readTrainingDescription('   ')).toEqual({
      ok: false,
      message: 'Write what you trained today first.'
    });
    expect(mockControls.invoke).not.toHaveBeenCalled();
  });
});
