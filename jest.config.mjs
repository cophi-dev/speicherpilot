import nextJest from "next/jest.js";

const createJestConfig = nextJest({
  dir: "./",
});

const customJestConfig = {
  testEnvironment: "jsdom",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
  },
};

const jestConfig = createJestConfig(customJestConfig);

async function withD3Transform() {
  const config = await jestConfig();
  config.transformIgnorePatterns = (config.transformIgnorePatterns ?? []).map((pattern) =>
    typeof pattern === "string" && pattern.includes("(?!(") ? pattern.replace("(?!(", "(?!(d3-shape|d3-path|") : pattern
  );
  return config;
}

export default withD3Transform;
