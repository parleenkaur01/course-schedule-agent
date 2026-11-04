// Injected into the confirmed sdsu.uachieve.com origin. It sends only fixed step labels
// to the extension and never sends student names, course data, form values, or audit text.
export function installAuditNavigator(runAlreadyAttempted: boolean): void {
  const marker = '__sdsuAuditNavigatorV1';
  const state = window as unknown as Record<string, boolean>;
  if (state[marker]) return;
  state[marker] = true;

  let busy = false;
  let runAttempted = runAlreadyAttempted;
  let programSelected = false;
  let viewClicked = false;
  let lastPhase = '';

  const report = (phase: string) => {
    if (phase === lastPhase) return;
    lastPhase = phase;
    void chrome.runtime.sendMessage({ type: 'SDSU_AUDIT_PROGRESS', phase }).catch(() => {});
  };
  const visible = (element: HTMLElement) => element.getClientRects().length > 0 && getComputedStyle(element).visibility !== 'hidden';
  const label = (element: HTMLElement) => (element.tagName === 'INPUT'
    ? (element as HTMLInputElement).value
    : element.getAttribute('aria-label') || element.textContent || '').trim().replace(/\s+/g, ' ');
  const controls = () => Array.from(document.querySelectorAll<HTMLElement>('a, button, input[type="button"], input[type="submit"], [role="button"], [role="link"]')).filter(visible);
  const matching = (expression: RegExp) => controls().filter((element) => expression.test(label(element)));

  const pointAndClick = (element: HTMLElement, phase: string, text: string, afterClick: () => void) => {
    busy = true;
    report(phase);
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    const rect = element.getBoundingClientRect();
    const pointer = document.createElement('div');
    pointer.textContent = `➜ ${text}`;
    Object.assign(pointer.style, {
      position: 'fixed',
      top: `${Math.max(8, rect.top - 36)}px`,
      left: `${Math.max(8, Math.min(window.innerWidth - 220, rect.left))}px`,
      padding: '7px 10px',
      background: '#216948',
      color: 'white',
      borderRadius: '8px',
      boxShadow: '0 4px 18px rgba(0,0,0,.25)',
      font: 'bold 13px system-ui',
      zIndex: '2147483647',
      pointerEvents: 'none',
    });
    document.documentElement.appendChild(pointer);
    pointer.animate?.([{ transform: 'translateY(-18px)', opacity: 0.2 }, { transform: 'translateY(0)', opacity: 1 }], { duration: 650, easing: 'ease-out' });
    const previousOutline = element.style.outline;
    element.style.outline = '3px solid #216948';
    setTimeout(() => {
      pointer.remove();
      element.style.outline = previousOutline;
      if (element.isConnected) element.click();
      afterClick();
      busy = false;
      setTimeout(scan, 800);
    }, 950);
  };

  const scan = () => {
    if (busy) return;
    if (document.querySelector('input[type="password"]')) {
      report('sign-in-needed');
      return;
    }
    if (document.body?.innerText && /open all sections/i.test(document.body.innerText) && /requirements/i.test(document.body.innerText)) {
      report('audit-opened');
      viewClicked = true;
      return;
    }
    if (viewClicked) return;

    if (!runAttempted) {
      const programRadios = Array.from(document.querySelectorAll<HTMLInputElement>('input[type="radio"], input[type="checkbox"]'))
        .filter((input) => visible(input) && /program/i.test(`${input.name} ${input.id} ${input.closest('tr')?.textContent ?? ''}`));
      if (programRadios.length > 1 && !programRadios.some((input) => input.checked)) {
        report('program-choice-needed');
        return;
      }
      if (programRadios.length === 1 && !programRadios[0].checked) {
        pointAndClick(programRadios[0], 'selecting-program', 'Select degree program', () => { programSelected = true; });
        return;
      }
      const programTableChoices = Array.from(document.querySelectorAll('table'))
        .filter((table) => Array.from(table.querySelectorAll('th')).some((heading) => /degree program/i.test(heading.textContent ?? '')))
        .flatMap((table) => Array.from(table.querySelectorAll<HTMLElement>('tbody a, tbody button, tbody [role="link"]')))
        .filter((element) => visible(element) && !/^(run|view audit)/i.test(label(element)));
      if (!programSelected && programTableChoices.length > 1) {
        report('program-choice-needed');
        return;
      }
      if (!programSelected && programTableChoices.length === 1) {
        pointAndClick(programTableChoices[0], 'selecting-program', 'Open degree program', () => { programSelected = true; });
        return;
      }
      const programLinks = matching(/^degree program$/i);
      if (!programSelected && programLinks.length === 1) {
        pointAndClick(programLinks[0], 'selecting-program', 'Open degree program', () => { programSelected = true; });
        return;
      }
      const runButtons = matching(/^run (declared programs?|program|audit)$/i);
      if (runButtons.length === 1) {
        pointAndClick(runButtons[0], 'running-audit', 'Run program', () => { runAttempted = true; });
        return;
      }
      if (runButtons.length > 1) {
        report('program-choice-needed');
        return;
      }
    }

    const viewLinks = matching(/^view audit$/i);
    if (viewLinks.length === 1) {
      pointAndClick(viewLinks[0], 'opening-audit', 'View audit', () => { viewClicked = true; });
      return;
    }
    if (viewLinks.length > 1) {
      report('audit-choice-needed');
      return;
    }
    report(runAttempted ? 'waiting-for-audit' : 'audit-page-found');
  };

  const observer = new MutationObserver(() => { scan(); });
  observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true });
  scan();
}
