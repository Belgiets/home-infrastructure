import type { Config } from "jest";
import nextJest from "next/jest";

const createJestConfig = nextJest({
  // Path to Next.js app
  dir: "./",
});

const config: Config = {
  // Test environment for React components
  testEnvironment: "jsdom",

  // Setup file to run before tests
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],

  // Module path aliases (match tsconfig)
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },

  // Test file patterns
  testMatch: ["**/*.test.ts", "**/*.test.tsx"],

  // Coverage settings
  collectCoverageFrom: [
    "src/**/*.{ts,tsx}",
    "!src/**/*.d.ts",
    "!src/**/layout.tsx",
  ],
};

export default createJestConfig(config);
