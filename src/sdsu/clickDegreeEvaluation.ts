// This function is injected into the SDSU portal only after the student has granted access.
// Keep it self-contained: Chrome serializes it for execution inside the page.
export function clickDegreeEvaluationTile(): Promise<'clicked' | 'missing'> {
  return new Promise((resolve) => {
    let observer: MutationObserver | undefined;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    let found = false;
    const finish = (result: 'clicked' | 'missing') => {
      observer?.disconnect();
      if (timeout) clearTimeout(timeout);
      resolve(result);
    };
    const tryClick = () => {
      if (found) return true;
      const candidates = Array.from(document.querySelectorAll<HTMLElement>('a, button, [role="link"], [role="button"], [onclick]'));
      const tile = candidates.find((element) =>
        /degree\s+evaluation/i.test(element.textContent ?? '') && element.getClientRects().length > 0,
      );
      if (!tile) return false;
      found = true;
      observer?.disconnect();
      tile.scrollIntoView({ behavior: 'smooth', block: 'center' });
      const rect = tile.getBoundingClientRect();
      const arrow = document.createElement('div');
      arrow.textContent = '➜ Opening Degree Evaluation';
      Object.assign(arrow.style, {
        position: 'fixed', top: `${Math.max(8, rect.top - 36)}px`, left: `${Math.max(8, rect.left)}px`,
        padding: '7px 10px', background: '#216948', color: '#fff', borderRadius: '8px',
        boxShadow: '0 4px 18px rgba(0,0,0,.25)', font: 'bold 13px system-ui', zIndex: '2147483647', pointerEvents: 'none',
      });
      document.documentElement.appendChild(arrow);
      arrow.animate?.([{ transform: 'translateY(-18px)', opacity: 0.2 }, { transform: 'translateY(0)', opacity: 1 }], { duration: 600, easing: 'ease-out' });
      const previousOutline = tile.style.outline;
      tile.style.outline = '3px solid #216948';
      setTimeout(() => {
        arrow.remove();
        tile.style.outline = previousOutline;
        if (tile.isConnected) tile.click();
        finish(tile.isConnected ? 'clicked' : 'missing');
      }, 800);
      return true;
    };
    if (tryClick()) return;
    observer = new MutationObserver(() => { tryClick(); });
    observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true });
    timeout = setTimeout(() => finish('missing'), 12000);
  });
}
