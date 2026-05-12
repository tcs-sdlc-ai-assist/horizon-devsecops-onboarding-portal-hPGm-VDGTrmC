# Deployment Guide — Horizon DevSecOps Portal

This document covers deployment procedures for the Horizon DevSecOps Portal, including Vercel deployment, environment configuration, SPA routing, preview deployments, production readiness, SSO integration, and CI/CD pipeline recommendations.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Variables](#environment-variables)
3. [Build Commands](#build-commands)
4. [Vercel Deployment](#vercel-deployment)
5. [SPA Routing Setup](#spa-routing-setup)
6. [Preview Deployments](#preview-deployments)
7. [Production Deployment Checklist](#production-deployment-checklist)
8. [SSO Integration Notes for Production](#sso-integration-notes-for-production)
9. [CI/CD Pipeline Recommendations](#cicd-pipeline-recommendations)
10. [Troubleshooting](#troubleshooting)

---

## Prerequisites

- **Node.js** >= 18.x (LTS recommended)
- **npm** >= 9.x
- A [Vercel](https://vercel.com) account (free tier is sufficient for prototype deployments)
- Git repository hosted on GitHub, GitLab, or Bitbucket

Verify your local environment:

```bash
node --version   # v18.x or higher
npm --version    # 9.x or higher
```

---

## Environment Variables

The application uses Vite environment variables prefixed with `VITE_`. Copy the example file and configure values for your target environment:

```bash
cp .env.example .env
```

### Variable Reference

| Variable                    | Required | Default                        | Description                                      |
| --------------------------- | -------- | ------------------------------ | ------------------------------------------------ |
| `VITE_APP_TITLE`            | No       | `Horizon DevSecOps Portal`     | Application title displayed in the browser tab   |
| `VITE_API_BASE_URL`         | No       | `http://localhost:8080/api`    | Base URL for backend API (future integration)    |
| `VITE_SSO_ENABLED`          | No       | `false`                        | Enable SSO authentication (`true` / `false`)     |
| `VITE_SSO_CLIENT_ID`        | No       | —                              | OAuth 2.0 / OIDC client ID                      |
| `VITE_SSO_AUTHORITY`        | No       | —                              | SSO identity provider authority URL              |
| `VITE_KAFKA_BROKER_URL`     | No       | —                              | Kafka broker URL (future integration)            |
| `VITE_DYNATRACE_API_URL`    | No       | —                              | Dynatrace API endpoint                           |
| `VITE_SPLUNK_API_URL`       | No       | —                              | Splunk API endpoint                              |
| `VITE_ELASTIC_API_URL`      | No       | —                              | Elastic API endpoint                             |
| `VITE_SERVICENOW_API_URL`   | No       | —                              | ServiceNow API endpoint                          |

### Vercel Environment Variables

In the Vercel dashboard, navigate to **Project Settings → Environment Variables** and add each variable for the appropriate scope:

- **Production** — variables applied to production deployments
- **Preview** — variables applied to preview/branch deployments
- **Development** — variables applied to `vercel dev` local runs

> **Important:** Never commit `.env` files containing secrets to version control. The `.gitignore` already excludes `.env` and `.env.local`.

---

## Build Commands

### Install Dependencies

```bash
npm install
```

### Development Server

```bash
npm run dev
```

Starts the Vite development server on `http://localhost:3000` with hot module replacement.

### Production Build

```bash
npm run build
```

Outputs optimized static assets to the `dist/` directory. Vite performs:

- Tree-shaking and dead code elimination
- CSS minification via PostCSS and Autoprefixer
- JavaScript minification and chunk splitting
- Source map generation (configured in `vite.config.js`)

### Preview Production Build Locally

```bash
npm run preview
```

Serves the `dist/` directory locally to verify the production build before deployment.

### Linting

```bash
npm run lint
```

Runs ESLint across all `.js` and `.jsx` files using the project configuration in `.eslintrc.cjs`.

### Formatting

```bash
npm run format
```

Runs Prettier on all source files in `src/` to enforce consistent code formatting.

### Tests

```bash
npm run test          # Run all tests once
npm run test:watch    # Run tests in watch mode
```

Runs Vitest with jsdom environment. Tests are located alongside source files with `.test.js` or `.test.jsx` extensions.

---

## Vercel Deployment

### Option 1: Git Integration (Recommended)

1. **Import Project**
   - Log in to [vercel.com](https://vercel.com)
   - Click **Add New → Project**
   - Select your Git repository (GitHub, GitLab, or Bitbucket)

2. **Configure Build Settings**
   Vercel auto-detects Vite projects. Verify the following settings:

   | Setting            | Value            |
   | ------------------ | ---------------- |
   | Framework Preset   | Vite             |
   | Build Command      | `npm run build`  |
   | Output Directory   | `dist`           |
   | Install Command    | `npm install`    |
   | Node.js Version    | 18.x             |

3. **Add Environment Variables**
   - Navigate to **Project Settings → Environment Variables**
   - Add all required `VITE_*` variables for each environment scope

4. **Deploy**
   - Click **Deploy** — Vercel builds and deploys automatically
   - Every push to the default branch triggers a production deployment
   - Every push to a non-default branch triggers a preview deployment

### Option 2: Vercel CLI

Install the Vercel CLI globally:

```bash
npm install -g vercel
```

Deploy from the project root:

```bash
# First-time setup — links the project to your Vercel account
vercel

# Production deployment
vercel --prod

# Preview deployment (default for non-production)
vercel
```

### Option 3: Manual Static Hosting

Build the project and deploy the `dist/` directory to any static hosting provider:

```bash
npm run build
# Upload the contents of dist/ to your hosting provider
```

Ensure the hosting provider supports SPA routing (see next section).

---

## SPA Routing Setup

The Horizon DevSecOps Portal is a single-page application (SPA) using React Router v6 with `createBrowserRouter`. All client-side routes must be rewritten to serve `index.html` so that React Router can handle navigation.

### Vercel Configuration

The project includes a `vercel.json` file that configures SPA rewrites:

```json
{
  "rewrites": [
    {
      "source": "/((?!assets/).*)",
      "destination": "/index.html"
    }
  ]
}
```

This rule rewrites all requests (except those to `/assets/`) to `index.html`, allowing React Router to handle routing on the client side.

### Other Hosting Providers

If deploying to a provider other than Vercel, configure equivalent rewrite rules:

**Nginx:**

```nginx
location / {
    try_files $uri $uri/ /index.html;
}
```

**Apache (.htaccess):**

```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>
```

**AWS CloudFront:**

Set the custom error response for 403 and 404 to return `/index.html` with a 200 status code.

---

## Preview Deployments

Vercel automatically creates preview deployments for every push to a non-default branch and for every pull request.

### Preview Deployment Features

- **Unique URL** — each preview deployment gets a unique URL (e.g., `horizon-portal-<hash>.vercel.app`)
- **Branch-specific** — preview URLs are tied to the branch and update on each push
- **Isolated environment** — preview deployments use the **Preview** environment variables
- **Comment integration** — Vercel posts the preview URL as a comment on pull requests (GitHub/GitLab)

### Preview Environment Variables

Configure preview-specific environment variables in Vercel:

- Set `VITE_SSO_ENABLED=false` for preview environments to use mock authentication
- Set `VITE_API_BASE_URL` to a staging API endpoint if available
- Set `VITE_APP_TITLE` to include a preview indicator (e.g., `Horizon Portal [Preview]`)

### Local Preview

To preview the production build locally before pushing:

```bash
npm run build
npm run preview
```

This serves the built assets on `http://localhost:4173`.

---

## Production Deployment Checklist

Complete the following checklist before deploying to production:

### Pre-Deployment

- [ ] All tests pass: `npm run test`
- [ ] Linting passes with no errors: `npm run lint`
- [ ] Production build succeeds: `npm run build`
- [ ] Local preview verified: `npm run preview`
- [ ] Environment variables configured in Vercel for the **Production** scope
- [ ] `VITE_SSO_ENABLED` set to `true` if SSO is configured
- [ ] `VITE_SSO_CLIENT_ID` and `VITE_SSO_AUTHORITY` set if SSO is enabled
- [ ] `VITE_API_BASE_URL` points to the production API endpoint
- [ ] No `.env` files committed to the repository
- [ ] `vercel.json` SPA rewrite rules are in place
- [ ] Source maps are generated (configured in `vite.config.js`)

### Security

- [ ] All sensitive environment variables are stored in Vercel (not in code)
- [ ] No API keys, tokens, or secrets are hardcoded in source files
- [ ] HTTPS is enforced (Vercel provides this by default)
- [ ] Content Security Policy headers are configured if required
- [ ] CORS settings on the backend API allow the production domain

### Performance

- [ ] Production build output size is reasonable (check `dist/` directory)
- [ ] Static assets are served with cache headers (Vercel handles this automatically)
- [ ] Images are optimized and appropriately sized
- [ ] Code splitting is working (Vite handles this via dynamic imports)

### Monitoring

- [ ] Error tracking is configured (e.g., Sentry, Dynatrace RUM)
- [ ] Analytics are configured if required
- [ ] Uptime monitoring is set up for the production URL

### Post-Deployment

- [ ] Verify the production URL loads correctly
- [ ] Verify SPA routing works (navigate to a deep link directly, e.g., `/onboarding/new`)
- [ ] Verify the role selector / SSO login flow works
- [ ] Verify dashboard data loads correctly
- [ ] Verify dark mode toggle works
- [ ] Verify responsive layout on mobile viewports
- [ ] Smoke test critical user flows: onboarding, pipeline generation, compliance artifacts

---

## SSO Integration Notes for Production

The prototype phase uses mock authentication via the `RoleSelector` component. For production deployment, the portal should integrate with an enterprise SSO provider using OAuth 2.0 / OpenID Connect (OIDC).

### Configuration

1. **Enable SSO** by setting the following environment variables:

   ```
   VITE_SSO_ENABLED=true
   VITE_SSO_CLIENT_ID=<your-client-id>
   VITE_SSO_AUTHORITY=<your-identity-provider-url>
   ```

2. **Identity Provider Setup:**
   - Register the Horizon DevSecOps Portal as a client application in your identity provider (e.g., Azure AD, Okta, Ping Identity, Keycloak)
   - Configure the redirect URI to match your production domain: `https://<your-domain>/callback`
   - Request the following scopes: `openid`, `profile`, `email`
   - Configure the token lifetime and refresh token policies per organizational requirements

3. **Role Mapping:**
   - Map identity provider groups/roles to the portal's RBAC roles: `Admin`, `Auditor`, `Engineer`, `Owner`, `Executive`
   - Configure role claims in the ID token or access token
   - Update the `AuthContext` to extract roles from the SSO token instead of using mock users

### Implementation Steps

The SSO integration requires modifications to the following files:

- **`src/contexts/AuthContext.jsx`** — Replace mock login logic with OIDC token validation and user session management
- **`src/pages/LoginPage.jsx`** — Redirect to the SSO authority when `VITE_SSO_ENABLED=true` instead of showing the `RoleSelector`
- **`src/components/auth/ProtectedRoute.jsx`** — Validate the SSO token on each route transition
- **`src/router.jsx`** — Add a `/callback` route to handle the OIDC redirect response

### Recommended Libraries

- **oidc-client-ts** — Lightweight OIDC client for browser-based applications
- **react-oidc-context** — React bindings for oidc-client-ts

> **Note:** These libraries are not included in the current `package.json`. They must be added when SSO integration is implemented.

### HIPAA/CMS Compliance Considerations

- Enforce multi-factor authentication (MFA) at the identity provider level
- Configure session timeout policies (idle timeout and absolute timeout)
- Ensure all authentication events are logged to the audit trail
- Implement token revocation on logout
- Validate that the SSO provider meets HIPAA security requirements

---

## CI/CD Pipeline Recommendations

### Recommended Pipeline Stages

Configure a CI/CD pipeline (GitHub Actions, GitLab CI, Jenkins, or Azure DevOps) with the following stages:

```
1. Install Dependencies    → npm ci
2. Lint                    → npm run lint
3. Unit Tests              → npm run test
4. Build                   → npm run build
5. Preview Deployment      → vercel (for PRs / non-default branches)
6. Production Deployment   → vercel --prod (for default branch)
```

### GitHub Actions Example

Create `.github/workflows/ci.yml`:

```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build-and-test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [18]

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Setup Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run linter
        run: npm run lint

      - name: Run tests
        run: npm run test

      - name: Build production bundle
        run: npm run build

      - name: Upload build artifacts
        uses: actions/upload-artifact@v4
        with:
          name: dist
          path: dist/
          retention-days: 7

  deploy-preview:
    needs: build-and-test
    if: github.event_name == 'pull_request'
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Deploy to Vercel (Preview)
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}

  deploy-production:
    needs: build-and-test
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Deploy to Vercel (Production)
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
```

### Required GitHub Secrets

| Secret                | Description                                      |
| --------------------- | ------------------------------------------------ |
| `VERCEL_TOKEN`        | Vercel personal access token                     |
| `VERCEL_ORG_ID`       | Vercel organization/team ID                      |
| `VERCEL_PROJECT_ID`   | Vercel project ID                                |

Obtain these values from the Vercel dashboard or by running `vercel link` locally.

### GitLab CI Example

Create `.gitlab-ci.yml`:

```yaml
stages:
  - validate
  - test
  - build
  - deploy

variables:
  NODE_VERSION: "18"

cache:
  key: ${CI_COMMIT_REF_SLUG}
  paths:
    - node_modules/

install:
  stage: validate
  image: node:${NODE_VERSION}
  script:
    - npm ci

lint:
  stage: validate
  image: node:${NODE_VERSION}
  script:
    - npm run lint

test:
  stage: test
  image: node:${NODE_VERSION}
  script:
    - npm run test

build:
  stage: build
  image: node:${NODE_VERSION}
  script:
    - npm run build
  artifacts:
    paths:
      - dist/
    expire_in: 7 days

deploy-production:
  stage: deploy
  image: node:${NODE_VERSION}
  only:
    - main
  script:
    - npm install -g vercel
    - vercel --prod --token=$VERCEL_TOKEN
```

### Pipeline Best Practices

1. **Use `npm ci` instead of `npm install`** in CI environments for deterministic, faster installs
2. **Cache `node_modules`** between pipeline runs to reduce install time
3. **Run lint and tests in parallel** when possible to reduce total pipeline duration
4. **Fail fast** — run lint before tests, tests before build
5. **Pin Node.js version** to match the version used in development (18.x)
6. **Store build artifacts** for debugging failed deployments
7. **Use branch protection rules** to require passing CI checks before merging
8. **Enable Vercel's built-in CI/CD** as an alternative to custom pipelines — Vercel automatically builds and deploys on every push when Git integration is configured

### Security Scanning in CI

For production readiness, consider adding security scanning stages:

```
7. SAST Scan             → SonarQube / Checkmarx
8. Dependency Audit      → npm audit / Snyk
9. License Compliance    → license-checker / FOSSA
```

Run `npm audit` as part of the pipeline to catch known vulnerabilities in dependencies:

```bash
npm audit --audit-level=high
```

---

## Troubleshooting

### Build Failures

**Issue:** `npm run build` fails with out-of-memory error.

**Solution:** Increase Node.js memory limit:

```bash
NODE_OPTIONS="--max-old-space-size=4096" npm run build
```

### SPA Routing Returns 404

**Issue:** Navigating directly to a deep link (e.g., `/onboarding/new`) returns a 404 error.

**Solution:** Verify that `vercel.json` is present in the project root with the SPA rewrite rule. If using a different hosting provider, configure equivalent rewrite rules as described in the [SPA Routing Setup](#spa-routing-setup) section.

### Environment Variables Not Available

**Issue:** `import.meta.env.VITE_*` returns `undefined` at runtime.

**Solution:**
- Ensure the variable name starts with `VITE_` — Vite only exposes variables with this prefix
- Verify the variable is set in the correct Vercel environment scope (Production / Preview / Development)
- After changing environment variables in Vercel, trigger a new deployment — existing deployments do not pick up changes
- For local development, ensure the `.env` file is in the project root (not in `src/`)

### Dark Mode Flash on Load

**Issue:** A brief flash of light mode appears before dark mode is applied.

**Solution:** The `AppContext` reads the theme preference from localStorage and applies the `dark` class to `<html>`. This happens after React hydrates. To eliminate the flash, add an inline script in `index.html` before the React bundle:

```html
<script>
  (function() {
    try {
      var theme = JSON.parse(localStorage.getItem('horizon_horizon_theme'));
      if (theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.documentElement.classList.add('dark');
      }
    } catch(e) {}
  })();
</script>
```

### Vercel Deployment Timeout

**Issue:** Vercel deployment times out during the build step.

**Solution:**
- Check the build log for long-running processes
- Ensure `npm ci` is used instead of `npm install` for faster installs
- Verify that the build command is `npm run build` (not a custom script that includes tests)
- Consider upgrading the Vercel plan if the project exceeds free-tier build time limits

### localStorage Quota Exceeded

**Issue:** The portal stops working with a `QuotaExceededError` in the browser console.

**Solution:** The prototype stores all data in localStorage, which has a ~5 MB limit per origin. If the limit is reached:
- Clear the browser's localStorage for the portal domain
- Use the Admin → Data Upload page to re-import only the necessary data
- In production, replace localStorage persistence with a backend API

---

## Additional Resources

- [Vite Documentation](https://vitejs.dev/guide/)
- [Vercel Documentation](https://vercel.com/docs)
- [React Router v6 Documentation](https://reactrouter.com/en/main)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Vitest Documentation](https://vitest.dev/guide/)