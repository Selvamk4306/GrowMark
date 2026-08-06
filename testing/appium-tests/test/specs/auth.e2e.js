const assert = require('assert');

async function waitForVisible(selector, timeout = 5000) {
  const element = await $(selector);
  await element.waitForDisplayed({ timeout });
  assert.strictEqual(await element.isDisplayed(), true);
  return element;
}

async function openLoginScreen() {
  const emailInput = await $('~login-email-input');
  if (await emailInput.isExisting()) {
    await emailInput.waitForDisplayed({ timeout: 5000 });
    return emailInput;
  }

  const signupLink = await $('~go-to-signup-button');
  if (await signupLink.isExisting()) {
    await signupLink.click();
    await browser.pause(1000);
  }

  return waitForVisible('~login-email-input');
}

describe('Authentication Flow Tests', () => {
  const loginValidationCases = [
    { name: 'empty email and password', email: '', password: '' },
    { name: 'empty email only', email: '', password: 'Test@1234' },
    { name: 'empty password only', email: 'testuser@growmark.com', password: '' },
    { name: 'invalid email simple', email: 'invalidemail', password: 'Test@1234' },
    { name: 'invalid email missing domain', email: 'test@', password: 'Test@1234' },
    { name: 'invalid email missing local', email: '@growmark.com', password: 'Test@1234' },
    { name: 'invalid email missing dot', email: 'test@com', password: 'Test@1234' },
    { name: 'wrong password short', email: 'testuser@growmark.com', password: 'wrongpass' },
    { name: 'wrong password numeric', email: 'testuser@growmark.com', password: '123' },
    { name: 'wrong password with spaces', email: 'testuser@growmark.com', password: 'Test 1234' },
    { name: 'sql injection email', email: "' OR 1=1 --", password: 'Test@1234' },
    { name: 'sql injection password', email: 'testuser@growmark.com', password: "' OR 1=1 --" },
    { name: 'very long email', email: 'a'.repeat(250) + '@growmark.com', password: 'Test@1234' },
    { name: 'very long password', email: 'testuser@growmark.com', password: 'A'.repeat(120) },
    { name: 'whitespace email', email: '   ', password: 'Test@1234' },
    { name: 'whitespace password', email: 'testuser@growmark.com', password: '   ' },
    { name: 'special chars email', email: 'test!user@growmark.com', password: 'Test@1234' },
    { name: 'special chars password', email: 'testuser@growmark.com', password: 'P@ss!word#' },
    { name: 'mixed case email', email: 'TestUser@GrowMark.com', password: 'Test@1234' },
    { name: 'numeric email', email: '123456789', password: 'Test@1234' },
  ];

  loginValidationCases.forEach((testCase) => {
    it(`login validation: ${testCase.name}`, async () => {
      await openLoginScreen();
      const emailInput = await waitForVisible('~login-email-input');
      const passwordInput = await waitForVisible('~login-password-input');
      await emailInput.setValue(testCase.email);
      await passwordInput.setValue(testCase.password);
      const submitButton = await waitForVisible('~login-submit-button');
      await submitButton.click();
      await browser.pause(1500);
      const stillOnLogin = await $('~login-email-input');
      assert.strictEqual(await stillOnLogin.isDisplayed(), true);
    });
  });

  const signupValidationCases = [
    { name: 'empty signup form', name: '', email: '', password: '', confirm: '' },
    { name: 'empty name field', name: '', email: 'new@growmark.com', password: 'Test@1234', confirm: 'Test@1234' },
    { name: 'empty email field', name: 'Sam', email: '', password: 'Test@1234', confirm: 'Test@1234' },
    { name: 'empty password field', name: 'Sam', email: 'new@growmark.com', password: '', confirm: '' },
    { name: 'empty confirm password field', name: 'Sam', email: 'new@growmark.com', password: 'Test@1234', confirm: '' },
    { name: 'short name', name: 'Jo', email: 'new@growmark.com', password: 'Test@1234', confirm: 'Test@1234' },
    { name: 'name with numbers', name: 'Sam123', email: 'new@growmark.com', password: 'Test@1234', confirm: 'Test@1234' },
    { name: 'name with symbols', name: 'Sam@', email: 'new@growmark.com', password: 'Test@1234', confirm: 'Test@1234' },
    { name: 'invalid email format', name: 'Sam', email: 'invalidemail', password: 'Test@1234', confirm: 'Test@1234' },
    { name: 'invalid email with trailing dot', name: 'Sam', email: 'test@.com', password: 'Test@1234', confirm: 'Test@1234' },
    { name: 'weak password no special', name: 'Sam', email: 'new@growmark.com', password: 'Password123', confirm: 'Password123' },
    { name: 'weak password short', name: 'Sam', email: 'new@growmark.com', password: 'Ab1!', confirm: 'Ab1!' },
    { name: 'password mismatch', name: 'Sam', email: 'new@growmark.com', password: 'Test@1234', confirm: 'Test@1235' },
    { name: 'whitespace name', name: '   ', email: 'new@growmark.com', password: 'Test@1234', confirm: 'Test@1234' },
    { name: 'whitespace email', name: 'Sam', email: '   ', password: 'Test@1234', confirm: 'Test@1234' },
    { name: 'whitespace password', name: 'Sam', email: 'new@growmark.com', password: '   ', confirm: '   ' },
    { name: 'mixed case password', name: 'Sam', email: 'new@growmark.com', password: 'Test@1234', confirm: 'Test@1234' },
    { name: 'long name', name: 'Sam'.repeat(20), email: 'new@growmark.com', password: 'Test@1234', confirm: 'Test@1234' },
    { name: 'special char email', name: 'Sam', email: 'sam!@growmark.com', password: 'Test@1234', confirm: 'Test@1234' },
    { name: 'numeric password', name: 'Sam', email: 'new@growmark.com', password: '12345678', confirm: '12345678' },
  ];

  signupValidationCases.forEach((testCase) => {
    it(`signup validation: ${testCase.name}`, async () => {
      const signupLink = await $('~go-to-signup-button');
      if (await signupLink.isExisting()) {
        await signupLink.click();
        await browser.pause(1000);
      }
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
      await browser.pause(1000);
      assert.strictEqual(await submitButton.isDisplayed(), true);
    });
  });

  const parameterizedLoginCases = [
    { email: 'alice@growmark.com', password: 'A1!aa', expected: 'email-set' },
    { email: 'bob@growmark.com', password: 'B2@bb', expected: 'email-set' },
    { email: 'carol@growmark.com', password: 'C3#cc', expected: 'email-set' },
    { email: 'dave@growmark.com', password: 'D4$dd', expected: 'email-set' },
    { email: 'erin@growmark.com', password: 'E5%ee', expected: 'email-set' },
    { email: 'frank@growmark.com', password: 'F6^ff', expected: 'email-set' },
    { email: 'grace@growmark.com', password: 'G7&gg', expected: 'email-set' },
    { email: 'henry@growmark.com', password: 'H8*hh', expected: 'email-set' },
    { email: 'ivy@growmark.com', password: 'I9(iii', expected: 'email-set' },
    { email: 'jack@growmark.com', password: 'J0)jjj', expected: 'email-set' },
    { email: 'kate@growmark.com', password: 'K11kk', expected: 'email-set' },
    { email: 'liam@growmark.com', password: 'L12ll', expected: 'email-set' },
    { email: 'maya@growmark.com', password: 'M13mm', expected: 'email-set' },
    { email: 'noah@growmark.com', password: 'N14nn', expected: 'email-set' },
    { email: 'olivia@growmark.com', password: 'O15oo', expected: 'email-set' },
    { email: 'peter@growmark.com', password: 'P16pp', expected: 'email-set' },
    { email: 'quinn@growmark.com', password: 'Q17qq', expected: 'email-set' },
    { email: 'ruby@growmark.com', password: 'R18rr', expected: 'email-set' },
    { email: 'sam@growmark.com', password: 'S19ss', expected: 'email-set' },
    { email: 'tina@growmark.com', password: 'T20tt', expected: 'email-set' },
  ];

  parameterizedLoginCases.forEach((testCase, index) => {
    it(`parameterized login ${index + 1}: ${testCase.email}`, async () => {
      await openLoginScreen();
      const emailInput = await waitForVisible('~login-email-input');
      const passwordInput = await waitForVisible('~login-password-input');
      await emailInput.setValue(testCase.email);
      await passwordInput.setValue(testCase.password);
      const emailValue = await emailInput.getValue();
      const passwordValue = await passwordInput.getValue();
      assert.strictEqual(emailValue, testCase.email);
      assert.strictEqual(passwordValue, testCase.password);
      const submitButton = await waitForVisible('~login-submit-button');
      await submitButton.click();
      await browser.pause(1000);
      assert.strictEqual(await submitButton.isDisplayed(), true);
    });
  });
});
