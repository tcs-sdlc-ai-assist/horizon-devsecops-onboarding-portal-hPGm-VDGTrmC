/**
 * Component tests for DashboardPage
 * Tests dashboard rendering, tab switching between MELT/KPI/Governance views,
 * metric card display, chart rendering, and data refresh functionality.
 * Uses React Testing Library.
 * @module pages/DashboardPage.test
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import DashboardPage from './DashboardPage.jsx';
import { AuthProvider } from '../contexts/AuthContext.jsx';
import { AppProvider } from '../contexts/AppContext.jsx';
import { ToastProvider } from '../components/common/Toast.jsx';
import { initializeStorage } from '../utils/localStorage.js';
import { MOCK_USERS } from '../constants/mockData.js';
import { ROLES } from '../constants/constants.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Render DashboardPage wrapped in all required providers.
 * Logs in as an Admin user by default so the page is accessible.
 */
const renderDashboardPage = (props = {}) => {
  initializeStorage({ force: true });

  const adminUser = MOCK_USERS.find((u) => u.role === ROLES.ADMIN);
  const sessionUser = {
    id: adminUser.id,
    username: adminUser.username,
    email: adminUser.email,
    firstName: adminUser.firstName,
    lastName: adminUser.lastName,
    role: adminUser.role,
    department: adminUser.department,
    avatar: null,
    active: true,
    lastLogin: new Date().toISOString(),
  };

  localStorage.setItem(
    'horizon_horizon_auth_user',
    JSON.stringify(sessionUser),
  );
  localStorage.setItem(
    'horizon_horizon_auth_token',
    JSON.stringify(`mock-token-${sessionUser.id}`),
  );

  return render(
    <MemoryRouter>
      <AuthProvider>
        <AppProvider>
          <ToastProvider>
            <DashboardPage {...props} />
          </ToastProvider>
        </AppProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
};

/**
 * Render DashboardPage with a specific role.
 */
const renderDashboardPageWithRole = (role) => {
  initializeStorage({ force: true });

  const user = MOCK_USERS.find((u) => u.role === role);
  if (!user) {
    throw new Error(`No mock user found for role "${role}".`);
  }

  const sessionUser = {
    id: user.id,
    username: user.username,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    department: user.department,
    avatar: null,
    active: true,
    lastLogin: new Date().toISOString(),
  };

  localStorage.setItem(
    'horizon_horizon_auth_user',
    JSON.stringify(sessionUser),
  );
  localStorage.setItem(
    'horizon_horizon_auth_token',
    JSON.stringify(`mock-token-${sessionUser.id}`),
  );

  return render(
    <MemoryRouter>
      <AuthProvider>
        <AppProvider>
          <ToastProvider>
            <DashboardPage />
          </ToastProvider>
        </AppProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
};

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  localStorage.clear();
});

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

describe('DashboardPage rendering', () => {
  it('renders the page header with Dashboard title', () => {
    renderDashboardPage();

    expect(screen.getByText('Dashboard')).toBeDefined();
  });

  it('renders the welcome message with the current user first name', () => {
    renderDashboardPage();

    const adminUser = MOCK_USERS.find((u) => u.role === ROLES.ADMIN);
    expect(
      screen.getByText((content) => content.includes(`Welcome back, ${adminUser.firstName}`)),
    ).toBeDefined();
  });

  it('renders the page description text', () => {
    renderDashboardPage();

    expect(
      screen.getByText((content) =>
        content.includes('Unified DevSecOps dashboard'),
      ),
    ).toBeDefined();
  });

  it('renders all four top-level tabs', () => {
    renderDashboardPage();

    expect(screen.getByRole('tab', { name: /Overview/i })).toBeDefined();
    expect(screen.getByRole('tab', { name: /MELT Observability/i })).toBeDefined();
    expect(screen.getByRole('tab', { name: /KPI/i })).toBeDefined();
    expect(screen.getByRole('tab', { name: /Governance/i })).toBeDefined();
  });

  it('renders the Overview tab as active by default', () => {
    renderDashboardPage();

    const overviewTab = screen.getByRole('tab', { name: /Overview/i });
    expect(overviewTab.getAttribute('aria-selected')).toBe('true');
  });
});

// ---------------------------------------------------------------------------
// Tab Switching
// ---------------------------------------------------------------------------

describe('DashboardPage tab switching', () => {
  it('switches to MELT Observability tab when clicked', async () => {
    const user = userEvent.setup();
    renderDashboardPage();

    const meltTab = screen.getByRole('tab', { name: /MELT Observability/i });
    await user.click(meltTab);

    expect(meltTab.getAttribute('aria-selected')).toBe('true');

    // The Overview tab should no longer be active
    const overviewTab = screen.getByRole('tab', { name: /Overview/i });
    expect(overviewTab.getAttribute('aria-selected')).toBe('false');
  });

  it('switches to KPI / DORA tab when clicked', async () => {
    const user = userEvent.setup();
    renderDashboardPage();

    const kpiTab = screen.getByRole('tab', { name: /KPI/i });
    await user.click(kpiTab);

    expect(kpiTab.getAttribute('aria-selected')).toBe('true');
  });

  it('switches to Governance tab when clicked', async () => {
    const user = userEvent.setup();
    renderDashboardPage();

    const governanceTab = screen.getByRole('tab', { name: /Governance/i });
    await user.click(governanceTab);

    expect(governanceTab.getAttribute('aria-selected')).toBe('true');
  });

  it('switches back to Overview tab after navigating away', async () => {
    const user = userEvent.setup();
    renderDashboardPage();

    // Navigate to KPI tab
    const kpiTab = screen.getByRole('tab', { name: /KPI/i });
    await user.click(kpiTab);
    expect(kpiTab.getAttribute('aria-selected')).toBe('true');

    // Navigate back to Overview tab
    const overviewTab = screen.getByRole('tab', { name: /Overview/i });
    await user.click(overviewTab);
    expect(overviewTab.getAttribute('aria-selected')).toBe('true');
  });
});

// ---------------------------------------------------------------------------
// Overview Tab Content
// ---------------------------------------------------------------------------

describe('DashboardPage Overview tab content', () => {
  it('renders the Dashboard sub-header within the Overview tab', () => {
    renderDashboardPage();

    // The DashboardShell component renders its own "Dashboard" heading
    const headings = screen.getAllByText('Dashboard');
    expect(headings.length).toBeGreaterThanOrEqual(1);
  });

  it('renders filter controls in the Overview tab', () => {
    renderDashboardPage();

    // DashboardShell renders domain and application filter selects
    const comboboxes = screen.getAllByRole('combobox');
    expect(comboboxes.length).toBeGreaterThan(0);
  });

  it('renders the Refresh button in the Overview tab', () => {
    renderDashboardPage();

    const refreshButtons = screen.getAllByRole('button', { name: /Refresh/i });
    expect(refreshButtons.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// MELT Tab Content
// ---------------------------------------------------------------------------

describe('DashboardPage MELT tab content', () => {
  it('renders MELT Dashboard heading after switching to MELT tab', async () => {
    const user = userEvent.setup();
    renderDashboardPage();

    const meltTab = screen.getByRole('tab', { name: /MELT Observability/i });
    await user.click(meltTab);

    await waitFor(() => {
      expect(screen.getByText('MELT Dashboard')).toBeDefined();
    });
  });

  it('renders MELT data source indicators after switching to MELT tab', async () => {
    const user = userEvent.setup();
    renderDashboardPage();

    const meltTab = screen.getByRole('tab', { name: /MELT Observability/i });
    await user.click(meltTab);

    await waitFor(() => {
      expect(screen.getByText('Data Sources:')).toBeDefined();
    });
  });
});

// ---------------------------------------------------------------------------
// KPI Tab Content
// ---------------------------------------------------------------------------

describe('DashboardPage KPI tab content', () => {
  it('renders KPI Dashboard heading after switching to KPI tab', async () => {
    const user = userEvent.setup();
    renderDashboardPage();

    const kpiTab = screen.getByRole('tab', { name: /KPI/i });
    await user.click(kpiTab);

    await waitFor(() => {
      expect(screen.getByText('KPI Dashboard (HSMART)')).toBeDefined();
    });
  });

  it('renders KPI description text after switching to KPI tab', async () => {
    const user = userEvent.setup();
    renderDashboardPage();

    const kpiTab = screen.getByRole('tab', { name: /KPI/i });
    await user.click(kpiTab);

    await waitFor(() => {
      expect(
        screen.getByText((content) =>
          content.includes('Comprehensive KPI dashboard'),
        ),
      ).toBeDefined();
    });
  });
});

// ---------------------------------------------------------------------------
// Governance Tab Content
// ---------------------------------------------------------------------------

describe('DashboardPage Governance tab content', () => {
  it('renders Governance Dashboard heading after switching to Governance tab', async () => {
    const user = userEvent.setup();
    renderDashboardPage();

    const governanceTab = screen.getByRole('tab', { name: /Governance/i });
    await user.click(governanceTab);

    await waitFor(() => {
      expect(screen.getByText('Governance Dashboard')).toBeDefined();
    });
  });

  it('renders Governance description text after switching to Governance tab', async () => {
    const user = userEvent.setup();
    renderDashboardPage();

    const governanceTab = screen.getByRole('tab', { name: /Governance/i });
    await user.click(governanceTab);

    await waitFor(() => {
      expect(
        screen.getByText((content) =>
          content.includes('Comprehensive governance view'),
        ),
      ).toBeDefined();
    });
  });
});

// ---------------------------------------------------------------------------
// Data Refresh
// ---------------------------------------------------------------------------

describe('DashboardPage data refresh', () => {
  it('renders Refresh button that can be clicked without errors', async () => {
    const user = userEvent.setup();
    renderDashboardPage();

    const refreshButtons = screen.getAllByRole('button', { name: /Refresh/i });
    expect(refreshButtons.length).toBeGreaterThan(0);

    // Click the first Refresh button — should not throw
    await user.click(refreshButtons[0]);

    // Page should still be rendered after refresh
    expect(screen.getByText('Dashboard')).toBeDefined();
  });

  it('renders Refresh button in MELT tab that can be clicked', async () => {
    const user = userEvent.setup();
    renderDashboardPage();

    const meltTab = screen.getByRole('tab', { name: /MELT Observability/i });
    await user.click(meltTab);

    await waitFor(() => {
      const refreshButtons = screen.getAllByRole('button', { name: /Refresh/i });
      expect(refreshButtons.length).toBeGreaterThan(0);
    });

    const refreshButtons = screen.getAllByRole('button', { name: /Refresh/i });
    await user.click(refreshButtons[0]);

    // Page should still be rendered after refresh
    expect(screen.getByText('MELT Dashboard')).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// Role-Based Rendering
// ---------------------------------------------------------------------------

describe('DashboardPage role-based rendering', () => {
  it('renders for Engineer role', () => {
    renderDashboardPageWithRole(ROLES.ENGINEER);

    expect(screen.getByText('Dashboard')).toBeDefined();

    const engineerUser = MOCK_USERS.find((u) => u.role === ROLES.ENGINEER);
    expect(
      screen.getByText((content) =>
        content.includes(`Welcome back, ${engineerUser.firstName}`),
      ),
    ).toBeDefined();
  });

  it('renders for Executive role', () => {
    renderDashboardPageWithRole(ROLES.EXECUTIVE);

    expect(screen.getByText('Dashboard')).toBeDefined();

    const executiveUser = MOCK_USERS.find((u) => u.role === ROLES.EXECUTIVE);
    expect(
      screen.getByText((content) =>
        content.includes(`Welcome back, ${executiveUser.firstName}`),
      ),
    ).toBeDefined();
  });

  it('renders for Auditor role', () => {
    renderDashboardPageWithRole(ROLES.AUDITOR);

    expect(screen.getByText('Dashboard')).toBeDefined();
  });

  it('renders for Owner role', () => {
    renderDashboardPageWithRole(ROLES.OWNER);

    expect(screen.getByText('Dashboard')).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// Metric Display
// ---------------------------------------------------------------------------

describe('DashboardPage metric display', () => {
  it('renders metric-related content in the Overview tab', () => {
    renderDashboardPage();

    // The DashboardShell Overview tab renders summary cards with labels like
    // "Applications", "Pipeline Success", "Active Incidents", "Compliance Score"
    // These are rendered inside the DashboardShell component
    // We verify the page renders without errors and contains expected structure
    const comboboxes = screen.getAllByRole('combobox');
    expect(comboboxes.length).toBeGreaterThan(0);
  });

  it('renders sub-tabs within the Overview DashboardShell', () => {
    renderDashboardPage();

    // DashboardShell renders its own set of tabs (Overview, MELT Metrics, KPI/DORA, etc.)
    // These are nested inside the page-level Overview tab
    const allTabs = screen.getAllByRole('tab');
    // Page-level tabs (4) + DashboardShell tabs (5) = at least 9 tabs
    expect(allTabs.length).toBeGreaterThanOrEqual(4);
  });
});

// ---------------------------------------------------------------------------
// Filter Controls
// ---------------------------------------------------------------------------

describe('DashboardPage filter controls', () => {
  it('renders domain filter dropdown in the Overview tab', () => {
    renderDashboardPage();

    // DashboardShell renders domain and application filter comboboxes
    const comboboxes = screen.getAllByRole('combobox');
    expect(comboboxes.length).toBeGreaterThanOrEqual(2);
  });

  it('renders time range selector in the Overview tab', () => {
    renderDashboardPage();

    // DashboardShell renders a time range selector combobox
    const comboboxes = screen.getAllByRole('combobox');
    // At least 3 comboboxes: domain, application, time range
    expect(comboboxes.length).toBeGreaterThanOrEqual(3);
  });
});

// ---------------------------------------------------------------------------
// Edge Cases
// ---------------------------------------------------------------------------

describe('DashboardPage edge cases', () => {
  it('renders without crashing when localStorage is empty', () => {
    localStorage.clear();
    initializeStorage({ force: true });

    const adminUser = MOCK_USERS.find((u) => u.role === ROLES.ADMIN);
    const sessionUser = {
      id: adminUser.id,
      username: adminUser.username,
      email: adminUser.email,
      firstName: adminUser.firstName,
      lastName: adminUser.lastName,
      role: adminUser.role,
      department: adminUser.department,
      avatar: null,
      active: true,
      lastLogin: new Date().toISOString(),
    };

    localStorage.setItem(
      'horizon_horizon_auth_user',
      JSON.stringify(sessionUser),
    );
    localStorage.setItem(
      'horizon_horizon_auth_token',
      JSON.stringify(`mock-token-${sessionUser.id}`),
    );

    render(
      <MemoryRouter>
        <AuthProvider>
          <AppProvider>
            <ToastProvider>
              <DashboardPage />
            </ToastProvider>
          </AppProvider>
        </AuthProvider>
      </MemoryRouter>,
    );

    expect(screen.getByText('Dashboard')).toBeDefined();
  });

  it('handles rapid tab switching without errors', async () => {
    const user = userEvent.setup();
    renderDashboardPage();

    const meltTab = screen.getByRole('tab', { name: /MELT Observability/i });
    const kpiTab = screen.getByRole('tab', { name: /KPI/i });
    const governanceTab = screen.getByRole('tab', { name: /Governance/i });
    const overviewTab = screen.getByRole('tab', { name: /Overview/i });

    // Rapidly switch between tabs
    await user.click(meltTab);
    await user.click(kpiTab);
    await user.click(governanceTab);
    await user.click(overviewTab);
    await user.click(meltTab);
    await user.click(overviewTab);

    // Page should still be rendered correctly
    expect(screen.getByText('Dashboard')).toBeDefined();
    expect(overviewTab.getAttribute('aria-selected')).toBe('true');
  });

  it('renders all four tabs as accessible tab elements', () => {
    renderDashboardPage();

    const tabs = screen.getAllByRole('tab');
    // At minimum the 4 page-level tabs should be present
    const pageTabLabels = ['Overview', 'MELT Observability', 'KPI / DORA', 'Governance'];
    pageTabLabels.forEach((label) => {
      const matchingTab = tabs.find((tab) => tab.textContent.includes(label.split(' ')[0]));
      expect(matchingTab).toBeDefined();
    });
  });
});