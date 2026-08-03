import type { Options } from '@wdio/types';

export const config: Options.Testrunner = {
    runner: 'local',
    autoCompileOpts: {
        autoCompile: true,
        tsNodeOpts: {
            project: './tsconfig.json',
            transpileOnly: true
        }
    },
    port: 4723,
    specs: [
        './appium.spec.ts'
    ],
    exclude: [],
    maxInstances: 1,
    capabilities: [{
        platformName: 'Android',
        'appium:deviceName': 'Pixel_6',
        'appium:automationName': 'UiAutomator2',
        // Target standard Expo Go or production preview client package
        'appium:appPackage': 'com.selvamks.growmark',
        'appium:appActivity': 'com.selvamks.growmark.MainActivity',
        'appium:noReset': true,
        'appium:newCommandTimeout': 240,
    }],
    logLevel: 'info',
    bail: 0,
    baseUrl: 'http://localhost',
    waitforTimeout: 10000,
    connectionRetryTimeout: 120000,
    connectionRetryCount: 3,
    services: [], // Assumes Appium server is run globally or locally via CLI
    framework: 'mocha',
    reporters: ['spec'],
    mochaOpts: {
        ui: 'bdd',
        timeout: 60000
    }
};
