// Runs only on the permitted uAchieve site. Sends a confirmed numeric total,
// never the audit's text, student details, or course information.
export function installAuditUnitReader(): void {
  const marker = '__sdsuAuditUnitReaderV1';
  const state = window as unknown as Record<string, boolean>;
  if (state[marker]) return;
  state[marker] = true;
  let lastSent: number | null = null;

  const numbersIn = (text: string, allowBareNumber: boolean): number[] => {
    const normalized = text.replace(/\s+/g, ' ').trim();
    const patterns = [
      /(?:remaining|needed|not\s+met)\s+(?:units|credits)\s*:?\s*(\d+(?:\.\d+)?)(?![\d.]|\s*%)/gi,
      /(?:units|credits)\s+(?:remaining|needed|not\s+met)\s*:?\s*(\d+(?:\.\d+)?)(?![\d.]|\s*%)/gi,
      /(\d+(?:\.\d+)?)\s+(?:units|credits)\s+(?:remaining|needed|not\s+met)\b/gi,
      /(?:remaining|needed|not\s+met)\s*:?\s*(\d+(?:\.\d+)?)\s+(?:units|credits)\b/gi,
    ];
    if (allowBareNumber) patterns.push(/(?:remaining|needed|not\s+met)\s*:?\s*(\d+(?:\.\d+)?)(?![\d.]|\s*%|\s*\/)/gi);
    return patterns.flatMap((pattern) => Array.from(normalized.matchAll(pattern), (match) => Number(match[1])))
      .filter((value) => Number.isFinite(value) && value >= 0 && value <= 240);
  };

  const read = (): number | null => {
    const candidates: number[] = [];
    const bodyText = document.body?.innerText ?? '';
    const heading = /minimum\s+units/i.exec(bodyText);
    if (heading) candidates.push(...numbersIn(bodyText.slice(heading.index, heading.index + 650), true));
    else candidates.push(...numbersIn(bodyText, false));

    for (const element of Array.from(document.querySelectorAll<HTMLElement>('[aria-label], [title], svg text, svg tspan'))) {
      const text = [element.getAttribute('aria-label'), element.getAttribute('title'), element.textContent].filter(Boolean).join(' ');
      if (!text || text.length > 500) continue;
      candidates.push(...numbersIn(text, /minimum\s+units/i.test(text)));
    }

    const unique = [...new Set(candidates)];
    return unique.length === 1 ? unique[0] : null;
  };

  const scan = () => {
    const units = read();
    if (units === null || units === lastSent) return;
    lastSent = units;
    void chrome.runtime.sendMessage({ type: 'SDSU_AUDIT_UNITS', units }).catch(() => {});
  };
  new MutationObserver(scan).observe(document.documentElement, { childList: true, subtree: true, characterData: true, attributes: true });
  scan();
}
