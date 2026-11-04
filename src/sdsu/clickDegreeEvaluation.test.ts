import { afterEach, describe, expect, it, vi } from 'vitest';
import { clickDegreeEvaluationTile } from './clickDegreeEvaluation';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('clickDegreeEvaluationTile', () => {
  it('clicks the visible Degree Evaluation control and returns no page content', async () => {
    vi.useFakeTimers();
    const click = vi.fn();
    const control = (textContent: string, action: () => void) => ({
      textContent, getClientRects: () => [{}], getBoundingClientRect: () => ({ top: 100, left: 100 }),
      scrollIntoView: vi.fn(), style: { outline: '' }, isConnected: true, click: action,
    });
    vi.stubGlobal('document', {
      documentElement: { appendChild: vi.fn() },
      createElement: () => ({ style: {}, remove: vi.fn(), animate: vi.fn(), textContent: '' }),
      querySelectorAll: () => [
        control('Financial Aid', vi.fn()),
        control('Degree Evaluation', click),
      ],
    });
    const outcome = clickDegreeEvaluationTile();
    await vi.advanceTimersByTimeAsync(800);
    expect(await outcome).toBe('clicked');
    expect(click).toHaveBeenCalledOnce();
  });

  it('reports a missing tile without clicking another control', async () => {
    vi.useFakeTimers();
    const click = vi.fn();
    vi.stubGlobal('document', {
      documentElement: {},
      querySelectorAll: () => [{ textContent: 'Financial Aid', getClientRects: () => [{}], click }],
    });
    vi.stubGlobal('MutationObserver', class {
      observe() {}
      disconnect() {}
    });
    const outcome = clickDegreeEvaluationTile();
    await vi.advanceTimersByTimeAsync(12000);
    expect(await outcome).toBe('missing');
    expect(click).not.toHaveBeenCalled();
  });
});
