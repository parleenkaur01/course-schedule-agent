import { afterEach, describe, expect, it, vi } from 'vitest';
import { clickDegreeEvaluationTile } from './clickDegreeEvaluation';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('clickDegreeEvaluationTile', () => {
  it('clicks the visible Degree Evaluation control and returns no page content', async () => {
    const click = vi.fn();
    vi.stubGlobal('document', {
      querySelectorAll: () => [
        { textContent: 'Financial Aid', getClientRects: () => [{}], click: vi.fn() },
        { textContent: 'Degree Evaluation', getClientRects: () => [{}], click },
      ],
    });
    expect(await clickDegreeEvaluationTile()).toBe('clicked');
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
