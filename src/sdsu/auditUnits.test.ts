import { afterEach, describe, expect, it, vi } from 'vitest';
import { installAuditUnitReader } from './auditUnits';

afterEach(() => vi.unstubAllGlobals());

function readFrom(bodyText: string, labels: string[] = []) {
  const sendMessage = vi.fn().mockResolvedValue(undefined);
  const elements = labels.map((value) => ({ getAttribute: (name: string) => name === 'aria-label' ? value : null, textContent: '' }));
  vi.stubGlobal('window', {});
  vi.stubGlobal('document', {
    body: { innerText: bodyText }, documentElement: {},
    querySelectorAll: () => elements,
  });
  vi.stubGlobal('MutationObserver', class { observe() {} });
  vi.stubGlobal('chrome', { runtime: { sendMessage } });
  installAuditUnitReader();
  return sendMessage;
}

describe('audit unit reader', () => {
  it('reads the Not Met number in the Minimum Units chart and sends only a number', () => {
    const sendMessage = readFrom('Minimum Units Complete 110 In Progress 0 Not Met 10 GPA Requirements');
    expect(sendMessage).toHaveBeenCalledWith({ type: 'SDSU_AUDIT_UNITS', units: 10 });
  });

  it('reads an accessible chart label', () => {
    const sendMessage = readFrom('Degree Audit', ['Minimum Units: 120 required; Not Met: 12']);
    expect(sendMessage).toHaveBeenCalledWith({ type: 'SDSU_AUDIT_UNITS', units: 12 });
  });

  it('does not turn a chart percentage into remaining units', () => {
    const sendMessage = readFrom('Minimum Units Complete 90% Not Met 10%');
    expect(sendMessage).not.toHaveBeenCalled();
  });

  it('does not choose between conflicting remaining-unit values', () => {
    const sendMessage = readFrom('Minimum Units Not Met 10 Not Met 12');
    expect(sendMessage).not.toHaveBeenCalled();
  });
});
