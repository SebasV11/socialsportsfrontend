import { defineConfig } from 'cypress';

export default defineConfig({
  allowCypressEnv: false,
  e2e: {
    specPattern: 'cypress/e2e/**/*.cy.ts',
    supportFile: 'cypress/support/e2e.ts',
    baseUrl: process.env.CYPRESS_BASE_URL ?? 'http://localhost:3000',
    video: false,
    screenshotOnRunFailure: true,
  },
});
