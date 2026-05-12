/**
 * Unit tests for auditLogger utility
 * Tests logAction, getAuditLogs with various filters, exportAuditLogs,
 * immutability of log entries, and localStorage persistence.
 * @module utils/auditLogger.test
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  logAction,
  getAuditLogs,
  exportAuditLogs,
  getAuditSummary,
  getAuditLogCount,
  clearAuditLogs,
  AUDIT_ACTIONS,
} from './auditLogger.js';
import { initializeStorage } from './localStorage.js';

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  localStorage.clear();
  initializeStorage({ force: true });
  // Clear any audit logs seeded by initializeStorage so tests start clean
  clearAuditLogs();
});

// ---------------------------------------------------------------------------
// logAction
// ---------------------------------------------------------------------------

describe('logAction', () => {
  it('successfully logs an action with valid parameters', () => {
    const result = logAction('USR-0001', AUDIT_ACTIONS.USER_LOGIN, {
      username: 'admin.horizon',
      role: 'Admin',
    });

    expect(result.success).toBe(true);
    expect(result.entry).not.toBeNull();
    expect(result.entry.userId).toBe('USR-0001');
    expect(result.entry.action).toBe(AUDIT_ACTIONS.USER_LOGIN);
    expect(result.entry.details).toBeDefined();
    expect(result.entry.details.username).toBe('admin.horizon');
  });

  it('generates a unique ID for each log entry', () => {
    const result1 = logAction('USR-0001', AUDIT_ACTIONS.USER_LOGIN, { test: 1 });
    const result2 = logAction('USR-0001', AUDIT_ACTIONS.USER_LOGIN, { test: 2 });

    expect(result1.success).toBe(true);
    expect(result2.success).toBe(true);
    expect(result1.entry.id).not.toBe(result2.entry.id);
  });

  it('generates an ID starting with AUD-', () => {
    const result = logAction('USR-0001', AUDIT_ACTIONS.USER_LOGIN);

    expect(result.success).toBe(true);
    expect(result.entry.id.startsWith('AUD-')).toBe(true);
  });

  it('includes a valid ISO timestamp', () => {
    const result = logAction('USR-0001', AUDIT_ACTIONS.USER_LOGIN);

    expect(result.success).toBe(true);
    expect(result.entry.timestamp).toBeDefined();
    const date = new Date(result.entry.timestamp);
    expect(Number.isNaN(date.getTime())).toBe(false);
  });

  it('stores userId as a string', () => {
    const result = logAction('USR-0001', AUDIT_ACTIONS.USER_LOGIN);

    expect(result.success).toBe(true);
    expect(typeof result.entry.userId).toBe('string');
    expect(result.entry.userId).toBe('USR-0001');
  });

  it('stores null userId for system actions', () => {
    const result = logAction(null, AUDIT_ACTIONS.SCHEDULED_SCAN, {
      message: 'Nightly scan',
    });

    expect(result.success).toBe(true);
    expect(result.entry.userId).toBeNull();
  });

  it('stores undefined userId as null', () => {
    const result = logAction(undefined, AUDIT_ACTIONS.SCHEDULED_SCAN);

    expect(result.success).toBe(true);
    expect(result.entry.userId).toBeNull();
  });

  it('stores string details as a message object', () => {
    const result = logAction('USR-0001', AUDIT_ACTIONS.SETTINGS_UPDATE, 'Updated theme');

    expect(result.success).toBe(true);
    expect(result.entry.details).toEqual({ message: 'Updated theme' });
  });

  it('stores object details as-is', () => {
    const details = { field: 'theme', oldValue: 'light', newValue: 'dark' };
    const result = logAction('USR-0001', AUDIT_ACTIONS.SETTINGS_UPDATE, details);

    expect(result.success).toBe(true);
    expect(result.entry.details.field).toBe('theme');
    expect(result.entry.details.oldValue).toBe('light');
    expect(result.entry.details.newValue).toBe('dark');
  });

  it('stores empty object when details is omitted', () => {
    const result = logAction('USR-0001', AUDIT_ACTIONS.USER_LOGIN);

    expect(result.success).toBe(true);
    expect(result.entry.details).toEqual({});
  });

  it('stores artifactRef when provided', () => {
    const result = logAction(
      'USR-0001',
      AUDIT_ACTIONS.COMPLIANCE_ARTIFACT_UPLOAD,
      { type: 'SAST Report' },
      'CMP-0001',
    );

    expect(result.success).toBe(true);
    expect(result.entry.artifactRef).toBe('CMP-0001');
  });

  it('stores null artifactRef when not provided', () => {
    const result = logAction('USR-0001', AUDIT_ACTIONS.USER_LOGIN);

    expect(result.success).toBe(true);
    expect(result.entry.artifactRef).toBeNull();
  });

  it('returns failure when action is empty string', () => {
    const result = logAction('USR-0001', '');

    expect(result.success).toBe(false);
    expect(result.entry).toBeNull();
  });

  it('returns failure when action is null', () => {
    const result = logAction('USR-0001', null);

    expect(result.success).toBe(false);
    expect(result.entry).toBeNull();
  });

  it('returns failure when action is undefined', () => {
    const result = logAction('USR-0001', undefined);

    expect(result.success).toBe(false);
    expect(result.entry).toBeNull();
  });

  it('trims whitespace from action string', () => {
    const result = logAction('USR-0001', '  USER_LOGIN  ');

    expect(result.success).toBe(true);
    expect(result.entry.action).toBe('USER_LOGIN');
  });

  it('persists the log entry to localStorage', () => {
    logAction('USR-0001', AUDIT_ACTIONS.USER_LOGIN, { test: true });

    const { entries, total } = getAuditLogs();
    expect(total).toBe(1);
    expect(entries[0].action).toBe(AUDIT_ACTIONS.USER_LOGIN);
  });

  it('appends multiple log entries to localStorage', () => {
    logAction('USR-0001', AUDIT_ACTIONS.USER_LOGIN);
    logAction('USR-0001', AUDIT_ACTIONS.APPLICATION_ONBOARD);
    logAction('USR-0002', AUDIT_ACTIONS.PIPELINE_DEPLOY);

    const { total } = getAuditLogs();
    expect(total).toBe(3);
  });

  it('logs all known AUDIT_ACTIONS without error', () => {
    const actions = Object.values(AUDIT_ACTIONS);

    actions.forEach((action) => {
      const result = logAction('USR-0001', action, { action });
      expect(result.success).toBe(true);
    });

    const { total } = getAuditLogs();
    expect(total).toBe(actions.length);
  });
});

// ---------------------------------------------------------------------------
// Immutability of log entries
// ---------------------------------------------------------------------------

describe('Immutability of log entries', () => {
  it('returns a frozen entry object from logAction', () => {
    const result = logAction('USR-0001', AUDIT_ACTIONS.USER_LOGIN, { key: 'value' });

    expect(result.success).toBe(true);
    expect(Object.isFrozen(result.entry)).toBe(true);
  });

  it('modifying the returned entry does not affect stored data', () => {
    const result = logAction('USR-0001', AUDIT_ACTIONS.USER_LOGIN, { key: 'original' });

    expect(result.success).toBe(true);

    // Attempt to modify the frozen entry (should throw in strict mode or be silently ignored)
    try {
      result.entry.action = 'MODIFIED';
    } catch (_err) {
      // Expected in strict mode
    }

    const { entries } = getAuditLogs();
    expect(entries[0].action).toBe(AUDIT_ACTIONS.USER_LOGIN);
  });

  it('modifying the details object passed to logAction does not affect stored data', () => {
    const details = { key: 'original' };
    logAction('USR-0001', AUDIT_ACTIONS.USER_LOGIN, details);

    // Modify the original details object after logging
    details.key = 'modified';
    details.newKey = 'added';

    const { entries } = getAuditLogs();
    expect(entries[0].details.key).toBe('original');
    expect(entries[0].details.newKey).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// getAuditLogs — no filters
// ---------------------------------------------------------------------------

describe('getAuditLogs without filters', () => {
  it('returns empty entries when no logs exist', () => {
    const { entries, total } = getAuditLogs();

    expect(entries).toEqual([]);
    expect(total).toBe(0);
  });

  it('returns all logged entries', () => {
    logAction('USR-0001', AUDIT_ACTIONS.USER_LOGIN);
    logAction('USR-0002', AUDIT_ACTIONS.PIPELINE_DEPLOY);
    logAction('USR-0003', AUDIT_ACTIONS.COMPLIANCE_REVIEW);

    const { entries, total } = getAuditLogs();

    expect(total).toBe(3);
    expect(entries.length).toBe(3);
  });

  it('returns entries sorted by timestamp descending by default', () => {
    logAction('USR-0001', AUDIT_ACTIONS.USER_LOGIN);
    logAction('USR-0002', AUDIT_ACTIONS.PIPELINE_DEPLOY);
    logAction('USR-0003', AUDIT_ACTIONS.COMPLIANCE_REVIEW);

    const { entries } = getAuditLogs();

    if (entries.length >= 2) {
      for (let i = 1; i < entries.length; i++) {
        const dateA = new Date(entries[i - 1].timestamp).getTime();
        const dateB = new Date(entries[i].timestamp).getTime();
        expect(dateA).toBeGreaterThanOrEqual(dateB);
      }
    }
  });

  it('returns entries sorted ascending when sortOrder is asc', () => {
    logAction('USR-0001', AUDIT_ACTIONS.USER_LOGIN);
    logAction('USR-0002', AUDIT_ACTIONS.PIPELINE_DEPLOY);

    const { entries } = getAuditLogs({ sortOrder: 'asc' });

    if (entries.length >= 2) {
      for (let i = 1; i < entries.length; i++) {
        const dateA = new Date(entries[i - 1].timestamp).getTime();
        const dateB = new Date(entries[i].timestamp).getTime();
        expect(dateA).toBeLessThanOrEqual(dateB);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// getAuditLogs — filter by userId
// ---------------------------------------------------------------------------

describe('getAuditLogs filter by userId', () => {
  beforeEach(() => {
    logAction('USR-0001', AUDIT_ACTIONS.USER_LOGIN);
    logAction('USR-0002', AUDIT_ACTIONS.PIPELINE_DEPLOY);
    logAction('USR-0001', AUDIT_ACTIONS.APPLICATION_ONBOARD);
    logAction(null, AUDIT_ACTIONS.SCHEDULED_SCAN);
  });

  it('filters entries by userId', () => {
    const { entries, total } = getAuditLogs({ userId: 'USR-0001' });

    expect(total).toBe(2);
    expect(entries.every((e) => e.userId === 'USR-0001')).toBe(true);
  });

  it('returns empty when userId matches no entries', () => {
    const { entries, total } = getAuditLogs({ userId: 'USR-9999' });

    expect(total).toBe(0);
    expect(entries).toEqual([]);
  });

  it('does not filter when userId is empty string', () => {
    const { total } = getAuditLogs({ userId: '' });

    expect(total).toBe(4);
  });
});

// ---------------------------------------------------------------------------
// getAuditLogs — filter by action
// ---------------------------------------------------------------------------

describe('getAuditLogs filter by action', () => {
  beforeEach(() => {
    logAction('USR-0001', AUDIT_ACTIONS.USER_LOGIN);
    logAction('USR-0001', AUDIT_ACTIONS.USER_LOGIN);
    logAction('USR-0002', AUDIT_ACTIONS.PIPELINE_DEPLOY);
    logAction('USR-0003', AUDIT_ACTIONS.COMPLIANCE_REVIEW);
  });

  it('filters entries by action type', () => {
    const { entries, total } = getAuditLogs({ action: AUDIT_ACTIONS.USER_LOGIN });

    expect(total).toBe(2);
    expect(entries.every((e) => e.action === AUDIT_ACTIONS.USER_LOGIN)).toBe(true);
  });

  it('returns empty when action matches no entries', () => {
    const { entries, total } = getAuditLogs({ action: 'NONEXISTENT_ACTION' });

    expect(total).toBe(0);
    expect(entries).toEqual([]);
  });

  it('does not filter when action is empty string', () => {
    const { total } = getAuditLogs({ action: '' });

    expect(total).toBe(4);
  });
});

// ---------------------------------------------------------------------------
// getAuditLogs — filter by artifactRef
// ---------------------------------------------------------------------------

describe('getAuditLogs filter by artifactRef', () => {
  beforeEach(() => {
    logAction('USR-0001', AUDIT_ACTIONS.COMPLIANCE_ARTIFACT_UPLOAD, {}, 'CMP-0001');
    logAction('USR-0001', AUDIT_ACTIONS.COMPLIANCE_REVIEW, {}, 'CMP-0002');
    logAction('USR-0002', AUDIT_ACTIONS.USER_LOGIN);
  });

  it('filters entries by artifactRef', () => {
    const { entries, total } = getAuditLogs({ artifactRef: 'CMP-0001' });

    expect(total).toBe(1);
    expect(entries[0].artifactRef).toBe('CMP-0001');
  });

  it('returns empty when artifactRef matches no entries', () => {
    const { entries, total } = getAuditLogs({ artifactRef: 'CMP-9999' });

    expect(total).toBe(0);
    expect(entries).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// getAuditLogs — filter by date range
// ---------------------------------------------------------------------------

describe('getAuditLogs filter by date range', () => {
  it('filters entries by startDate', () => {
    logAction('USR-0001', AUDIT_ACTIONS.USER_LOGIN);

    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 1);

    const { total: totalFuture } = getAuditLogs({ startDate: futureDate.toISOString() });
    expect(totalFuture).toBe(0);

    const pastDate = new Date();
    pastDate.setFullYear(pastDate.getFullYear() - 1);

    const { total: totalPast } = getAuditLogs({ startDate: pastDate.toISOString() });
    expect(totalPast).toBe(1);
  });

  it('filters entries by endDate', () => {
    logAction('USR-0001', AUDIT_ACTIONS.USER_LOGIN);

    const pastDate = new Date();
    pastDate.setFullYear(pastDate.getFullYear() - 1);

    const { total: totalPast } = getAuditLogs({ endDate: pastDate.toISOString() });
    expect(totalPast).toBe(0);

    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 1);

    const { total: totalFuture } = getAuditLogs({ endDate: futureDate.toISOString() });
    expect(totalFuture).toBe(1);
  });

  it('filters entries by both startDate and endDate', () => {
    logAction('USR-0001', AUDIT_ACTIONS.USER_LOGIN);

    const pastDate = new Date();
    pastDate.setFullYear(pastDate.getFullYear() - 1);

    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 1);

    const { total } = getAuditLogs({
      startDate: pastDate.toISOString(),
      endDate: futureDate.toISOString(),
    });
    expect(total).toBe(1);
  });

  it('accepts Date objects for startDate and endDate', () => {
    logAction('USR-0001', AUDIT_ACTIONS.USER_LOGIN);

    const pastDate = new Date();
    pastDate.setFullYear(pastDate.getFullYear() - 1);

    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 1);

    const { total } = getAuditLogs({
      startDate: pastDate,
      endDate: futureDate,
    });
    expect(total).toBe(1);
  });

  it('ignores invalid date strings', () => {
    logAction('USR-0001', AUDIT_ACTIONS.USER_LOGIN);

    const { total } = getAuditLogs({ startDate: 'not-a-date' });
    // Invalid date should not filter anything
    expect(total).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// getAuditLogs — free-text search
// ---------------------------------------------------------------------------

describe('getAuditLogs free-text search', () => {
  beforeEach(() => {
    logAction('USR-0001', AUDIT_ACTIONS.USER_LOGIN, { username: 'admin.horizon' });
    logAction('USR-0002', AUDIT_ACTIONS.PIPELINE_DEPLOY, { applicationName: 'Member Portal' });
    logAction('USR-0003', AUDIT_ACTIONS.COMPLIANCE_REVIEW, { message: 'Reviewed SAST report' }, 'CMP-0001');
  });

  it('searches across action field', () => {
    const { entries, total } = getAuditLogs({ search: 'PIPELINE' });

    expect(total).toBe(1);
    expect(entries[0].action).toBe(AUDIT_ACTIONS.PIPELINE_DEPLOY);
  });

  it('searches across details field', () => {
    const { entries, total } = getAuditLogs({ search: 'Member Portal' });

    expect(total).toBe(1);
    expect(entries[0].details.applicationName).toBe('Member Portal');
  });

  it('searches across artifactRef field', () => {
    const { entries, total } = getAuditLogs({ search: 'CMP-0001' });

    expect(total).toBe(1);
    expect(entries[0].artifactRef).toBe('CMP-0001');
  });

  it('searches across userId field', () => {
    const { entries, total } = getAuditLogs({ search: 'USR-0002' });

    expect(total).toBe(1);
    expect(entries[0].userId).toBe('USR-0002');
  });

  it('search is case-insensitive', () => {
    const { total: totalLower } = getAuditLogs({ search: 'pipeline' });
    const { total: totalUpper } = getAuditLogs({ search: 'PIPELINE' });

    expect(totalLower).toBe(totalUpper);
    expect(totalLower).toBe(1);
  });

  it('returns empty when search matches nothing', () => {
    const { entries, total } = getAuditLogs({ search: 'zzz_nonexistent_zzz' });

    expect(total).toBe(0);
    expect(entries).toEqual([]);
  });

  it('does not filter when search is empty string', () => {
    const { total } = getAuditLogs({ search: '' });

    expect(total).toBe(3);
  });

  it('does not filter when search is null', () => {
    const { total } = getAuditLogs({ search: null });

    expect(total).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// getAuditLogs — combined filters
// ---------------------------------------------------------------------------

describe('getAuditLogs combined filters', () => {
  beforeEach(() => {
    logAction('USR-0001', AUDIT_ACTIONS.USER_LOGIN, { session: 1 });
    logAction('USR-0001', AUDIT_ACTIONS.PIPELINE_DEPLOY, { build: 100 });
    logAction('USR-0002', AUDIT_ACTIONS.USER_LOGIN, { session: 2 });
    logAction('USR-0002', AUDIT_ACTIONS.COMPLIANCE_REVIEW, { artifact: 'CMP-001' });
  });

  it('combines userId and action filters', () => {
    const { entries, total } = getAuditLogs({
      userId: 'USR-0001',
      action: AUDIT_ACTIONS.USER_LOGIN,
    });

    expect(total).toBe(1);
    expect(entries[0].userId).toBe('USR-0001');
    expect(entries[0].action).toBe(AUDIT_ACTIONS.USER_LOGIN);
  });

  it('combines userId and search filters', () => {
    const { entries, total } = getAuditLogs({
      userId: 'USR-0001',
      search: 'PIPELINE',
    });

    expect(total).toBe(1);
    expect(entries[0].action).toBe(AUDIT_ACTIONS.PIPELINE_DEPLOY);
  });

  it('returns empty when combined filters match nothing', () => {
    const { total } = getAuditLogs({
      userId: 'USR-0001',
      action: AUDIT_ACTIONS.COMPLIANCE_REVIEW,
    });

    expect(total).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// getAuditLogs — pagination
// ---------------------------------------------------------------------------

describe('getAuditLogs pagination', () => {
  beforeEach(() => {
    for (let i = 0; i < 10; i++) {
      logAction(`USR-000${i}`, AUDIT_ACTIONS.USER_LOGIN, { index: i });
    }
  });

  it('supports limit parameter', () => {
    const { entries, total } = getAuditLogs({ limit: 3 });

    expect(entries.length).toBe(3);
    expect(total).toBe(10);
  });

  it('supports offset parameter', () => {
    const { entries: page1 } = getAuditLogs({ limit: 3, offset: 0 });
    const { entries: page2 } = getAuditLogs({ limit: 3, offset: 3 });

    expect(page1.length).toBe(3);
    expect(page2.length).toBe(3);
    expect(page1[0].id).not.toBe(page2[0].id);
  });

  it('returns remaining entries when offset + limit exceeds total', () => {
    const { entries } = getAuditLogs({ limit: 5, offset: 8 });

    expect(entries.length).toBe(2);
  });

  it('returns empty when offset exceeds total', () => {
    const { entries } = getAuditLogs({ limit: 5, offset: 100 });

    expect(entries.length).toBe(0);
  });

  it('returns all entries when limit is not specified', () => {
    const { entries, total } = getAuditLogs();

    expect(entries.length).toBe(10);
    expect(total).toBe(10);
  });
});

// ---------------------------------------------------------------------------
// exportAuditLogs — JSON format
// ---------------------------------------------------------------------------

describe('exportAuditLogs JSON format', () => {
  beforeEach(() => {
    logAction('USR-0001', AUDIT_ACTIONS.USER_LOGIN, { session: 1 });
    logAction('USR-0002', AUDIT_ACTIONS.PIPELINE_DEPLOY, { build: 100 });
    logAction('USR-0003', AUDIT_ACTIONS.COMPLIANCE_REVIEW, { artifact: 'CMP-001' });
  });

  it('exports all entries as valid JSON string', () => {
    const result = exportAuditLogs();

    expect(result.success).toBe(true);
    expect(typeof result.data).toBe('string');
    expect(result.count).toBe(3);
    expect(result.format).toBe('json');

    const parsed = JSON.parse(result.data);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed.length).toBe(3);
  });

  it('exports filtered entries as JSON', () => {
    const result = exportAuditLogs({ userId: 'USR-0001' });

    expect(result.success).toBe(true);
    expect(result.count).toBe(1);

    const parsed = JSON.parse(result.data);
    expect(parsed.length).toBe(1);
    expect(parsed[0].userId).toBe('USR-0001');
  });

  it('exports all entries ignoring pagination filters', () => {
    const result = exportAuditLogs({ limit: 1, offset: 0 });

    expect(result.success).toBe(true);
    // Export should ignore limit/offset and return all matching entries
    expect(result.count).toBe(3);
  });

  it('exports empty array when no entries match', () => {
    const result = exportAuditLogs({ userId: 'USR-9999' });

    expect(result.success).toBe(true);
    expect(result.count).toBe(0);

    const parsed = JSON.parse(result.data);
    expect(parsed).toEqual([]);
  });

  it('each exported entry has expected properties', () => {
    const result = exportAuditLogs();
    const parsed = JSON.parse(result.data);

    parsed.forEach((entry) => {
      expect(entry).toHaveProperty('id');
      expect(entry).toHaveProperty('timestamp');
      expect(entry).toHaveProperty('userId');
      expect(entry).toHaveProperty('action');
      expect(entry).toHaveProperty('details');
      expect(entry).toHaveProperty('artifactRef');
    });
  });
});

// ---------------------------------------------------------------------------
// exportAuditLogs — CSV format
// ---------------------------------------------------------------------------

describe('exportAuditLogs CSV format', () => {
  beforeEach(() => {
    logAction('USR-0001', AUDIT_ACTIONS.USER_LOGIN, { session: 1 });
    logAction('USR-0002', AUDIT_ACTIONS.PIPELINE_DEPLOY, { build: 100 });
  });

  it('exports entries as CSV string', () => {
    const result = exportAuditLogs({}, { format: 'csv' });

    expect(result.success).toBe(true);
    expect(typeof result.data).toBe('string');
    expect(result.count).toBe(2);
    expect(result.format).toBe('csv');
  });

  it('CSV output includes header row', () => {
    const result = exportAuditLogs({}, { format: 'csv' });

    expect(result.success).toBe(true);

    const lines = result.data.split('\n');
    expect(lines.length).toBeGreaterThanOrEqual(3); // header + 2 data rows

    const header = lines[0];
    expect(header).toContain('id');
    expect(header).toContain('timestamp');
    expect(header).toContain('userId');
    expect(header).toContain('action');
    expect(header).toContain('details');
    expect(header).toContain('artifactRef');
  });

  it('CSV output has correct number of data rows', () => {
    const result = exportAuditLogs({}, { format: 'csv' });

    const lines = result.data.split('\n');
    // 1 header + 2 data rows = 3 lines
    expect(lines.length).toBe(3);
  });

  it('exports filtered entries as CSV', () => {
    const result = exportAuditLogs({ userId: 'USR-0001' }, { format: 'csv' });

    expect(result.success).toBe(true);
    expect(result.count).toBe(1);

    const lines = result.data.split('\n');
    // 1 header + 1 data row = 2 lines
    expect(lines.length).toBe(2);
  });

  it('returns empty string when no entries match for CSV', () => {
    const result = exportAuditLogs({ userId: 'USR-9999' }, { format: 'csv' });

    expect(result.success).toBe(true);
    expect(result.count).toBe(0);
    expect(result.data).toBe('');
  });
});

// ---------------------------------------------------------------------------
// getAuditSummary
// ---------------------------------------------------------------------------

describe('getAuditSummary', () => {
  it('returns empty object when no logs exist', () => {
    const summary = getAuditSummary();

    expect(summary).toEqual({});
  });

  it('returns action counts grouped by action type', () => {
    logAction('USR-0001', AUDIT_ACTIONS.USER_LOGIN);
    logAction('USR-0001', AUDIT_ACTIONS.USER_LOGIN);
    logAction('USR-0002', AUDIT_ACTIONS.PIPELINE_DEPLOY);
    logAction('USR-0003', AUDIT_ACTIONS.COMPLIANCE_REVIEW);

    const summary = getAuditSummary();

    expect(summary[AUDIT_ACTIONS.USER_LOGIN]).toBe(2);
    expect(summary[AUDIT_ACTIONS.PIPELINE_DEPLOY]).toBe(1);
    expect(summary[AUDIT_ACTIONS.COMPLIANCE_REVIEW]).toBe(1);
  });

  it('returns correct total when summing all action counts', () => {
    logAction('USR-0001', AUDIT_ACTIONS.USER_LOGIN);
    logAction('USR-0002', AUDIT_ACTIONS.PIPELINE_DEPLOY);
    logAction('USR-0003', AUDIT_ACTIONS.COMPLIANCE_REVIEW);

    const summary = getAuditSummary();
    const total = Object.values(summary).reduce((sum, count) => sum + count, 0);

    expect(total).toBe(3);
  });

  it('supports filtering by userId', () => {
    logAction('USR-0001', AUDIT_ACTIONS.USER_LOGIN);
    logAction('USR-0001', AUDIT_ACTIONS.PIPELINE_DEPLOY);
    logAction('USR-0002', AUDIT_ACTIONS.USER_LOGIN);

    const summary = getAuditSummary({ userId: 'USR-0001' });

    const total = Object.values(summary).reduce((sum, count) => sum + count, 0);
    expect(total).toBe(2);
    expect(summary[AUDIT_ACTIONS.USER_LOGIN]).toBe(1);
    expect(summary[AUDIT_ACTIONS.PIPELINE_DEPLOY]).toBe(1);
  });

  it('supports filtering by action', () => {
    logAction('USR-0001', AUDIT_ACTIONS.USER_LOGIN);
    logAction('USR-0002', AUDIT_ACTIONS.USER_LOGIN);
    logAction('USR-0003', AUDIT_ACTIONS.PIPELINE_DEPLOY);

    const summary = getAuditSummary({ action: AUDIT_ACTIONS.USER_LOGIN });

    expect(Object.keys(summary).length).toBe(1);
    expect(summary[AUDIT_ACTIONS.USER_LOGIN]).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// getAuditLogCount
// ---------------------------------------------------------------------------

describe('getAuditLogCount', () => {
  it('returns 0 when no logs exist', () => {
    const count = getAuditLogCount();

    expect(count).toBe(0);
  });

  it('returns correct total count', () => {
    logAction('USR-0001', AUDIT_ACTIONS.USER_LOGIN);
    logAction('USR-0002', AUDIT_ACTIONS.PIPELINE_DEPLOY);
    logAction('USR-0003', AUDIT_ACTIONS.COMPLIANCE_REVIEW);

    const count = getAuditLogCount();

    expect(count).toBe(3);
  });

  it('returns filtered count when filters are applied', () => {
    logAction('USR-0001', AUDIT_ACTIONS.USER_LOGIN);
    logAction('USR-0001', AUDIT_ACTIONS.PIPELINE_DEPLOY);
    logAction('USR-0002', AUDIT_ACTIONS.USER_LOGIN);

    const count = getAuditLogCount({ userId: 'USR-0001' });

    expect(count).toBe(2);
  });

  it('returns 0 when filters match nothing', () => {
    logAction('USR-0001', AUDIT_ACTIONS.USER_LOGIN);

    const count = getAuditLogCount({ userId: 'USR-9999' });

    expect(count).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// clearAuditLogs
// ---------------------------------------------------------------------------

describe('clearAuditLogs', () => {
  it('removes all audit log entries', () => {
    logAction('USR-0001', AUDIT_ACTIONS.USER_LOGIN);
    logAction('USR-0002', AUDIT_ACTIONS.PIPELINE_DEPLOY);

    const countBefore = getAuditLogCount();
    expect(countBefore).toBe(2);

    const result = clearAuditLogs();
    expect(result).toBe(true);

    const countAfter = getAuditLogCount();
    expect(countAfter).toBe(0);
  });

  it('returns true on success', () => {
    const result = clearAuditLogs();

    expect(result).toBe(true);
  });

  it('can log new entries after clearing', () => {
    logAction('USR-0001', AUDIT_ACTIONS.USER_LOGIN);
    clearAuditLogs();

    logAction('USR-0002', AUDIT_ACTIONS.PIPELINE_DEPLOY);

    const { entries, total } = getAuditLogs();
    expect(total).toBe(1);
    expect(entries[0].userId).toBe('USR-0002');
  });
});

// ---------------------------------------------------------------------------
// AUDIT_ACTIONS constants
// ---------------------------------------------------------------------------

describe('AUDIT_ACTIONS constants', () => {
  it('contains all expected action types', () => {
    expect(AUDIT_ACTIONS.USER_LOGIN).toBe('USER_LOGIN');
    expect(AUDIT_ACTIONS.USER_LOGOUT).toBe('USER_LOGOUT');
    expect(AUDIT_ACTIONS.USER_ROLE_CHANGE).toBe('USER_ROLE_CHANGE');
    expect(AUDIT_ACTIONS.APPLICATION_ONBOARD).toBe('APPLICATION_ONBOARD');
    expect(AUDIT_ACTIONS.APPLICATION_UPDATE).toBe('APPLICATION_UPDATE');
    expect(AUDIT_ACTIONS.APPLICATION_DELETE).toBe('APPLICATION_DELETE');
    expect(AUDIT_ACTIONS.PIPELINE_DEPLOY).toBe('PIPELINE_DEPLOY');
    expect(AUDIT_ACTIONS.PIPELINE_FAILED).toBe('PIPELINE_FAILED');
    expect(AUDIT_ACTIONS.PIPELINE_CONFIG_UPDATE).toBe('PIPELINE_CONFIG_UPDATE');
    expect(AUDIT_ACTIONS.TOOLCHAIN_CONFIG_UPDATE).toBe('TOOLCHAIN_CONFIG_UPDATE');
    expect(AUDIT_ACTIONS.COMPLIANCE_REVIEW).toBe('COMPLIANCE_REVIEW');
    expect(AUDIT_ACTIONS.COMPLIANCE_ARTIFACT_UPLOAD).toBe('COMPLIANCE_ARTIFACT_UPLOAD');
    expect(AUDIT_ACTIONS.INCIDENT_CREATE).toBe('INCIDENT_CREATE');
    expect(AUDIT_ACTIONS.INCIDENT_UPDATE).toBe('INCIDENT_UPDATE');
    expect(AUDIT_ACTIONS.INCIDENT_RESOLVE).toBe('INCIDENT_RESOLVE');
    expect(AUDIT_ACTIONS.REPORT_EXPORT).toBe('REPORT_EXPORT');
    expect(AUDIT_ACTIONS.SCHEDULED_SCAN).toBe('SCHEDULED_SCAN');
    expect(AUDIT_ACTIONS.SETTINGS_UPDATE).toBe('SETTINGS_UPDATE');
    expect(AUDIT_ACTIONS.DATA_EXPORT).toBe('DATA_EXPORT');
    expect(AUDIT_ACTIONS.DATA_IMPORT).toBe('DATA_IMPORT');
  });

  it('is frozen and cannot be modified', () => {
    expect(Object.isFrozen(AUDIT_ACTIONS)).toBe(true);
  });

  it('has at least 20 action types', () => {
    const actionCount = Object.keys(AUDIT_ACTIONS).length;

    expect(actionCount).toBeGreaterThanOrEqual(20);
  });
});

// ---------------------------------------------------------------------------
// localStorage persistence
// ---------------------------------------------------------------------------

describe('localStorage persistence', () => {
  it('entries persist across multiple getAuditLogs calls', () => {
    logAction('USR-0001', AUDIT_ACTIONS.USER_LOGIN, { key: 'value' });

    const { entries: entries1 } = getAuditLogs();
    const { entries: entries2 } = getAuditLogs();

    expect(entries1.length).toBe(entries2.length);
    expect(entries1[0].id).toBe(entries2[0].id);
  });

  it('entries persist after multiple logAction calls', () => {
    logAction('USR-0001', AUDIT_ACTIONS.USER_LOGIN);
    logAction('USR-0002', AUDIT_ACTIONS.PIPELINE_DEPLOY);

    const { total } = getAuditLogs();
    expect(total).toBe(2);

    logAction('USR-0003', AUDIT_ACTIONS.COMPLIANCE_REVIEW);

    const { total: totalAfter } = getAuditLogs();
    expect(totalAfter).toBe(3);
  });

  it('cleared logs do not reappear on subsequent reads', () => {
    logAction('USR-0001', AUDIT_ACTIONS.USER_LOGIN);
    logAction('USR-0002', AUDIT_ACTIONS.PIPELINE_DEPLOY);

    clearAuditLogs();

    const { total: total1 } = getAuditLogs();
    expect(total1).toBe(0);

    const { total: total2 } = getAuditLogs();
    expect(total2).toBe(0);
  });

  it('export reflects current state of localStorage', () => {
    logAction('USR-0001', AUDIT_ACTIONS.USER_LOGIN);

    const result1 = exportAuditLogs();
    expect(result1.count).toBe(1);

    logAction('USR-0002', AUDIT_ACTIONS.PIPELINE_DEPLOY);

    const result2 = exportAuditLogs();
    expect(result2.count).toBe(2);
  });

  it('summary reflects current state of localStorage', () => {
    logAction('USR-0001', AUDIT_ACTIONS.USER_LOGIN);

    const summary1 = getAuditSummary();
    expect(summary1[AUDIT_ACTIONS.USER_LOGIN]).toBe(1);

    logAction('USR-0002', AUDIT_ACTIONS.USER_LOGIN);

    const summary2 = getAuditSummary();
    expect(summary2[AUDIT_ACTIONS.USER_LOGIN]).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe('Edge cases', () => {
  it('handles logging with numeric userId by converting to string', () => {
    const result = logAction(12345, AUDIT_ACTIONS.USER_LOGIN);

    expect(result.success).toBe(true);
    expect(result.entry.userId).toBe('12345');
    expect(typeof result.entry.userId).toBe('string');
  });

  it('handles logging with numeric artifactRef by converting to string', () => {
    const result = logAction('USR-0001', AUDIT_ACTIONS.COMPLIANCE_REVIEW, {}, 42);

    expect(result.success).toBe(true);
    expect(result.entry.artifactRef).toBe('42');
    expect(typeof result.entry.artifactRef).toBe('string');
  });

  it('handles rapid sequential logging without data loss', () => {
    const count = 50;

    for (let i = 0; i < count; i++) {
      logAction(`USR-${i}`, AUDIT_ACTIONS.USER_LOGIN, { index: i });
    }

    const { total } = getAuditLogs();
    expect(total).toBe(count);
  });

  it('handles logging with large details object', () => {
    const largeDetails = {};
    for (let i = 0; i < 100; i++) {
      largeDetails[`key_${i}`] = `value_${i}_${'x'.repeat(50)}`;
    }

    const result = logAction('USR-0001', AUDIT_ACTIONS.SETTINGS_UPDATE, largeDetails);

    expect(result.success).toBe(true);
    expect(result.entry.details.key_0).toBeDefined();
    expect(result.entry.details.key_99).toBeDefined();
  });

  it('handles logging with special characters in details', () => {
    const result = logAction('USR-0001', AUDIT_ACTIONS.SETTINGS_UPDATE, {
      message: 'Updated "theme" to \'dark\' with <html> & special chars',
      path: '/api/v1/settings?key=value&other=123',
    });

    expect(result.success).toBe(true);
    expect(result.entry.details.message).toContain('"theme"');
    expect(result.entry.details.path).toContain('?key=value');
  });

  it('handles getAuditLogs with empty filters object', () => {
    logAction('USR-0001', AUDIT_ACTIONS.USER_LOGIN);

    const { total } = getAuditLogs({});

    expect(total).toBe(1);
  });

  it('handles exportAuditLogs with empty filters and options', () => {
    logAction('USR-0001', AUDIT_ACTIONS.USER_LOGIN);

    const result = exportAuditLogs({}, {});

    expect(result.success).toBe(true);
    expect(result.count).toBe(1);
    expect(result.format).toBe('json');
  });

  it('handles custom action strings not in AUDIT_ACTIONS', () => {
    const result = logAction('USR-0001', 'CUSTOM_ACTION', { custom: true });

    expect(result.success).toBe(true);
    expect(result.entry.action).toBe('CUSTOM_ACTION');
  });

  it('handles whitespace-only action string as failure', () => {
    const result = logAction('USR-0001', '   ');

    expect(result.success).toBe(false);
    expect(result.entry).toBeNull();
  });
});