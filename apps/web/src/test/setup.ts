import '@testing-library/jest-dom';

// Node 26 exposes its own localStorage backed by SQLite, which can conflict
// with happy-dom's implementation and leave globalThis.localStorage undefined.
// Ensure a working in-memory shim is always present before tests run.
if (typeof localStorage === 'undefined' || localStorage === null) {
  const store: Record<string, string> = {};
  Object.defineProperty(globalThis, 'localStorage', {
    value: {
      getItem: (key: string): string | null => (Object.hasOwn(store, key) ? store[key] : null),
      setItem: (key: string, value: string): void => {
        store[key] = String(value);
      },
      removeItem: (key: string): void => {
        delete store[key];
      },
      clear: (): void => {
        for (const key of Object.keys(store)) delete store[key];
      },
      get length(): number {
        return Object.keys(store).length;
      },
      key: (index: number): string | null => Object.keys(store)[index] ?? null,
    },
    writable: true,
    configurable: true,
  });
}
