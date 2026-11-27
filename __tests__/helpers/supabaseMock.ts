// Stand-in for src/lib/supabase.ts. Use it with:
//   jest.mock('../../src/lib/supabase', () => require('../helpers/supabaseMock'));
// Nothing here talks to the network.

type AuthListener = (event: string, session: unknown) => void;

const listeners = new Set<AuthListener>();

export let isSupabaseConfigured = true;

const maybeSingle = jest.fn();
const eq = jest.fn();
const select = jest.fn();
const upsert = jest.fn();
const unsubscribe = jest.fn();
// user_plans has its own query chain so a plan never mixes with the profile row.
const planMaybeSingle = jest.fn();
const planEq = jest.fn();
const planSelect = jest.fn();
const invoke = jest.fn();

export const supabase = {
  auth: {
    getSession: jest.fn(),
    onAuthStateChange: jest.fn(),
    signInWithPassword: jest.fn(),
    signUp: jest.fn(),
    signInWithOAuth: jest.fn(),
    exchangeCodeForSession: jest.fn(),
    signOut: jest.fn(),
    startAutoRefresh: jest.fn(),
    stopAutoRefresh: jest.fn()
  },
  from: jest.fn(),
  functions: { invoke }
};

export const makeSession = (id = 'user-1', email = 'player@example.com') => ({
  access_token: 'test-token',
  user: { id, email }
});

/** A session as Supabase returns it after a Google sign-in. */
export const makeGoogleSession = (
  id = 'google-user',
  email = 'jordan.miles@gmail.com',
  metadata: Record<string, unknown> = { full_name: 'Jordan Miles' }
) => ({
  access_token: 'google-token',
  user: {
    id,
    email,
    app_metadata: { provider: 'google', providers: ['google'] },
    user_metadata: metadata
  }
});

export const GOOGLE_AUTH_URL = 'https://project.supabase.co/auth/v1/authorize?provider=google';

export const mockControls = {
  invoke,
  planSelect,
  maybeSingle,
  eq,
  select,
  upsert,
  unsubscribe,

  setConfigured(value: boolean) {
    isSupabaseConfigured = value;
  },

  /** Simulates Supabase telling the app the session changed. */
  emitAuthChange(event: string, session: unknown) {
    Array.from(listeners).forEach((listener) => listener(event, session));
  },

  listenerCount() {
    return listeners.size;
  },

  /** The app starts with this session already stored on the device. */
  startSignedIn(session: unknown = makeSession()) {
    supabase.auth.getSession.mockResolvedValue({
      data: { session },
      error: null
    });
  },

  /** The cloud row returned when the app loads the player's progress. */
  setStoredProgress(progressState: unknown) {
    maybeSingle.mockResolvedValue({
      data: progressState === null ? null : { progress_state: progressState },
      error: null
    });
  },

  /** The signed-in user's row in user_plans (null: no row, i.e. free). */
  setPlan(plan: string | null) {
    planMaybeSingle.mockResolvedValue({
      data: plan === null ? null : { plan },
      error: null
    });
  },

  reset() {
    listeners.clear();
    isSupabaseConfigured = true;

    Object.values(supabase.auth).forEach((mock) => mock.mockReset());
    [
      supabase.from,
      maybeSingle,
      eq,
      select,
      upsert,
      unsubscribe,
      planMaybeSingle,
      planEq,
      planSelect,
      invoke
    ].forEach((mock) => mock.mockReset());

    supabase.auth.getSession.mockResolvedValue({
      data: { session: null },
      error: null
    });
    supabase.auth.onAuthStateChange.mockImplementation((listener: AuthListener) => {
      listeners.add(listener);

      return {
        data: {
          subscription: {
            unsubscribe: () => {
              listeners.delete(listener);
              unsubscribe();
            }
          }
        }
      };
    });
    supabase.auth.signInWithPassword.mockResolvedValue({ data: {}, error: null });
    supabase.auth.signUp.mockResolvedValue({
      data: { user: null, session: null },
      error: null
    });
    supabase.auth.signOut.mockResolvedValue({ error: null });
    supabase.auth.signInWithOAuth.mockResolvedValue({
      data: { provider: 'google', url: GOOGLE_AUTH_URL },
      error: null
    });
    supabase.auth.exchangeCodeForSession.mockResolvedValue({
      data: { session: null, user: null },
      error: null
    });

    maybeSingle.mockResolvedValue({ data: null, error: null });
    eq.mockReturnValue({ maybeSingle });
    select.mockReturnValue({ eq });
    upsert.mockResolvedValue({ error: null });
    planMaybeSingle.mockResolvedValue({ data: null, error: null });
    planEq.mockReturnValue({ maybeSingle: planMaybeSingle });
    planSelect.mockReturnValue({ eq: planEq });
    supabase.from.mockImplementation((table: string) =>
      table === 'user_plans' ? { select: planSelect } : { select, upsert }
    );
    invoke.mockResolvedValue({ data: { status: 'not_configured' }, error: null });
  }
};

mockControls.reset();
