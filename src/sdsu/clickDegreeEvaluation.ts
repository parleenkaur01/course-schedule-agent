// This function is injected into the SDSU portal only after the student has granted access.
// Keep it self-contained: Chrome serializes it for execution inside the page.
export function clickDegreeEvaluationTile(): Promise<'clicked' | 'missing'> {
  return new Promise((resolve) => {
    let observer: MutationObserver | undefined;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const finish = (result: 'clicked' | 'missing') => {
      observer?.disconnect();
      if (timeout) clearTimeout(timeout);
      resolve(result);
    };
    const tryClick = () => {
      const candidates = Array.from(document.querySelectorAll<HTMLElement>('a, button, [role="link"], [role="button"], [onclick]'));
      const tile = candidates.find((element) =>
        /degree\s+evaluation/i.test(element.textContent ?? '') && element.getClientRects().length > 0,
      );
      if (!tile) return false;
      tile.click();
      finish('clicked');
      return true;
    };
    if (tryClick()) return;
    observer = new MutationObserver(() => { tryClick(); });
    observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true });
    timeout = setTimeout(() => finish('missing'), 12000);
  });
}
