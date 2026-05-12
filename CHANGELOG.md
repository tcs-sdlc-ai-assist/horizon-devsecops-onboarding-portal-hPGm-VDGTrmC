# Changelog

All notable changes to the Horizon DevSecOps Portal will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2024-11-10

### Added

#### Application Onboarding Portal
- Multi-step onboarding form with domain/portfolio/application metadata, toolchain selection, configuration, and review steps.
- Cascading domain selector with three linked dropdowns: domain → portfolio → application.
- Toolchain selector organized by category (Source Control, CI/CD, Build, Container, Security, Observability, QE, ITSM, Collaboration) with multi-select support.
- Onboarded applications list with card and table view modes, filtering by domain, portfolio, criticality tier, and status.
- Catalog browser displaying all available domains, portfolios, and applications in searchable grid/list views.
- Bulk application import via CSV/Excel file upload with schema validation and data preview.
- Draft save and restore for in-progress onboarding forms.
- Application metadata display including criticality tier, environments, tech stack, tags, and owner information.

#### Golden Pipeline Generator
- Pipeline generation for Jenkins Declarative, OpenShift Tekton, GitOps ArgoCD, GitHub Actions, and GitLab CI platforms.
- Embedded security scanning stages: SAST, DAST, SCA, and container scanning with configurable tool selections.
- Quality Engineering stages with performance, load, and regression testing support.
- Observability hooks for post-deployment monitoring and logging validation.
- Manual approval gates with configurable approver roles and change request integration.
- Policy-as-code rules with block, warn, and info enforcement levels per criticality tier.
- Pipeline artifact viewer with syntax-highlighted code preview, copy to clipboard, and download functionality.
- Pipeline flow diagram visualization with expandable stage details and policy rule display.
- Pipeline list with card and table views, filtering by platform, status, and criticality tier.
- Pipeline run history with status tracking and duration metrics.
- Criticality-tier-aware stage and policy rule filtering (Business-critical, Mission-critical, Business Operational, Admin Services).

#### Event-Driven Kafka Integration
- Frontend event bus service simulating Kafka publish/subscribe pattern.
- Event catalog with 28 supported event topics across pipeline, deployment, incident, SLO, security, compliance, application, toolchain, metrics, and alert categories.
- Event schema viewer with payload field definitions and downstream action descriptions.
- Event log with searchable, filterable table and severity/category/topic distribution charts.
- Test event publishing with customizable JSON payloads per topic.
- Event acknowledgment and replay capabilities.
- Convenience publishers for pipeline execution, deployment, incident, SLO breach, security vulnerability, and compliance violation events.
- Event log summary with distribution by topic, severity, category, and status.

#### MELT Observability Dashboards
- Unified MELT (Metrics, Events, Logs, Traces) dashboard aggregating data from Dynatrace, Splunk, Elastic, Prometheus, and Grafana sources.
- Application metrics visualization: CPU utilization, memory utilization, P95 response time, error rate, availability, and requests per second.
- Event timeline with severity-based filtering and distribution charts.
- Log viewer with level-based filtering (ERROR, WARN, INFO, DEBUG) and distribution charts.
- Distributed trace viewer with span waterfall visualization and duration breakdown.
- Data source indicators showing connectivity status for each monitoring platform.
- Per-domain and per-application filtering with time range selection.

#### HSMART KPI Dashboards
- DORA metrics dashboard: deployment frequency, lead time for changes, change failure rate, and mean time to recovery.
- DORA performance level classification (Elite, High, Medium, Low) with per-metric and overall ratings.
- Quality Engineering metrics: code coverage, pipeline success rate, security scan pass rate, vulnerability counts, and technical debt hours.
- AI adoption metrics: toil reduction, pipeline auto-generation rate, AI-assisted remediation, predictive alert accuracy, and ChatOps adoption.
- Cost and FinOps metrics: monthly/annual costs, optimization potential, cost efficiency score, and cost breakdown by domain and application.
- Governance metrics: compliance rate, audit readiness score, critical findings, and artifact counts.
- Configurable metrics panel allowing admins to toggle metric visibility per domain or application.
- KPI trend charts with historical data points across 6-month periods.
- Radar chart for AI adoption metrics visualization.
- All percentages displayed to 2 decimal places.

#### Compliance Artifact Generation
- ITM change record generation for ServiceNow integration with change type, risk level, and approval requirements.
- QE evidence package generation from pipeline data, test results, and code coverage metrics.
- Security scan report generation (consolidated, SAST, DAST, SCA, container) with findings summary and remediation recommendations.
- Sign-off pack generation with comprehensive deployment approval documentation.
- HIPAA/CMS audit documentation generation with governance, security posture, operational metrics, and compliance controls.
- Artifact preview with metadata display, findings summary, and document content viewer.
- Artifact download in text and JSON formats.
- Artifact status management (Compliant, Non-Compliant, Partial, Pending Review, Not Applicable).
- Artifact history with searchable, filterable table and summary statistics.
- Artifact export as JSON with optional content inclusion.

#### Admin Data Upload
- CSV and Excel file upload with drag-and-drop zone and file type validation.
- Three upload types: Applications (Catalog), KPI Metrics, and Configuration Data.
- Schema validation against required columns and allowed values per upload type.
- Data preview table showing parsed rows before import confirmation.
- Bulk application import with duplicate detection and skip reporting.
- Upload history tracking with status, row counts, and imported/skipped counts.
- Download CSV template for each upload type.
- Compliance notice for data upload governance.

#### Metrics Configurator
- Per-domain and per-application metric toggle configuration.
- 20 configurable KPI metrics across DORA, Quality, Security, Operations, Performance, Governance, and Efficiency categories.
- Warning and critical threshold configuration per metric.
- Display order management with drag-to-reorder functionality.
- Metric search and category filtering.
- Enable/disable all and per-category bulk toggle actions.
- Configuration persistence to localStorage with scope-based keys.

#### Mock Authentication with RBAC
- Role-based mock authentication with 5 roles: Admin, Auditor, Engineer, Owner, Executive.
- Role selector with interactive cards showing role descriptions, permissions, and mock user profiles.
- Session persistence in localStorage with automatic restoration on page load.
- Role switching without logout for prototype testing.
- Permission-based access control with 18 granular permissions mapped to roles.
- Protected routes with role-based access restrictions and unauthorized access fallback.
- User avatar with dropdown menu for profile, role switching, and logout.

#### Audit Trail Logging
- Immutable audit log entries with UUID-based IDs, timestamps, user identification, action types, and detailed context.
- 20 audit action types covering authentication, application management, pipeline operations, toolchain configuration, compliance reviews, incident management, and system administration.
- Audit log viewer with searchable, filterable table accessible to Admin and Auditor roles.
- Filtering by user, action type, date range, and free-text search.
- Export to CSV and JSON formats for regulatory compliance and evidence collection.
- Action distribution chart showing audit activity breakdown by type.
- HIPAA/CMS compliance notice for audit log retention and immutability.

#### Dashboard Shell and Navigation
- Responsive sidebar navigation with RBAC-based section visibility and collapsible state.
- Top header bar with breadcrumb navigation, global search, theme toggle, notification bell, and user menu.
- Dashboard shell with domain/application filter bar, time range selector, and auto-refresh toggle.
- Overview summary cards with key metrics: applications, pipeline success, active incidents, and compliance score.
- Tab-based navigation across Overview, MELT, KPI/DORA, Governance, and Cost views.
- Dark mode support with system preference detection.

#### Integration Manager
- Catalog of 22 available external system integrations across monitoring, logging, database, messaging, security scanning, ITSM, collaboration, data platform, CI/CD, and artifact management categories.
- Integration configuration forms with schema-driven field rendering and validation.
- Simulated connectivity testing with response time metrics.
- Per-application integration management with enable/disable toggle.
- Integration summary statistics with type, status, and application breakdowns.
- Card and list view modes for browsing available and configured integrations.

#### Reusable UI Components
- Badge component with 7 color variants, 3 sizes, optional icon, and dot indicator.
- Button component with 4 variants, 3 sizes, loading state, and icon support.
- Card component with 3 variants, header with icon/title/subtitle, and footer actions.
- Chart widget wrapping Recharts for line, bar, area, pie, and radar chart types.
- Empty state component with customizable icon, title, description, and action button.
- File upload component with drag-and-drop, file validation, progress indicator, and data preview.
- Metric card component with value, trend arrow, sparkline chart, and comparison period.
- Modal dialog with backdrop click, keyboard escape, body scroll lock, and multiple sizes.
- Select dropdown with search, multi-select, clearable, and keyboard navigation support.
- Status indicator with 13 status variants and pulse animation.
- Table component with sortable columns, pagination, row selection, search, and loading skeleton.
- Tabs component with underline, pill, and bordered variants, keyboard navigation, and badge support.
- Toast notification system with success, error, warning, and info variants, auto-dismiss, and stacking.

#### Data Services
- CatalogService for CRUD operations on domains, portfolios, applications, and toolchains with localStorage persistence.
- DashboardDataService for aggregated MELT, KPI, DORA, MTTR, QE, AI adoption, and Cost/FinOps data.
- ComplianceArtifactService for generating, storing, and managing compliance artifacts.
- EventBusService for publish/subscribe event management with event log persistence.
- IntegrationService for managing external system integrations with configuration validation.
- OnboardingService for orchestrating application onboarding workflows.
- PipelineService for Golden Pipeline generation with platform-specific artifact output.

#### Utilities
- localStorage utility with JSON-safe get/set/remove, key prefixing, mock data seeding, and migration support.
- Audit logger with immutable entries, filtering, export, and summary capabilities.
- CSV/Excel parser using PapaParse and SheetJS with schema validation and data transformation.
- Formatting utilities for percentages, numbers, dates, durations, bytes, and strings.
- Validation utilities for forms, CSV data, toolchain selections, and pipeline configurations.
- Pipeline template definitions with 19 stages, policy-as-code rules, and platform configurations.

#### Testing
- Component tests for OnboardingForm, AdminDataUpload, and DashboardPage using React Testing Library.
- Unit tests for CatalogService, PipelineService, ComplianceArtifactService, and auditLogger.
- Test coverage for RBAC access control, form validation, multi-step navigation, and localStorage persistence.

#### Infrastructure
- Vite build configuration with React plugin, path aliases, and source maps.
- Tailwind CSS configuration with custom color palette (Horizon blue, surface grays), extended spacing, and dark mode support.
- ESLint configuration with React, React Hooks, and import sorting rules.
- Prettier configuration for consistent code formatting.
- Vitest configuration with jsdom environment and coverage reporting.
- Vercel deployment configuration with SPA rewrites.

### Security
- Role-based access control (RBAC) enforced across all portal features.
- Sensitive configuration fields masked in integration exports and audit logs.
- Immutable audit trail entries for regulatory compliance.
- HIPAA/CMS compliance notices on data upload, audit log, and compliance artifact views.

### Notes
- This is a prototype release using mock authentication and localStorage-based data persistence.
- All data is stored locally in the browser — no backend API integration in this release.
- Mock data includes 16 applications, 7 domains, 14 portfolios, 6 pipeline configurations, 5 pipeline runs, 6 KPI metric sets, 5 MELT metric sets, 11 compliance artifacts, 5 incidents, and 8 mock users.

[1.0.0]: https://github.com/horizon-org/horizon-devsecops-portal/releases/tag/v1.0.0