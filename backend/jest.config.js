/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: "node",
  roots: ["<rootDir>/tests"],
  // SWC strips types only; type checking is done by `npm run typecheck`.
  transform: { "^.+\\.ts$": ["@swc/jest"] },
  setupFiles: ["<rootDir>/tests/setup/env.ts"],
  setupFilesAfterEnv: ["<rootDir>/tests/setup/db.ts"],
  // Downloading the MongoDB binary on the very first run can take a while.
  testTimeout: 30000,
  collectCoverageFrom: ["src/**/*.ts", "!src/index.ts", "!src/types/**"],
  coverageReporters: ["text", "text-summary", "html"],
};
