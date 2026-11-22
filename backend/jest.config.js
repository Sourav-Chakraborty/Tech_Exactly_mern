/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: "node",
  roots: ["<rootDir>/tests"],
  // SWC strips types only; type checking is done by `npm run typecheck`.
  transform: { "^.+\\.(ts|js|mjs)$": ["@swc/jest"] },
  // sanitize-html's parser (htmlparser2 and friends) ships ESM only; compile it to CommonJS for Jest.
  transformIgnorePatterns: [
    "node_modules/(?!(htmlparser2|domhandler|domutils|dom-serializer|domelementtype|entities)/)",
  ],
  setupFiles: ["<rootDir>/tests/setup/env.ts"],
  setupFilesAfterEnv: ["<rootDir>/tests/setup/db.ts"],
  // Downloading the MongoDB binary on the very first run can take a while.
  testTimeout: 30000,
  collectCoverageFrom: ["src/**/*.ts", "!src/index.ts", "!src/types/**", "!src/scripts/**"],
  coverageReporters: ["text", "text-summary", "html"],
};
