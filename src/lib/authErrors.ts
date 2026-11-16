const NETWORK_ERROR_PATTERN =
  /failed to fetch|network request failed|networkerror|load failed|fetch failed/i;

export const NETWORK_ERROR_MESSAGE =
  "Can't reach the server. Check your internet connection and that the Supabase project is active, then try again.";

const FALLBACK_ERROR_MESSAGE = 'Something went wrong. Please try again.';

interface ErrorLike {
  name?: unknown;
  message?: unknown;
}

// Browsers and React Native report an unreachable server as a bare
// "Failed to fetch" / "Network request failed", which tells the user nothing.
export const describeError = (error: unknown): string => {
  const { name, message } = (error ?? {}) as ErrorLike;
  const text = typeof message === 'string' ? message.trim() : '';

  if (name === 'AuthRetryableFetchError' || NETWORK_ERROR_PATTERN.test(text)) {
    return NETWORK_ERROR_MESSAGE;
  }

  return text || FALLBACK_ERROR_MESSAGE;
};
