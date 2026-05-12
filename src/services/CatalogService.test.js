/**
 * Unit tests for CatalogService
 * Tests getCatalog, getDomains, getPortfolios, getApplications,
 * updateCatalog, addApplication. Verifies localStorage interactions,
 * data filtering, and initialization with mock data.
 * @module services/CatalogService.test
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getCatalog,
  getDomains,
  getDomainById,
  getDomainByName,
  getPortfolios,
  getPortfolioById,
  getApplications,
  getApplicationById,
  getApplicationByShortCode,
  addApplication,
  updateApplication,
  deleteApplication,
  bulkAddApplications,
  updateCatalog,
  getToolchains,
  getToolchainAssignments,
  saveToolchainAssignment,
  getPipelineConfigs,
  getKpiMetrics,
  getCatalogSummary,
  searchCatalog,
  resetCatalog,
} from './CatalogService.js';
import { initializeStorage, clearStorage } from '../utils/localStorage.js';
import {
  MOCK_DOMAINS,
  MOCK_PORTFOLIOS,
  MOCK_APPLICATIONS,
  MOCK_TOOLCHAIN_ASSIGNMENTS,
} from '../constants/mockData.js';
import {
  DOMAINS,
  CRITICALITY_TIERS,
  ENVIRONMENTS,
} from '../constants/constants.js';

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  localStorage.clear();
  initializeStorage({ force: true });
});

// ---------------------------------------------------------------------------
// getCatalog
// ---------------------------------------------------------------------------

describe('getCatalog', () => {
  it('returns a complete catalog object with all expected keys', () => {
    const catalog = getCatalog();

    expect(catalog).toBeDefined();
    expect(catalog).toHaveProperty('domains');
    expect(catalog).toHaveProperty('portfolios');
    expect(catalog).toHaveProperty('applications');
    expect(catalog).toHaveProperty('toolchainCatalog');
    expect(catalog).toHaveProperty('toolchainByCategory');
    expect(catalog).toHaveProperty('toolchainAssignments');
    expect(catalog).toHaveProperty('pipelineConfigs');
    expect(catalog).toHaveProperty('kpiMetrics');
    expect(catalog).toHaveProperty('domainList');
    expect(catalog).toHaveProperty('portfolioList');
    expect(catalog).toHaveProperty('criticalityTierList');
    expect(catalog).toHaveProperty('environmentList');
    expect(catalog).toHaveProperty('toolchainCategoryList');
    expect(catalog).toHaveProperty('toolList');
  });

  it('returns non-empty arrays for domains, portfolios, and applications', () => {
    const catalog = getCatalog();

    expect(Array.isArray(catalog.domains)).toBe(true);
    expect(catalog.domains.length).toBeGreaterThan(0);
    expect(Array.isArray(catalog.portfolios)).toBe(true);
    expect(catalog.portfolios.length).toBeGreaterThan(0);
    expect(Array.isArray(catalog.applications)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// getDomains
// ---------------------------------------------------------------------------

describe('getDomains', () => {
  it('returns all mock domains when no filters are applied', () => {
    const domains = getDomains();

    expect(Array.isArray(domains)).toBe(true);
    expect(domains.length).toBe(MOCK_DOMAINS.length);
  });

  it('returns domains sorted by name ascending by default', () => {
    const domains = getDomains();

    for (let i = 1; i < domains.length; i++) {
      expect(domains[i].name.localeCompare(domains[i - 1].name)).toBeGreaterThanOrEqual(0);
    }
  });

  it('returns domains sorted by name descending when specified', () => {
    const domains = getDomains({ sortBy: 'name', sortOrder: 'desc' });

    for (let i = 1; i < domains.length; i++) {
      expect(domains[i].name.localeCompare(domains[i - 1].name)).toBeLessThanOrEqual(0);
    }
  });

  it('filters domains by search query matching name', () => {
    const domains = getDomains({ search: 'Digital' });

    expect(domains.length).toBeGreaterThan(0);
    expect(domains.every((d) => d.name.toLowerCase().includes('digital'))).toBe(true);
  });

  it('filters domains by search query matching description', () => {
    const domains = getDomains({ search: 'Finance' });

    expect(domains.length).toBeGreaterThan(0);
  });

  it('returns empty array when search matches nothing', () => {
    const domains = getDomains({ search: 'zzz_nonexistent_zzz' });

    expect(domains).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// getDomainById
// ---------------------------------------------------------------------------

describe('getDomainById', () => {
  it('returns the correct domain for a valid ID', () => {
    const allDomains = getDomains();
    const firstDomain = allDomains[0];

    const result = getDomainById(firstDomain.id);

    expect(result).not.toBeNull();
    expect(result.id).toBe(firstDomain.id);
    expect(result.name).toBe(firstDomain.name);
  });

  it('returns null for an invalid ID', () => {
    const result = getDomainById('INVALID-ID-999');

    expect(result).toBeNull();
  });

  it('returns null when ID is null or undefined', () => {
    expect(getDomainById(null)).toBeNull();
    expect(getDomainById(undefined)).toBeNull();
    expect(getDomainById('')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// getDomainByName
// ---------------------------------------------------------------------------

describe('getDomainByName', () => {
  it('returns the correct domain for a valid name', () => {
    const result = getDomainByName(DOMAINS.DIGITAL_EXPERIENCE);

    expect(result).not.toBeNull();
    expect(result.name).toBe(DOMAINS.DIGITAL_EXPERIENCE);
  });

  it('returns null for a non-existent name', () => {
    const result = getDomainByName('Non Existent Domain');

    expect(result).toBeNull();
  });

  it('returns null when name is null or undefined', () => {
    expect(getDomainByName(null)).toBeNull();
    expect(getDomainByName(undefined)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// getPortfolios
// ---------------------------------------------------------------------------

describe('getPortfolios', () => {
  it('returns all mock portfolios when no filters are applied', () => {
    const portfolios = getPortfolios();

    expect(Array.isArray(portfolios)).toBe(true);
    expect(portfolios.length).toBe(MOCK_PORTFOLIOS.length);
  });

  it('filters portfolios by domainId', () => {
    const allDomains = getDomains();
    const firstDomain = allDomains[0];

    const portfolios = getPortfolios({ domainId: firstDomain.id });

    expect(portfolios.length).toBeGreaterThan(0);
    expect(portfolios.every((p) => p.domainId === firstDomain.id)).toBe(true);
  });

  it('filters portfolios by domainName', () => {
    const portfolios = getPortfolios({ domainName: DOMAINS.CORPORATE_FUNCTIONS });

    expect(portfolios.length).toBeGreaterThan(0);
    expect(portfolios.every((p) => p.domainName === DOMAINS.CORPORATE_FUNCTIONS)).toBe(true);
  });

  it('filters portfolios by search query', () => {
    const portfolios = getPortfolios({ search: 'Finance' });

    expect(portfolios.length).toBeGreaterThan(0);
  });

  it('returns empty array when no portfolios match filters', () => {
    const portfolios = getPortfolios({ domainId: 'NONEXISTENT-DOMAIN-ID' });

    expect(portfolios).toEqual([]);
  });

  it('returns portfolios sorted by name ascending by default', () => {
    const portfolios = getPortfolios();

    for (let i = 1; i < portfolios.length; i++) {
      expect(portfolios[i].name.localeCompare(portfolios[i - 1].name)).toBeGreaterThanOrEqual(0);
    }
  });
});

// ---------------------------------------------------------------------------
// getPortfolioById
// ---------------------------------------------------------------------------

describe('getPortfolioById', () => {
  it('returns the correct portfolio for a valid ID', () => {
    const allPortfolios = getPortfolios();
    const first = allPortfolios[0];

    const result = getPortfolioById(first.id);

    expect(result).not.toBeNull();
    expect(result.id).toBe(first.id);
  });

  it('returns null for an invalid ID', () => {
    expect(getPortfolioById('INVALID-PRT-999')).toBeNull();
  });

  it('returns null when ID is null or undefined', () => {
    expect(getPortfolioById(null)).toBeNull();
    expect(getPortfolioById(undefined)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// getApplications
// ---------------------------------------------------------------------------

describe('getApplications', () => {
  it('returns all mock applications when no filters are applied', () => {
    const { data, total } = getApplications();

    expect(Array.isArray(data)).toBe(true);
    expect(total).toBe(MOCK_APPLICATIONS.length);
    expect(data.length).toBe(MOCK_APPLICATIONS.length);
  });

  it('filters applications by domainName', () => {
    const { data } = getApplications({ domainName: DOMAINS.DIGITAL_EXPERIENCE });

    expect(data.length).toBeGreaterThan(0);
    expect(data.every((a) => a.domainName === DOMAINS.DIGITAL_EXPERIENCE)).toBe(true);
  });

  it('filters applications by criticalityTier', () => {
    const { data } = getApplications({ criticalityTier: CRITICALITY_TIERS.BUSINESS_CRITICAL });

    expect(data.length).toBeGreaterThan(0);
    expect(data.every((a) => a.criticalityTier === CRITICALITY_TIERS.BUSINESS_CRITICAL)).toBe(true);
  });

  it('filters applications by environment', () => {
    const { data } = getApplications({ environment: ENVIRONMENTS.PROD });

    expect(data.length).toBeGreaterThan(0);
    expect(
      data.every((a) => Array.isArray(a.environments) && a.environments.includes(ENVIRONMENTS.PROD)),
    ).toBe(true);
  });

  it('filters applications by status', () => {
    const { data } = getApplications({ status: 'active' });

    expect(data.length).toBeGreaterThan(0);
    expect(data.every((a) => a.status === 'active')).toBe(true);
  });

  it('filters applications by search query matching name', () => {
    const { data } = getApplications({ search: 'Member Portal' });

    expect(data.length).toBeGreaterThan(0);
    expect(data.some((a) => a.name === 'Member Portal')).toBe(true);
  });

  it('filters applications by search query matching shortCode', () => {
    const { data } = getApplications({ search: 'MBRP' });

    expect(data.length).toBeGreaterThan(0);
    expect(data.some((a) => a.shortCode === 'MBRP')).toBe(true);
  });

  it('filters applications by search query matching tags', () => {
    const { data } = getApplications({ search: 'hipaa' });

    expect(data.length).toBeGreaterThan(0);
  });

  it('returns empty data array when search matches nothing', () => {
    const { data, total } = getApplications({ search: 'zzz_nonexistent_zzz' });

    expect(data).toEqual([]);
    expect(total).toBe(0);
  });

  it('returns applications sorted by name ascending by default', () => {
    const { data } = getApplications();

    for (let i = 1; i < data.length; i++) {
      expect(data[i].name.localeCompare(data[i - 1].name)).toBeGreaterThanOrEqual(0);
    }
  });

  it('supports pagination with limit and offset', () => {
    const { data: allData, total: allTotal } = getApplications();
    const { data: page1 } = getApplications({ limit: 3, offset: 0 });
    const { data: page2 } = getApplications({ limit: 3, offset: 3 });

    expect(page1.length).toBe(3);
    expect(page2.length).toBeLessThanOrEqual(3);
    expect(page1[0].id).not.toBe(page2[0].id);
  });

  it('combines multiple filters correctly', () => {
    const { data } = getApplications({
      domainName: DOMAINS.DIGITAL_EXPERIENCE,
      criticalityTier: CRITICALITY_TIERS.BUSINESS_CRITICAL,
    });

    expect(data.length).toBeGreaterThan(0);
    expect(
      data.every(
        (a) =>
          a.domainName === DOMAINS.DIGITAL_EXPERIENCE &&
          a.criticalityTier === CRITICALITY_TIERS.BUSINESS_CRITICAL,
      ),
    ).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// getApplicationById
// ---------------------------------------------------------------------------

describe('getApplicationById', () => {
  it('returns the correct application for a valid ID', () => {
    const { data } = getApplications();
    const first = data[0];

    const result = getApplicationById(first.id);

    expect(result).not.toBeNull();
    expect(result.id).toBe(first.id);
    expect(result.name).toBe(first.name);
  });

  it('returns null for an invalid ID', () => {
    expect(getApplicationById('INVALID-APP-999')).toBeNull();
  });

  it('returns null when ID is null or undefined', () => {
    expect(getApplicationById(null)).toBeNull();
    expect(getApplicationById(undefined)).toBeNull();
    expect(getApplicationById('')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// getApplicationByShortCode
// ---------------------------------------------------------------------------

describe('getApplicationByShortCode', () => {
  it('returns the correct application for a valid short code', () => {
    const result = getApplicationByShortCode('MBRP');

    expect(result).not.toBeNull();
    expect(result.shortCode).toBe('MBRP');
    expect(result.name).toBe('Member Portal');
  });

  it('is case-insensitive', () => {
    const result = getApplicationByShortCode('mbrp');

    expect(result).not.toBeNull();
    expect(result.shortCode).toBe('MBRP');
  });

  it('returns null for a non-existent short code', () => {
    expect(getApplicationByShortCode('ZZZZ')).toBeNull();
  });

  it('returns null when short code is null or undefined', () => {
    expect(getApplicationByShortCode(null)).toBeNull();
    expect(getApplicationByShortCode(undefined)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// addApplication
// ---------------------------------------------------------------------------

describe('addApplication', () => {
  const validAppData = {
    name: 'Test Application',
    shortCode: 'TAPP',
    description: 'A test application for unit testing.',
    domainName: DOMAINS.DIGITAL_EXPERIENCE,
    portfolioName: 'Customer Portal',
    criticalityTier: CRITICALITY_TIERS.BUSINESS_OPERATIONAL,
    ownerName: 'Test Owner',
    ownerEmail: 'test@example.com',
    environments: [ENVIRONMENTS.DEV, ENVIRONMENTS.PROD],
    techStack: ['React', 'Node.js'],
    tags: ['test', 'unit-test'],
    repoUrl: 'https://github.com/test/repo',
  };

  it('successfully adds a new application with valid data', () => {
    const result = addApplication(validAppData);

    expect(result.success).toBe(true);
    expect(result.application).not.toBeNull();
    expect(result.application.name).toBe('Test Application');
    expect(result.application.shortCode).toBe('TAPP');
    expect(result.application.id).toBeDefined();
    expect(result.application.id.startsWith('APP-')).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('persists the new application to localStorage', () => {
    addApplication(validAppData);

    const found = getApplicationByShortCode('TAPP');

    expect(found).not.toBeNull();
    expect(found.name).toBe('Test Application');
  });

  it('rejects duplicate application names', () => {
    addApplication(validAppData);
    const result = addApplication({ ...validAppData, shortCode: 'DIFF' });

    expect(result.success).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toContain('already exists');
  });

  it('rejects duplicate short codes', () => {
    addApplication(validAppData);
    const result = addApplication({ ...validAppData, name: 'Different Name' });

    expect(result.success).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toContain('already exists');
  });

  it('rejects application with missing required fields', () => {
    const result = addApplication({ name: '', shortCode: '', description: '' });

    expect(result.success).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('rejects null or undefined input', () => {
    const result1 = addApplication(null);
    expect(result1.success).toBe(false);

    const result2 = addApplication(undefined);
    expect(result2.success).toBe(false);
  });

  it('sets default values for optional fields', () => {
    const result = addApplication({
      ...validAppData,
      name: 'Minimal App',
      shortCode: 'MINA',
      environments: undefined,
      techStack: undefined,
      tags: undefined,
    });

    expect(result.success).toBe(true);
    expect(result.application.status).toBe('active');
    expect(result.application.onboardedAt).toBeDefined();
  });

  it('converts short code to uppercase', () => {
    const result = addApplication({
      ...validAppData,
      name: 'Uppercase Test',
      shortCode: 'lowc',
    });

    expect(result.success).toBe(true);
    expect(result.application.shortCode).toBe('LOWC');
  });

  it('converts tags to lowercase', () => {
    const result = addApplication({
      ...validAppData,
      name: 'Tag Test',
      shortCode: 'TAGT',
      tags: ['MyTag', 'UPPER'],
    });

    expect(result.success).toBe(true);
    expect(result.application.tags).toEqual(['mytag', 'upper']);
  });
});

// ---------------------------------------------------------------------------
// updateApplication
// ---------------------------------------------------------------------------

describe('updateApplication', () => {
  it('successfully updates an existing application', () => {
    const { data } = getApplications();
    const app = data[0];

    const result = updateApplication(app.id, { description: 'Updated description' });

    expect(result.success).toBe(true);
    expect(result.application.description).toBe('Updated description');
    expect(result.application.updatedAt).toBeDefined();
  });

  it('persists the update to localStorage', () => {
    const { data } = getApplications();
    const app = data[0];

    updateApplication(app.id, { description: 'Persisted update' });

    const updated = getApplicationById(app.id);
    expect(updated.description).toBe('Persisted update');
  });

  it('rejects update with duplicate name', () => {
    const { data } = getApplications();
    const app1 = data[0];
    const app2 = data[1];

    const result = updateApplication(app1.id, { name: app2.name });

    expect(result.success).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('returns error for non-existent application ID', () => {
    const result = updateApplication('NONEXISTENT-ID', { description: 'test' });

    expect(result.success).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('returns error when applicationId is null', () => {
    const result = updateApplication(null, { description: 'test' });

    expect(result.success).toBe(false);
  });

  it('returns error when updates is null', () => {
    const { data } = getApplications();
    const result = updateApplication(data[0].id, null);

    expect(result.success).toBe(false);
  });

  it('updates multiple fields at once', () => {
    const { data } = getApplications();
    const app = data[0];

    const result = updateApplication(app.id, {
      description: 'Multi-field update',
      techStack: ['Python', 'Django'],
      tags: ['updated'],
    });

    expect(result.success).toBe(true);
    expect(result.application.description).toBe('Multi-field update');
    expect(result.application.techStack).toEqual(['Python', 'Django']);
    expect(result.application.tags).toEqual(['updated']);
  });
});

// ---------------------------------------------------------------------------
// deleteApplication
// ---------------------------------------------------------------------------

describe('deleteApplication', () => {
  it('successfully deletes an existing application', () => {
    const { data: before } = getApplications();
    const app = before[0];

    const result = deleteApplication(app.id);

    expect(result.success).toBe(true);
    expect(result.error).toBeNull();
  });

  it('removes the application from localStorage', () => {
    const { data: before } = getApplications();
    const app = before[0];
    const initialCount = before.length;

    deleteApplication(app.id);

    const { data: after } = getApplications();
    expect(after.length).toBe(initialCount - 1);
    expect(getApplicationById(app.id)).toBeNull();
  });

  it('returns error for non-existent application ID', () => {
    const result = deleteApplication('NONEXISTENT-ID');

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('returns error when applicationId is null', () => {
    const result = deleteApplication(null);

    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// bulkAddApplications
// ---------------------------------------------------------------------------

describe('bulkAddApplications', () => {
  const bulkData = [
    {
      name: 'Bulk App 1',
      shortCode: 'BLK1',
      description: 'First bulk app',
      domainName: DOMAINS.DIGITAL_EXPERIENCE,
      portfolioName: 'Customer Portal',
      criticalityTier: CRITICALITY_TIERS.BUSINESS_OPERATIONAL,
      ownerName: 'Bulk Owner',
    },
    {
      name: 'Bulk App 2',
      shortCode: 'BLK2',
      description: 'Second bulk app',
      domainName: DOMAINS.CORPORATE_FUNCTIONS,
      portfolioName: 'Finance',
      criticalityTier: CRITICALITY_TIERS.ADMIN_SERVICES,
      ownerName: 'Bulk Owner',
    },
  ];

  it('successfully adds multiple applications', () => {
    const result = bulkAddApplications(bulkData);

    expect(result.success).toBe(true);
    expect(result.added).toBe(2);
    expect(result.skipped).toEqual([]);
  });

  it('skips applications with duplicate names', () => {
    bulkAddApplications([bulkData[0]]);

    const result = bulkAddApplications(bulkData);

    expect(result.added).toBe(1);
    expect(result.skipped.length).toBe(1);
    expect(result.skipped[0].reason).toContain('already exists');
  });

  it('returns failure when input is not an array', () => {
    const result = bulkAddApplications('not an array');

    expect(result.success).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('returns failure when input is an empty array', () => {
    const result = bulkAddApplications([]);

    expect(result.success).toBe(false);
  });

  it('skips rows with missing required fields', () => {
    const result = bulkAddApplications([
      { name: '', shortCode: '', description: '' },
      bulkData[0],
    ]);

    expect(result.added).toBe(1);
    expect(result.skipped.length).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// updateCatalog
// ---------------------------------------------------------------------------

describe('updateCatalog', () => {
  it('successfully updates domains in the catalog', () => {
    const newDomains = [
      { id: 'DOM-NEW-1', name: 'New Domain', description: 'A new domain' },
    ];

    const result = updateCatalog({ domains: newDomains });

    expect(result.success).toBe(true);
    expect(result.error).toBeNull();

    const domains = getDomains();
    expect(domains.length).toBe(1);
    expect(domains[0].name).toBe('New Domain');
  });

  it('successfully updates applications in the catalog', () => {
    const newApps = [
      {
        id: 'APP-NEW-1',
        name: 'Catalog App',
        shortCode: 'CATA',
        description: 'Catalog test',
        domainName: 'Test',
        portfolioName: 'Test',
        criticalityTier: CRITICALITY_TIERS.ADMIN_SERVICES,
        ownerName: 'Test',
        status: 'active',
      },
    ];

    const result = updateCatalog({ applications: newApps });

    expect(result.success).toBe(true);

    const { data } = getApplications();
    expect(data.length).toBe(1);
    expect(data[0].name).toBe('Catalog App');
  });

  it('returns error when data is null', () => {
    const result = updateCatalog(null);

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('returns error when data is not an object', () => {
    const result = updateCatalog('invalid');

    expect(result.success).toBe(false);
  });

  it('ignores non-array values in the update object', () => {
    const domainsBefore = getDomains();

    const result = updateCatalog({ domains: 'not an array' });

    expect(result.success).toBe(true);

    const domainsAfter = getDomains();
    expect(domainsAfter.length).toBe(domainsBefore.length);
  });

  it('can update multiple catalog sections at once', () => {
    const result = updateCatalog({
      domains: [{ id: 'D1', name: 'Domain 1' }],
      portfolios: [{ id: 'P1', name: 'Portfolio 1', domainId: 'D1' }],
    });

    expect(result.success).toBe(true);

    const domains = getDomains();
    expect(domains.length).toBe(1);

    const portfolios = getPortfolios();
    expect(portfolios.length).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// getToolchains
// ---------------------------------------------------------------------------

describe('getToolchains', () => {
  it('returns all toolchain catalog entries when no filters are applied', () => {
    const tools = getToolchains();

    expect(Array.isArray(tools)).toBe(true);
    expect(tools.length).toBeGreaterThan(0);
  });

  it('filters toolchains by category', () => {
    const tools = getToolchains({ category: 'Source Control' });

    expect(tools.length).toBeGreaterThan(0);
    expect(tools.every((t) => t.category === 'Source Control')).toBe(true);
  });

  it('filters toolchains by search query', () => {
    const tools = getToolchains({ search: 'Jenkins' });

    expect(tools.length).toBeGreaterThan(0);
    expect(tools.some((t) => t.name === 'Jenkins')).toBe(true);
  });

  it('returns empty array when search matches nothing', () => {
    const tools = getToolchains({ search: 'zzz_nonexistent_tool_zzz' });

    expect(tools).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// getToolchainAssignments
// ---------------------------------------------------------------------------

describe('getToolchainAssignments', () => {
  it('returns all toolchain assignments when no filter is applied', () => {
    const assignments = getToolchainAssignments();

    expect(Array.isArray(assignments)).toBe(true);
    expect(assignments.length).toBe(MOCK_TOOLCHAIN_ASSIGNMENTS.length);
  });

  it('filters assignments by applicationId', () => {
    const { data } = getApplications();
    const app = data.find((a) => a.name === 'Member Portal');

    if (app) {
      const assignments = getToolchainAssignments({ applicationId: app.id });

      expect(assignments.length).toBeGreaterThan(0);
      expect(assignments.every((a) => a.applicationId === app.id)).toBe(true);
    }
  });

  it('returns empty array for non-existent applicationId', () => {
    const assignments = getToolchainAssignments({ applicationId: 'NONEXISTENT' });

    expect(assignments).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// saveToolchainAssignment
// ---------------------------------------------------------------------------

describe('saveToolchainAssignment', () => {
  it('successfully saves a new toolchain assignment', () => {
    const result = saveToolchainAssignment(
      'APP-TEST-001',
      'Test App',
      [{ category: 'Source Control', tool: 'GitHub', configured: true }],
    );

    expect(result.success).toBe(true);
    expect(result.error).toBeNull();
  });

  it('persists the assignment to localStorage', () => {
    saveToolchainAssignment(
      'APP-TEST-002',
      'Test App 2',
      [{ category: 'CI/CD', tool: 'Jenkins', configured: true }],
    );

    const assignments = getToolchainAssignments({ applicationId: 'APP-TEST-002' });
    expect(assignments.length).toBe(1);
    expect(assignments[0].tools.length).toBe(1);
    expect(assignments[0].tools[0].tool).toBe('Jenkins');
  });

  it('updates existing assignment for the same applicationId', () => {
    saveToolchainAssignment(
      'APP-TEST-003',
      'Test App 3',
      [{ category: 'Source Control', tool: 'GitHub', configured: true }],
    );

    saveToolchainAssignment(
      'APP-TEST-003',
      'Test App 3',
      [
        { category: 'Source Control', tool: 'GitLab', configured: true },
        { category: 'CI/CD', tool: 'Jenkins', configured: true },
      ],
    );

    const assignments = getToolchainAssignments({ applicationId: 'APP-TEST-003' });
    expect(assignments.length).toBe(1);
    expect(assignments[0].tools.length).toBe(2);
  });

  it('returns error when applicationId is missing', () => {
    const result = saveToolchainAssignment(null, null, []);

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('returns error when tools is not an array', () => {
    const result = saveToolchainAssignment('APP-001', 'App', 'not an array');

    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// getPipelineConfigs
// ---------------------------------------------------------------------------

describe('getPipelineConfigs', () => {
  it('returns all pipeline configs when no filter is applied', () => {
    const configs = getPipelineConfigs();

    expect(Array.isArray(configs)).toBe(true);
    expect(configs.length).toBeGreaterThan(0);
  });

  it('filters pipeline configs by applicationId', () => {
    const configs = getPipelineConfigs();
    if (configs.length > 0) {
      const appId = configs[0].applicationId;
      const filtered = getPipelineConfigs({ applicationId: appId });

      expect(filtered.length).toBeGreaterThan(0);
      expect(filtered.every((c) => c.applicationId === appId)).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// getKpiMetrics
// ---------------------------------------------------------------------------

describe('getKpiMetrics', () => {
  it('returns all KPI metrics when no filter is applied', () => {
    const metrics = getKpiMetrics();

    expect(Array.isArray(metrics)).toBe(true);
    expect(metrics.length).toBeGreaterThan(0);
  });

  it('filters KPI metrics by applicationId', () => {
    const metrics = getKpiMetrics();
    if (metrics.length > 0) {
      const appId = metrics[0].applicationId;
      const filtered = getKpiMetrics({ applicationId: appId });

      expect(filtered.length).toBeGreaterThan(0);
      expect(filtered.every((m) => m.applicationId === appId)).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// getCatalogSummary
// ---------------------------------------------------------------------------

describe('getCatalogSummary', () => {
  it('returns a summary object with expected properties', () => {
    const summary = getCatalogSummary();

    expect(summary).toHaveProperty('totalDomains');
    expect(summary).toHaveProperty('totalPortfolios');
    expect(summary).toHaveProperty('totalApplications');
    expect(summary).toHaveProperty('applicationsByDomain');
    expect(summary).toHaveProperty('applicationsByCriticality');
    expect(summary).toHaveProperty('applicationsByStatus');
  });

  it('returns correct counts matching the data', () => {
    const summary = getCatalogSummary();
    const domains = getDomains();
    const portfolios = getPortfolios();
    const { total } = getApplications();

    expect(summary.totalDomains).toBe(domains.length);
    expect(summary.totalPortfolios).toBe(portfolios.length);
    expect(summary.totalApplications).toBe(total);
  });

  it('returns non-empty applicationsByDomain array', () => {
    const summary = getCatalogSummary();

    expect(Array.isArray(summary.applicationsByDomain)).toBe(true);
    expect(summary.applicationsByDomain.length).toBeGreaterThan(0);
    expect(summary.applicationsByDomain[0]).toHaveProperty('domain');
    expect(summary.applicationsByDomain[0]).toHaveProperty('count');
  });

  it('returns non-empty applicationsByCriticality array', () => {
    const summary = getCatalogSummary();

    expect(Array.isArray(summary.applicationsByCriticality)).toBe(true);
    expect(summary.applicationsByCriticality.length).toBeGreaterThan(0);
    expect(summary.applicationsByCriticality[0]).toHaveProperty('tier');
    expect(summary.applicationsByCriticality[0]).toHaveProperty('count');
  });
});

// ---------------------------------------------------------------------------
// searchCatalog
// ---------------------------------------------------------------------------

describe('searchCatalog', () => {
  it('returns results across domains, portfolios, and applications', () => {
    const result = searchCatalog('Digital');

    expect(result).toHaveProperty('domains');
    expect(result).toHaveProperty('portfolios');
    expect(result).toHaveProperty('applications');
    expect(result).toHaveProperty('totalResults');
    expect(result.totalResults).toBeGreaterThan(0);
  });

  it('returns empty results for empty query', () => {
    const result = searchCatalog('');

    expect(result.totalResults).toBe(0);
    expect(result.domains).toEqual([]);
    expect(result.portfolios).toEqual([]);
    expect(result.applications).toEqual([]);
  });

  it('returns empty results for null query', () => {
    const result = searchCatalog(null);

    expect(result.totalResults).toBe(0);
  });

  it('respects the limit option', () => {
    const result = searchCatalog('a', { limit: 2 });

    expect(result.domains.length).toBeLessThanOrEqual(2);
    expect(result.portfolios.length).toBeLessThanOrEqual(2);
    expect(result.applications.length).toBeLessThanOrEqual(2);
  });

  it('finds applications by name', () => {
    const result = searchCatalog('Member Portal');

    expect(result.applications.length).toBeGreaterThan(0);
    expect(result.applications.some((a) => a.name === 'Member Portal')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// resetCatalog
// ---------------------------------------------------------------------------

describe('resetCatalog', () => {
  it('resets catalog to default mock data', () => {
    // Modify the catalog first
    updateCatalog({ domains: [{ id: 'D-TEMP', name: 'Temporary' }] });
    expect(getDomains().length).toBe(1);

    // Reset
    const result = resetCatalog();

    expect(result.success).toBe(true);

    const domains = getDomains();
    expect(domains.length).toBe(MOCK_DOMAINS.length);
  });

  it('restores applications to mock data after reset', () => {
    // Add a new application
    addApplication({
      name: 'Temp App',
      shortCode: 'TEMP',
      description: 'Temporary',
      domainName: DOMAINS.DIGITAL_EXPERIENCE,
      portfolioName: 'Customer Portal',
      criticalityTier: CRITICALITY_TIERS.ADMIN_SERVICES,
      ownerName: 'Temp',
    });

    const { total: beforeReset } = getApplications();
    expect(beforeReset).toBe(MOCK_APPLICATIONS.length + 1);

    resetCatalog();

    const { total: afterReset } = getApplications();
    expect(afterReset).toBe(MOCK_APPLICATIONS.length);
  });
});

// ---------------------------------------------------------------------------
// localStorage initialization
// ---------------------------------------------------------------------------

describe('localStorage initialization', () => {
  it('initializes with mock data on first access', () => {
    localStorage.clear();

    const domains = getDomains();

    expect(domains.length).toBe(MOCK_DOMAINS.length);
  });

  it('preserves data across multiple calls without re-initialization', () => {
    const domains1 = getDomains();
    const domains2 = getDomains();

    expect(domains1.length).toBe(domains2.length);
    expect(domains1[0].id).toBe(domains2[0].id);
  });

  it('data persists after adding and retrieving applications', () => {
    const initialCount = getApplications().total;

    addApplication({
      name: 'Persistence Test',
      shortCode: 'PRST',
      description: 'Testing persistence',
      domainName: DOMAINS.DIGITAL_EXPERIENCE,
      portfolioName: 'Customer Portal',
      criticalityTier: CRITICALITY_TIERS.BUSINESS_OPERATIONAL,
      ownerName: 'Tester',
    });

    const afterCount = getApplications().total;
    expect(afterCount).toBe(initialCount + 1);

    // Verify the app is retrievable
    const app = getApplicationByShortCode('PRST');
    expect(app).not.toBeNull();
    expect(app.name).toBe('Persistence Test');
  });
});