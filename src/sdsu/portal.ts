import type { AuditReport } from './auditInspector';

export const SDSU_ENTRY_URL = 'https://my.sdsu.edu/';
export const PORTAL_ORIGIN = 'https://cmsweb.cms.sdsu.edu/*';
export const AUDIT_ORIGIN = 'https://sdsu.uachieve.com/*';
export const AUDIT_HOST = 'sdsu.uachieve.com';
const PORTAL_HOST = 'cmsweb.cms.sdsu.edu';
export const RUN_KEY = 'sdsuWorkflow';

export type WorkflowPhase = 'awaiting-sign-in' | 'opening-degree-evaluation' | 'tile-clicked' | 'sign-in-needed' | 'audit-page-found' | 'selecting-program' | 'running-audit' | 'opening-audit' | 'audit-opened' | 'needs-action' | 'stopped';
export type SdsuWorkflow = {
  phase: WorkflowPhase;
  message: string;
  windowId: number;
  startedAt: number;
  auditTabId?: number;
  auditReport?: AuditReport;
  runAttempted?: boolean;
};

export function isAuditSite(url: string | undefined): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' && parsed.hostname === AUDIT_HOST;
  } catch {
    return false;
  }
}

export function isPortalLandingPage(url: string | undefined): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' && parsed.hostname === PORTAL_HOST && parsed.pathname.toUpperCase().includes('PT_LANDINGPAGE.GBL');
  } catch {
    return false;
  }
}
