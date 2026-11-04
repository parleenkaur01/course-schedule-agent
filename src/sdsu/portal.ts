export const SDSU_ENTRY_URL = 'https://my.sdsu.edu/';
const PORTAL_ORIGIN = 'https://cmsweb.cms.sdsu.edu/*';
const PORTAL_HOST = 'cmsweb.cms.sdsu.edu';

export type PortalCheck =
  | { status: 'ready'; message: string }
  | { status: 'needs-action'; message: string };

export async function openSdsu(): Promise<void> {
  if (typeof chrome === 'undefined' || !chrome.tabs) {
    window.open(SDSU_ENTRY_URL, '_blank', 'noopener,noreferrer');
    return;
  }
  await chrome.tabs.create({ url: SDSU_ENTRY_URL });
}

export async function checkStudentHomepage(): Promise<PortalCheck> {
  if (typeof chrome === 'undefined' || !chrome.permissions || !chrome.scripting) {
    return { status: 'needs-action', message: 'Load the built extension in Chrome to check your SDSU tab.' };
  }

  // This is called directly from a button click so Chrome can show its permission prompt.
  const granted = await chrome.permissions.request({ permissions: ['scripting'], origins: [PORTAL_ORIGIN] });
  if (!granted) {
    return { status: 'needs-action', message: 'Portal access was not granted. You can continue using the sample planner.' };
  }

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id || !tab.url || new URL(tab.url).hostname !== PORTAL_HOST) {
    return { status: 'needs-action', message: 'Open your my.SDSU student homepage tab, then click Check again.' };
  }

  const [result] = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => {
      // Return only tile-presence booleans. No page text, passwords, or student details leave this function.
      const pageText = document.body?.innerText ?? '';
      return {
        degreeEvaluation: /degree evaluation/i.test(pageText),
        manageClasses: /manage classes/i.test(pageText),
      };
    },
  });
  const tiles = result?.result;
  if (tiles?.degreeEvaluation && tiles.manageClasses) {
    return { status: 'ready', message: 'Student homepage detected. Degree Evaluation and Manage Classes tiles are visible.' };
  }
  return { status: 'needs-action', message: 'Portal tab found, but both student tiles were not visible. Finish signing in and return to the student homepage, then check again.' };
}
