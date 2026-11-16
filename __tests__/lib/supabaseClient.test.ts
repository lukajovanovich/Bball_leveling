const mockCreateClient = jest.fn((..._args: unknown[]) => ({
  auth: { startAutoRefresh: jest.fn(), stopAutoRefresh: jest.fn() }
}));

jest.mock('@supabase/supabase-js', () => ({
  createClient: (...args: unknown[]) => mockCreateClient(...args),
  processLock: jest.fn()
}));
jest.mock('expo-sqlite/localStorage/install', () => ({}));
jest.mock('react-native-url-polyfill/auto', () => ({}));

const ENV_KEYS = [
  'EXPO_PUBLIC_SUPABASE_URL',
  'EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY'
] as const;

const originalEnv = { ...process.env };

const loadClientModule = (env: Partial<Record<(typeof ENV_KEYS)[number], string>>) => {
  ENV_KEYS.forEach((key) => {
    delete process.env[key];
  });
  Object.assign(process.env, env);

  let loaded!: typeof import('../../src/lib/supabase');
  let appStateListener!: jest.SpyInstance;

  jest.isolateModules(() => {
    const { AppState } = require('react-native');

    appStateListener = jest.spyOn(AppState, 'addEventListener');
    loaded = require('../../src/lib/supabase');
  });

  return Object.assign(loaded, { appStateListener });
};

beforeEach(() => {
  mockCreateClient.mockClear();
});

afterAll(() => {
  process.env = originalEnv;
});

describe('supabase client setup', () => {
  it('reports configured when both env vars are present', () => {
    const { isSupabaseConfigured } = loadClientModule({
      EXPO_PUBLIC_SUPABASE_URL: 'https://project.supabase.co',
      EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test'
    });

    expect(isSupabaseConfigured).toBe(true);
    expect(mockCreateClient).toHaveBeenCalledWith(
      'https://project.supabase.co',
      'sb_publishable_test',
      expect.any(Object)
    );
  });

  it.each([
    ['both are missing', {}],
    ['only the URL is set', { EXPO_PUBLIC_SUPABASE_URL: 'https://project.supabase.co' }],
    ['only the key is set', { EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test' }],
    [
      'a value is empty',
      {
        EXPO_PUBLIC_SUPABASE_URL: '',
        EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test'
      }
    ]
  ])('reports not configured when %s', (_, env) => {
    expect(loadClientModule(env).isSupabaseConfigured).toBe(false);
  });

  it('still builds a placeholder client so the app can boot without env vars', () => {
    const { supabase } = loadClientModule({});

    expect(supabase).toBeDefined();
    expect(mockCreateClient).toHaveBeenCalledTimes(1);
    expect(mockCreateClient.mock.calls[0][0]).toMatch(/^https:\/\//);
  });

  it('refreshes the session only while the app is in the foreground', () => {
    const { supabase, appStateListener } = loadClientModule({
      EXPO_PUBLIC_SUPABASE_URL: 'https://project.supabase.co',
      EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test'
    });

    expect(appStateListener).toHaveBeenCalledWith('change', expect.any(Function));

    const onChange = appStateListener.mock.calls[0][1] as (state: string) => void;

    onChange('active');
    expect(supabase.auth.startAutoRefresh).toHaveBeenCalledTimes(1);
    expect(supabase.auth.stopAutoRefresh).not.toHaveBeenCalled();

    onChange('background');
    expect(supabase.auth.stopAutoRefresh).toHaveBeenCalledTimes(1);
    expect(supabase.auth.startAutoRefresh).toHaveBeenCalledTimes(1);
  });

  it('keeps the session on the device and refreshes it automatically', () => {
    loadClientModule({
      EXPO_PUBLIC_SUPABASE_URL: 'https://project.supabase.co',
      EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test'
    });

    const options = mockCreateClient.mock.calls[0][2] as {
      auth: Record<string, unknown>;
    };

    expect(options.auth).toMatchObject({
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false
    });
  });
});
