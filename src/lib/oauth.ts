import { Platform } from 'react-native';
import * as Linking from 'expo-linking';

export interface AuthRedirectParams {
  code: string | null;
  error: string | null;
  errorDescription: string | null;
}

const AUTH_REDIRECT_KEYS = ['code', 'error', 'error_code', 'error_description'];

const readParams = (part: string) => new URLSearchParams(part);

// Supabase sends `?code=` back for PKCE, but errors can arrive in the query or
// in the hash depending on where the flow failed, so both are read.
export const parseAuthRedirectUrl = (url: string): AuthRedirectParams => {
  const hashIndex = url.indexOf('#');
  const beforeHash = hashIndex === -1 ? url : url.slice(0, hashIndex);
  const hash = hashIndex === -1 ? '' : url.slice(hashIndex + 1);
  const queryIndex = beforeHash.indexOf('?');
  const query = readParams(queryIndex === -1 ? '' : beforeHash.slice(queryIndex + 1));
  const fragment = readParams(hash);
  const get = (key: string) => query.get(key) || fragment.get(key) || null;

  return {
    code: get('code'),
    error: get('error'),
    errorDescription: get('error_description')
  };
};

export const hasAuthRedirectParams = (params: AuthRedirectParams) =>
  Boolean(params.code || params.error);

// Google answers "access_denied" when the player closes or declines the
// consent screen. That is a choice, not a failure.
export const isCancelledAuthRedirect = (params: AuthRedirectParams) =>
  params.error === 'access_denied';

/** Where Supabase sends the player back after Google. */
export const getOAuthRedirectUrl = () => {
  if (Platform.OS === 'web') {
    return `${globalThis.location?.origin ?? ''}/`;
  }

  // bballleveling:/// in a build, exp://.../--/ in Expo Go. The root path is
  // the sign-in screen, so a deep link that reaches the router lands there.
  return Linking.createURL('/');
};

const removeAuthParams = (part: string) => {
  const params = readParams(part);
  AUTH_REDIRECT_KEYS.forEach((key) => params.delete(key));

  return params.toString();
};

let webRedirectTaken = false;

/**
 * On web, reads the sign-in result Supabase put in the address bar and removes
 * it, so a reload or a shared link does not replay a used code. Returns null
 * on native, when there is nothing to read, and on every call after the first.
 */
export const takeWebAuthRedirect = (): AuthRedirectParams | null => {
  if (Platform.OS !== 'web' || webRedirectTaken) {
    return null;
  }

  const location = globalThis.location;

  if (!location?.href) {
    return null;
  }

  webRedirectTaken = true;
  const params = parseAuthRedirectUrl(location.href);

  if (!hasAuthRedirectParams(params)) {
    return null;
  }

  const search = removeAuthParams(location.search.replace(/^\?/, ''));
  const hash = removeAuthParams(location.hash.replace(/^#/, ''));
  const cleanUrl = `${location.pathname}${search ? `?${search}` : ''}${hash ? `#${hash}` : ''}`;

  globalThis.history?.replaceState(globalThis.history.state, '', cleanUrl);

  return params;
};

/** Test-only: lets each test read the address bar again. */
export const resetWebAuthRedirectForTests = () => {
  webRedirectTaken = false;
};
