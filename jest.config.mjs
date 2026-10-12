export default {
  roots: ["<rootDir>/src", "<rootDir>/scripts", "<rootDir>/.agents/skills"],
  testEnvironment: "node",
  testMatch: ["**/*.test.ts", "**/*.test.mts"],
  moduleFileExtensions: ["ts", "mts", "js", "mjs", "json"],
  extensionsToTreatAsEsm: [".ts", ".mts"],
  transform: { "\\.m?ts$": "<rootDir>/jest.transform.mjs" },
};
