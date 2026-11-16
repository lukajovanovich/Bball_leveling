import { NETWORK_ERROR_MESSAGE, describeError } from '../../src/lib/authErrors';

describe('describeError', () => {
  it.each([
    'Failed to fetch',
    'TypeError: Failed to fetch',
    'Network request failed',
    'NetworkError when attempting to fetch resource.',
    'Load failed',
    'fetch failed'
  ])('explains the unreachable-server error "%s"', (message) => {
    expect(describeError({ message })).toBe(NETWORK_ERROR_MESSAGE);
    expect(describeError(new Error(message))).toBe(NETWORK_ERROR_MESSAGE);
  });

  it('recognises Supabase retryable fetch errors by name', () => {
    expect(describeError({ name: 'AuthRetryableFetchError', message: '' })).toBe(
      NETWORK_ERROR_MESSAGE
    );
  });

  it('never shows the raw "Failed to fetch" text to the user', () => {
    expect(describeError(new TypeError('Failed to fetch'))).not.toMatch(
      /failed to fetch/i
    );
  });

  it('passes real server messages through untouched', () => {
    expect(describeError({ message: 'Invalid login credentials' })).toBe(
      'Invalid login credentials'
    );
    expect(describeError({ message: 'User already registered' })).toBe(
      'User already registered'
    );
  });

  it('falls back to a generic message when there is nothing useful', () => {
    const generic = 'Something went wrong. Please try again.';

    expect(describeError(null)).toBe(generic);
    expect(describeError(undefined)).toBe(generic);
    expect(describeError({})).toBe(generic);
    expect(describeError({ message: '   ' })).toBe(generic);
    expect(describeError({ message: 42 })).toBe(generic);
    expect(describeError('plain string')).toBe(generic);
  });
});
