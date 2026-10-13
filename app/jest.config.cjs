module.exports = {
  ...require("../jest.preset.cjs"),
  testEnvironment: "jsdom",
  testMatch: ["<rootDir>/test/**/*.test.ts?(x)"],
  setupFilesAfterEnv: ["<rootDir>/test/setup.ts"],
  moduleNameMapper: {
    "\.(css|svg|png)$": "<rootDir>/test/file-stub.cjs",
    "^virtual:pwa-register/react$": "<rootDir>/test/pwa-stub.cjs",
  },
};
