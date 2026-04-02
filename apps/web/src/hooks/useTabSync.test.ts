import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useSessionStore } from '@/store/sessionStore';
import { useTabSync } from './useTabSync';

// ---------------------------------------------------------------------------
// vi.mock is hoisted to the top of the file by vitest, so the static import
// of useTabSync above still sees the mocked module.
// ---------------------------------------------------------------------------
vi.mock('react-hot-toast', () => ({
  default: Object.assign(vi.fn(), {
    error: vi.fn(),
    success: vi.fn(),
  }),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function buildMockWindow(closed = false): Window {
  return {
    closed,
    close: vi.fn(),
    location: { href: '' },
  } as unknown as Window;
}

let mockOpenReturn: Window | null;

beforeEach(() => {
  // Reset the Zustand store
  useSessionStore.getState().reset();

  // Return a fresh open window by default
  mockOpenReturn = buildMockWindow(false);
  vi.spyOn(window, 'open').mockImplementation(() => mockOpenReturn);
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// enableSync()
// ---------------------------------------------------------------------------
describe('useTabSync — enableSync()', () => {
  it('calls window.open with "about:blank" and target "tabpilot_sync"', () => {
    const { result } = renderHook(() => useTabSync());
    act(() => {
      result.current.enableSync();
    });
    expect(window.open).toHaveBeenCalledWith('about:blank', 'tabpilot_sync');
  });

  it('returns true on success', () => {
    const { result } = renderHook(() => useTabSync());
    let returnValue: boolean | undefined;
    act(() => {
      returnValue = result.current.enableSync();
    });
    expect(returnValue).toBe(true);
  });

  it('sets tabSyncEnabled to true in the store', () => {
    const { result } = renderHook(() => useTabSync());
    act(() => {
      result.current.enableSync();
    });
    expect(useSessionStore.getState().tabSyncEnabled).toBe(true);
  });

  it('returns false and does not enable sync when window.open returns null (pop-up blocked)', () => {
    mockOpenReturn = null;
    const { result } = renderHook(() => useTabSync());
    let returnValue: boolean | undefined;
    act(() => {
      returnValue = result.current.enableSync();
    });
    expect(returnValue).toBe(false);
    expect(useSessionStore.getState().tabSyncEnabled).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// navigateTo()
// ---------------------------------------------------------------------------
describe('useTabSync — navigateTo()', () => {
  it('does nothing when tabSyncEnabled is false', () => {
    const { result } = renderHook(() => useTabSync());
    // Do NOT call enableSync — tabSyncEnabled stays false in the store
    act(() => {
      result.current.navigateTo('https://example.com');
    });
    // window.open should not have been called for navigation
    expect(window.open).not.toHaveBeenCalled();
  });

  it('sets location.href on an existing open window', () => {
    const mockWin = buildMockWindow(false);
    mockOpenReturn = mockWin;

    const { result } = renderHook(() => useTabSync());
    // Enable sync so the hook stores a reference to mockWin
    act(() => {
      result.current.enableSync();
    });

    // Navigate — the existing window should receive the new URL
    act(() => {
      result.current.navigateTo('https://new.com');
    });
    expect((mockWin as unknown as { location: { href: string } }).location.href).toBe(
      'https://new.com',
    );
  });

  it('opens a new window with the URL when the previous window was closed', () => {
    // First call to open returns the initial window (for enableSync)
    const initialWin = buildMockWindow(false);
    mockOpenReturn = initialWin;

    const { result } = renderHook(() => useTabSync());
    act(() => {
      result.current.enableSync();
    });

    // Simulate the initial window being closed
    (initialWin as unknown as { closed: boolean }).closed = true;

    // Set up open to return a fresh window for the reopen call
    const reopenedWin = buildMockWindow(false);
    vi.spyOn(window, 'open').mockImplementation(() => reopenedWin);

    act(() => {
      result.current.navigateTo('https://reopened.com');
    });

    // window.open should have been called with the target URL to reopen
    expect(window.open).toHaveBeenCalledWith('https://reopened.com', 'tabpilot_sync');
  });
});
