/**
 * Comprehensive toolchain catalog data for Horizon DevSecOps Portal
 * @module toolchainData
 */

import { TOOLCHAIN_CATEGORIES } from './constants.js';

// ---------------------------------------------------------------------------
// Extended Toolchain Categories (beyond what constants.js provides)
// ---------------------------------------------------------------------------
export const EXTENDED_CATEGORIES = Object.freeze({
  ...TOOLCHAIN_CATEGORIES,
  BUILD: 'Build',
  API_MANAGEMENT: 'API Management',
  MESSAGING: 'Messaging',
  DATABASE: 'Database',
  DATA_PLATFORM: 'Data Platform',
  QE_TOOLS: 'QE Tools',
});

// ---------------------------------------------------------------------------
// Toolchain Catalog
// ---------------------------------------------------------------------------
export const TOOLCHAIN_CATALOG = Object.freeze([
  // -------------------------------------------------------------------------
  // Source Control
  // -------------------------------------------------------------------------
  {
    id: 'bitbucket',
    name: 'Bitbucket',
    category: TOOLCHAIN_CATEGORIES.SOURCE_CONTROL,
    description:
      'Git-based source code repository hosting service for collaborative code management and pull request workflows.',
    defaultConfig: {
      serverUrl: '',
      project: '',
      repository: '',
      defaultBranch: 'main',
      webhooksEnabled: true,
      branchStrategy: 'gitflow',
    },
  },
  {
    id: 'svn',
    name: 'Apache Subversion (SVN)',
    category: TOOLCHAIN_CATEGORIES.SOURCE_CONTROL,
    description:
      'Centralized version control system for tracking changes in files and directories over time.',
    defaultConfig: {
      serverUrl: '',
      repository: '',
      trunkPath: '/trunk',
      branchesPath: '/branches',
      tagsPath: '/tags',
      authMethod: 'basic',
    },
  },
  {
    id: 'github',
    name: 'GitHub',
    category: TOOLCHAIN_CATEGORIES.SOURCE_CONTROL,
    description:
      'Cloud-based Git repository hosting platform with integrated CI/CD, code review, and project management.',
    defaultConfig: {
      organization: '',
      repository: '',
      defaultBranch: 'main',
      webhooksEnabled: true,
      branchProtection: true,
      requirePrReviews: true,
    },
  },
  {
    id: 'gitlab',
    name: 'GitLab',
    category: TOOLCHAIN_CATEGORIES.SOURCE_CONTROL,
    description:
      'Complete DevOps platform with integrated source control, CI/CD pipelines, and security scanning.',
    defaultConfig: {
      serverUrl: '',
      group: '',
      project: '',
      defaultBranch: 'main',
      webhooksEnabled: true,
      mergeRequestApprovals: 1,
    },
  },

  // -------------------------------------------------------------------------
  // CI/CD
  // -------------------------------------------------------------------------
  {
    id: 'jenkins',
    name: 'Jenkins',
    category: TOOLCHAIN_CATEGORIES.CI_CD,
    description:
      'Open-source automation server for building, testing, and deploying software with extensive plugin ecosystem.',
    defaultConfig: {
      serverUrl: '',
      pipelineType: 'declarative',
      agentLabel: 'default',
      credentialsId: '',
      pollScm: false,
      webhookTrigger: true,
      concurrentBuilds: 1,
      timeoutMinutes: 60,
    },
  },
  {
    id: 'github-actions',
    name: 'GitHub Actions',
    category: TOOLCHAIN_CATEGORIES.CI_CD,
    description:
      'Native CI/CD platform integrated with GitHub for automating build, test, and deployment workflows.',
    defaultConfig: {
      workflowPath: '.github/workflows',
      runnerType: 'ubuntu-latest',
      concurrency: 1,
      timeoutMinutes: 60,
      artifactRetentionDays: 30,
    },
  },
  {
    id: 'azure-devops',
    name: 'Azure DevOps',
    category: TOOLCHAIN_CATEGORIES.CI_CD,
    description:
      'Microsoft cloud-based DevOps platform providing CI/CD pipelines, boards, repos, and test plans.',
    defaultConfig: {
      organization: '',
      project: '',
      pipelineType: 'yaml',
      agentPool: 'Azure Pipelines',
      serviceConnection: '',
      timeoutMinutes: 60,
    },
  },

  // -------------------------------------------------------------------------
  // Build
  // -------------------------------------------------------------------------
  {
    id: 'maven',
    name: 'Apache Maven',
    category: EXTENDED_CATEGORIES.BUILD,
    description:
      'Build automation and project management tool primarily for Java projects, using POM-based configuration.',
    defaultConfig: {
      javaVersion: '17',
      mavenVersion: '3.9',
      goals: 'clean install',
      profiles: [],
      settingsFile: 'settings.xml',
      localRepository: '~/.m2/repository',
      skipTests: false,
    },
  },
  {
    id: 'gradle',
    name: 'Gradle',
    category: EXTENDED_CATEGORIES.BUILD,
    description:
      'Flexible build automation tool supporting multi-language development with Groovy or Kotlin DSL.',
    defaultConfig: {
      javaVersion: '17',
      gradleVersion: '8.4',
      tasks: 'clean build',
      daemon: true,
      parallel: true,
      caching: true,
    },
  },

  // -------------------------------------------------------------------------
  // Containerization
  // -------------------------------------------------------------------------
  {
    id: 'docker',
    name: 'Docker',
    category: TOOLCHAIN_CATEGORIES.CONTAINERIZATION,
    description:
      'Container platform for building, shipping, and running applications in isolated environments.',
    defaultConfig: {
      registryUrl: '',
      namespace: '',
      dockerfilePath: 'Dockerfile',
      buildContext: '.',
      tagStrategy: 'semver',
      scanOnPush: true,
      multiStage: true,
    },
  },
  {
    id: 'podman',
    name: 'Podman',
    category: TOOLCHAIN_CATEGORIES.CONTAINERIZATION,
    description:
      'Daemonless container engine for developing, managing, and running OCI containers with rootless support.',
    defaultConfig: {
      registryUrl: '',
      namespace: '',
      containerfilePath: 'Containerfile',
      buildContext: '.',
      rootless: true,
      tagStrategy: 'semver',
    },
  },
  {
    id: 'kubernetes',
    name: 'Kubernetes',
    category: TOOLCHAIN_CATEGORIES.CONTAINERIZATION,
    description:
      'Container orchestration platform for automating deployment, scaling, and management of containerized applications.',
    defaultConfig: {
      clusterUrl: '',
      namespace: 'default',
      kubeconfig: '',
      ingressEnabled: true,
      resourceLimits: true,
      hpaEnabled: false,
      replicaCount: 2,
    },
  },
  {
    id: 'openshift',
    name: 'OpenShift',
    category: TOOLCHAIN_CATEGORIES.CONTAINERIZATION,
    description:
      'Enterprise Kubernetes platform with built-in developer tools, CI/CD, and security features.',
    defaultConfig: {
      clusterUrl: '',
      project: '',
      routeEnabled: true,
      buildStrategy: 'source',
      deploymentStrategy: 'rolling',
      resourceLimits: true,
    },
  },

  // -------------------------------------------------------------------------
  // Artifact Management
  // -------------------------------------------------------------------------
  {
    id: 'nexus',
    name: 'Nexus Repository',
    category: TOOLCHAIN_CATEGORIES.ARTIFACT_MANAGEMENT,
    description:
      'Universal artifact repository manager supporting Maven, npm, Docker, and other package formats.',
    defaultConfig: {
      serverUrl: '',
      repositoryType: 'hosted',
      format: 'maven2',
      versionPolicy: 'release',
      cleanupPolicy: 'default',
      blobStore: 'default',
      strictContentValidation: true,
    },
  },
  {
    id: 'artifactory',
    name: 'JFrog Artifactory',
    category: TOOLCHAIN_CATEGORIES.ARTIFACT_MANAGEMENT,
    description:
      'Universal artifact repository for managing binaries and build artifacts across the software supply chain.',
    defaultConfig: {
      serverUrl: '',
      repositoryType: 'local',
      packageType: 'maven',
      xrayEnabled: true,
      retentionDays: 90,
      replicationEnabled: false,
    },
  },

  // -------------------------------------------------------------------------
  // API Management
  // -------------------------------------------------------------------------
  {
    id: 'apigee',
    name: 'Apigee',
    category: EXTENDED_CATEGORIES.API_MANAGEMENT,
    description:
      'Full-lifecycle API management platform for designing, securing, deploying, and monitoring APIs.',
    defaultConfig: {
      organization: '',
      environment: 'dev',
      proxyBasePath: '/api/v1',
      targetUrl: '',
      authType: 'oauth2',
      quotaLimit: 1000,
      quotaInterval: 1,
      quotaTimeUnit: 'minute',
      spikeArrestRate: '30ps',
      analyticsEnabled: true,
    },
  },

  // -------------------------------------------------------------------------
  // Messaging
  // -------------------------------------------------------------------------
  {
    id: 'kafka',
    name: 'Apache Kafka',
    category: EXTENDED_CATEGORIES.MESSAGING,
    description:
      'Distributed event streaming platform for high-throughput, fault-tolerant real-time data pipelines.',
    defaultConfig: {
      brokerUrl: '',
      clusterId: '',
      topicPrefix: '',
      partitions: 3,
      replicationFactor: 3,
      retentionMs: 604800000,
      compressionType: 'snappy',
      securityProtocol: 'SASL_SSL',
      saslMechanism: 'PLAIN',
    },
  },
  {
    id: 'ibm-event-streams',
    name: 'IBM Event Streams',
    category: EXTENDED_CATEGORIES.MESSAGING,
    description:
      'Enterprise-grade Apache Kafka service on IBM Cloud for event-driven architectures and real-time analytics.',
    defaultConfig: {
      bootstrapServers: '',
      apiKey: '',
      topicPrefix: '',
      partitions: 3,
      retentionHours: 168,
      throughputMbps: 75,
      schemaRegistryEnabled: true,
      encryptionEnabled: true,
    },
  },

  // -------------------------------------------------------------------------
  // Monitoring (Observability)
  // -------------------------------------------------------------------------
  {
    id: 'dynatrace',
    name: 'Dynatrace',
    category: TOOLCHAIN_CATEGORIES.MONITORING,
    description:
      'AI-powered full-stack observability platform for monitoring applications, infrastructure, and user experience.',
    defaultConfig: {
      apiUrl: '',
      environmentId: '',
      apiToken: '',
      oneAgentEnabled: true,
      realUserMonitoring: true,
      syntheticMonitoring: false,
      logIngestion: true,
      customMetrics: true,
      alertingProfileId: '',
    },
  },
  {
    id: 'prometheus',
    name: 'Prometheus',
    category: TOOLCHAIN_CATEGORIES.MONITORING,
    description:
      'Open-source systems monitoring and alerting toolkit with a dimensional data model and PromQL query language.',
    defaultConfig: {
      serverUrl: '',
      scrapeInterval: '15s',
      evaluationInterval: '15s',
      retentionDays: 15,
      alertmanagerUrl: '',
      remoteWriteEnabled: false,
    },
  },
  {
    id: 'grafana',
    name: 'Grafana',
    category: TOOLCHAIN_CATEGORIES.MONITORING,
    description:
      'Open-source analytics and interactive visualization platform for metrics, logs, and traces.',
    defaultConfig: {
      serverUrl: '',
      defaultDatasource: 'prometheus',
      dashboardFolder: '',
      alertingEnabled: true,
      anonymousAccess: false,
      orgId: 1,
    },
  },
  {
    id: 'datadog',
    name: 'Datadog',
    category: TOOLCHAIN_CATEGORIES.MONITORING,
    description:
      'Cloud-scale monitoring and security platform for infrastructure, applications, and logs.',
    defaultConfig: {
      apiKey: '',
      appKey: '',
      site: 'datadoghq.com',
      apmEnabled: true,
      logsEnabled: true,
      rumEnabled: false,
      profilingEnabled: false,
    },
  },

  // -------------------------------------------------------------------------
  // Logging
  // -------------------------------------------------------------------------
  {
    id: 'splunk',
    name: 'Splunk',
    category: TOOLCHAIN_CATEGORIES.LOGGING,
    description:
      'Enterprise platform for searching, monitoring, and analyzing machine-generated data and logs.',
    defaultConfig: {
      apiUrl: '',
      index: 'main',
      sourcetype: 'json',
      hecToken: '',
      hecPort: 8088,
      retentionDays: 90,
      searchHeadUrl: '',
      sslEnabled: true,
    },
  },
  {
    id: 'elastic',
    name: 'Elastic (ELK Stack)',
    category: TOOLCHAIN_CATEGORIES.LOGGING,
    description:
      'Distributed search and analytics engine for centralized logging, observability, and security analytics.',
    defaultConfig: {
      apiUrl: '',
      clusterName: '',
      indexPattern: 'app-logs-*',
      shards: 1,
      replicas: 1,
      retentionDays: 30,
      kibanaUrl: '',
      ilmPolicyEnabled: true,
      apmEnabled: true,
    },
  },

  // -------------------------------------------------------------------------
  // Security Scanning
  // -------------------------------------------------------------------------
  {
    id: 'fortify',
    name: 'Fortify',
    category: TOOLCHAIN_CATEGORIES.SECURITY_SCANNING,
    description:
      'Static and dynamic application security testing platform for identifying vulnerabilities in source code and running applications.',
    defaultConfig: {
      sscUrl: '',
      applicationName: '',
      applicationVersion: '',
      scanType: 'sast',
      buildId: '',
      sensorPoolId: '',
      issueFilterSet: 'Security Auditor View',
      criticalThreshold: 0,
      highThreshold: 0,
      failOnSeverity: 'critical',
    },
  },
  {
    id: 'appscan',
    name: 'HCL AppScan',
    category: TOOLCHAIN_CATEGORIES.SECURITY_SCANNING,
    description:
      'Application security testing suite providing SAST, DAST, and IAST capabilities for enterprise applications.',
    defaultConfig: {
      serverUrl: '',
      applicationId: '',
      scanType: 'static',
      presenceId: '',
      scanConfiguration: 'Default',
      failOnSeverity: 'high',
      personalScan: false,
      openSourceAnalysis: true,
    },
  },
  {
    id: 'cyberark',
    name: 'CyberArk',
    category: TOOLCHAIN_CATEGORIES.SECURITY_SCANNING,
    description:
      'Privileged access management platform for securing credentials, secrets, and privileged accounts.',
    defaultConfig: {
      vaultUrl: '',
      appId: '',
      safeName: '',
      folderName: 'Root',
      connectionTimeout: 30,
      secretRotationDays: 90,
      conjurEnabled: false,
      conjurAccount: '',
      conjurApplianceUrl: '',
    },
  },
  {
    id: 'sonarqube',
    name: 'SonarQube',
    category: TOOLCHAIN_CATEGORIES.SECURITY_SCANNING,
    description:
      'Continuous code quality and security inspection platform for detecting bugs, vulnerabilities, and code smells.',
    defaultConfig: {
      serverUrl: '',
      projectKey: '',
      qualityGate: 'Sonar way',
      coverageThreshold: 80,
      duplicationsThreshold: 3,
      language: 'java',
      exclusions: '**/test/**,**/vendor/**',
      failOnQualityGate: true,
    },
  },
  {
    id: 'checkmarx',
    name: 'Checkmarx',
    category: TOOLCHAIN_CATEGORIES.SECURITY_SCANNING,
    description:
      'Application security testing platform providing SAST, SCA, and supply chain security analysis.',
    defaultConfig: {
      serverUrl: '',
      projectName: '',
      teamName: '',
      preset: 'Checkmarx Default',
      scanType: 'full',
      incremental: false,
      failOnSeverity: 'high',
      excludeFolders: 'test,node_modules',
    },
  },
  {
    id: 'snyk',
    name: 'Snyk',
    category: TOOLCHAIN_CATEGORIES.SECURITY_SCANNING,
    description:
      'Developer-first security platform for finding and fixing vulnerabilities in code, dependencies, and containers.',
    defaultConfig: {
      organization: '',
      projectName: '',
      severityThreshold: 'high',
      failOnIssues: true,
      monitorOnBuild: true,
      targetFramework: '',
      policyPath: '.snyk',
    },
  },
  {
    id: 'twistlock',
    name: 'Twistlock (Prisma Cloud)',
    category: TOOLCHAIN_CATEGORIES.SECURITY_SCANNING,
    description:
      'Cloud-native security platform for container and serverless security with vulnerability management.',
    defaultConfig: {
      consoleUrl: '',
      project: '',
      complianceThreshold: 'high',
      vulnerabilityThreshold: 'critical',
      blockOnFailure: true,
      ciScanEnabled: true,
      runtimeProtection: true,
    },
  },
  {
    id: 'black-duck',
    name: 'Black Duck',
    category: TOOLCHAIN_CATEGORIES.SECURITY_SCANNING,
    description:
      'Software composition analysis tool for managing open-source security, license compliance, and code quality risks.',
    defaultConfig: {
      serverUrl: '',
      projectName: '',
      versionName: '',
      scanMode: 'intelligent',
      failOnSeverity: 'high',
      licenseCheck: true,
      snippetMatching: false,
      policyCheck: true,
    },
  },

  // -------------------------------------------------------------------------
  // ITSM
  // -------------------------------------------------------------------------
  {
    id: 'servicenow',
    name: 'ServiceNow',
    category: TOOLCHAIN_CATEGORIES.ITSM,
    description:
      'Enterprise IT service management platform for incident, change, and problem management workflows.',
    defaultConfig: {
      instanceUrl: '',
      apiVersion: 'v2',
      assignmentGroup: '',
      changeModel: 'standard',
      approvalRequired: true,
      autoCloseResolved: true,
      slaEnabled: true,
      cmdbIntegration: true,
      notificationEnabled: true,
    },
  },

  // -------------------------------------------------------------------------
  // Collaboration
  // -------------------------------------------------------------------------
  {
    id: 'jira',
    name: 'Jira',
    category: TOOLCHAIN_CATEGORIES.COLLABORATION,
    description:
      'Agile project management and issue tracking tool for planning, tracking, and releasing software.',
    defaultConfig: {
      serverUrl: '',
      projectKey: '',
      boardType: 'scrum',
      issueTypes: ['Story', 'Bug', 'Task', 'Epic'],
      workflowScheme: 'default',
      sprintDurationWeeks: 2,
      estimationMethod: 'story_points',
      notificationsEnabled: true,
    },
  },
  {
    id: 'confluence',
    name: 'Confluence',
    category: TOOLCHAIN_CATEGORIES.COLLABORATION,
    description:
      'Team workspace and knowledge management platform for creating, sharing, and collaborating on documentation.',
    defaultConfig: {
      serverUrl: '',
      spaceKey: '',
      parentPageId: '',
      templateEnabled: true,
      versioningEnabled: true,
      permissionScheme: 'default',
    },
  },
  {
    id: 'microsoft-teams',
    name: 'Microsoft Teams',
    category: TOOLCHAIN_CATEGORIES.COLLABORATION,
    description:
      'Unified communication and collaboration platform with chat, video meetings, and application integrations.',
    defaultConfig: {
      tenantId: '',
      teamId: '',
      channelId: '',
      webhookUrl: '',
      notifyOnBuildFailure: true,
      notifyOnDeployment: true,
      notifyOnIncident: true,
    },
  },
  {
    id: 'slack',
    name: 'Slack',
    category: TOOLCHAIN_CATEGORIES.COLLABORATION,
    description:
      'Channel-based messaging platform for team communication with extensive bot and integration support.',
    defaultConfig: {
      workspaceUrl: '',
      channelId: '',
      webhookUrl: '',
      botToken: '',
      notifyOnBuildFailure: true,
      notifyOnDeployment: true,
      notifyOnIncident: true,
    },
  },

  // -------------------------------------------------------------------------
  // QE Tools (Testing)
  // -------------------------------------------------------------------------
  {
    id: 'tosca',
    name: 'Tricentis Tosca',
    category: EXTENDED_CATEGORIES.QE_TOOLS,
    description:
      'Model-based test automation platform for continuous testing across enterprise applications.',
    defaultConfig: {
      serverUrl: '',
      workspace: '',
      projectName: '',
      executionListId: '',
      testEventType: 'regression',
      parallelExecution: true,
      maxParallelAgents: 5,
      reportFormat: 'junit',
      riskBasedTesting: true,
    },
  },
  {
    id: 'selenium',
    name: 'Selenium',
    category: EXTENDED_CATEGORIES.QE_TOOLS,
    description:
      'Open-source browser automation framework for end-to-end web application testing across multiple browsers.',
    defaultConfig: {
      gridUrl: '',
      browser: 'chrome',
      headless: true,
      implicitWaitSeconds: 10,
      pageLoadTimeoutSeconds: 30,
      screenshotOnFailure: true,
      videoRecording: false,
      parallelThreads: 4,
    },
  },
  {
    id: 'neoload',
    name: 'NeoLoad',
    category: EXTENDED_CATEGORIES.QE_TOOLS,
    description:
      'Performance testing platform for web and mobile applications with real-time analytics and CI/CD integration.',
    defaultConfig: {
      serverUrl: '',
      workspaceId: '',
      testSettingsId: '',
      scenario: 'default',
      virtualUsers: 100,
      rampUpMinutes: 5,
      durationMinutes: 30,
      slaThresholds: {
        avgResponseTimeMs: 2000,
        errorRatePercent: 1,
        throughputPerSec: 100,
      },
      cloudLoadGenerators: true,
    },
  },
  {
    id: 'qtest',
    name: 'qTest',
    category: EXTENDED_CATEGORIES.QE_TOOLS,
    description:
      'Test management platform for planning, executing, and tracking test cases with CI/CD integration.',
    defaultConfig: {
      serverUrl: '',
      projectId: '',
      testCycleId: '',
      automationIntegration: true,
      defectTracking: true,
      reportingEnabled: true,
      jiraIntegration: true,
      requirementsTraceability: true,
    },
  },
  {
    id: 'browserstack',
    name: 'BrowserStack',
    category: EXTENDED_CATEGORIES.QE_TOOLS,
    description:
      'Cloud-based cross-browser testing platform for testing web and mobile applications on real devices and browsers.',
    defaultConfig: {
      username: '',
      accessKey: '',
      projectName: '',
      buildName: '',
      os: 'Windows',
      osVersion: '11',
      browser: 'Chrome',
      browserVersion: 'latest',
      local: false,
      debug: true,
      networkLogs: true,
      consoleLogs: 'verbose',
    },
  },
  {
    id: 'cypress',
    name: 'Cypress',
    category: EXTENDED_CATEGORIES.QE_TOOLS,
    description:
      'JavaScript-based end-to-end testing framework for modern web applications with real-time reloading.',
    defaultConfig: {
      baseUrl: '',
      viewportWidth: 1280,
      viewportHeight: 720,
      defaultCommandTimeout: 10000,
      video: true,
      screenshotOnRunFailure: true,
      retries: 2,
      browser: 'chrome',
      specPattern: 'cypress/e2e/**/*.cy.{js,jsx}',
    },
  },

  // -------------------------------------------------------------------------
  // Database
  // -------------------------------------------------------------------------
  {
    id: 'postgres',
    name: 'PostgreSQL',
    category: EXTENDED_CATEGORIES.DATABASE,
    description:
      'Advanced open-source relational database with strong ACID compliance, extensibility, and SQL standards support.',
    defaultConfig: {
      host: '',
      port: 5432,
      database: '',
      schema: 'public',
      sslMode: 'require',
      maxConnections: 100,
      connectionPoolSize: 20,
      statementTimeout: 30000,
      backupEnabled: true,
      backupSchedule: '0 2 * * *',
      replicationEnabled: false,
    },
  },
  {
    id: 'mongodb',
    name: 'MongoDB',
    category: EXTENDED_CATEGORIES.DATABASE,
    description:
      'Document-oriented NoSQL database for flexible schema design, horizontal scaling, and high-performance data access.',
    defaultConfig: {
      connectionString: '',
      database: '',
      replicaSet: '',
      authSource: 'admin',
      readPreference: 'primaryPreferred',
      writeConcern: 'majority',
      maxPoolSize: 50,
      retryWrites: true,
      tls: true,
      backupEnabled: true,
    },
  },
  {
    id: 'oracle',
    name: 'Oracle Database',
    category: EXTENDED_CATEGORIES.DATABASE,
    description:
      'Enterprise relational database management system with advanced features for high availability and data security.',
    defaultConfig: {
      host: '',
      port: 1521,
      serviceName: '',
      schema: '',
      connectionPoolMin: 5,
      connectionPoolMax: 50,
      walletEnabled: false,
      tdeEnabled: true,
      backupEnabled: true,
    },
  },

  // -------------------------------------------------------------------------
  // Data Platform
  // -------------------------------------------------------------------------
  {
    id: 'databricks',
    name: 'Databricks',
    category: EXTENDED_CATEGORIES.DATA_PLATFORM,
    description:
      'Unified analytics platform for data engineering, data science, and machine learning on a lakehouse architecture.',
    defaultConfig: {
      workspaceUrl: '',
      clusterId: '',
      clusterType: 'standard',
      sparkVersion: '13.3.x-scala2.12',
      nodeType: 'Standard_DS3_v2',
      minWorkers: 1,
      maxWorkers: 8,
      autoTerminationMinutes: 30,
      unityCatalogEnabled: true,
      deltaLakeEnabled: true,
      secretScope: '',
    },
  },
  {
    id: 'snowflake',
    name: 'Snowflake',
    category: EXTENDED_CATEGORIES.DATA_PLATFORM,
    description:
      'Cloud-native data platform for data warehousing, data lakes, and data sharing with elastic scalability.',
    defaultConfig: {
      accountUrl: '',
      warehouse: '',
      database: '',
      schema: 'PUBLIC',
      role: '',
      autoSuspendSeconds: 300,
      autoResume: true,
      minClusterCount: 1,
      maxClusterCount: 3,
      encryptionEnabled: true,
    },
  },
]);

// ---------------------------------------------------------------------------
// Lookup helpers
// ---------------------------------------------------------------------------

/**
 * Get all tools for a given category.
 * @param {string} category - The toolchain category name.
 * @returns {Array<Object>} Array of tool objects matching the category.
 */
export const getToolsByCategory = (category) => {
  return TOOLCHAIN_CATALOG.filter((tool) => tool.category === category);
};

/**
 * Get a single tool by its id.
 * @param {string} id - The unique tool identifier.
 * @returns {Object|undefined} The tool object or undefined if not found.
 */
export const getToolById = (id) => {
  return TOOLCHAIN_CATALOG.find((tool) => tool.id === id);
};

/**
 * Get all unique categories present in the catalog.
 * @returns {Array<string>} Sorted array of category names.
 */
export const getAllCategories = () => {
  const categories = new Set(TOOLCHAIN_CATALOG.map((tool) => tool.category));
  return [...categories].sort();
};

/**
 * Get the catalog grouped by category.
 * @returns {Object} Object keyed by category name with arrays of tool objects.
 */
export const getCatalogByCategory = () => {
  return TOOLCHAIN_CATALOG.reduce((acc, tool) => {
    if (!acc[tool.category]) {
      acc[tool.category] = [];
    }
    acc[tool.category].push(tool);
    return acc;
  }, {});
};

/**
 * Search tools by name or description (case-insensitive).
 * @param {string} query - The search query string.
 * @returns {Array<Object>} Array of matching tool objects.
 */
export const searchTools = (query) => {
  if (!query || typeof query !== 'string') {
    return [...TOOLCHAIN_CATALOG];
  }
  const lowerQuery = query.toLowerCase();
  return TOOLCHAIN_CATALOG.filter(
    (tool) =>
      tool.name.toLowerCase().includes(lowerQuery) ||
      tool.description.toLowerCase().includes(lowerQuery),
  );
};