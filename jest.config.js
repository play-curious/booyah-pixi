const { createDefaultPreset } = require("ts-jest");

/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  ...createDefaultPreset(),
  testEnvironment: "jsdom",
  runner: "@kayahr/jest-electron-runner",
  testEnvironment: "@kayahr/jest-electron-runner/environment",
  // setupFilesAfterEnv: ["jest-extended/all"],
  // transform: {
  //   // Support for loading vertex and fragment shaders for PixiJS
  //   "\\.vert$": "jest-raw-loader",
  //   "\\.frag$": "jest-raw-loader",
  //   "\\.wgsl$": "jest-raw-loader",
  // },
};
