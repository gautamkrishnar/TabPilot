import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

// Each test imports a fresh module instance so the module-level cache is reset
describe('useDocsAvailable', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    vi.resetModules();
  });

  it('returns false initially before fetch resolves', async () => {
    global.fetch = vi.fn().mockReturnValue(new Promise(() => {}));
    const { useDocsAvailable } = await import('./useDocsAvailable');
    const { result } = renderHook(() => useDocsAvailable());
    expect(result.current).toBe(false);
  });

  it('returns true when /docs/ responds with ok', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true } as Response);
    const { useDocsAvailable } = await import('./useDocsAvailable');
    const { result } = renderHook(() => useDocsAvailable());
    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current).toBe(true);
    expect(global.fetch).toHaveBeenCalledWith('/docs/', { method: 'HEAD' });
  });

  it('stays false when /docs/ responds with ok:false', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false } as Response);
    const { useDocsAvailable } = await import('./useDocsAvailable');
    const { result } = renderHook(() => useDocsAvailable());
    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current).toBe(false);
  });

  it('stays false when fetch throws', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));
    const { useDocsAvailable } = await import('./useDocsAvailable');
    const { result } = renderHook(() => useDocsAvailable());
    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current).toBe(false);
  });

  it('uses cached result on second render without re-fetching', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true } as Response);
    const { useDocsAvailable } = await import('./useDocsAvailable');
    renderHook(() => useDocsAvailable());
    await act(async () => {
      await Promise.resolve();
    });
    renderHook(() => useDocsAvailable());
    // fetch should only have been called once (second render uses cache)
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });
});
