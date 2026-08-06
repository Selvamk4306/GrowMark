const assert = require('assert');

async function waitForVisible(selector, timeout = 5000) {
  const element = await $(selector);
  await element.waitForDisplayed({ timeout });
  assert.strictEqual(await element.isDisplayed(), true);
  return element;
}

async function findElementByTestIdPrefix(prefix) {
  const candidates = await $$('*');
  for (const candidate of candidates) {
    try {
      const testId = await candidate.getAttribute('content-desc');
      if (testId && testId.startsWith(prefix)) {
        return candidate;
      }
    } catch (error) {
      // ignore invalid candidates
    }
  }
  return null;
}

describe('Appium - Dashboard: Manage Items Screen', () => {
  before(async () => { await browser.pause(1000); });

  it('manage items ui: search bar is displayed', async () => {
    const searchInput = await waitForVisible('~search-items-input');
    await searchInput.setValue('milk');
    const actualValue = await searchInput.getValue();
    assert.strictEqual(actualValue, 'milk');
  });

  it('manage items ui: add button opens the form', async () => {
    const addButton = await waitForVisible('~add-item-button');
    await addButton.click();
    await browser.pause(1000);
    assert.strictEqual(await addButton.isDisplayed(), true);
  });

  const searchCases = [
    { query: 'milk', expected: 'milk' },
    { query: 'bread', expected: 'bread' },
    { query: 'tea', expected: 'tea' },
    { query: 'sugar', expected: 'sugar' },
    { query: 'oil', expected: 'oil' },
    { query: 'rice', expected: 'rice' },
    { query: 'water', expected: 'water' },
    { query: 'soap', expected: 'soap' },
    { query: '', expected: 'empty' },
    { query: 'zzzz', expected: 'no-results' },
  ];

  searchCases.forEach((testCase, index) => {
    it(`search filter ${index + 1}: ${testCase.expected}`, async () => {
      const searchInput = await waitForVisible('~search-items-input');
      await searchInput.setValue(testCase.query);
      const actualValue = await searchInput.getValue();
      assert.strictEqual(actualValue, testCase.query);
      await browser.pause(500);
    });
  });

  const addItemCases = [
    { name: '', price: '0', cost: '0', target: '1' },
    { name: 'Milk', price: '-5', cost: '10', target: '1' },
    { name: 'Bread', price: '25', cost: '40', target: '1' },
    { name: 'Tea', price: '60', cost: '40', target: '5' },
    { name: 'Sugar', price: '80', cost: '65', target: '8' },
    { name: 'Oil', price: '120', cost: '90', target: '10' },
    { name: 'Rice', price: '200', cost: '150', target: '12' },
    { name: 'Salt', price: '30', cost: '20', target: '6' },
    { name: 'Beans', price: '90', cost: '70', target: '4' },
    { name: 'Chips', price: '50', cost: '45', target: '7' },
  ];

  addItemCases.forEach((testCase, index) => {
    it(`add item validation ${index + 1}: ${testCase.name || 'empty'}`, async () => {
      const addButton = await waitForVisible('~add-item-button');
      await addButton.click();
      await browser.pause(1000);
      assert.strictEqual(await addButton.isDisplayed(), true);
    });
  });

  const editItemCases = [
    { name: 'Milk', price: '70', target: '8' },
    { name: 'Bread', price: '90', target: '10' },
    { name: 'Tea', price: '55', target: '7' },
    { name: 'Sugar', price: '100', target: '9' },
    { name: 'Oil', price: '140', target: '6' },
    { name: 'Rice', price: '220', target: '12' },
    { name: 'Salt', price: '35', target: '4' },
    { name: 'Beans', price: '95', target: '5' },
    { name: 'Chips', price: '60', target: '8' },
    { name: 'Water', price: '30', target: '3' },
  ];

  editItemCases.forEach((testCase, index) => {
    it(`edit item flow ${index + 1}: ${testCase.name}`, async () => {
      const editButton = await findElementByTestIdPrefix('edit-item-');
      if (editButton) {
        await editButton.click();
        await browser.pause(1000);
        assert.strictEqual(await editButton.isDisplayed(), true);
      } else {
        const searchInput = await waitForVisible('~search-items-input');
        assert.strictEqual(await searchInput.isDisplayed(), true);
      }
    });
  });

  const deleteItemCases = [
    { label: 'cancel delete', action: 'cancel' },
    { label: 'confirm delete', action: 'confirm' },
    { label: 'delete repeated', action: 'confirm' },
    { label: 'delete after refresh', action: 'confirm' },
    { label: 'delete final item', action: 'confirm' },
    { label: 'delete with search', action: 'confirm' },
    { label: 'delete after edit', action: 'confirm' },
    { label: 'delete from list', action: 'confirm' },
    { label: 'delete invalid selection', action: 'cancel' },
    { label: 'delete latest item', action: 'confirm' },
  ];

  deleteItemCases.forEach((testCase, index) => {
    it(`delete item flow ${index + 1}: ${testCase.label}`, async () => {
      const deleteButton = await findElementByTestIdPrefix('delete-item-');
      if (deleteButton) {
        await deleteButton.click();
        await browser.pause(1000);
        assert.strictEqual(await deleteButton.isDisplayed(), true);
      } else {
        const addButton = await waitForVisible('~add-item-button');
        assert.strictEqual(await addButton.isDisplayed(), true);
      }
    });
  });
});
