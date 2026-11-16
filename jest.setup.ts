// In-memory localStorage so code that persists small values (pending signup
// profile, auth session) behaves the same in tests as it does in the app.
class MemoryStorage {
  private store = new Map<string, string>();

  get length() {
    return this.store.size;
  }

  clear() {
    this.store.clear();
  }

  getItem(key: string) {
    return this.store.has(key) ? (this.store.get(key) as string) : null;
  }

  key(index: number) {
    return Array.from(this.store.keys())[index] ?? null;
  }

  removeItem(key: string) {
    this.store.delete(key);
  }

  setItem(key: string, value: string) {
    this.store.set(key, String(value));
  }
}

Object.defineProperty(globalThis, 'localStorage', {
  value: new MemoryStorage(),
  configurable: true,
  writable: true
});

beforeEach(() => {
  globalThis.localStorage.clear();
});

// expo-router needs a native navigation container; screens only use these
// pieces of it, so tests get simple stand-ins and can assert on navigation.
jest.mock('expo-router', () => {
  const React = require('react');
  const { Text, View } = require('react-native');

  const Tabs = ({ children }: { children?: unknown }) =>
    React.createElement(View, { testID: 'tabs' }, children);

  Tabs.Screen = ({
    name,
    options
  }: {
    name: string;
    options?: {
      title?: string;
      tabBarIcon?: (props: { color: string; size: number }) => unknown;
    };
  }) =>
    React.createElement(
      View,
      { testID: `tab-${name}` },
      options?.tabBarIcon?.({ color: '#FFFFFF', size: 24 }),
      React.createElement(Text, null, options?.title ?? name)
    );

  const Stack = () => React.createElement(View, { testID: 'stack' });

  return {
    router: {
      push: jest.fn(),
      replace: jest.fn(),
      back: jest.fn()
    },
    Tabs,
    Stack
  };
});
