export const SDSU_ENTRY_URL = 'https://my.sdsu.edu/';
export const PORTAL_ORIGIN = 'https://cmsweb.cms.sdsu.edu/*';
const PORTAL_HOST = 'cmsweb.cms.sdsu.edu';
export const RUN_KEY = 'sdsuWorkflow';

export type WorkflowPhase = 'awaiting-sign-in' | 'opening-degree-evaluation' | 'tile-clicked' | 'needs-action' | 'stopped';
export type SdsuWorkflow = {
  phase: WorkflowPhase;
  message: string;
  windowId: number;
  startedAt: number;
};

export function isPortalLandingPage(url: string | undefined): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' && parsed.hostname === PORTAL_HOST && parsed.pathname.toUpperCase().includes('PT_LANDINGPAGE.GBL');
  } catch {
    return false;
  }
}
