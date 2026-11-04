import { clickDegreeEvaluationTile } from '../sdsu/clickDegreeEvaluation';
import { installAuditNavigator } from '../sdsu/auditNavigator';
import { isAuditSite, isPortalLandingPage, RUN_KEY, SDSU_ENTRY_URL, type SdsuWorkflow, type WorkflowPhase } from '../sdsu/portal';

// A service worker handles Chrome events even when the side panel is closed.
chrome.runtime.onInstalled.addListener(() => {
  void chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
});

async function getRun(): Promise<SdsuWorkflow | undefined> {
  const stored = await chrome.storage.session.get(RUN_KEY);
  return stored[RUN_KEY] as SdsuWorkflow | undefined;
}

async function saveRun(run: SdsuWorkflow): Promise<void> {
  await chrome.storage.session.set({ [RUN_KEY]: run });
}

async function showSignInReminder(): Promise<void> {
  if (!chrome.notifications || typeof OffscreenCanvas === 'undefined') return;
  try {
    const canvas = new OffscreenCanvas(64, 64);
    const context = canvas.getContext('2d');
    if (!context) return;
    context.fillStyle = '#216948';
    context.fillRect(0, 0, 64, 64);
    context.fillStyle = '#ffffff';
    context.font = 'bold 42px sans-serif';
    context.textAlign = 'center';
    context.fillText('S', 32, 47);
    const blob = await canvas.convertToBlob({ type: 'image/png' });
    const bytes = new Uint8Array(await blob.arrayBuffer());
    let binary = '';
    for (const byte of bytes) binary += String.fromCharCode(byte);
    await chrome.notifications.create('sdsu-sign-in', {
      type: 'basic',
      iconUrl: `data:image/png;base64,${btoa(binary)}`,
      title: 'SDSU sign-in may be needed',
      message: 'If a sign-in page appears, enter your SDSUid and complete Duo on SDSU’s page. The extension will continue afterward.',
    });
  } catch {
    // The same instruction remains visible in the side panel if system notifications are unavailable.
  }
}

const auditProgress: Record<string, { phase: WorkflowPhase; message: string }> = {
  'sign-in-needed': { phase: 'sign-in-needed', message: 'SDSU is asking you to sign in. Enter your SDSUid and complete Duo on SDSU’s page; the extension will continue afterward.' },
  'audit-page-found': { phase: 'audit-page-found', message: 'Degree Evaluation site found. Looking for your declared degree program…' },
  'program-choice-needed': { phase: 'needs-action', message: 'More than one degree program or Run control is shown. Please choose your intended program on SDSU’s page; the extension will continue.' },
  'selecting-program': { phase: 'selecting-program', message: 'Selecting the declared degree program on the visible audit page…' },
  'running-audit': { phase: 'running-audit', message: 'Selecting Run Declared Programs. Waiting for SDSU to prepare the audit…' },
  'waiting-for-audit': { phase: 'running-audit', message: 'SDSU is preparing your audit. Waiting for View Audit to appear…' },
  'audit-choice-needed': { phase: 'needs-action', message: 'Several View Audit links are shown. Please choose the correct audit on SDSU’s page.' },
  'opening-audit': { phase: 'opening-audit', message: 'Clicking View Audit on the visible page…' },
  'audit-opened': { phase: 'audit-opened', message: 'Audit view detected. The extension has not read or interpreted degree requirements yet.' },
};

async function handleAuditProgress(stage: string, tabId: number | undefined): Promise<void> {
  const update = auditProgress[stage];
  const run = await getRun();
  if (!update || !run || run.auditTabId !== tabId) return;
  if (run.phase === 'audit-opened') return;
  if (run.runAttempted && ['audit-page-found', 'program-choice-needed', 'selecting-program'].includes(stage)) return;
  if (run.phase === 'opening-audit' && stage === 'waiting-for-audit') return;
  await saveRun({ ...run, ...update, runAttempted: run.runAttempted || stage === 'running-audit' });
  if (stage === 'audit-page-found' || stage === 'audit-opened') void chrome.notifications?.clear('sdsu-sign-in').catch(() => {});
}

async function advanceFromAuditSite(tabId: number, tab: chrome.tabs.Tab): Promise<void> {
  if (!isAuditSite(tab.url)) return;
  const run = await getRun();
  if (!run || run.phase === 'awaiting-sign-in' || run.phase === 'audit-opened' || run.phase === 'stopped' || Date.now() - run.startedAt > 15 * 60 * 1000) return;
  const keepCurrentStep = run.auditTabId === tabId && (run.phase === 'running-audit' || run.phase === 'opening-audit');
  await saveRun(keepCurrentStep
    ? { ...run, auditTabId: tabId }
    : { ...run, auditTabId: tabId, phase: 'audit-page-found', message: 'Degree Evaluation site opened. Checking the next step…' });
  void chrome.notifications?.clear('sdsu-sign-in').catch(() => {});
  try {
    await chrome.scripting.executeScript({ target: { tabId, allFrames: true }, func: installAuditNavigator, args: [run.runAttempted === true] });
  } catch {
    const latest = await getRun();
    if (latest?.phase === 'audit-page-found' && latest.auditTabId === tabId) {
      await saveRun({ ...latest, phase: 'needs-action', message: 'Could not inspect the audit page. Complete any SDSU sign-in, then use the Run Declared Programs and View Audit controls yourself.' });
    }
  }
}

let advancing = false;
async function advanceFromHomepage(tabId: number, tab: chrome.tabs.Tab): Promise<void> {
  if (advancing || !isPortalLandingPage(tab.url)) return;
  advancing = true;
  let run: SdsuWorkflow | undefined;
  try {
    run = await getRun();
    if (!run || run.phase !== 'awaiting-sign-in' || tab.windowId !== run.windowId) return;
    if (Date.now() - run.startedAt > 15 * 60 * 1000) {
      await saveRun({ ...run, phase: 'needs-action', message: 'The sign-in wait expired. Start the SDSU workflow again.' });
      return;
    }
    await saveRun({ ...run, phase: 'opening-degree-evaluation', message: 'Student homepage found. Opening Degree Evaluation…' });
    const results = await chrome.scripting.executeScript({ target: { tabId, allFrames: true }, func: clickDegreeEvaluationTile });
    const latest = await getRun();
    if (latest?.phase === 'opening-degree-evaluation') {
      if (results.some((result) => result.result === 'clicked')) {
        await saveRun({ ...latest, phase: 'tile-clicked', message: 'Clicked Degree Evaluation. If SDSU asks for another sign-in or Duo, complete it on SDSU’s page. The evaluation content has not been read yet.' });
        void showSignInReminder();
      } else {
        await saveRun({ ...latest, phase: 'needs-action', message: 'Homepage found, but the Degree Evaluation tile was not detected. You can click the tile yourself and share the destination hostname.' });
      }
    }
  } catch {
    const latest = await getRun();
    if (latest?.phase === 'opening-degree-evaluation') await saveRun({ ...latest, phase: 'needs-action', message: 'Homepage found, but the extension could not open Degree Evaluation. Click the tile yourself and share the destination hostname.' });
  } finally {
    advancing = false;
  }
}

async function startWorkflow(): Promise<void> {
  const [active] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  const windowId = active?.windowId ?? chrome.windows.WINDOW_ID_CURRENT;
  const run: SdsuWorkflow = {
    phase: 'awaiting-sign-in',
    message: 'Waiting for you to finish SDSU sign-in and Duo…',
    windowId,
    startedAt: Date.now(),
  };
  await saveRun(run);
  if (active?.id && isPortalLandingPage(active.url)) {
    await advanceFromHomepage(active.id, active);
  } else {
    await chrome.tabs.create({ url: SDSU_ENTRY_URL, windowId });
  }
}

let auditProgressQueue = Promise.resolve();
chrome.runtime.onMessage.addListener((message: { type?: string }, _sender, sendResponse) => {
  if (message.type === 'SDSU_AUDIT_PROGRESS') {
    const stage = (message as { phase?: string }).phase;
    if (stage && isAuditSite(_sender.tab?.url)) {
      auditProgressQueue = auditProgressQueue.then(() => handleAuditProgress(stage, _sender.tab?.id)).catch(() => {});
    }
    return;
  }
  if (message.type !== 'START_SDSU_WORKFLOW') return;
  void startWorkflow().then(() => sendResponse({ ok: true })).catch(async () => {
    const run = await getRun();
    if (run) await saveRun({ ...run, phase: 'needs-action', message: 'Could not start the SDSU workflow. Reload the extension and try again.' });
    sendResponse({ ok: false });
  });
  return true;
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  const url = changeInfo.url ?? tab.url;
  if (changeInfo.status === 'complete' && isPortalLandingPage(url)) {
    void advanceFromHomepage(tabId, { ...tab, url });
  }
  if (changeInfo.status === 'complete' && isAuditSite(url)) {
    void advanceFromAuditSite(tabId, { ...tab, url });
  }
});
