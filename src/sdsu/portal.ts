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
  if (typeof chrome === 'undefined' || !chrome.permissions || !chrome.tabs) {
    return { status: 'needs-action', message: 'Load the built extension in Chrome to check your SDSU tab.' };
  }

  // This is called directly from a button click so Chrome can show its permission prompt.
  const granted = await chrome.permissions.request({ origins: [PORTAL_ORIGIN] });
  if (!granted) {
    return { status: 'needs-action', message: 'Portal access was not granted. You can continue using the sample planner.' };
  }

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.url || new URL(tab.url).hostname !== PORTAL_HOST) {
    return { status: 'needs-action', message: 'Open your my.SDSU student homepage tab, then click Check again.' };
  }

  if (new URL(tab.url).pathname.toUpperCase().includes('PT_LANDINGPAGE.GBL')) {
    return { status: 'ready', message: 'my.SDSU homepage tab detected. You can open Degree Evaluation on that page.' };
  }
  return { status: 'needs-action', message: 'my.SDSU portal tab detected, but it is not the homepage. Return to the homepage and check again.' };
}
