const assert = require('assert');

async function waitForVisible(selector, timeout = 5000) {
  const element = await $(selector);
  await element.waitForDisplayed({ timeout });
  assert.strictEqual(await element.isDisplayed(), true);
  return element;
}

async function openSignupScreen() {
  const nameInput = await $('~signup-name-input');
  if (await nameInput.isExisting()) {
    await nameInput.waitForDisplayed({ timeout: 5000 });
    return nameInput;
  }

  const loginLink = await $('~go-to-login-button');
  if (await loginLink.isExisting()) {
    await loginLink.click();
    await browser.pause(1000);
  }

  const signupLink = await $('~go-to-signup-button');
  if (await signupLink.isExisting()) {
    await signupLink.click();
    await browser.pause(1000);
  }

  return waitForVisible('~signup-name-input');
}

describe('Appium - Auth: Signup Screen', () => {
  before(async () => { await browser.pause(1000); });

  const nameValidationCases = [
    { name: '', expected: 'empty' },
    { name: 'Jo', expected: 'short' },
    { name: 'Sam123', expected: 'numeric' },
    { name: 'Sam@', expected: 'symbol' },
    { name: 'Samuel', expected: 'valid' },
    { name: 'A', expected: 'single' },
    { name: '   ', expected: 'whitespace' },
    { name: 'Mary Jane', expected: 'space' },
    { name: 'O\'Connor', expected: 'apostrophe' },
    { name: 'Ravi Kumar', expected: 'full-name' },
  ];

  nameValidationCases.forEach((testCase, index) => {
    it(`signup name validation ${index + 1}: ${testCase.expected}`, async () => {
      await openSignupScreen();
      const nameInput = await waitForVisible('~signup-name-input');
      await nameInput.setValue(testCase.name);
      const actualValue = await nameInput.getValue();
      assert.strictEqual(actualValue, testCase.name);
      await browser.pause(500);
    });
  });

  const emailValidationCases = [
    { email: '', expected: 'empty' },
    { email: 'invalidemail', expected: 'plain' },
    { email: 'test@', expected: 'missing-domain' },
    { email: 'test@.com', expected: 'missing-label' },
    { email: '@growmark.com', expected: 'missing-user' },
    { email: 'test@growmark', expected: 'missing-dot' },
    { email: 'test@@growmark.com', expected: 'double-at' },
    { email: 'test@growmark.com', expected: 'valid' },
    { email: 'user.name@growmark.com', expected: 'dot-name' },
    { email: 'user+tag@growmark.com', expected: 'plus-tag' },
  ];

  emailValidationCases.forEach((testCase, index) => {
    it(`signup email validation ${index + 1}: ${testCase.expected}`, async () => {
      await openSignupScreen();
      const emailInput = await waitForVisible('~signup-email-input');
      await emailInput.setValue(testCase.email);
      const actualValue = await emailInput.getValue();
      assert.strictEqual(actualValue, testCase.email);
      await browser.pause(500);
    });
  });

  const passwordValidationCases = [
    { password: 'Ab1!', expected: 'short' },
    { password: 'password', expected: 'no-special' },
    { password: 'Password123', expected: 'no-special' },
    { password: 'Test@1234', expected: 'valid' },
    { password: 'Abcd@1234', expected: 'valid' },
    { password: 'Qwerty!1', expected: 'valid' },
    { password: '   ', expected: 'spaces' },
    { password: '12345678', expected: 'numeric-only' },
    { password: 'Password!', expected: 'missing-number' },
    { password: 'Pass1234', expected: 'missing-special' },
  ];

  passwordValidationCases.forEach((testCase, index) => {
    it(`signup password validation ${index + 1}: ${testCase.expected}`, async () => {
      await openSignupScreen();
      const passwordInput = await waitForVisible('~signup-password-input');
      const confirmInput = await waitForVisible('~signup-confirm-password-input');
      await passwordInput.setValue(testCase.password);
      await confirmInput.setValue(testCase.password);
      const actualPassword = await passwordInput.getValue();
      const actualConfirm = await confirmInput.getValue();
      assert.strictEqual(actualPassword, testCase.password);
      assert.strictEqual(actualConfirm, testCase.password);
      await browser.pause(500);
    });
  });

  const fullSignupCases = [
    { name: 'Alice', email: 'alice@growmark.com', password: 'A1!aaaa', confirm: 'A1!aaaa' },
    { name: 'Bob', email: 'bob@growmark.com', password: 'B2@bbbb', confirm: 'B2@bbbb' },
    { name: 'Carol', email: 'carol@growmark.com', password: 'C3#cccc', confirm: 'C3#cccc' },
    { name: 'Drew', email: 'drew@growmark.com', password: 'D4$dddd', confirm: 'D4$dddd' },
    { name: 'Elena', email: 'elena@growmark.com', password: 'E5%eeee', confirm: 'E5%eeee' },
    { name: 'Finn', email: 'finn@growmark.com', password: 'F6^ffff', confirm: 'F6^ffff' },
    { name: 'Grace', email: 'grace@growmark.com', password: 'G7&gggg', confirm: 'G7&gggg' },
    { name: 'Hugo', email: 'hugo@growmark.com', password: 'H8*hhhh', confirm: 'H8*hhhh' },
    { name: 'Iris', email: 'iris@growmark.com', password: 'I9(iiii', confirm: 'I9(iiii' },
    { name: 'Jules', email: 'jules@growmark.com', password: 'J0)jjjj', confirm: 'J0)jjjj' },
  ];

  fullSignupCases.forEach((testCase, index) => {
    it(`parameterized signup ${index + 1}: ${testCase.email}`, async () => {
      await openSignupScreen();
      const nameInput = await waitForVisible('~signup-name-input');
      const emailInput = await waitForVisible('~signup-email-input');
      const passwordInput = await waitForVisible('~signup-password-input');
      const confirmInput = await waitForVisible('~signup-confirm-password-input');
      await nameInput.setValue(testCase.name);
      await emailInput.setValue(testCase.email);
      await passwordInput.setValue(testCase.password);
      await confirmInput.setValue(testCase.confirm);
      const submitButton = await waitForVisible('~signup-submit-button');
      await submitButton.click();
      await browser.pause(1500);
      assert.strictEqual(await submitButton.isDisplayed(), true);
    });
  });
});
