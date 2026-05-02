module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/__tests__"],
  moduleFileExtensions: ["ts", "js"],
  collectCoverageFrom: ["src/**/*.ts", "!src/**/*.d.ts"],
  moduleNameMapper: {
    "^@ecu/transport-abstract$":
      "<rootDir>/../../transport/abstract/src/index.ts",
    "^@ecu/dtc-engine$": "<rootDir>/../../services/dtc-engine/src/index.ts",
    "^@ecu/did-registry$": "<rootDir>/../../services/did-registry/src/index.ts",
    "^@ecu/security-engine$":
      "<rootDir>/../../services/security-engine/src/index.ts",
    "^@ecu/timing-engine$": "<rootDir>/../../core/timing-engine/src/index.ts",
  },
};
