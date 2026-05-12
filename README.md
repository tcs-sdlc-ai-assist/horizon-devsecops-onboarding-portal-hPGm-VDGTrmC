# Horizon DevSecOps Portal

Unified DevSecOps management and monitoring portal for enterprise application onboarding, Golden Pipeline generation, MELT observability, KPI/DORA dashboards, compliance artifact generation, and governance oversight.

---

## Table of Contents

1. [Overview](#overview)
2. [Tech Stack](#tech-stack)
3. [Folder Structure](#folder-structure)
4. [Prerequisites](#prerequisites)
5. [Setup Instructions](#setup-instructions)
6. [Available Scripts](#available-scripts)
7. [Environment Variables](#environment-variables)
8. [Feature Overview](#feature-overview)
9. [Architecture Notes](#architecture-notes)
10. [Testing](#testing)
11. [Deployment](#deployment)
12. [License](#license)

---

## Overview

The Horizon DevSecOps Portal is a comprehensive, browser-based platform that provides a unified interface for managing the full DevSecOps lifecycle across enterprise applications. It supports application onboarding with cascading domain/portfolio/application selection, Golden Pipeline generation with embedded security scanning and policy-as-code rules, MELT (Metrics, Events, Logs, Traces) observability dashboards, HSMART KPI/DORA performance tracking, compliance artifact generation for HIPAA/CMS audit readiness, event-driven Kafka integration, and role-based access control with immutable audit trail logging.

This is a **prototype release** using mock authentication and localStorage-based data persistence. All data is stored locally in the browser — no backend API integration is included in this release.

---

## Tech Stack

| Technology | Version | Purpose |
| --- | --- | --- |
| **React** | 18.3.x | UI component library |
| **Vite** | 5.4.x | Build tool and dev server |
| **Tailwind CSS** | 3.4.x | Utility-first CSS framework |
| **JavaScript (ES2022+)** | — | Application language (JSX) |
| **React Router** | 6.28.x | Client-side routing with `createBrowserRouter` |
| **Recharts** | 2.13.x | Chart and data visualization |
| **Lucide React** | 0.454.x | Icon library |
| **PapaParse** | 5.4.x | CSV parsing |
| **SheetJS (xlsx)** | 0.18.x | Excel file parsing |
| **uuid** | 10.x | Unique ID generation |
| **clsx** | 2.1.x | Conditional CSS class utility |
| **prop-types** | 15.8.x | Runtime prop type checking |
| **Vitest** | 2.1.x | Unit and component testing |
| **React Testing Library** | 16.x | Component testing utilities |
| **ESLint** | 9.x | Code linting |
| **Prettier** | 3.4.x | Code formatting |
| **PostCSS + Autoprefixer** | — | CSS processing |

---

## Folder Structure

```
horizon-devsecops-portal/
├── public/                          # Static assets
├── src/
│   ├── components/                  # Reusable UI components
│   │   ├── admin/                   # Admin data upload, metrics configurator
│   │   │   ├── AdminDataUpload.jsx
│   │   │   └── MetricsConfigurator.jsx
│   │   ├── auth/                    # Authentication components
│   │   │   ├── ProtectedRoute.jsx
│   │   │   └── RoleSelector.jsx
│   │   ├── common/                  # Shared UI primitives
│   │   │   ├── Badge.jsx
│   │   │   ├── Button.jsx
│   │   │   ├── Card.jsx
│   │   │   ├── EmptyState.jsx
│   │   │   ├── FileUpload.jsx
│   │   │   ├── Modal.jsx
│   │   │   ├── Select.jsx
│   │   │   ├── StatusIndicator.jsx
│   │   │   ├── Table.jsx
│   │   │   ├── Tabs.jsx
│   │   │   └── Toast.jsx
│   │   ├── compliance/              # Compliance artifact generation, audit log
│   │   │   ├── AuditLogViewer.jsx
│   │   │   └── ComplianceArtifactGenerator.jsx
│   │   ├── dashboard/               # Dashboard shells and visualizations
│   │   │   ├── ChartWidget.jsx
│   │   │   ├── DashboardShell.jsx
│   │   │   ├── GovernanceDashboard.jsx
│   │   │   ├── KPIDashboard.jsx
│   │   │   ├── MELTDashboard.jsx
│   │   │   └── MetricCard.jsx
│   │   ├── integrations/            # Event catalog, integration manager
│   │   │   ├── EventCatalog.jsx
│   │   │   └── IntegrationManager.jsx
│   │   ├── layout/                  # Application layout components
│   │   │   ├── Header.jsx
│   │   │   ├── MainLayout.jsx
│   │   │   └── Sidebar.jsx
│   │   ├── onboarding/              # Application onboarding workflow
│   │   │   ├── DomainSelector.jsx
│   │   │   ├── OnboardedApplicationsList.jsx
│   │   │   ├── OnboardingCatalog.jsx
│   │   │   ├── OnboardingForm.jsx
│   │   │   └── ToolchainSelector.jsx
│   │   └── pipeline/                # Pipeline generation and visualization
│   │       ├── PipelineGenerator.jsx
│   │       ├── PipelineList.jsx
│   │       └── PipelineViewer.jsx
│   ├── constants/                   # Application constants and mock data
│   │   ├── constants.js             # Enums, lists, keys
│   │   ├── mockData.js              # Seed data for prototype
│   │   └── toolchainData.js         # Toolchain catalog definitions
│   ├── contexts/                    # React context providers
│   │   ├── AppContext.jsx           # Global app state (theme, sidebar, selections)
│   │   └── AuthContext.jsx          # Authentication and RBAC
│   ├── hooks/                       # Custom React hooks
│   │   ├── useAuth.js               # Auth context hook re-export
│   │   ├── useDashboardData.js      # Dashboard data fetching with auto-refresh
│   │   └── useLocalStorage.js       # Reactive localStorage state
│   ├── pages/                       # Route-level page components
│   │   ├── AdminPage.jsx
│   │   ├── CompliancePage.jsx
│   │   ├── DashboardPage.jsx
│   │   ├── IntegrationsPage.jsx
│   │   ├── LoginPage.jsx
│   │   ├── NotFoundPage.jsx
│   │   ├── OnboardingPage.jsx
│   │   └── PipelinePage.jsx
│   ├── services/                    # Business logic and data services
│   │   ├── CatalogService.js        # Domain/portfolio/application CRUD
│   │   ├── ComplianceArtifactService.js  # Artifact generation
│   │   ├── DashboardDataService.js  # MELT, KPI, DORA aggregation
│   │   ├── EventBusService.js       # Kafka event simulation
│   │   ├── IntegrationService.js    # External system integrations
│   │   ├── OnboardingService.js     # Onboarding orchestration
│   │   └── PipelineService.js       # Pipeline generation
│   ├── utils/                       # Utility functions
│   │   ├── auditLogger.js           # Immutable audit trail
│   │   ├── csvParser.js             # CSV/Excel parsing and validation
│   │   ├── formatters.js            # Number, date, duration formatting
│   │   ├── localStorage.js          # JSON-safe localStorage with seeding
│   │   ├── pipelineTemplates.js     # Golden Pipeline stage/policy definitions
│   │   └── validators.js            # Form, CSV, pipeline validation
│   ├── App.jsx                      # Root component with providers
│   ├── index.css                    # Tailwind directives and global styles
│   ├── main.jsx                     # Application entry point
│   ├── router.jsx                   # React Router configuration
│   └── setupTests.js                # Test environment setup
├── .env.example                     # Environment variable template
├── .eslintrc.cjs                    # ESLint configuration
├── .prettierrc                      # Prettier configuration
├── index.html                       # HTML entry point
├── package.json                     # Dependencies and scripts
├── postcss.config.js                # PostCSS configuration
├── tailwind.config.js               # Tailwind CSS configuration
├── vercel.json                      # Vercel deployment configuration
├── vite.config.js                   # Vite build configuration
└── vitest.config.js                 # Vitest test configuration
```

---

## Prerequisites

- **Node.js** >= 18.x (LTS recommended)
- **npm** >= 9.x

Verify your local environment:

```bash
node --version   # v18.x or higher
npm --version    # 9.x or higher
```

---

## Setup Instructions

1. **Clone the repository:**

   ```bash
   git clone https://github.com/horizon-org/horizon-devsecops-portal.git
   cd horizon-devsecops-portal
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Configure environment variables (optional):**

   ```bash
   cp .env.example .env
   ```

   Edit `.env` with your environment-specific values. All variables are optional for the prototype phase.

4. **Start the development server:**

   ```bash
   npm run dev
   ```

   The application will be available at `http://localhost:3000`.

5. **Select a role:**

   On first load, the portal displays a role selector. Choose from Admin, Auditor, Engineer, Owner, or Executive to explore the portal with different permission levels.

---

## Available Scripts

| Script | Command | Description |
| --- | --- | --- |
| **dev** | `npm run dev` | Start Vite development server with HMR on port 3000 |
| **build** | `npm run build` | Create optimized production build in `dist/` |
| **preview** | `npm run preview` | Serve the production build locally for verification |
| **lint** | `npm run lint` | Run ESLint across all `.js` and `.jsx` files |
| **format** | `npm run format` | Run Prettier on all source files in `src/` |
| **test** | `npm run test` | Run all tests once with Vitest |
| **test:watch** | `npm run test:watch` | Run tests in watch mode for development |

---

## Environment Variables

All environment variables are prefixed with `VITE_` and accessed via `import.meta.env.VITE_*`.

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| `VITE_APP_TITLE` | No | `Horizon DevSecOps Portal` | Application title in browser tab |
| `VITE_API_BASE_URL` | No | `http://localhost:8080/api` | Backend API base URL (future) |
| `VITE_SSO_ENABLED` | No | `false` | Enable SSO authentication |
| `VITE_SSO_CLIENT_ID` | No | — | OAuth 2.0 / OIDC client ID |
| `VITE_SSO_AUTHORITY` | No | — | SSO identity provider URL |
| `VITE_KAFKA_BROKER_URL` | No | — | Kafka broker URL (future) |
| `VITE_DYNATRACE_API_URL` | No | — | Dynatrace API endpoint |
| `VITE_SPLUNK_API_URL` | No | — | Splunk API endpoint |
| `VITE_ELASTIC_API_URL` | No | — | Elastic API endpoint |
| `VITE_SERVICENOW_API_URL` | No | — | ServiceNow API endpoint |

> **Note:** No environment variables are required for the prototype phase. The portal operates entirely with mock data stored in localStorage.

---

## Feature Overview

### Application Onboarding Portal

- Multi-step onboarding form with domain/portfolio/application metadata, toolchain selection, configuration, and review steps
- Cascading domain selector with three linked dropdowns: domain → portfolio → application
- Toolchain selector organized by category (Source Control, CI/CD, Build, Container, Security, Observability, QE, ITSM, Collaboration) with multi-select support
- Onboarded applications list with card and table view modes, filtering by domain, portfolio, criticality tier, and status
- Catalog browser displaying all available domains, portfolios, and applications in searchable grid/list views
- Bulk application import via CSV/Excel file upload with schema validation and data preview
- Draft save and restore for in-progress onboarding forms

### Golden Pipeline Generator

- Pipeline generation for Jenkins Declarative, OpenShift Tekton, GitOps ArgoCD, GitHub Actions, and GitLab CI platforms
- Embedded security scanning stages: SAST, DAST, SCA, and container scanning with configurable tool selections
- Quality Engineering stages with performance, load, and regression testing support
- Observability hooks for post-deployment monitoring and logging validation
- Manual approval gates with configurable approver roles and change request integration
- Policy-as-code rules with block, warn, and info enforcement levels per criticality tier
- Pipeline artifact viewer with syntax-highlighted code preview, copy to clipboard, and download functionality
- Pipeline flow diagram visualization with expandable stage details and policy rule display

### MELT Observability Dashboards

- Unified MELT (Metrics, Events, Logs, Traces) dashboard aggregating data from Dynatrace, Splunk, Elastic, Prometheus, and Grafana sources
- Application metrics visualization: CPU utilization, memory utilization, P95 response time, error rate, availability, and requests per second
- Event timeline with severity-based filtering and distribution charts
- Log viewer with level-based filtering (ERROR, WARN, INFO, DEBUG) and distribution charts
- Distributed trace viewer with span waterfall visualization and duration breakdown
- Data source indicators showing connectivity status for each monitoring platform

### HSMART KPI Dashboards

- DORA metrics dashboard: deployment frequency, lead time for changes, change failure rate, and mean time to recovery
- DORA performance level classification (Elite, High, Medium, Low) with per-metric and overall ratings
- Quality Engineering metrics: code coverage, pipeline success rate, security scan pass rate, vulnerability counts, and technical debt hours
- AI adoption metrics: toil reduction, pipeline auto-generation rate, AI-assisted remediation, predictive alert accuracy, and ChatOps adoption
- Cost and FinOps metrics: monthly/annual costs, optimization potential, cost efficiency score, and cost breakdown by domain and application
- Governance metrics: compliance rate, audit readiness score, critical findings, and artifact counts
- Configurable metrics panel allowing admins to toggle metric visibility per domain or application
- All percentages displayed to 2 decimal places

### Compliance Artifact Generation

- ITM change record generation for ServiceNow integration with change type, risk level, and approval requirements
- QE evidence package generation from pipeline data, test results, and code coverage metrics
- Security scan report generation (consolidated, SAST, DAST, SCA, container) with findings summary and remediation recommendations
- Sign-off pack generation with comprehensive deployment approval documentation
- HIPAA/CMS audit documentation generation with governance, security posture, operational metrics, and compliance controls
- Artifact preview with metadata display, findings summary, and document content viewer
- Artifact download in text and JSON formats

### Event-Driven Kafka Integration

- Frontend event bus service simulating Kafka publish/subscribe pattern
- Event catalog with 28 supported event topics across pipeline, deployment, incident, SLO, security, compliance, application, toolchain, metrics, and alert categories
- Event schema viewer with payload field definitions and downstream action descriptions
- Event log with searchable, filterable table and severity/category/topic distribution charts
- Test event publishing with customizable JSON payloads per topic

### Integration Manager

- Catalog of 22 available external system integrations across monitoring, logging, database, messaging, security scanning, ITSM, collaboration, data platform, CI/CD, and artifact management categories
- Integration configuration forms with schema-driven field rendering and validation
- Simulated connectivity testing with response time metrics
- Per-application integration management with enable/disable toggle

### Admin Data Upload

- CSV and Excel file upload with drag-and-drop zone and file type validation
- Three upload types: Applications (Catalog), KPI Metrics, and Configuration Data
- Schema validation against required columns and allowed values per upload type
- Data preview table showing parsed rows before import confirmation
- Upload history tracking with status, row counts, and imported/skipped counts

### Metrics Configurator

- Per-domain and per-application metric toggle configuration
- 20 configurable KPI metrics across DORA, Quality, Security, Operations, Performance, Governance, and Efficiency categories
- Warning and critical threshold configuration per metric
- Display order management with drag-to-reorder functionality

### Mock Authentication with RBAC

- Role-based mock authentication with 5 roles: Admin, Auditor, Engineer, Owner, Executive
- 18 granular permissions mapped to roles
- Protected routes with role-based access restrictions and unauthorized access fallback
- Session persistence in localStorage with automatic restoration on page load

### Audit Trail Logging

- Immutable audit log entries with UUID-based IDs, timestamps, user identification, action types, and detailed context
- 20 audit action types covering authentication, application management, pipeline operations, toolchain configuration, compliance reviews, incident management, and system administration
- Audit log viewer with searchable, filterable table accessible to Admin and Auditor roles
- Export to CSV and JSON formats for regulatory compliance and evidence collection

---

## Architecture Notes

### Data Flow

The portal follows a service-oriented architecture within the browser:

```
Pages → Components → Services → localStorage
                  ↘ Contexts (Auth, App)
                  ↘ Hooks (useDashboardData, useLocalStorage)
```

- **Pages** compose feature-specific components and provide page-level context
- **Components** handle UI rendering and user interaction
- **Services** encapsulate business logic, data access, and localStorage persistence
- **Contexts** provide global state (authentication, theme, sidebar, selections)
- **Hooks** provide reusable stateful logic (dashboard data fetching, localStorage sync)

### State Management

- **AuthContext** — Authentication state, RBAC permissions, login/logout/role switching
- **AppContext** — Theme, sidebar state, domain/portfolio/application selections, notifications
- **localStorage** — All persistent data including mock datasets, user preferences, generated artifacts, audit logs, and dashboard configurations

### Routing

React Router v6 with `createBrowserRouter` is used for client-side routing. All routes are defined in `src/router.jsx`. Protected routes use the `ProtectedRoute` component for authentication and role-based access control. SPA routing is configured via `vercel.json` rewrites.

### Mock Data

The prototype uses comprehensive mock data seeded into localStorage on first load via `src/utils/localStorage.js`. Mock datasets include:

- 16 applications across 7 domains and 14 portfolios
- 6 pipeline configurations with 5 pipeline runs
- 6 KPI metric sets with historical trends
- 5 MELT metric sets with events, logs, and traces
- 11 compliance artifacts
- 5 incidents
- 8 mock users across all 5 roles

### Security

- Role-based access control (RBAC) enforced across all portal features
- Sensitive configuration fields masked in integration exports and audit logs
- Immutable audit trail entries for regulatory compliance
- HIPAA/CMS compliance notices on data upload, audit log, and compliance artifact views

---

## Testing

The project uses [Vitest](https://vitest.dev/) with [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/) for component and unit testing.

### Running Tests

```bash
# Run all tests once
npm run test

# Run tests in watch mode
npm run test:watch
```

### Test Coverage

Tests are located alongside source files with `.test.js` or `.test.jsx` extensions. Current test coverage includes:

- **Component tests** — OnboardingForm, AdminDataUpload, DashboardPage
- **Service tests** — CatalogService, PipelineService, ComplianceArtifactService
- **Utility tests** — auditLogger

### Test Environment

- **jsdom** environment via Vitest for DOM simulation
- **localStorage mock** provided in `vitest.setup.js`
- **React Testing Library** for component rendering and user interaction simulation
- Tests use mock authentication by seeding localStorage with user session data

### Writing Tests

```javascript
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

describe('ComponentName', () => {
  it('renders expected content', () => {
    render(<ComponentName />);
    expect(screen.getByText('Expected Text')).toBeDefined();
  });
});
```

---

## Deployment

The portal is configured for deployment on [Vercel](https://vercel.com/) with SPA routing support. See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions including:

- Vercel Git integration setup
- Environment variable configuration
- SPA routing for other hosting providers (Nginx, Apache, AWS CloudFront)
- Preview deployments
- Production deployment checklist
- CI/CD pipeline recommendations

### Quick Deploy

```bash
# Build for production
npm run build

# Preview the production build locally
npm run preview

# Deploy to Vercel
npx vercel --prod
```

---

## License

This project is private and proprietary.