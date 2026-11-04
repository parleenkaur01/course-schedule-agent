export type AuditSnapshot = {
  counted?: number;
  required?: number;
  complete?: number;
  inProgress?: number;
  notMet?: number;
};

export type AuditRequirement = { section: string; courses: string[] };
export type AuditReport = { snapshot: AuditSnapshot; missing: AuditRequirement[]; reviewedSections: number };

// Chrome injects this self-contained function into the student's uAchieve tab.
// Only chart counts and short course/requirement labels leave the page.
export function installAuditInspector(): void {
  const marker = '__sdsuAuditInspectorV1';
  const state = window as unknown as Record<string, boolean>;
  if (state[marker]) return;
  state[marker] = true;
  let scanning = false;
  let lastReport = '';
  let sectionsOpened = false;
  let attempts = 0;
  const hoveredTexts: string[] = [];

  const clean = (text: string) => text.replace(/\s+/g, ' ').trim();
  const visible = (element: Element) => element.getClientRects().length > 0;
  const reportStage = (stage: string) => { void chrome.runtime.sendMessage({ type: 'SDSU_AUDIT_PROGRESS', phase: stage }).catch(() => {}); };
  const pause = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

  const heading = () => Array.from(document.querySelectorAll<HTMLElement>('h1,h2,h3,h4,h5,h6,[role="heading"],strong,div,span'))
    .find((element) => visible(element) && clean(element.textContent ?? '').toUpperCase() === 'SNAPSHOT');

  const categoryValue = (text: string, category: 'complete' | 'inProgress' | 'notMet'): number | undefined => {
    const normalized = clean(text);
    const labels = category === 'complete' ? /\bcomplete\b/i : category === 'inProgress' ? /\b(?:in\s*progress|ip\s*\/\s*ep|ip)\b/i : /\bnot\s*met\b/i;
    for (const match of normalized.matchAll(/\b(complete|in\s*progress|ip\s*\/\s*ep|ip|not\s*met)\b\s*:?\s*(?:units?\s*)?(\d+(?:\.\d+)?)(?![\d.]|\s*%)/gi)) {
      const value = Number(match[2]);
      if (labels.test(match[1]) && Number.isFinite(value) && value >= 0 && value <= 240) return value;
    }
    for (const match of normalized.matchAll(/\b(\d+(?:\.\d+)?)\s*(?:units?\s*)?\b(complete|in\s*progress|ip\s*\/\s*ep|ip|not\s*met)\b/gi)) {
      const value = Number(match[1]);
      if (labels.test(match[2]) && Number.isFinite(value) && value >= 0 && value <= 240) return value;
    }
    return undefined;
  };

  const readSnapshot = (texts: string[]): AuditSnapshot => {
    const snapshot: AuditSnapshot = {};
    const candidates: string[] = [];
    for (const text of texts) {
      const index = text.search(/\bSNAPSHOT\b/i);
      if (index >= 0) candidates.push(text.slice(index, index + 1600));
      else if (/\b(?:complete|in\s*progress|not\s*met)\b/i.test(text) && text.length < 250) candidates.push(text);
    }
    for (const text of candidates) {
      const fraction = /(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)\s*units?\b/i.exec(text);
      if (fraction) {
        const counted = Number(fraction[1]);
        const required = Number(fraction[2]);
        if (required > 0 && required <= 240 && counted >= 0 && counted <= 300) {
          snapshot.counted = counted;
          snapshot.required = required;
        }
      }
      for (const category of ['complete', 'inProgress', 'notMet'] as const) {
        const value = categoryValue(text, category);
        if (value !== undefined && snapshot[category] === undefined) snapshot[category] = value;
      }
    }
    if (snapshot.required !== undefined && snapshot.counted !== undefined && snapshot.complete !== undefined && snapshot.inProgress !== undefined
      && Math.abs(snapshot.counted - snapshot.complete - snapshot.inProgress) < 0.01 && snapshot.notMet === undefined) {
      const difference = snapshot.required - snapshot.complete - snapshot.inProgress;
      if (difference >= 0 && difference <= snapshot.required) snapshot.notMet = Number(difference.toFixed(2));
    }
    return snapshot;
  };

  const chartTexts = () => {
    const texts = [document.body?.innerText ?? '', document.body?.textContent ?? '', ...hoveredTexts];
    for (const element of Array.from(document.querySelectorAll<HTMLElement>('[aria-label], [title], svg text, svg tspan, [role="tooltip"], [class*="tooltip"]'))) {
      if (!visible(element)) continue;
      const value = clean([element.getAttribute('aria-label'), element.getAttribute('title'), element.textContent].filter(Boolean).join(' '));
      if (value && value.length < 250) texts.push(value);
    }
    return texts;
  };

  const hoverChart = async () => {
    const title = heading();
    if (!title) return;
    title.scrollIntoView({ behavior: 'smooth', block: 'start' });
    reportStage('inspecting-snapshot');
    await pause(350);
    const base = title.getBoundingClientRect();
    const chart = Array.from(document.querySelectorAll<SVGSVGElement>('svg'))
      .filter((svg) => {
        const rect = svg.getBoundingClientRect();
        return visible(svg) && rect.top >= base.top && rect.top < base.top + 900 && svg.querySelectorAll('path').length > 0;
      }).sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top)[0];
    const paths = Array.from(chart?.querySelectorAll<SVGPathElement>('path') ?? [])
      .filter((path) => {
        const rect = path.getBoundingClientRect();
        return visible(path) && rect.top >= base.top && rect.top < base.top + 1200 && rect.width > 8 && rect.height > 8;
      }).slice(0, 12);
    const captureTooltip = () => {
      for (const tooltip of Array.from(document.querySelectorAll<HTMLElement>('[role="tooltip"],[class*="tooltip"],[id*="tooltip"]'))) {
        if (!visible(tooltip)) continue;
        const value = clean(tooltip.innerText || tooltip.textContent || '');
        if (value && value.length < 250) hoveredTexts.push(value);
      }
    };
    const moveOver = async (element: Element, x: number, y: number) => {
      for (const type of ['pointerover', 'mouseover', 'pointermove', 'mousemove']) {
        const EventType = type.startsWith('pointer') && typeof PointerEvent !== 'undefined' ? PointerEvent : MouseEvent;
        element.dispatchEvent(new EventType(type, { bubbles: true, clientX: x, clientY: y }));
      }
      await pause(220);
      captureTooltip();
    };
    for (const path of paths) {
      path.scrollIntoView({ behavior: 'smooth', block: 'center' });
      const rect = path.getBoundingClientRect();
      let x = rect.left + rect.width / 2;
      let y = rect.top + rect.height / 2;
      try {
        const point = path.getPointAtLength(path.getTotalLength() / 2);
        const screen = point.matrixTransform(path.getScreenCTM()!);
        x = screen.x;
        y = screen.y;
      } catch { /* A chart may use ordinary SVG paths without geometry methods. */ }
      await moveOver(path, x, y);
    }
    if (!paths.length) {
      const canvas = Array.from(document.querySelectorAll<HTMLCanvasElement>('canvas'))
        .filter((element) => {
          const rect = element.getBoundingClientRect();
          return visible(element) && rect.top >= base.top && rect.top < base.top + 900 && rect.width > 120 && rect.height > 120;
        }).sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top)[0];
      if (canvas) {
        canvas.scrollIntoView({ behavior: 'smooth', block: 'center' });
        for (const angle of [-Math.PI / 2, -Math.PI / 6, Math.PI / 2, Math.PI]) {
          const rect = canvas.getBoundingClientRect();
          const radius = Math.min(rect.width, rect.height) * 0.34;
          await moveOver(canvas, rect.left + rect.width / 2 + Math.cos(angle) * radius, rect.top + rect.height / 2 + Math.sin(angle) * radius);
        }
      }
    }
  };

  const missingRequirements = (): AuditRequirement[] => {
    const rows = Array.from(document.querySelectorAll<HTMLElement>('tr,li,[role="row"],[class*="requirement"],[class*="subreq"]'));
    const seen = new Set<string>();
    const missing: AuditRequirement[] = [];
    for (const row of rows) {
      if (!visible(row)) continue;
      const text = clean(row.innerText || row.textContent || '');
      if (!text || text.length > 900) continue;
      const status = clean([row.className?.toString() ?? '', row.getAttribute('aria-label') ?? '', row.getAttribute('title') ?? '',
        ...Array.from(row.querySelectorAll<HTMLElement>('[aria-label],[title],img')).slice(0, 6).map((child) => `${child.getAttribute('aria-label') ?? ''} ${child.getAttribute('title') ?? ''} ${child.getAttribute('alt') ?? ''}`)].join(' '));
      const unmet = /\b(?:not[-\s]?met|unsatisfied|incomplete|missing)\b/i.test(`${status} ${text.slice(0, 100)}`) || /^-R\b/i.test(text);
      if (!unmet || /\b(?:complete|satisfied|in progress)\b/i.test(status) && !/\b(?:not[-\s]?met|unsatisfied|incomplete|missing)\b/i.test(status)) continue;
      const courses = [...new Set(Array.from(text.matchAll(/\b[A-Z&]{2,6}[\s-]?\d{2,4}[A-Z]?\b/g), (match) => clean(match[0]).replace(/-/g, ' ')))].slice(0, 12);
      const section = clean((row.innerText || row.textContent || '').split(/\n|\r/)[0]).slice(0, 100) || 'Unmet requirement';
      const key = `${section}|${courses.join(',')}`;
      if (seen.has(key)) continue;
      seen.add(key);
      missing.push({ section, courses });
      if (missing.length >= 40) break;
    }
    const lines = (document.body?.innerText ?? '').split(/\r?\n/).map(clean).filter(Boolean);
    for (let index = 0; index < lines.length && missing.length < 40; index += 1) {
      if (!/^(?:-R\b|not met\b|requirement not satisfied\b)/i.test(lines[index])) continue;
      if (/^-R\s*=/.test(lines[index])) continue;
      const nearby = lines.slice(index, index + 5);
      const courses = [...new Set(Array.from(nearby.join(' ').matchAll(/\b[A-Z&]{2,6}[\s-]?\d{2,4}[A-Z]?\b/g), (match) => clean(match[0]).replace(/-/g, ' ')))].slice(0, 12);
      if (!courses.length) continue;
      const section = lines[index].slice(0, 100);
      const key = `${section}|${courses.join(',')}`;
      if (seen.has(key)) continue;
      seen.add(key);
      missing.push({ section, courses });
    }
    return missing;
  };

  const inspect = async () => {
    if (scanning || attempts >= 3 || !heading()) return;
    scanning = true;
    attempts += 1;
    try {
      await hoverChart();
      if (!sectionsOpened) {
        const open = Array.from(document.querySelectorAll<HTMLElement>('button,a,input[type="button"],[role="button"]'))
          .find((element) => visible(element) && /open all sections/i.test(clean(element.innerText || element.textContent || (element as HTMLInputElement).value || '')));
        if (open) {
          open.scrollIntoView({ behavior: 'smooth', block: 'center' });
          open.click();
          sectionsOpened = true;
          await pause(400);
        }
      }
      const headings = Array.from(document.querySelectorAll<HTMLElement>('h2,h3,h4,[role="heading"],details>summary,button[aria-expanded],[role="button"][aria-expanded]'))
        .filter((element) => visible(element) && clean(element.textContent ?? '').length < 120 && !/^(snapshot|legend)$/i.test(clean(element.textContent ?? ''))).slice(0, 35);
      reportStage('inspecting-requirements');
      for (const section of headings) {
        section.scrollIntoView({ behavior: 'smooth', block: 'center' });
        await pause(180);
      }
      const report: AuditReport = { snapshot: readSnapshot(chartTexts()), missing: missingRequirements(), reviewedSections: headings.length };
      const serialized = JSON.stringify(report);
      if (serialized !== lastReport) {
        lastReport = serialized;
        void chrome.runtime.sendMessage({ type: 'SDSU_AUDIT_REPORT', report }).catch(() => {});
      }
      if (headings.length > 0 && report.snapshot.required !== undefined && report.snapshot.complete !== undefined
        && report.snapshot.inProgress !== undefined && report.snapshot.notMet !== undefined) attempts = 3;
    } catch {
      reportStage('audit-inspection-limited');
    } finally {
      scanning = false;
      if (attempts < 3) setTimeout(() => { void inspect(); }, 1000);
    }
  };
  void inspect();
  new MutationObserver(() => { if (!scanning) void inspect(); }).observe(document.documentElement, { childList: true, subtree: true });
}
