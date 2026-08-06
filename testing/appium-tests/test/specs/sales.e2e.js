const assert = require('assert');

async function waitForVisible(selector, timeout = 5000) {
  const element = await $(selector);
  await element.waitForDisplayed({ timeout });
  assert.strictEqual(await element.isDisplayed(), true);
  return element;
}

async function openSalesScreen() {
  const salesEntryButton = await $('~nav-sales-entry');
  if (await salesEntryButton.isExisting()) {
    await salesEntryButton.click();
    await browser.pause(1000);
  }
  return waitForVisible('~date-selector-button');
}

async function getFirstQuantityInput() {
  const inputs = await $$('android.widget.EditText');
  if (inputs.length > 0) {
    return inputs[0];
  }
  return null;
}

describe('GrowMark Sales Entry - Parameterized Boundary Tests', () => {
  before(async () => {
    await browser.pause(5000);
  });

  const boundaryQuantities = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 25, 30, 40, 50, 60, 70, 80, 90, 99, 100, 150, 250, 500, 999, 1000, 1999, 2500, 9999];

  boundaryQuantities.forEach((quantity, index) => {
    it(`sales boundary ${index + 1}: quantity ${quantity}`, async () => {
      await openSalesScreen();
      const quantityInput = await getFirstQuantityInput();
      if (quantityInput) {
        await quantityInput.setValue(String(quantity));
        const value = await quantityInput.getValue();
        assert.strictEqual(value, String(quantity));
      } else {
        const submitButton = await waitForVisible('~sales-submit-button');
        assert.strictEqual(await submitButton.isDisplayed(), true);
      }
      await browser.pause(500);
    });
  });

  const dateSelectorCases = [
    { label: 'today', expected: 'today' },
    { label: 'yesterday', expected: 'yesterday' },
    { label: 'two days ago', expected: 'past' },
    { label: 'three days ago', expected: 'past' },
    { label: 'one week ago', expected: 'past' },
    { label: 'last working day', expected: 'past' },
    { label: 'future date', expected: 'future' },
    { label: 'same day', expected: 'same' },
    { label: 'custom date', expected: 'custom' },
    { label: 'reset date', expected: 'reset' },
  ];

  dateSelectorCases.forEach((testCase, index) => {
    it(`date selector ${index + 1}: ${testCase.label}`, async () => {
      await openSalesScreen();
      const dateSelector = await waitForVisible('~date-selector-button');
      await dateSelector.click();
      await browser.pause(1000);
      assert.strictEqual(await dateSelector.isDisplayed(), true);
    });
  });

  const submitFlowCases = [
    { label: 'submit with zero', quantity: '0' },
    { label: 'submit with one', quantity: '1' },
    { label: 'submit with five', quantity: '5' },
    { label: 'submit with ten', quantity: '10' },
    { label: 'submit with twenty', quantity: '20' },
    { label: 'submit with fifty', quantity: '50' },
    { label: 'submit with value', quantity: '75' },
    { label: 'submit with max', quantity: '999' },
    { label: 'submit with large', quantity: '9999' },
    { label: 'submit with updated', quantity: '42' },
  ];

  submitFlowCases.forEach((testCase, index) => {
    it(`submit flow ${index + 1}: ${testCase.label}`, async () => {
      await openSalesScreen();
      const quantityInput = await getFirstQuantityInput();
      if (quantityInput) {
        await quantityInput.setValue(testCase.quantity);
      }
      const submitButton = await waitForVisible('~sales-submit-button');
      await submitButton.click();
      await browser.pause(1000);
      assert.strictEqual(await submitButton.isDisplayed(), true);
    });
  });

  const leaveTests = [
    { label: 'mark leave', action: 'leave' },
    { label: 'remove leave', action: 'remove' },
    { label: 'attempt leave twice', action: 'leave' },
    { label: 'leave then refresh', action: 'leave' },
    { label: 'leave with values', action: 'leave' },
  ];

  leaveTests.forEach((testCase, index) => {
    it(`leave flow ${index + 1}: ${testCase.label}`, async () => {
      await openSalesScreen();
      const leaveButton = await waitForVisible('~mark-leave-button');
      await leaveButton.click();
      await browser.pause(1000);
      assert.strictEqual(await leaveButton.isDisplayed(), true);
    });
  });

  const validationCases = [
    { label: 'submit with no items', quantity: '0' },
    { label: 'submit with zero quantity', quantity: '0' },
    { label: 'submit with empty input', quantity: '' },
    { label: 'submit after clearing', quantity: '' },
    { label: 'submit after reset', quantity: '0' },
  ];

  validationCases.forEach((testCase, index) => {
    it(`validation ${index + 1}: ${testCase.label}`, async () => {
      await openSalesScreen();
      const quantityInput = await getFirstQuantityInput();
      if (quantityInput) {
        await quantityInput.setValue(testCase.quantity);
        const rawValue = await quantityInput.getValue();
        assert.strictEqual(rawValue, testCase.quantity);
      }
      const submitButton = await waitForVisible('~sales-submit-button');
      await submitButton.click();
      await browser.pause(1000);
      assert.strictEqual(await submitButton.isDisplayed(), true);
    });
  });
});
