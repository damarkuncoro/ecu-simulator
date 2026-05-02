module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/__tests__"],
  moduleFileExtensions: ["ts", "js"],
  collectCoverageFrom: ["src/**/*.ts", "!src/**/*.d.ts"],
  passWithNoTests: true,
};
