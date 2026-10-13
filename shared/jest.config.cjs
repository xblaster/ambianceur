module.exports = {
  ...require("../jest.preset.cjs"),
  testEnvironment: "node",
  testMatch: ["<rootDir>/src/**/*.test.ts"],
};
