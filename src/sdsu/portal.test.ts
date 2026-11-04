import { afterEach, describe, expect, it, vi } from 'vitest';
import { checkStudentHomepage } from './portal';

afterEach(() => vi.unstubAllGlobals());

describe('checkStudentHomepage', () => {
  it('recognizes the PeopleSoft landing page using only the active tab URL', async () => {
    const request = vi.fn().mockResolvedValue(true);
    const query = vi.fn().mockResolvedValue([{ url: 'https://cmsweb.cms.sdsu.edu/psc/CSDPRD/EMPLOYEE/SA/c/NUI_FRAMEWORK.PT_LANDINGPAGE.GBL?' }]);
    vi.stubGlobal('chrome', { permissions: { request }, tabs: { query } });

    expect(await checkStudentHomepage()).toEqual({
      status: 'ready',
      message: 'my.SDSU homepage tab detected. You can open Degree Evaluation on that page.',
    });
    expect(request).toHaveBeenCalledWith({ origins: ['https://cmsweb.cms.sdsu.edu/*'] });
    expect(query).toHaveBeenCalledWith({ active: true, currentWindow: true });
  });

  it('does not call the tab API when site access is declined', async () => {
    const query = vi.fn();
    vi.stubGlobal('chrome', { permissions: { request: vi.fn().mockResolvedValue(false) }, tabs: { query } });
    expect((await checkStudentHomepage()).status).toBe('needs-action');
    expect(query).not.toHaveBeenCalled();
  });

  it('does not accept an unrelated active tab', async () => {
    vi.stubGlobal('chrome', { permissions: { request: vi.fn().mockResolvedValue(true) }, tabs: { query: vi.fn().mockResolvedValue([{ url: 'https://example.com/' }]) } });
    expect((await checkStudentHomepage()).status).toBe('needs-action');
  });
});
