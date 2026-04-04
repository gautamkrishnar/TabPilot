import type { Options } from '@wdio/types';

const {
  BROWSERSTACK_USERNAME,
  BROWSERSTACK_ACCESS_KEY,
  BASE_URL = 'http://localhost:5173',
  GITHUB_RUN_NUMBER,
} = process.env;

const buildName = GITHUB_RUN_NUMBER
  ? `TabPilot E2E – run #${GITHUB_RUN_NUMBER}`
  : `TabPilot E2E – ${new Date().toISOString().slice(0, 10)}`;

// Must be the same value in both the service opts and bstack:options so the
// remote browser is routed through the correct Local tunnel.
const localIdentifier = `tabpilot-${Date.now()}`;

export const config: Options.Testrunner = {
  // ── BrowserStack Automate connection ─────────────────────────────────────
  user: BROWSERSTACK_USERNAME,
  key: BROWSERSTACK_ACCESS_KEY,
  hostname: 'hub.browserstack.com',

  // ── Test files ───────────────────────────────────────────────────────────
  specs: ['./tests/specs/**/*.e2e.ts'],
  exclude: [],

  // ── Capabilities: Chrome Stable on macOS ─────────────────────────────────
  maxInstances: 1,
  capabilities: [
    {
      browserName: 'Chrome',
      browserVersion: 'latest',
      pageLoadStrategy: 'none',
      'bstack:options': {
        os: 'OS X',
        osVersion: 'Sonoma',
        projectName: 'TabPilot',
        buildName,
        sessionName: 'Session Lifecycle',
        local: true,
        localIdentifier,
        resolution: '1920x1080',
        debug: false,
        networkLogs: false,
      },
    },
  ],

  // ── Runner settings ───────────────────────────────────────────────────────
  logLevel: 'warn',
  bail: 0,
  baseUrl: BASE_URL,
  waitforTimeout: 20_000,
  connectionRetryTimeout: 120_000,
  connectionRetryCount: 0,

  // ── Services ──────────────────────────────────────────────────────────────
  services: [
    [
      'browserstack',
      {
        browserstackLocal: true,
        opts: {
          localIdentifier,
          forceLocal: true,
        },
        // Enables BrowserStack Test Reporting — with the GitHub App installed
        // this posts build status back to the commit/PR as a GitHub Check.
        testReporting: true,
        testReportingOptions: {
          projectName: 'TabPilot',
          buildName,
        },
      },
    ],
  ],

  // ── Framework ─────────────────────────────────────────────────────────────
  framework: 'mocha',
  reporters: [
    'spec',
    [
      'junit',
      {
        outputDir: './reports',
        outputFileFormat: (options: { cid: string }) => `results-${options.cid}.xml`,
      },
    ],
  ],
  mochaOpts: {
    ui: 'bdd',
    timeout: 90_000,
  },
};
