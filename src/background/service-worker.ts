import { clickDegreeEvaluationTile } from '../sdsu/clickDegreeEvaluation';
import { isPortalLandingPage, RUN_KEY, SDSU_ENTRY_URL, type SdsuWorkflow } from '../sdsu/portal';

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
    if (results.some((result) => result.result === 'clicked')) {
      await saveRun({ ...run, phase: 'tile-clicked', message: 'Clicked Degree Evaluation. If SDSU asks for another sign-in or Duo, complete it on SDSU’s page. The evaluation content has not been read yet.' });
    } else {
      await saveRun({ ...run, phase: 'needs-action', message: 'Homepage found, but the Degree Evaluation tile was not detected. You can click the tile yourself and share the destination hostname.' });
    }
  } catch {
    if (run) await saveRun({ ...run, phase: 'needs-action', message: 'Homepage found, but the extension could not open Degree Evaluation. Click the tile yourself and share the destination hostname.' });
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

chrome.runtime.onMessage.addListener((message: { type?: string }, _sender, sendResponse) => {
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
});
