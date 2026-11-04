import { afterEach, describe, expect, it, vi } from 'vitest';
import { installAuditInspector } from './auditInspector';

afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

async function inspect(text: string, rowText?: string) {
  vi.useFakeTimers();
  const sendMessage = vi.fn().mockResolvedValue(undefined);
  const heading = {
    textContent: 'SNAPSHOT', getClientRects: () => [{}], scrollIntoView: vi.fn(),
    getBoundingClientRect: () => ({ top: 100 }),
  };
  const row = rowText ? {
    innerText: rowText, textContent: rowText, className: 'not-met', getClientRects: () => [{}],
    getAttribute: () => null, querySelectorAll: () => [],
  } : null;
  vi.stubGlobal('window', {});
  vi.stubGlobal('document', {
    body: { innerText: text, textContent: text }, documentElement: {},
    querySelectorAll: (selector: string) => selector.startsWith('h1,') ? [heading]
      : selector.startsWith('tr,li') && row ? [row] : [],
  });
  vi.stubGlobal('MutationObserver', class { observe() {} });
  vi.stubGlobal('chrome', { runtime: { sendMessage } });
  installAuditInspector();
  await vi.advanceTimersByTimeAsync(1000);
  const reports = sendMessage.mock.calls.map(([message]) => message).filter((message) => message.type === 'SDSU_AUDIT_REPORT');
  return { reports, heading };
}

describe('audit inspector', () => {
  it('separates complete, in-progress, and not-met units instead of treating 116 as complete', async () => {
    const { reports, heading } = await inspect('SNAPSHOT 116 / 120 Units Complete: 101 In Progress: 15 Not Met: 4');
    expect(heading.scrollIntoView).toHaveBeenCalled();
    expect(reports[0].report.snapshot).toEqual({ counted: 116, required: 120, complete: 101, inProgress: 15, notMet: 4 });
  });

  it('does not invent a category breakdown from the fraction alone', async () => {
    const { reports } = await inspect('SNAPSHOT 116 / 120 Units');
    expect(reports[0].report.snapshot).toEqual({ counted: 116, required: 120 });
  });

  it('records course options from an unmet requirement without sending the whole page', async () => {
    const { reports } = await inspect('SNAPSHOT 116 / 120 Units', 'Writing requirement\nRWS 305W or RWS 350');
    expect(reports[0].report.missing).toEqual([{ section: 'Writing requirement', courses: ['RWS 305W', 'RWS 350'] }]);
    expect(JSON.stringify(reports[0])).not.toContain('SNAPSHOT');
  });

  it('finds a missing course option following a visible -R marker', async () => {
    const { reports } = await inspect('SNAPSHOT 116 / 120 Units\n-R Upper Division Writing\nRWS 305W or RWS 350');
    expect(reports[0].report.missing).toEqual([{ section: '-R Upper Division Writing', courses: ['RWS 305W', 'RWS 350'] }]);
  });
});
