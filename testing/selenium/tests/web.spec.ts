import { expect } from 'chai';
import { after, before, describe, it } from 'node:test';
import { Builder, By, until } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome';
import { generateWebExcelReport } from '../excel-generator';
import { WebTestCase, webTestCases } from './test-data';

const WEB_APP_URL = process.env.WEB_APP_URL || 'http://localhost:5000';
const EXCEL_OUTPUT = `${process.cwd()}/GrowMark-Web-Test-Report.xlsx`;

type WebTestResult = {
  id: string;
  module: string;
  name: string;
  expected: string;
  actual: string;
  status: 'Passed' | 'Failed' | 'Skipped';
  duration: number;
  error?: string;
};

async function waitForLoginPage(driver: any) {
  await driver.wait(until.elementLocated(By.xpath("//input[@placeholder='Enter your email']")), 10000);
}

async function waitForSignupPage(driver: any) {
  await driver.wait(until.elementLocated(By.xpath("//input[@placeholder='Enter your email']")), 10000);
}

async function waitForOnboardingPage(driver: any) {
  await driver.wait(until.elementLocated(By.xpath("//button[contains(.,'Continue') or contains(.,'Continue')]")), 10000);
}

async function verifyRouteOrRedirect(driver: any, path: string) {
  const url = await driver.getCurrentUrl();
  return url.includes(path) || url.includes('/auth/login');
}

function getRouteForType(testCase: WebTestCase): string {
  switch (testCase.type) {
    case 'login':
      return '/auth/login';
    case 'signup':
      return '/auth/signup';
    case 'onboarding':
      return '/onboarding/language-select';
    case 'dashboard':
      return '/dashboard';
    case 'profile':
      return '/dashboard/profile';
    case 'sales':
      return '/dashboard/sales-entry';
    case 'reports':
      return '/dashboard/reports';
    case 'health-score':
      return '/dashboard/health-score';
    default:
      return '/';
  }
}

function getTypeDescription(type: WebTestCase['type']): string {
  return type === 'login' || type === 'signup' ? `${type} page` : `${type} route`;
}

async function executeTest(driver: any, testCase: WebTestCase): Promise<WebTestResult> {
  const start = Date.now();
  const route = getRouteForType(testCase);
  const expected = testCase.expected;
  let actual = '';
  let status: WebTestResult['status'] = 'Passed';
  let error: string | undefined;

  try {
    await driver.get(`${WEB_APP_URL}${route}`);

    if (testCase.type === 'login') {
      await waitForLoginPage(driver);
      actual = 'Login page loaded successfully.';
    } else if (testCase.type === 'signup') {
      await waitForSignupPage(driver);
      actual = 'Signup page loaded successfully.';
    } else if (testCase.type === 'onboarding') {
      await waitForOnboardingPage(driver);
      actual = 'Onboarding language page loaded successfully.';
    } else {
      if (await verifyRouteOrRedirect(driver, route)) {
        actual = `Route ${route} loaded or redirected to auth as expected.`;
      } else {
        actual = `Expected route or auth redirect for ${route}`;
        status = 'Failed';
        error = `Route ${route} did not load or redirect as expected.`;
      }
    }

    if (testCase.type === 'login' && testCase.data?.email === 'invalid-email') {
      const loginButton = await driver.findElement(By.xpath("//button[normalize-space()='Login']"));
      const emailField = await driver.findElement(By.xpath("//input[@placeholder='Enter your email']"));
      const passwordField = await driver.findElement(By.xpath("//input[@placeholder='Enter your password']"));
      await emailField.clear();
      await emailField.sendKeys('invalid-email');
      await passwordField.clear();
      await passwordField.sendKeys('Password123');
      await loginButton.click();
      const invalidAlert = await driver.wait(until.elementLocated(By.xpath("//*[contains(text(),'Invalid email') or contains(text(),'Please enter a valid email') or contains(text(),'invalid email')]")), 10000);
      actual = await invalidAlert.getText();
    }

    if (testCase.type === 'signup' && testCase.data?.confirmPassword && testCase.data.password !== testCase.data.confirmPassword) {
      const signupButton = await driver.findElement(By.xpath("//button[normalize-space()='Create Account']"));
      const fullNameField = await driver.findElement(By.xpath("//input[@placeholder='Enter your full name']"));
      const emailField = await driver.findElement(By.xpath("//input[@placeholder='Enter your email']"));
      const passwordField = await driver.findElement(By.xpath("//input[@placeholder='Create a password']"));
      const confirmPasswordField = await driver.findElement(By.xpath("//input[@placeholder='Confirm your password']"));
      await fullNameField.clear();
      await fullNameField.sendKeys(testCase.data.fullName || 'Test User');
      await emailField.clear();
      await emailField.sendKeys(testCase.data.email || 'testuser@example.com');
      await passwordField.clear();
      await passwordField.sendKeys(testCase.data.password || 'Password123');
      await confirmPasswordField.clear();
      await confirmPasswordField.sendKeys(testCase.data.confirmPassword || 'Password123');
      await signupButton.click();
      const errorText = await driver.wait(until.elementLocated(By.xpath("//*[contains(text(),'Passwords do not match') or contains(text(),'Passwords must match') or contains(text(),'Please fill in all fields') or contains(text(),'Invalid email')]")), 10000);
      actual = await errorText.getText();
    }

    if (testCase.data?.language) {
      const languageOption = await driver.findElement(By.xpath(`//button[contains(.,'${testCase.data.language}') or //div[contains(.,'${testCase.data.language}')]]`));
      await languageOption.click();
      const continueButton = await driver.findElement(By.xpath("//button[contains(.,'Continue') or contains(.,'Continue')]"));
      actual = await continueButton.getText();
    }

  } catch (err: any) {
    status = 'Failed';
    error = err.message;
    actual = `Exception during test execution: ${err.message}`;
  }

  return {
    id: testCase.id,
    module: testCase.module,
    name: testCase.name,
    expected,
    actual,
    status,
    duration: Date.now() - start,
    error,
  };
}

describe('GrowMark Web E2E Master Suite', function () {
  this.timeout(300000);
  let driver: any;
  const results: WebTestResult[] = [];

  before(async () => {
    const chromeOptions = new chrome.Options();
    chromeOptions.addArguments('--headless=new', '--disable-gpu', '--no-sandbox', '--window-size=1600,1200');

    driver = await new Builder().forBrowser('chrome').setChromeOptions(chromeOptions).build();
  });

  after(async () => {
    if (driver) {
      await driver.quit();
    }
    await generateWebExcelReport(results, EXCEL_OUTPUT);
  });

  webTestCases.forEach(testCase => {
    it(`${testCase.id}: ${testCase.name}`, async function () {
      const result = await executeTest(driver, testCase);
      results.push(result);
      expect(result.status).to.equal('Passed', result.actual);
    });
  });
});
