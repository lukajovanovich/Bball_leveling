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

export const supabase = {
  auth: {
    getSession: jest.fn(),
    onAuthStateChange: jest.fn(),
    signInWithPassword: jest.fn(),
    signUp: jest.fn(),
    signOut: jest.fn(),
    startAutoRefresh: jest.fn(),
    stopAutoRefresh: jest.fn()
  },
  from: jest.fn()
};

export const makeSession = (id = 'user-1', email = 'player@example.com') => ({
  access_token: 'test-token',
  user: { id, email }
});

export const mockControls = {
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

  reset() {
    listeners.clear();
    isSupabaseConfigured = true;

    Object.values(supabase.auth).forEach((mock) => mock.mockReset());
    [supabase.from, maybeSingle, eq, select, upsert, unsubscribe].forEach((mock) =>
      mock.mockReset()
    );

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

    maybeSingle.mockResolvedValue({ data: null, error: null });
    eq.mockReturnValue({ maybeSingle });
    select.mockReturnValue({ eq });
    upsert.mockResolvedValue({ error: null });
    supabase.from.mockReturnValue({ select, upsert });
  }
};

mockControls.reset();
