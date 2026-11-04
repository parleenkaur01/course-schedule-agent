import { afterEach, describe, expect, it, vi } from 'vitest';
import { installAuditNavigator } from './auditNavigator';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('installAuditNavigator', () => {
  it('points to one Run control and then one View Audit link without sending page contents', async () => {
    vi.useFakeTimers();
    let page: 'run' | 'view' | 'audit' = 'run';
    const sendMessage = vi.fn().mockResolvedValue(undefined);
    const control = (text: string, onClick: () => void) => ({
      tagName: 'BUTTON', textContent: text, style: { outline: '' }, isConnected: true,
      getAttribute: () => null, getClientRects: () => [{}], getBoundingClientRect: () => ({ top: 100, left: 100 }),
      scrollIntoView: vi.fn(), click: vi.fn(onClick),
    });
    const run = control('Run Declared Programs', () => { page = 'view'; });
    const view = control('View Audit', () => { page = 'audit'; });
    vi.stubGlobal('window', { innerWidth: 900 });
    vi.stubGlobal('document', {
      documentElement: { appendChild: vi.fn() },
      body: { get innerText() { return page === 'audit' ? 'Open All Sections Requirements' : ''; } },
      querySelector: () => null,
      querySelectorAll: (selector: string) => selector.startsWith('a, button') ? page === 'run' ? [run] : page === 'view' ? [view] : [] : [],
      createElement: () => ({ style: {}, remove: vi.fn(), textContent: '' }),
    });
    vi.stubGlobal('getComputedStyle', () => ({ visibility: 'visible' }));
    vi.stubGlobal('MutationObserver', class { observe() {} disconnect() {} });
    vi.stubGlobal('chrome', { runtime: { sendMessage } });

    installAuditNavigator(false);
    await vi.advanceTimersByTimeAsync(950 + 800 + 950 + 800);
    expect(run.click).toHaveBeenCalledOnce();
    expect(view.click).toHaveBeenCalledOnce();
    expect(sendMessage.mock.calls.map(([message]) => message.phase)).toEqual(['running-audit', 'opening-audit', 'audit-opened']);
    expect(sendMessage.mock.calls.every(([message]) => Object.keys(message).sort().join(',') === 'phase,type')).toBe(true);
  });

  it('does not choose among several declared programs', () => {
    const sendMessage = vi.fn().mockResolvedValue(undefined);
    const click = vi.fn();
    const radio = { name: 'degreeProgram', id: 'program', checked: false, getClientRects: () => [{}], closest: () => null };
    const run = { tagName: 'BUTTON', textContent: 'Run Declared Programs', getClientRects: () => [{}], getAttribute: () => null, click };
    vi.stubGlobal('window', {});
    vi.stubGlobal('document', {
      documentElement: {}, body: { innerText: '' }, querySelector: () => null,
      querySelectorAll: (selector: string) => selector.startsWith('input[type="radio"]') ? [radio, radio] : [run],
    });
    vi.stubGlobal('getComputedStyle', () => ({ visibility: 'visible' }));
    vi.stubGlobal('MutationObserver', class { observe() {} disconnect() {} });
    vi.stubGlobal('chrome', { runtime: { sendMessage } });
    installAuditNavigator(false);
    expect(sendMessage).toHaveBeenCalledWith({ type: 'SDSU_AUDIT_PROGRESS', phase: 'program-choice-needed' });
    expect(click).not.toHaveBeenCalled();
  });

  it('opens the only program link before running that program', async () => {
    vi.useFakeTimers();
    const sendMessage = vi.fn().mockResolvedValue(undefined);
    const programClick = vi.fn();
    const runClick = vi.fn();
    const control = (textContent: string, click: () => void) => ({
      tagName: 'A', textContent, style: { outline: '' }, isConnected: true, click,
      getAttribute: () => null, getClientRects: () => [{}], getBoundingClientRect: () => ({ top: 80, left: 80 }), scrollIntoView: vi.fn(),
    });
    const program = control('B.S. Example Program', programClick);
    const run = control('Run Declared Programs', runClick);
    const table = { querySelectorAll: (selector: string) => selector === 'th' ? [{ textContent: 'Degree Program' }] : [program] };
    vi.stubGlobal('window', { innerWidth: 900 });
    vi.stubGlobal('document', {
      documentElement: { appendChild: vi.fn() }, body: { innerText: '' }, querySelector: () => null,
      querySelectorAll: (selector: string) => selector === 'table' ? [table] : selector.startsWith('a, button') ? [run] : [],
      createElement: () => ({ style: {}, remove: vi.fn(), textContent: '' }),
    });
    vi.stubGlobal('getComputedStyle', () => ({ visibility: 'visible' }));
    vi.stubGlobal('MutationObserver', class { observe() {} disconnect() {} });
    vi.stubGlobal('chrome', { runtime: { sendMessage } });
    installAuditNavigator(false);
    await vi.advanceTimersByTimeAsync(950 + 800 + 950);
    expect(programClick).toHaveBeenCalledOnce();
    expect(runClick).toHaveBeenCalledOnce();
    expect(sendMessage.mock.calls.map(([message]) => message.phase)).toEqual(['selecting-program', 'running-audit']);
  });
});
