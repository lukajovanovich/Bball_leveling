import {
  fetchPlayerProgressState,
  upsertPlayerProgressState
} from '../../src/lib/playerProfileStore';
import { ProgressState } from '../../src/types';
import { newPlayerState } from '../helpers/fixtures';
import { mockControls, supabase } from '../helpers/supabaseMock';

jest.mock('../../src/lib/supabase', () => require('../helpers/supabaseMock'));

beforeEach(() => {
  mockControls.reset();
});

describe('fetchPlayerProgressState', () => {
  it('reads only the signed-in user row from player_profiles', async () => {
    await fetchPlayerProgressState('user-42');

    expect(supabase.from).toHaveBeenCalledWith('player_profiles');
    expect(mockControls.select).toHaveBeenCalledWith('progress_state');
    expect(mockControls.eq).toHaveBeenCalledWith('user_id', 'user-42');
    expect(mockControls.maybeSingle).toHaveBeenCalledTimes(1);
  });

  it('returns null data when the user has no row yet', async () => {
    mockControls.setStoredProgress(null);

    await expect(fetchPlayerProgressState('user-1')).resolves.toEqual({
      data: null,
      error: null
    });
  });

  it('returns the stored progress', async () => {
    const stored = newPlayerState({ speed: 40 }, 900);
    mockControls.setStoredProgress(stored);

    const { data, error } = await fetchPlayerProgressState('user-1');

    expect(error).toBeNull();
    expect(data?.player.totalXp).toBe(900);
    expect(data?.player.attributes.speed).toBe(40);
    expect(data?.quests).toHaveLength(6);
  });

  it('never restores a stale level-up popup', async () => {
    mockControls.setStoredProgress({
      ...newPlayerState(),
      lastLevelUp: { previousLevel: 1, level: 2 }
    });

    const { data } = await fetchPlayerProgressState('user-1');

    expect(data?.lastLevelUp).toBeNull();
  });

  it('repairs old or damaged rows instead of crashing the app', async () => {
    mockControls.setStoredProgress({
      player: { name: '', height: '6\'4"', weight: '200 lbs', totalXp: 'lots' }
    });

    const { data, error } = await fetchPlayerProgressState('user-1');

    expect(error).toBeNull();
    expect(data?.player.name).toBe('MyPlayer');
    expect(data?.player.heightCm).toBe(193.04);
    expect(data?.player.totalXp).toBe(0);
    expect(data?.quests).toHaveLength(6);
    expect(data?.trainingSessions).toEqual([]);
    expect(data?.activityLog).toEqual([]);
  });

  it('treats a row with an empty progress_state as unusable but safe', async () => {
    mockControls.maybeSingle.mockResolvedValue({
      data: { progress_state: null },
      error: null
    });

    const { data, error } = await fetchPlayerProgressState('user-1');

    expect(error).toBeNull();
    expect(data?.player.name).toBe('MyPlayer');
  });

  it('passes database errors back to the caller', async () => {
    const dbError = { message: 'permission denied for table player_profiles' };
    mockControls.maybeSingle.mockResolvedValue({ data: null, error: dbError });

    await expect(fetchPlayerProgressState('user-1')).resolves.toEqual({
      data: null,
      error: dbError
    });
  });
});

describe('upsertPlayerProgressState', () => {
  const lastUpsert = () => {
    const [payload, options] = mockControls.upsert.mock.calls[0];

    return {
      payload: payload as {
        user_id: string;
        email: string | null;
        progress_state: ProgressState;
        updated_at: string;
      },
      options
    };
  };

  it('writes one row per user and overwrites on conflict', async () => {
    await upsertPlayerProgressState('user-9', 'p@example.com', newPlayerState());

    const { payload, options } = lastUpsert();

    expect(supabase.from).toHaveBeenCalledWith('player_profiles');
    expect(payload.user_id).toBe('user-9');
    expect(payload.email).toBe('p@example.com');
    expect(options).toEqual({ onConflict: 'user_id' });
  });

  it('stamps the row with a valid ISO update time', async () => {
    const before = Date.now();
    await upsertPlayerProgressState('user-9', null, newPlayerState());
    const { payload } = lastUpsert();

    expect(payload.email).toBeNull();
    expect(new Date(payload.updated_at).toISOString()).toBe(payload.updated_at);
    expect(new Date(payload.updated_at).getTime()).toBeGreaterThanOrEqual(before);
  });

  it('saves the full progress but never the level-up popup', async () => {
    const state = {
      ...newPlayerState({ stamina: 12 }, 333),
      lastLevelUp: { previousLevel: 1, level: 2 }
    };

    await upsertPlayerProgressState('user-9', null, state);
    const { payload } = lastUpsert();

    expect(payload.progress_state.lastLevelUp).toBeNull();
    expect(payload.progress_state.player.totalXp).toBe(333);
    expect(payload.progress_state.player.attributes.stamina).toBe(12);
    expect(payload.progress_state.quests).toEqual(state.quests);
  });

  it('does not change the state object it was given', async () => {
    const state = {
      ...newPlayerState(),
      lastLevelUp: { previousLevel: 1, level: 2 }
    };

    await upsertPlayerProgressState('user-9', null, state);

    expect(state.lastLevelUp).toEqual({ previousLevel: 1, level: 2 });
  });

  it('returns the database result', async () => {
    const dbError = { message: 'row violates row-level security policy' };
    mockControls.upsert.mockResolvedValue({ error: dbError });

    await expect(
      upsertPlayerProgressState('user-9', null, newPlayerState())
    ).resolves.toEqual({ error: dbError });
  });

  it('what is saved can be loaded back unchanged', async () => {
    const state = newPlayerState({ ballHandle: 55, speed: 61 }, 1234);

    await upsertPlayerProgressState('user-9', null, state);
    mockControls.setStoredProgress(
      JSON.parse(JSON.stringify(lastUpsert().payload.progress_state))
    );

    const { data } = await fetchPlayerProgressState('user-9');

    expect(data).toEqual(state);
  });
});
