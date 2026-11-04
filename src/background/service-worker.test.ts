import { afterEach, describe, expect, it, vi } from 'vitest';
import { RUN_KEY, type SdsuWorkflow } from '../sdsu/portal';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe('SDSU browser workflow', () => {
  it('waits for student sign-in, then opens the degree tile and reports progress', async () => {
    let onMessage: ((message: { type: string }, sender: unknown, sendResponse: (response: { ok: boolean }) => void) => boolean | void) | undefined;
    let onUpdated: ((tabId: number, info: { status: string; url?: string }, tab: { id: number; windowId: number; url?: string }) => void) | undefined;
    let stored: SdsuWorkflow | undefined;
    const create = vi.fn().mockResolvedValue({ id: 8, windowId: 3 });
    const executeScript = vi.fn().mockResolvedValue([{ result: 'clicked' }]);
    vi.stubGlobal('chrome', {
      runtime: { onInstalled: { addListener: vi.fn() }, onMessage: { addListener: (listener: typeof onMessage) => { onMessage = listener; } } },
      sidePanel: { setPanelBehavior: vi.fn() },
      tabs: {
        query: vi.fn().mockResolvedValue([{ id: 7, windowId: 3, url: 'https://my.sdsu.edu/' }]),
        create,
        onUpdated: { addListener: (listener: typeof onUpdated) => { onUpdated = listener; } },
      },
      storage: { session: { get: vi.fn().mockImplementation(async () => ({ [RUN_KEY]: stored })), set: vi.fn().mockImplementation(async (value: Record<string, SdsuWorkflow>) => { stored = value[RUN_KEY]; }) } },
      scripting: { executeScript },
    });
    await import('./service-worker');
    const response = await new Promise<{ ok: boolean }>((resolve) => onMessage?.({ type: 'START_SDSU_WORKFLOW' }, {}, resolve));
    expect(response.ok).toBe(true);
    expect(create).toHaveBeenCalledWith({ url: 'https://my.sdsu.edu/', windowId: 3 });
    expect(stored?.phase).toBe('awaiting-sign-in');

    onUpdated?.(8, { status: 'complete', url: 'https://cmsweb.cms.sdsu.edu/psc/CSDPRD/EMPLOYEE/SA/c/NUI_FRAMEWORK.PT_LANDINGPAGE.GBL' }, { id: 8, windowId: 3 });
    await vi.waitFor(() => expect(stored?.phase).toBe('tile-clicked'));
    expect(executeScript).toHaveBeenCalledWith(expect.objectContaining({ target: { tabId: 8, allFrames: true } }));

    onUpdated?.(9, { status: 'complete', url: 'https://sdsu.uachieve.com/selfservice/audit/create.html' }, { id: 9, windowId: 4 });
    await vi.waitFor(() => expect(stored?.auditTabId).toBe(9));
    onMessage?.({ type: 'SDSU_AUDIT_UNITS', units: 10 } as { type: string }, { tab: { id: 9, url: 'https://sdsu.uachieve.com/selfservice/audit/create.html' }, frameId: 0 }, vi.fn());
    await vi.waitFor(() => expect(stored?.auditUnits).toBe(10));
    onMessage?.({ type: 'SDSU_AUDIT_UNITS', units: 99 } as { type: string }, { tab: { id: 9, url: 'https://example.com/audit' }, frameId: 0 }, vi.fn());
    expect(stored?.auditUnits).toBe(10);
    onMessage?.({ type: 'SDSU_AUDIT_PROGRESS', phase: 'running-audit' } as { type: string }, { tab: { id: 9, url: 'https://sdsu.uachieve.com/selfservice/audit/create.html' } }, vi.fn());
    await vi.waitFor(() => expect(stored?.runAttempted).toBe(true));
    onUpdated?.(9, { status: 'complete', url: 'https://sdsu.uachieve.com/selfservice/audit/create.html' }, { id: 9, windowId: 4 });
    await vi.waitFor(() => expect(executeScript).toHaveBeenCalledTimes(5));
    expect(stored?.phase).toBe('running-audit');
  });

  it('does not replace newer audit progress when the original tile click finishes late', async () => {
    let onMessage: ((message: { type: string }, sender: unknown, sendResponse: (response: { ok: boolean }) => void) => boolean | void) | undefined;
    let onUpdated: ((tabId: number, info: { status: string; url?: string }, tab: { id: number; windowId: number; url?: string }) => void) | undefined;
    let stored: SdsuWorkflow | undefined;
    let finishPortal!: (value: { result: string }[]) => void;
    const portalClick = new Promise<{ result: string }[]>((resolve) => { finishPortal = resolve; });
    vi.stubGlobal('chrome', {
      runtime: { onInstalled: { addListener: vi.fn() }, onMessage: { addListener: (listener: typeof onMessage) => { onMessage = listener; } } },
      sidePanel: { setPanelBehavior: vi.fn() },
      tabs: { query: vi.fn().mockResolvedValue([{ id: 8, windowId: 3, url: 'https://cmsweb.cms.sdsu.edu/psc/PT_LANDINGPAGE.GBL' }]), onUpdated: { addListener: (listener: typeof onUpdated) => { onUpdated = listener; } } },
      storage: { session: { get: vi.fn().mockImplementation(async () => ({ [RUN_KEY]: stored })), set: vi.fn().mockImplementation(async (value: Record<string, SdsuWorkflow>) => { stored = value[RUN_KEY]; }) } },
      scripting: { executeScript: vi.fn().mockImplementation(({ target }: { target: { tabId: number } }) => target.tabId === 8 ? portalClick : Promise.resolve([])) },
    });
    await import('./service-worker');
    const response = new Promise<{ ok: boolean }>((resolve) => onMessage?.({ type: 'START_SDSU_WORKFLOW' }, {}, resolve));
    await vi.waitFor(() => expect(stored?.phase).toBe('opening-degree-evaluation'));
    onUpdated?.(9, { status: 'complete', url: 'https://sdsu.uachieve.com/selfservice/audit/create.html' }, { id: 9, windowId: 4 });
    await vi.waitFor(() => expect(stored?.auditTabId).toBe(9));
    finishPortal([{ result: 'clicked' }]);
    await response;
    expect(stored?.phase).toBe('audit-page-found');
  });

  it('reads an audit tab that was already open when the workflow starts', async () => {
    let onMessage: ((message: { type: string }, sender: unknown, sendResponse: (response: { ok: boolean }) => void) => boolean | void) | undefined;
    let stored: SdsuWorkflow | undefined;
    const executeScript = vi.fn().mockResolvedValue([]);
    vi.stubGlobal('chrome', {
      runtime: { onInstalled: { addListener: vi.fn() }, onMessage: { addListener: (listener: typeof onMessage) => { onMessage = listener; } } },
      sidePanel: { setPanelBehavior: vi.fn() },
      tabs: { query: vi.fn().mockResolvedValue([{ id: 12, windowId: 4, url: 'https://sdsu.uachieve.com/selfservice/audit/view.html' }]), onUpdated: { addListener: vi.fn() } },
      storage: { session: { get: vi.fn().mockImplementation(async () => ({ [RUN_KEY]: stored })), set: vi.fn().mockImplementation(async (value: Record<string, SdsuWorkflow>) => { stored = value[RUN_KEY]; }) } },
      scripting: { executeScript },
    });
    await import('./service-worker');
    const response = await new Promise<{ ok: boolean }>((resolve) => onMessage?.({ type: 'START_SDSU_WORKFLOW' }, {}, resolve));
    expect(response.ok).toBe(true);
    expect(stored?.auditTabId).toBe(12);
    expect(executeScript).toHaveBeenCalledWith(expect.objectContaining({ target: { tabId: 12 } }));
    onMessage?.({ type: 'SDSU_AUDIT_UNITS', units: 8 } as { type: string }, { tab: { id: 12, url: 'https://sdsu.uachieve.com/selfservice/audit/view.html' }, frameId: 0 }, vi.fn());
    await vi.waitFor(() => expect(stored?.auditUnits).toBe(8));
  });
});
