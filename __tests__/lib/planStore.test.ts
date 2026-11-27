jest.mock('../../src/lib/supabase', () => require('../helpers/supabaseMock'));

import { NETWORK_ERROR_MESSAGE } from '../../src/lib/authErrors';
import { fetchUserPlan, setTestPlan } from '../../src/lib/planStore';
import { mockControls, supabase } from '../helpers/supabaseMock';

beforeEach(() => {
  mockControls.reset();
});

describe('fetchUserPlan', () => {
  it('reads premium and treats anything else as free', async () => {
    mockControls.setPlan('premium');
    expect(await fetchUserPlan('user-1')).toEqual({ plan: 'premium', error: null });

    mockControls.setPlan('gold');
    expect((await fetchUserPlan('user-1')).plan).toBe('free');

    mockControls.setPlan(null);
    expect((await fetchUserPlan('user-1')).plan).toBe('free');
  });

  it('falls back to free when the read fails or throws', async () => {
    const failure = { message: 'permission denied' };
    mockControls.planSelect.mockReturnValue({
      eq: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: failure }) })
    });
    expect(await fetchUserPlan('user-1')).toEqual({ plan: 'free', error: failure });

    supabase.from.mockImplementation(() => {
      throw new Error('offline');
    });
    expect((await fetchUserPlan('user-1')).plan).toBe('free');
  });
});

describe('setTestPlan', () => {
  it('calls the database function with the plan', async () => {
    expect(await setTestPlan('premium')).toEqual({ error: null });
    expect(mockControls.rpc).toHaveBeenCalledWith('set_test_plan', { new_plan: 'premium' });
  });

  it('turns failures into messages for the player', async () => {
    mockControls.rpc.mockResolvedValue({ data: null, error: { message: 'test_upgrades_disabled' } });
    expect(await setTestPlan('premium')).toEqual({ error: 'Upgrades are not open yet.' });

    mockControls.rpc.mockResolvedValue({ data: null, error: { code: 'PGRST202', message: 'x' } });
    expect(await setTestPlan('premium')).toEqual({ error: 'Upgrades are not set up yet.' });

    mockControls.rpc.mockResolvedValue({ data: null, error: { message: 'Failed to fetch' } });
    expect(await setTestPlan('premium')).toEqual({ error: NETWORK_ERROR_MESSAGE });

    mockControls.rpc.mockRejectedValue(new TypeError('Failed to fetch'));
    expect(await setTestPlan('free')).toEqual({ error: NETWORK_ERROR_MESSAGE });
  });
});
