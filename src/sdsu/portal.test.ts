import { describe, expect, it } from 'vitest';
import { isAuditSite, isPortalLandingPage } from './portal';

describe('isPortalLandingPage', () => {
  it('recognizes the student homepage URL seen in Chrome', () => {
    expect(isPortalLandingPage('https://cmsweb.cms.sdsu.edu/psc/CSDPRD/EMPLOYEE/SA/c/NUI_FRAMEWORK.PT_LANDINGPAGE.GBL?')).toBe(true);
  });

  it('does not treat the public site, sign-in site, or unrelated hosts as the student homepage', () => {
    expect(isPortalLandingPage('https://my.sdsu.edu/')).toBe(false);
    expect(isPortalLandingPage('https://cmsweb.cms.sdsu.edu/psc/CSDPRD/EMPLOYEE/SA/s/WEBLIB_PTBR.ISCRIPT1.FieldFormula.IScript_StartPage')).toBe(false);
    expect(isPortalLandingPage('https://example.com/psc/PT_LANDINGPAGE.GBL')).toBe(false);
    expect(isPortalLandingPage(undefined)).toBe(false);
  });
});

describe('isAuditSite', () => {
  it('matches only the confirmed SDSU uAchieve hostname', () => {
    expect(isAuditSite('https://sdsu.uachieve.com/selfservice/audit/create.html')).toBe(true);
    expect(isAuditSite('https://other.uachieve.com/selfservice/audit/create.html')).toBe(false);
    expect(isAuditSite('https://sdsu.uachieve.com.evil.example/audit')).toBe(false);
  });
});
