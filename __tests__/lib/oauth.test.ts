import { Platform } from 'react-native';
import * as Linking from 'expo-linking';
import {
  getOAuthRedirectUrl,
  hasAuthRedirectParams,
  isCancelledAuthRedirect,
  parseAuthRedirectUrl,
  resetWebAuthRedirectForTests,
  takeWebAuthRedirect
} from '../../src/lib/oauth';

jest.mock('expo-linking', () => ({
  createURL: jest.fn(() => 'bballleveling:///')
}));

const originalLocation = Object.getOwnPropertyDescriptor(globalThis, 'location');
const originalHistory = Object.getOwnPropertyDescriptor(globalThis, 'history');

const setAddressBar = (url: string) => {
  const parsed = new URL(url);
  const replaceState = jest.fn();

  Object.defineProperty(globalThis, 'location', {
    configurable: true,
    value: {
      href: parsed.href,
      origin: parsed.origin,
      pathname: parsed.pathname,
      search: parsed.search,
      hash: parsed.hash
    }
  });
  Object.defineProperty(globalThis, 'history', {
    configurable: true,
    value: { state: { key: 'router' }, replaceState }
  });

  return replaceState;
};

const restoreGlobal = (name: string, descriptor?: PropertyDescriptor) => {
  if (descriptor) {
    Object.defineProperty(globalThis, name, descriptor);
  } else {
    delete (globalThis as Record<string, unknown>)[name];
  }
};

afterEach(() => {
  jest.restoreAllMocks();
  restoreGlobal('location', originalLocation);
  restoreGlobal('history', originalHistory);
  resetWebAuthRedirectForTests();
});

describe('parseAuthRedirectUrl', () => {
  it('reads the PKCE code from the query', () => {
    expect(parseAuthRedirectUrl('https://bballleveling.vercel.app/?code=abc123')).toEqual({
      code: 'abc123',
      error: null,
      errorCode: null,
      errorDescription: null
    });
  });

  it('reads the code from a native app link', () => {
    expect(parseAuthRedirectUrl('bballleveling:///?code=xyz').code).toBe('xyz');
    expect(parseAuthRedirectUrl('exp://192.168.1.5:8081/--/?code=xyz').code).toBe('xyz');
  });

  it('reads an error sent in the hash', () => {
    expect(
      parseAuthRedirectUrl(
        'https://app.test/#error=server_error&error_description=Unable+to+exchange+external+code'
      )
    ).toEqual({
      code: null,
      error: 'server_error',
      errorCode: null,
      errorDescription: 'Unable to exchange external code'
    });
  });

  it('finds nothing in an ordinary link', () => {
    const params = parseAuthRedirectUrl('https://app.test/home?tab=build');

    expect(hasAuthRedirectParams(params)).toBe(false);
  });

  it('treats a declined Google consent screen as a cancel', () => {
    expect(
      isCancelledAuthRedirect(parseAuthRedirectUrl('https://app.test/?error=access_denied'))
    ).toBe(true);
    expect(
      isCancelledAuthRedirect(parseAuthRedirectUrl('https://app.test/?error=server_error'))
    ).toBe(false);
  });

  it('does not hide an expired email link as a cancel', () => {
    const params = parseAuthRedirectUrl(
      'https://app.test/#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired'
    );

    expect(params.errorCode).toBe('otp_expired');
    expect(isCancelledAuthRedirect(params)).toBe(false);
  });
});

describe('getOAuthRedirectUrl', () => {
  it('uses the app scheme on native', () => {
    expect(getOAuthRedirectUrl()).toBe('bballleveling:///');
    expect(Linking.createURL).toHaveBeenCalledWith('/');
  });

  it('comes back to the current site on web', () => {
    jest.replaceProperty(Platform, 'OS', 'web');
    setAddressBar('https://preview-abc.vercel.app/home');

    expect(getOAuthRedirectUrl()).toBe('https://preview-abc.vercel.app/');
  });
});

describe('takeWebAuthRedirect', () => {
  it('ignores the address bar on native', () => {
    const replaceState = setAddressBar('https://app.test/?code=abc');

    expect(takeWebAuthRedirect()).toBeNull();
    expect(replaceState).not.toHaveBeenCalled();
  });

  it('returns the code and removes it from the address bar', () => {
    jest.replaceProperty(Platform, 'OS', 'web');
    const replaceState = setAddressBar('https://app.test/?code=abc&tab=build');

    expect(takeWebAuthRedirect()).toMatchObject({ code: 'abc' });
    expect(replaceState).toHaveBeenCalledWith({ key: 'router' }, '', '/?tab=build');
  });

  it('removes an error from the hash too', () => {
    jest.replaceProperty(Platform, 'OS', 'web');
    const replaceState = setAddressBar(
      'https://app.test/#error=access_denied&error_description=denied'
    );

    expect(takeWebAuthRedirect()).toMatchObject({ error: 'access_denied' });
    expect(replaceState).toHaveBeenCalledWith({ key: 'router' }, '', '/');
  });

  it('leaves an ordinary link alone', () => {
    jest.replaceProperty(Platform, 'OS', 'web');
    const replaceState = setAddressBar('https://app.test/quests');

    expect(takeWebAuthRedirect()).toBeNull();
    expect(replaceState).not.toHaveBeenCalled();
  });

  it('hands out a code only once', () => {
    jest.replaceProperty(Platform, 'OS', 'web');
    setAddressBar('https://app.test/?code=abc');

    expect(takeWebAuthRedirect()).toMatchObject({ code: 'abc' });
    expect(takeWebAuthRedirect()).toBeNull();
  });
});
