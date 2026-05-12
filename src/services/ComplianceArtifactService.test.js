/**
 * Unit tests for ComplianceArtifactService
 * Tests generateArtifact for each type (change record, QE evidence,
 * security scan report, sign-off pack, audit documentation),
 * getArtifacts with filters, and audit logging of artifact generation.
 * @module services/ComplianceArtifactService.test
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  generateArtifact,
  generateChangeRecord,
  generateQEEvidence,
  generateSecurityScanReport,
  generateSignOffPack,
  generateAuditDocumentation,
  getArtifacts,
  getArtifactById,
  getArtifactSummary,
  updateArtifactStatus,
  deleteArtifact,
  downloadArtifact,
  exportArtifacts,
  resetArtifacts,
  ARTIFACT_TYPES,
} from './ComplianceArtifactService.js';
import { initializeStorage, clearStorage } from '../utils/localStorage.js';
import { getAuditLogs } from '../utils/auditLogger.js';
import {
  MOCK_APPLICATIONS,
  MOCK_COMPLIANCE_ARTIFACTS,
} from '../constants/mockData.js';
import {
  COMPLIANCE_STATUSES,
  CRITICALITY_TIERS,
  ENVIRONMENTS,
} from '../constants/constants.js';

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  localStorage.clear();
  initializeStorage({ force: true });
  resetArtifacts();
});

// ---------------------------------------------------------------------------
// generateArtifact (Generic)
// ---------------------------------------------------------------------------

describe('generateArtifact', () => {
  it('successfully generates a generic artifact with valid data', () => {
    const result = generateArtifact('Test Artifact', {
      applicationId: MOCK_APPLICATIONS[0].id,
      applicationName: MOCK_APPLICATIONS[0].name,
      description: 'A test artifact',
    });

    expect(result.success).toBe(true);
    expect(result.artifact).not.toBeNull();
    expect(result.artifact.type).toBe('Test Artifact');
    expect(result.artifact.applicationName).toBe(MOCK_APPLICATIONS[0].name);
    expect(result.artifact.id).toBeDefined();
    expect(result.artifact.generatedAt).toBeDefined();
    expect(result.artifact.content).toBeDefined();
    expect(typeof result.artifact.content).toBe('string');
    expect(result.error).toBeNull();
  });

  it('generates artifact with findings and determines compliance status', () => {
    const result = generateArtifact('Security Report', {
      applicationId: MOCK_APPLICATIONS[0].id,
      data: {
        findings: { critical: 0, high: 0, medium: 3, low: 5, info: 10 },
      },
    });

    expect(result.success).toBe(true);
    expect(result.artifact.findings).toBeDefined();
    expect(result.artifact.findings.critical).toBe(0);
    expect(result.artifact.findings.medium).toBe(3);
    expect(result.artifact.status).toBe(COMPLIANCE_STATUSES.COMPLIANT);
  });

  it('marks artifact as non-compliant when critical findings exist', () => {
    const result = generateArtifact('Security Report', {
      applicationId: MOCK_APPLICATIONS[0].id,
      data: {
        findings: { critical: 2, high: 1, medium: 0, low: 0, info: 0 },
      },
    });

    expect(result.success).toBe(true);
    expect(result.artifact.status).toBe(COMPLIANCE_STATUSES.NON_COMPLIANT);
  });

  it('returns error when artifact type is missing', () => {
    const result = generateArtifact('', { applicationId: MOCK_APPLICATIONS[0].id });

    expect(result.success).toBe(false);
    expect(result.artifact).toBeNull();
    expect(result.error).toBeDefined();
  });

  it('returns error when artifact type is null', () => {
    const result = generateArtifact(null, {});

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('returns error when context is null', () => {
    const result = generateArtifact('Test', null);

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('persists the generated artifact to localStorage', () => {
    const result = generateArtifact('Persisted Artifact', {
      applicationId: MOCK_APPLICATIONS[0].id,
    });

    expect(result.success).toBe(true);

    const found = getArtifactById(result.artifact.id);
    expect(found).not.toBeNull();
    expect(found.id).toBe(result.artifact.id);
  });

  it('logs the artifact generation to the audit trail', () => {
    generateArtifact('Audit Test Artifact', {
      applicationId: MOCK_APPLICATIONS[0].id,
      userId: 'USR-0001',
    });

    const { entries } = getAuditLogs({ action: 'COMPLIANCE_ARTIFACT_UPLOAD' });
    const relevant = entries.filter(
      (e) => e.details && e.details.action === 'artifact_generated',
    );
    expect(relevant.length).toBeGreaterThan(0);
  });

  it('generates artifact without applicationId', () => {
    const result = generateArtifact('General Artifact', {
      description: 'No application context',
    });

    expect(result.success).toBe(true);
    expect(result.artifact.applicationId).toBeNull();
    expect(result.artifact.applicationName).toBe('');
  });

  it('includes metadata in generated artifact', () => {
    const result = generateArtifact('Metadata Test', {
      applicationId: MOCK_APPLICATIONS[0].id,
      data: {
        environment: ENVIRONMENTS.PROD,
        version: '2.0.0',
        metadata: { custom: 'value' },
      },
    });

    expect(result.success).toBe(true);
    expect(result.artifact.metadata).toBeDefined();
    expect(result.artifact.metadata.environment).toBe(ENVIRONMENTS.PROD);
    expect(result.artifact.metadata.version).toBe('2.0.0');
    expect(result.artifact.metadata.custom).toBe('value');
  });
});

// ---------------------------------------------------------------------------
// generateChangeRecord
// ---------------------------------------------------------------------------

describe('generateChangeRecord', () => {
  it('successfully generates an ITM change record', () => {
    const result = generateChangeRecord({
      applicationId: MOCK_APPLICATIONS[0].id,
      applicationName: MOCK_APPLICATIONS[0].name,
      changeType: 'standard',
      environment: ENVIRONMENTS.PROD,
      version: '2.15.0',
      requestedBy: 'Test User',
    });

    expect(result.success).toBe(true);
    expect(result.artifact).not.toBeNull();
    expect(result.changeRecordId).toBeDefined();
    expect(result.changeRecordId.startsWith('CR-')).toBe(true);
    expect(result.artifact.type).toBe(ARTIFACT_TYPES.ITM_CHANGE_RECORD);
    expect(result.artifact.status).toBe(COMPLIANCE_STATUSES.COMPLIANT);
    expect(result.error).toBeNull();
  });

  it('includes change record metadata', () => {
    const result = generateChangeRecord({
      applicationId: MOCK_APPLICATIONS[0].id,
      changeType: 'emergency',
      environment: ENVIRONMENTS.PROD,
      version: '1.0.0',
      assignmentGroup: 'Platform Engineering',
    });

    expect(result.success).toBe(true);
    expect(result.artifact.metadata).toBeDefined();
    expect(result.artifact.metadata.changeRecordId).toBe(result.changeRecordId);
    expect(result.artifact.metadata.changeType).toBe('emergency');
    expect(result.artifact.metadata.environment).toBe(ENVIRONMENTS.PROD);
    expect(result.artifact.metadata.assignmentGroup).toBe('Platform Engineering');
  });

  it('sets high risk level for business-critical applications', () => {
    const criticalApp = MOCK_APPLICATIONS.find(
      (a) => a.criticalityTier === CRITICALITY_TIERS.BUSINESS_CRITICAL,
    );

    if (criticalApp) {
      const result = generateChangeRecord({
        applicationId: criticalApp.id,
        applicationName: criticalApp.name,
      });

      expect(result.success).toBe(true);
      expect(result.artifact.metadata.riskLevel).toBe('High');
    }
  });

  it('generates document content with change record sections', () => {
    const result = generateChangeRecord({
      applicationId: MOCK_APPLICATIONS[0].id,
      changeReason: 'Feature deployment',
    });

    expect(result.success).toBe(true);
    expect(result.artifact.content).toContain('Change Record Information');
    expect(result.artifact.content).toContain('Change Reason');
    expect(result.artifact.content).toContain('Implementation Plan');
    expect(result.artifact.content).toContain('Rollback Plan');
    expect(result.artifact.content).toContain('Risk Assessment');
  });

  it('returns error when onboarding data is null', () => {
    const result = generateChangeRecord(null);

    expect(result.success).toBe(false);
    expect(result.artifact).toBeNull();
    expect(result.changeRecordId).toBeNull();
    expect(result.error).toBeDefined();
  });

  it('persists change record to localStorage', () => {
    const result = generateChangeRecord({
      applicationId: MOCK_APPLICATIONS[0].id,
    });

    expect(result.success).toBe(true);

    const found = getArtifactById(result.artifact.id);
    expect(found).not.toBeNull();
    expect(found.type).toBe(ARTIFACT_TYPES.ITM_CHANGE_RECORD);
  });

  it('logs change record generation to audit trail', () => {
    generateChangeRecord({
      applicationId: MOCK_APPLICATIONS[0].id,
      userId: 'USR-0001',
    });

    const { entries } = getAuditLogs({ action: 'COMPLIANCE_ARTIFACT_UPLOAD' });
    const relevant = entries.filter(
      (e) => e.details && e.details.action === 'change_record_generated',
    );
    expect(relevant.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// generateQEEvidence
// ---------------------------------------------------------------------------

describe('generateQEEvidence', () => {
  it('successfully generates a QE evidence package', () => {
    const result = generateQEEvidence({
      applicationId: MOCK_APPLICATIONS[0].id,
      applicationName: MOCK_APPLICATIONS[0].name,
    });

    expect(result.success).toBe(true);
    expect(result.artifact).not.toBeNull();
    expect(result.artifact.type).toBe(ARTIFACT_TYPES.QE_EVIDENCE);
    expect(result.artifact.content).toBeDefined();
    expect(result.error).toBeNull();
  });

  it('includes test results in QE evidence', () => {
    const result = generateQEEvidence({
      applicationId: MOCK_APPLICATIONS[0].id,
      testResults: {
        total: 100,
        passed: 98,
        failed: 0,
        skipped: 2,
      },
      codeCoverage: 85.5,
    });

    expect(result.success).toBe(true);
    expect(result.artifact.metadata).toBeDefined();
    expect(result.artifact.metadata.testResults).toBeDefined();
    expect(result.artifact.metadata.testResults.total).toBe(100);
    expect(result.artifact.metadata.testResults.passed).toBe(98);
    expect(result.artifact.metadata.codeCoverage).toBe(85.5);
  });

  it('marks QE evidence as compliant when tests pass and coverage meets threshold', () => {
    const result = generateQEEvidence({
      applicationId: MOCK_APPLICATIONS[0].id,
      testResults: {
        total: 100,
        passed: 100,
        failed: 0,
        skipped: 0,
      },
      codeCoverage: 90,
    });

    expect(result.success).toBe(true);
    expect(result.artifact.status).toBe(COMPLIANCE_STATUSES.COMPLIANT);
  });

  it('marks QE evidence as partial when coverage is below threshold', () => {
    const result = generateQEEvidence({
      applicationId: MOCK_APPLICATIONS[0].id,
      testResults: {
        total: 100,
        passed: 100,
        failed: 0,
        skipped: 0,
      },
      codeCoverage: 50,
    });

    expect(result.success).toBe(true);
    expect(result.artifact.status).toBe(COMPLIANCE_STATUSES.PARTIAL);
  });

  it('generates document content with QE sections', () => {
    const result = generateQEEvidence({
      applicationId: MOCK_APPLICATIONS[0].id,
    });

    expect(result.success).toBe(true);
    expect(result.artifact.content).toContain('QE Evidence Package');
    expect(result.artifact.content).toContain('Unit Test Results');
    expect(result.artifact.content).toContain('Code Coverage');
    expect(result.artifact.content).toContain('QE Compliance Statement');
  });

  it('returns error when pipeline data is null', () => {
    const result = generateQEEvidence(null);

    expect(result.success).toBe(false);
    expect(result.artifact).toBeNull();
    expect(result.error).toBeDefined();
  });

  it('uses KPI data when test results are not provided', () => {
    const result = generateQEEvidence({
      applicationId: MOCK_APPLICATIONS[0].id,
    });

    expect(result.success).toBe(true);
    expect(result.artifact.metadata.testResults).toBeDefined();
    expect(result.artifact.metadata.testResults.total).toBeGreaterThan(0);
  });

  it('logs QE evidence generation to audit trail', () => {
    generateQEEvidence({
      applicationId: MOCK_APPLICATIONS[0].id,
      userId: 'USR-0001',
    });

    const { entries } = getAuditLogs({ action: 'COMPLIANCE_ARTIFACT_UPLOAD' });
    const relevant = entries.filter(
      (e) => e.details && e.details.action === 'qe_evidence_generated',
    );
    expect(relevant.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// generateSecurityScanReport
// ---------------------------------------------------------------------------

describe('generateSecurityScanReport', () => {
  it('successfully generates a consolidated security scan report', () => {
    const result = generateSecurityScanReport({
      applicationId: MOCK_APPLICATIONS[0].id,
      applicationName: MOCK_APPLICATIONS[0].name,
      scanType: 'consolidated',
      tool: 'Multiple',
      version: '2.15.0',
    });

    expect(result.success).toBe(true);
    expect(result.artifact).not.toBeNull();
    expect(result.artifact.type).toBe(ARTIFACT_TYPES.SECURITY_SCAN_REPORT);
    expect(result.artifact.content).toBeDefined();
    expect(result.error).toBeNull();
  });

  it('generates SAST report type for sast scan type', () => {
    const result = generateSecurityScanReport({
      applicationId: MOCK_APPLICATIONS[0].id,
      scanType: 'sast',
      tool: 'Checkmarx',
    });

    expect(result.success).toBe(true);
    expect(result.artifact.type).toBe(ARTIFACT_TYPES.SAST_REPORT);
  });

  it('generates DAST report type for dast scan type', () => {
    const result = generateSecurityScanReport({
      applicationId: MOCK_APPLICATIONS[0].id,
      scanType: 'dast',
      tool: 'OWASP ZAP',
    });

    expect(result.success).toBe(true);
    expect(result.artifact.type).toBe(ARTIFACT_TYPES.DAST_REPORT);
  });

  it('generates SCA report type for sca scan type', () => {
    const result = generateSecurityScanReport({
      applicationId: MOCK_APPLICATIONS[0].id,
      scanType: 'sca',
      tool: 'Snyk',
    });

    expect(result.success).toBe(true);
    expect(result.artifact.type).toBe(ARTIFACT_TYPES.SCA_REPORT);
  });

  it('generates container scan report type for container scan type', () => {
    const result = generateSecurityScanReport({
      applicationId: MOCK_APPLICATIONS[0].id,
      scanType: 'container',
      tool: 'Twistlock',
    });

    expect(result.success).toBe(true);
    expect(result.artifact.type).toBe(ARTIFACT_TYPES.CONTAINER_SCAN_REPORT);
  });

  it('includes findings in the security scan report', () => {
    const result = generateSecurityScanReport({
      applicationId: MOCK_APPLICATIONS[0].id,
      findings: { critical: 1, high: 3, medium: 5, low: 10, info: 20 },
    });

    expect(result.success).toBe(true);
    expect(result.artifact.findings).toBeDefined();
    expect(result.artifact.findings.critical).toBe(1);
    expect(result.artifact.findings.high).toBe(3);
    expect(result.artifact.findings.medium).toBe(5);
  });

  it('marks report as non-compliant when critical findings exist', () => {
    const result = generateSecurityScanReport({
      applicationId: MOCK_APPLICATIONS[0].id,
      findings: { critical: 2, high: 0, medium: 0, low: 0, info: 0 },
    });

    expect(result.success).toBe(true);
    expect(result.artifact.status).toBe(COMPLIANCE_STATUSES.NON_COMPLIANT);
  });

  it('marks report as compliant when no critical or high findings', () => {
    const result = generateSecurityScanReport({
      applicationId: MOCK_APPLICATIONS[0].id,
      findings: { critical: 0, high: 0, medium: 2, low: 5, info: 10 },
    });

    expect(result.success).toBe(true);
    expect(result.artifact.status).toBe(COMPLIANCE_STATUSES.COMPLIANT);
  });

  it('generates document content with security sections', () => {
    const result = generateSecurityScanReport({
      applicationId: MOCK_APPLICATIONS[0].id,
    });

    expect(result.success).toBe(true);
    expect(result.artifact.content).toContain('Security Scan Report');
    expect(result.artifact.content).toContain('Findings Summary');
    expect(result.artifact.content).toContain('Remediation Recommendations');
    expect(result.artifact.content).toContain('Compliance Assessment');
  });

  it('returns error when scan data is null', () => {
    const result = generateSecurityScanReport(null);

    expect(result.success).toBe(false);
    expect(result.artifact).toBeNull();
    expect(result.error).toBeDefined();
  });

  it('uses default findings when none are provided', () => {
    const result = generateSecurityScanReport({
      applicationId: MOCK_APPLICATIONS[0].id,
    });

    expect(result.success).toBe(true);
    expect(result.artifact.findings).toBeDefined();
    expect(typeof result.artifact.findings.critical).toBe('number');
  });

  it('logs security scan report generation to audit trail', () => {
    generateSecurityScanReport({
      applicationId: MOCK_APPLICATIONS[0].id,
      userId: 'USR-0001',
    });

    const { entries } = getAuditLogs({ action: 'COMPLIANCE_ARTIFACT_UPLOAD' });
    const relevant = entries.filter(
      (e) => e.details && e.details.action === 'security_scan_report_generated',
    );
    expect(relevant.length).toBeGreaterThan(0);
  });

  it('includes vulnerability details when provided', () => {
    const result = generateSecurityScanReport({
      applicationId: MOCK_APPLICATIONS[0].id,
      findings: { critical: 1, high: 0, medium: 0, low: 0, info: 0 },
      vulnerabilities: [
        { severity: 'Critical', title: 'SQL Injection', location: 'auth.js' },
      ],
    });

    expect(result.success).toBe(true);
    expect(result.artifact.content).toContain('Vulnerability Details');
    expect(result.artifact.content).toContain('SQL Injection');
  });
});

// ---------------------------------------------------------------------------
// generateSignOffPack
// ---------------------------------------------------------------------------

describe('generateSignOffPack', () => {
  it('successfully generates a sign-off pack for a valid application', () => {
    const appId = MOCK_APPLICATIONS[0].id;

    const result = generateSignOffPack(appId, {
      environment: ENVIRONMENTS.PROD,
      version: '2.15.0',
      approvedBy: 'Application Owner',
    });

    expect(result.success).toBe(true);
    expect(result.artifact).not.toBeNull();
    expect(result.artifact.type).toBe(ARTIFACT_TYPES.SIGN_OFF_PACK);
    expect(result.artifact.applicationId).toBe(appId);
    expect(result.artifact.status).toBe(COMPLIANCE_STATUSES.COMPLIANT);
    expect(result.error).toBeNull();
  });

  it('includes sign-off metadata', () => {
    const appId = MOCK_APPLICATIONS[0].id;

    const result = generateSignOffPack(appId, {
      environment: ENVIRONMENTS.PROD,
      version: '3.0.0',
      approvedBy: 'John Doe',
      notes: 'Approved after review',
    });

    expect(result.success).toBe(true);
    expect(result.artifact.metadata).toBeDefined();
    expect(result.artifact.metadata.environment).toBe(ENVIRONMENTS.PROD);
    expect(result.artifact.metadata.version).toBe('3.0.0');
    expect(result.artifact.metadata.approvedBy).toBe('John Doe');
  });

  it('generates comprehensive document content', () => {
    const appId = MOCK_APPLICATIONS[0].id;

    const result = generateSignOffPack(appId);

    expect(result.success).toBe(true);
    expect(result.artifact.content).toContain('Sign-Off Pack Summary');
    expect(result.artifact.content).toContain('Approval Information');
    expect(result.artifact.content).toContain('Sign-Off Checklist');
    expect(result.artifact.content).toContain('Compliance Statement');
  });

  it('returns error when application ID is missing', () => {
    const result = generateSignOffPack(null);

    expect(result.success).toBe(false);
    expect(result.artifact).toBeNull();
    expect(result.error).toBeDefined();
  });

  it('returns error when application ID is empty string', () => {
    const result = generateSignOffPack('');

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('returns error for non-existent application ID', () => {
    const result = generateSignOffPack('NONEXISTENT-APP-ID');

    expect(result.success).toBe(false);
    expect(result.error).toContain('not found');
  });

  it('logs sign-off pack generation to audit trail', () => {
    const appId = MOCK_APPLICATIONS[0].id;

    generateSignOffPack(appId, { userId: 'USR-0001' });

    const { entries } = getAuditLogs({ action: 'COMPLIANCE_ARTIFACT_UPLOAD' });
    const relevant = entries.filter(
      (e) => e.details && e.details.action === 'sign_off_pack_generated',
    );
    expect(relevant.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// generateAuditDocumentation
// ---------------------------------------------------------------------------

describe('generateAuditDocumentation', () => {
  it('successfully generates comprehensive audit documentation', () => {
    const result = generateAuditDocumentation({
      auditType: 'comprehensive',
      preparedBy: 'Compliance Team',
    });

    expect(result.success).toBe(true);
    expect(result.artifact).not.toBeNull();
    expect(result.artifact.type).toBe(ARTIFACT_TYPES.AUDIT_DOCUMENTATION);
    expect(result.artifact.status).toBe(COMPLIANCE_STATUSES.COMPLIANT);
    expect(result.error).toBeNull();
  });

  it('generates security audit documentation', () => {
    const result = generateAuditDocumentation({
      auditType: 'security',
    });

    expect(result.success).toBe(true);
    expect(result.artifact.content).toContain('Security Posture');
  });

  it('generates operational audit documentation', () => {
    const result = generateAuditDocumentation({
      auditType: 'operational',
    });

    expect(result.success).toBe(true);
    expect(result.artifact.content).toContain('Operational Metrics');
  });

  it('includes HIPAA/CMS compliance controls section', () => {
    const result = generateAuditDocumentation();

    expect(result.success).toBe(true);
    expect(result.artifact.content).toContain('HIPAA/CMS Compliance Controls');
    expect(result.artifact.content).toContain('Access Controls');
    expect(result.artifact.content).toContain('Audit Controls');
    expect(result.artifact.content).toContain('Data Protection');
  });

  it('includes certification section', () => {
    const result = generateAuditDocumentation({
      preparedBy: 'Test Preparer',
    });

    expect(result.success).toBe(true);
    expect(result.artifact.content).toContain('Certification');
    expect(result.artifact.content).toContain('Test Preparer');
  });

  it('filters by domain when specified', () => {
    const result = generateAuditDocumentation({
      domain: 'Digital Experience',
    });

    expect(result.success).toBe(true);
    expect(result.artifact.metadata).toBeDefined();
    expect(result.artifact.metadata.domain).toBe('Digital Experience');
  });

  it('filters by application when specified', () => {
    const appId = MOCK_APPLICATIONS[0].id;

    const result = generateAuditDocumentation({
      applicationId: appId,
    });

    expect(result.success).toBe(true);
    expect(result.artifact.applicationId).toBe(appId);
  });

  it('includes audit period in metadata', () => {
    const result = generateAuditDocumentation({
      period: '2024-Q4',
    });

    expect(result.success).toBe(true);
    expect(result.artifact.metadata.auditPeriod).toBe('2024-Q4');
  });

  it('auto-generates audit period when not specified', () => {
    const result = generateAuditDocumentation();

    expect(result.success).toBe(true);
    expect(result.artifact.metadata.auditPeriod).toBeDefined();
    expect(result.artifact.metadata.auditPeriod).toMatch(/^\d{4}-Q[1-4]$/);
  });

  it('logs audit documentation generation to audit trail', () => {
    generateAuditDocumentation({ userId: 'USR-0001' });

    const { entries } = getAuditLogs({ action: 'COMPLIANCE_ARTIFACT_UPLOAD' });
    const relevant = entries.filter(
      (e) => e.details && e.details.action === 'audit_documentation_generated',
    );
    expect(relevant.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// getArtifacts
// ---------------------------------------------------------------------------

describe('getArtifacts', () => {
  it('returns all artifacts including mock data when no filters are applied', () => {
    const { data, total } = getArtifacts();

    expect(Array.isArray(data)).toBe(true);
    expect(total).toBeGreaterThan(0);
    expect(total).toBeGreaterThanOrEqual(MOCK_COMPLIANCE_ARTIFACTS.length);
  });

  it('filters artifacts by applicationId', () => {
    const appId = MOCK_APPLICATIONS[0].id;

    const { data } = getArtifacts({ applicationId: appId });

    expect(data.length).toBeGreaterThan(0);
    expect(data.every((a) => a.applicationId === appId)).toBe(true);
  });

  it('filters artifacts by type', () => {
    const { data } = getArtifacts({ type: 'SAST Report' });

    expect(data.length).toBeGreaterThan(0);
    expect(data.every((a) => a.type === 'SAST Report')).toBe(true);
  });

  it('filters artifacts by status', () => {
    const { data } = getArtifacts({ status: COMPLIANCE_STATUSES.COMPLIANT });

    expect(data.length).toBeGreaterThan(0);
    expect(data.every((a) => a.status === COMPLIANCE_STATUSES.COMPLIANT)).toBe(true);
  });

  it('filters artifacts by search query', () => {
    const { data } = getArtifacts({ search: 'Member Portal' });

    expect(data.length).toBeGreaterThan(0);
  });

  it('returns empty data when search matches nothing', () => {
    const { data, total } = getArtifacts({ search: 'zzz_nonexistent_artifact_zzz' });

    expect(data).toEqual([]);
    expect(total).toBe(0);
  });

  it('sorts artifacts by generatedAt descending by default', () => {
    const { data } = getArtifacts();

    if (data.length >= 2) {
      for (let i = 1; i < data.length; i++) {
        const dateA = data[i - 1].generatedAt || '';
        const dateB = data[i].generatedAt || '';
        if (dateA && dateB) {
          expect(dateA >= dateB).toBe(true);
        }
      }
    }
  });

  it('includes generated artifacts in results', () => {
    generateArtifact('Generated Test', {
      applicationId: MOCK_APPLICATIONS[0].id,
    });

    const { data } = getArtifacts({ search: 'Generated Test' });

    expect(data.length).toBeGreaterThan(0);
    expect(data.some((a) => a.type === 'Generated Test')).toBe(true);
  });

  it('supports pagination with limit and offset', () => {
    const { data: allData, total: allTotal } = getArtifacts();

    if (allTotal >= 2) {
      const { data: page1 } = getArtifacts({ limit: 1, offset: 0 });
      const { data: page2 } = getArtifacts({ limit: 1, offset: 1 });

      expect(page1.length).toBe(1);
      expect(page2.length).toBe(1);
      expect(page1[0].id).not.toBe(page2[0].id);
    }
  });

  it('filters artifacts by generatedBy', () => {
    generateArtifact('By User Test', {
      applicationId: MOCK_APPLICATIONS[0].id,
      userId: 'USR-FILTER-TEST',
    });

    const { data } = getArtifacts({ generatedBy: 'USR-FILTER-TEST' });

    expect(data.length).toBeGreaterThan(0);
  });

  it('filters artifacts by applicationName', () => {
    const { data } = getArtifacts({ applicationName: 'Member Portal' });

    expect(data.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// getArtifactById
// ---------------------------------------------------------------------------

describe('getArtifactById', () => {
  it('returns the correct artifact for a valid ID from generated artifacts', () => {
    const genResult = generateArtifact('Find By ID Test', {
      applicationId: MOCK_APPLICATIONS[0].id,
    });

    expect(genResult.success).toBe(true);

    const found = getArtifactById(genResult.artifact.id);

    expect(found).not.toBeNull();
    expect(found.id).toBe(genResult.artifact.id);
    expect(found.type).toBe('Find By ID Test');
  });

  it('returns artifact from mock data', () => {
    const mockArtifactId = MOCK_COMPLIANCE_ARTIFACTS[0].id;

    const found = getArtifactById(mockArtifactId);

    expect(found).not.toBeNull();
    expect(found.id).toBe(mockArtifactId);
  });

  it('returns null for an invalid ID', () => {
    const result = getArtifactById('INVALID-ARTIFACT-999');

    expect(result).toBeNull();
  });

  it('returns null when ID is null', () => {
    expect(getArtifactById(null)).toBeNull();
  });

  it('returns null when ID is undefined', () => {
    expect(getArtifactById(undefined)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// updateArtifactStatus
// ---------------------------------------------------------------------------

describe('updateArtifactStatus', () => {
  it('successfully updates the status of a generated artifact', () => {
    const genResult = generateArtifact('Status Update Test', {
      applicationId: MOCK_APPLICATIONS[0].id,
    });

    expect(genResult.success).toBe(true);

    const updateResult = updateArtifactStatus(
      genResult.artifact.id,
      COMPLIANCE_STATUSES.NON_COMPLIANT,
      { reviewedBy: 'Reviewer', reviewNotes: 'Failed review' },
    );

    expect(updateResult.success).toBe(true);
    expect(updateResult.artifact).not.toBeNull();
    expect(updateResult.artifact.status).toBe(COMPLIANCE_STATUSES.NON_COMPLIANT);
    expect(updateResult.artifact.reviewedBy).toBe('Reviewer');
    expect(updateResult.artifact.reviewNotes).toBe('Failed review');
  });

  it('returns error for invalid artifact ID', () => {
    const result = updateArtifactStatus('NONEXISTENT', COMPLIANCE_STATUSES.COMPLIANT);

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('returns error for invalid status', () => {
    const genResult = generateArtifact('Invalid Status Test', {
      applicationId: MOCK_APPLICATIONS[0].id,
    });

    const result = updateArtifactStatus(genResult.artifact.id, 'INVALID_STATUS');

    expect(result.success).toBe(false);
    expect(result.error).toContain('Invalid status');
  });

  it('returns error when artifact ID is null', () => {
    const result = updateArtifactStatus(null, COMPLIANCE_STATUSES.COMPLIANT);

    expect(result.success).toBe(false);
  });

  it('returns error when new status is null', () => {
    const genResult = generateArtifact('Null Status Test', {
      applicationId: MOCK_APPLICATIONS[0].id,
    });

    const result = updateArtifactStatus(genResult.artifact.id, null);

    expect(result.success).toBe(false);
  });

  it('logs status update to audit trail', () => {
    const genResult = generateArtifact('Audit Status Test', {
      applicationId: MOCK_APPLICATIONS[0].id,
    });

    updateArtifactStatus(
      genResult.artifact.id,
      COMPLIANCE_STATUSES.NON_COMPLIANT,
      { userId: 'USR-0001' },
    );

    const { entries } = getAuditLogs({ action: 'COMPLIANCE_REVIEW' });
    const relevant = entries.filter(
      (e) => e.details && e.details.action === 'artifact_status_updated',
    );
    expect(relevant.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// deleteArtifact
// ---------------------------------------------------------------------------

describe('deleteArtifact', () => {
  it('successfully deletes a generated artifact', () => {
    const genResult = generateArtifact('Delete Test', {
      applicationId: MOCK_APPLICATIONS[0].id,
    });

    expect(genResult.success).toBe(true);

    const deleteResult = deleteArtifact(genResult.artifact.id);

    expect(deleteResult.success).toBe(true);
    expect(deleteResult.error).toBeNull();
  });

  it('removes the artifact from localStorage', () => {
    const genResult = generateArtifact('Delete Persist Test', {
      applicationId: MOCK_APPLICATIONS[0].id,
    });

    expect(genResult.success).toBe(true);

    deleteArtifact(genResult.artifact.id);

    const found = getArtifactById(genResult.artifact.id);
    expect(found).toBeNull();
  });

  it('returns error for non-existent artifact ID', () => {
    const result = deleteArtifact('NONEXISTENT-ID');

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('returns error when artifact ID is null', () => {
    const result = deleteArtifact(null);

    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// downloadArtifact
// ---------------------------------------------------------------------------

describe('downloadArtifact', () => {
  it('downloads artifact as text format', () => {
    const genResult = generateArtifact('Download Test', {
      applicationId: MOCK_APPLICATIONS[0].id,
    });

    expect(genResult.success).toBe(true);

    const downloadResult = downloadArtifact(genResult.artifact.id, { format: 'text' });

    expect(downloadResult.success).toBe(true);
    expect(downloadResult.content).toBeDefined();
    expect(typeof downloadResult.content).toBe('string');
    expect(downloadResult.content.length).toBeGreaterThan(0);
    expect(downloadResult.fileName).toBeDefined();
    expect(downloadResult.fileName.endsWith('.txt')).toBe(true);
    expect(downloadResult.mimeType).toBe('text/plain');
    expect(downloadResult.error).toBeNull();
  });

  it('downloads artifact as JSON format', () => {
    const genResult = generateArtifact('JSON Download Test', {
      applicationId: MOCK_APPLICATIONS[0].id,
    });

    expect(genResult.success).toBe(true);

    const downloadResult = downloadArtifact(genResult.artifact.id, { format: 'json' });

    expect(downloadResult.success).toBe(true);
    expect(downloadResult.content).toBeDefined();
    expect(downloadResult.fileName).toBeDefined();
    expect(downloadResult.fileName.endsWith('.json')).toBe(true);
    expect(downloadResult.mimeType).toBe('application/json');

    // Verify it's valid JSON
    const parsed = JSON.parse(downloadResult.content);
    expect(parsed).toBeDefined();
    expect(parsed.id).toBe(genResult.artifact.id);
  });

  it('returns error for non-existent artifact ID', () => {
    const result = downloadArtifact('NONEXISTENT-ID');

    expect(result.success).toBe(false);
    expect(result.content).toBeNull();
    expect(result.error).toBeDefined();
  });

  it('returns error when artifact ID is null', () => {
    const result = downloadArtifact(null);

    expect(result.success).toBe(false);
  });

  it('logs download to audit trail', () => {
    const genResult = generateArtifact('Audit Download Test', {
      applicationId: MOCK_APPLICATIONS[0].id,
    });

    downloadArtifact(genResult.artifact.id, { userId: 'USR-0001' });

    const { entries } = getAuditLogs({ action: 'REPORT_EXPORT' });
    const relevant = entries.filter(
      (e) => e.details && e.details.action === 'artifact_downloaded',
    );
    expect(relevant.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// getArtifactSummary
// ---------------------------------------------------------------------------

describe('getArtifactSummary', () => {
  it('returns a summary object with expected properties', () => {
    const summary = getArtifactSummary();

    expect(summary).toHaveProperty('totalArtifacts');
    expect(summary).toHaveProperty('byType');
    expect(summary).toHaveProperty('byStatus');
    expect(summary).toHaveProperty('byApplication');
    expect(summary).toHaveProperty('recentArtifacts');
    expect(summary).toHaveProperty('complianceRate');
    expect(summary).toHaveProperty('criticalFindings');
    expect(summary).toHaveProperty('highFindings');
  });

  it('returns correct total artifact count', () => {
    const summary = getArtifactSummary();

    expect(summary.totalArtifacts).toBeGreaterThan(0);
    expect(summary.totalArtifacts).toBeGreaterThanOrEqual(MOCK_COMPLIANCE_ARTIFACTS.length);
  });

  it('returns non-empty byType array', () => {
    const summary = getArtifactSummary();

    expect(Array.isArray(summary.byType)).toBe(true);
    expect(summary.byType.length).toBeGreaterThan(0);
    expect(summary.byType[0]).toHaveProperty('type');
    expect(summary.byType[0]).toHaveProperty('count');
  });

  it('returns non-empty byStatus array', () => {
    const summary = getArtifactSummary();

    expect(Array.isArray(summary.byStatus)).toBe(true);
    expect(summary.byStatus.length).toBeGreaterThan(0);
    expect(summary.byStatus[0]).toHaveProperty('status');
    expect(summary.byStatus[0]).toHaveProperty('count');
  });

  it('returns non-empty byApplication array', () => {
    const summary = getArtifactSummary();

    expect(Array.isArray(summary.byApplication)).toBe(true);
    expect(summary.byApplication.length).toBeGreaterThan(0);
    expect(summary.byApplication[0]).toHaveProperty('applicationName');
    expect(summary.byApplication[0]).toHaveProperty('count');
  });

  it('returns a valid compliance rate between 0 and 100', () => {
    const summary = getArtifactSummary();

    expect(typeof summary.complianceRate).toBe('number');
    expect(summary.complianceRate).toBeGreaterThanOrEqual(0);
    expect(summary.complianceRate).toBeLessThanOrEqual(100);
  });

  it('returns non-negative critical and high findings counts', () => {
    const summary = getArtifactSummary();

    expect(typeof summary.criticalFindings).toBe('number');
    expect(summary.criticalFindings).toBeGreaterThanOrEqual(0);
    expect(typeof summary.highFindings).toBe('number');
    expect(summary.highFindings).toBeGreaterThanOrEqual(0);
  });

  it('returns recent artifacts array', () => {
    const summary = getArtifactSummary();

    expect(Array.isArray(summary.recentArtifacts)).toBe(true);
    expect(summary.recentArtifacts.length).toBeLessThanOrEqual(10);
  });

  it('updates summary after generating a new artifact', () => {
    const summaryBefore = getArtifactSummary();
    const totalBefore = summaryBefore.totalArtifacts;

    generateArtifact('Summary Update Test', {
      applicationId: MOCK_APPLICATIONS[0].id,
    });

    const summaryAfter = getArtifactSummary();
    expect(summaryAfter.totalArtifacts).toBe(totalBefore + 1);
  });

  it('supports filtering by applicationId', () => {
    const appId = MOCK_APPLICATIONS[0].id;

    const summary = getArtifactSummary({ applicationId: appId });

    expect(summary.totalArtifacts).toBeGreaterThan(0);
    expect(
      summary.byApplication.every((a) => a.applicationName === MOCK_APPLICATIONS[0].name),
    ).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// exportArtifacts
// ---------------------------------------------------------------------------

describe('exportArtifacts', () => {
  it('exports artifacts as JSON string', () => {
    const result = exportArtifacts();

    expect(result.success).toBe(true);
    expect(typeof result.data).toBe('string');
    expect(result.count).toBeGreaterThan(0);

    // Verify it's valid JSON
    const parsed = JSON.parse(result.data);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed.length).toBe(result.count);
  });

  it('excludes content by default', () => {
    const result = exportArtifacts({}, { includeContent: false });

    expect(result.success).toBe(true);

    const parsed = JSON.parse(result.data);
    if (parsed.length > 0) {
      expect(parsed[0].content).toBeUndefined();
    }
  });

  it('includes content when requested', () => {
    generateArtifact('Export Content Test', {
      applicationId: MOCK_APPLICATIONS[0].id,
    });

    const result = exportArtifacts({}, { includeContent: true });

    expect(result.success).toBe(true);

    const parsed = JSON.parse(result.data);
    const withContent = parsed.filter((a) => a.content !== undefined);
    expect(withContent.length).toBeGreaterThan(0);
  });

  it('supports filtering during export', () => {
    const appId = MOCK_APPLICATIONS[0].id;

    const result = exportArtifacts({ applicationId: appId });

    expect(result.success).toBe(true);

    const parsed = JSON.parse(result.data);
    expect(parsed.every((a) => a.applicationId === appId)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// resetArtifacts
// ---------------------------------------------------------------------------

describe('resetArtifacts', () => {
  it('resets all generated artifacts', () => {
    // Generate some artifacts
    generateArtifact('Reset Test 1', { applicationId: MOCK_APPLICATIONS[0].id });
    generateArtifact('Reset Test 2', { applicationId: MOCK_APPLICATIONS[0].id });

    const result = resetArtifacts();

    expect(result.success).toBe(true);

    // Generated artifacts should be gone, but mock artifacts should still be accessible
    const { data } = getArtifacts({ search: 'Reset Test' });
    expect(data.length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Audit Logging Integration
// ---------------------------------------------------------------------------

describe('Audit logging integration', () => {
  it('logs all artifact generation types to audit trail', () => {
    const appId = MOCK_APPLICATIONS[0].id;
    const userId = 'USR-AUDIT-TEST';

    // Generate each type
    generateChangeRecord({ applicationId: appId, userId });
    generateQEEvidence({ applicationId: appId, userId });
    generateSecurityScanReport({ applicationId: appId, userId });
    generateSignOffPack(appId, { userId });
    generateAuditDocumentation({ userId });

    const { entries } = getAuditLogs({
      userId,
      action: 'COMPLIANCE_ARTIFACT_UPLOAD',
    });

    // Should have at least 5 entries (one for each type)
    expect(entries.length).toBeGreaterThanOrEqual(5);
  });

  it('audit entries contain correct artifact type information', () => {
    const appId = MOCK_APPLICATIONS[0].id;
    const userId = 'USR-TYPE-CHECK';

    generateChangeRecord({ applicationId: appId, userId });

    const { entries } = getAuditLogs({
      userId,
      action: 'COMPLIANCE_ARTIFACT_UPLOAD',
    });

    const changeRecordEntry = entries.find(
      (e) => e.details && e.details.artifactType === ARTIFACT_TYPES.ITM_CHANGE_RECORD,
    );

    expect(changeRecordEntry).toBeDefined();
    expect(changeRecordEntry.details.artifactId).toBeDefined();
    expect(changeRecordEntry.details.applicationId).toBe(appId);
  });

  it('audit entries contain user ID when provided', () => {
    const userId = 'USR-USER-CHECK';

    generateArtifact('User Audit Test', {
      applicationId: MOCK_APPLICATIONS[0].id,
      userId,
    });

    const { entries } = getAuditLogs({
      userId,
      action: 'COMPLIANCE_ARTIFACT_UPLOAD',
    });

    expect(entries.length).toBeGreaterThan(0);
    expect(entries[0].userId).toBe(userId);
  });
});

// ---------------------------------------------------------------------------
// Edge Cases
// ---------------------------------------------------------------------------

describe('Edge cases', () => {
  it('handles generating multiple artifacts for the same application', () => {
    const appId = MOCK_APPLICATIONS[0].id;

    const result1 = generateArtifact('Multi 1', { applicationId: appId });
    const result2 = generateArtifact('Multi 2', { applicationId: appId });
    const result3 = generateArtifact('Multi 3', { applicationId: appId });

    expect(result1.success).toBe(true);
    expect(result2.success).toBe(true);
    expect(result3.success).toBe(true);

    // All should have unique IDs
    const ids = new Set([result1.artifact.id, result2.artifact.id, result3.artifact.id]);
    expect(ids.size).toBe(3);

    // All should be retrievable
    const { data } = getArtifacts({ applicationId: appId });
    const generatedTypes = data.filter(
      (a) => a.type === 'Multi 1' || a.type === 'Multi 2' || a.type === 'Multi 3',
    );
    expect(generatedTypes.length).toBe(3);
  });

  it('handles artifacts with empty findings object', () => {
    const result = generateArtifact('Empty Findings', {
      applicationId: MOCK_APPLICATIONS[0].id,
      data: {
        findings: {},
      },
    });

    expect(result.success).toBe(true);
    expect(result.artifact.findings).toBeDefined();
    expect(result.artifact.findings.critical).toBe(0);
    expect(result.artifact.findings.high).toBe(0);
  });

  it('handles security scan report with custom recommendations', () => {
    const result = generateSecurityScanReport({
      applicationId: MOCK_APPLICATIONS[0].id,
      recommendations: 'Custom remediation steps for the team.',
    });

    expect(result.success).toBe(true);
    expect(result.artifact.content).toContain('Custom remediation steps for the team.');
  });

  it('handles change record with all optional fields', () => {
    const result = generateChangeRecord({
      applicationId: MOCK_APPLICATIONS[0].id,
      changeType: 'emergency',
      changeReason: 'Critical hotfix',
      implementationPlan: 'Deploy immediately',
      rollbackPlan: 'Revert to previous version',
      testPlan: 'Run smoke tests',
      riskAssessment: 'High risk but necessary',
      environment: ENVIRONMENTS.PROD,
      version: '2.15.1',
      assignmentGroup: 'Emergency Response',
      requestedBy: 'CTO',
      userId: 'USR-0001',
    });

    expect(result.success).toBe(true);
    expect(result.artifact.content).toContain('Critical hotfix');
    expect(result.artifact.content).toContain('Deploy immediately');
    expect(result.artifact.content).toContain('Revert to previous version');
  });

  it('handles QE evidence with performance results', () => {
    const result = generateQEEvidence({
      applicationId: MOCK_APPLICATIONS[0].id,
      performanceResults: {
        avgResponseTimeMs: 150,
        p95ResponseTimeMs: 450,
        errorRatePercent: 0.5,
        throughputPerSec: 200,
        virtualUsers: 50,
        durationMinutes: 15,
      },
    });

    expect(result.success).toBe(true);
    expect(result.artifact.content).toContain('Performance Test Results');
    expect(result.artifact.content).toContain('150');
  });

  it('handles QE evidence with security results', () => {
    const result = generateQEEvidence({
      applicationId: MOCK_APPLICATIONS[0].id,
      securityResults: {
        sast: 'Passed',
        sca: 'Passed',
        dast: 'N/A',
        containerScan: 'Passed',
        overallStatus: 'Passed',
      },
    });

    expect(result.success).toBe(true);
    expect(result.artifact.content).toContain('Security Scan Summary');
  });

  it('handles QE evidence with pipeline stages', () => {
    const result = generateQEEvidence({
      applicationId: MOCK_APPLICATIONS[0].id,
      stages: [
        { name: 'Build', status: 'Success', durationSeconds: 120 },
        { name: 'Test', status: 'Success', durationSeconds: 300 },
      ],
    });

    expect(result.success).toBe(true);
    expect(result.artifact.content).toContain('Pipeline Stage Results');
  });
});

// ---------------------------------------------------------------------------
// localStorage persistence
// ---------------------------------------------------------------------------

describe('localStorage persistence', () => {
  it('generated artifacts persist across multiple getArtifacts calls', () => {
    generateArtifact('Persist Test', {
      applicationId: MOCK_APPLICATIONS[0].id,
    });

    const { data: data1 } = getArtifacts({ search: 'Persist Test' });
    const { data: data2 } = getArtifacts({ search: 'Persist Test' });

    expect(data1.length).toBe(data2.length);
    expect(data1[0].id).toBe(data2[0].id);
  });

  it('artifact status updates persist to localStorage', () => {
    const genResult = generateArtifact('Status Persist Test', {
      applicationId: MOCK_APPLICATIONS[0].id,
    });

    updateArtifactStatus(genResult.artifact.id, COMPLIANCE_STATUSES.NON_COMPLIANT);

    const found = getArtifactById(genResult.artifact.id);
    expect(found.status).toBe(COMPLIANCE_STATUSES.NON_COMPLIANT);
  });

  it('artifact deletion persists to localStorage', () => {
    const genResult = generateArtifact('Delete Persist Test', {
      applicationId: MOCK_APPLICATIONS[0].id,
    });

    const artifactId = genResult.artifact.id;
    deleteArtifact(artifactId);

    const found = getArtifactById(artifactId);
    expect(found).toBeNull();
  });

  it('multiple artifact types coexist in storage', () => {
    const appId = MOCK_APPLICATIONS[0].id;

    generateChangeRecord({ applicationId: appId });
    generateQEEvidence({ applicationId: appId });
    generateSecurityScanReport({ applicationId: appId });

    const { data } = getArtifacts({ applicationId: appId });

    const types = new Set(data.map((a) => a.type));
    expect(types.size).toBeGreaterThanOrEqual(3);
  });
});