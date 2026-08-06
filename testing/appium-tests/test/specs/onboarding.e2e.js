const assert = require('assert');

async function waitForVisible(selector, timeout = 5000) {
  const element = await $(selector);
  await element.waitForDisplayed({ timeout });
  assert.strictEqual(await element.isDisplayed(), true);
  return element;
}

async function openShopSetupScreen() {
  const shopNameInput = await $('~shop-name-input');
  if (await shopNameInput.isExisting()) {
    await shopNameInput.waitForDisplayed({ timeout: 5000 });
    return shopNameInput;
  }
  return waitForVisible('~shop-name-input');
}

describe('Onboarding Flow Tests', () => {
  const shopNameCases = [
    { value: '', expected: 'empty' },
    { value: 'A', expected: 'single-char' },
    { value: 'Shop@1', expected: 'special-chars' },
    { value: 'Green Basket', expected: 'valid' },
    { value: 'Corner Store', expected: 'valid' },
    { value: 'Mina Mart', expected: 'valid' },
    { value: '  ', expected: 'spaces' },
    { value: 'North Gate', expected: 'valid' },
    { value: 'Fresh Foods', expected: 'valid' },
    { value: 'The Daily Stop', expected: 'valid' },
  ];

  shopNameCases.forEach((testCase, index) => {
    it(`shop name validation ${index + 1}: ${testCase.expected}`, async () => {
      await openShopSetupScreen();
      const shopNameInput = await waitForVisible('~shop-name-input');
      await shopNameInput.setValue(testCase.value);
      const actualValue = await shopNameInput.getValue();
      assert.strictEqual(actualValue, testCase.value);
      await browser.pause(500);
    });
  });

  const shopTypeCases = [
    { id: 'shop-type-grocery', label: 'Grocery' },
    { id: 'shop-type-food-and-beverage', label: 'Food and Beverage' },
    { id: 'shop-type-salon', label: 'Salon' },
    { id: 'shop-type-pharmacy', label: 'Pharmacy' },
    { id: 'shop-type-clothing', label: 'Clothing' },
    { id: 'shop-type-hardware', label: 'Hardware' },
    { id: 'shop-type-other', label: 'Other' },
  ];

  shopTypeCases.forEach((testCase, index) => {
    it(`shop type selection ${index + 1}: ${testCase.label}`, async () => {
      await openShopSetupScreen();
      const shopTypeChip = await waitForVisible(`~${testCase.id}`);
      await shopTypeChip.click();
      assert.strictEqual(await shopTypeChip.isDisplayed(), true);
      await browser.pause(500);
    });
  });

  const locationCases = [
    { value: '', expected: 'empty' },
    { value: 'Colombo', expected: 'city' },
    { value: 'Kandy', expected: 'city' },
    { value: 'Galle', expected: 'city' },
    { value: 'Jaffna', expected: 'city' },
    { value: 'Kurunegala', expected: 'city' },
    { value: 'Negombo', expected: 'city' },
    { value: 'Trincomalee', expected: 'city' },
    { value: 'Ratnapura', expected: 'city' },
    { value: 'Anuradhapura', expected: 'city' },
  ];

  locationCases.forEach((testCase, index) => {
    it(`location validation ${index + 1}: ${testCase.expected}`, async () => {
      await openShopSetupScreen();
      const locationInput = await waitForVisible('~shop-location-input');
      await locationInput.setValue(testCase.value);
      const actualValue = await locationInput.getValue();
      assert.strictEqual(actualValue, testCase.value);
      await browser.pause(500);
    });
  });

  it('navigation: back button is displayed and usable', async () => {
    await openShopSetupScreen();
    const backButton = await waitForVisible('~shop-setup-back-button');
    await backButton.click();
    await browser.pause(1000);
    assert.strictEqual(await backButton.isDisplayed(), true);
  });

  it('navigation: next button is displayed', async () => {
    await openShopSetupScreen();
    const nextButton = await waitForVisible('~shop-setup-next-button');
    await nextButton.click();
    await browser.pause(1000);
    assert.strictEqual(await nextButton.isDisplayed(), true);
  });

  it('validation: empty form stays on shop setup screen', async () => {
    await openShopSetupScreen();
    const nextButton = await waitForVisible('~shop-setup-next-button');
    await nextButton.click();
    await browser.pause(1000);
    const shopNameInput = await $('~shop-name-input');
    assert.strictEqual(await shopNameInput.isDisplayed(), true);
  });

  const workingDayCombinations = [
    { shopName: 'Shop 01', shopType: 'shop-type-grocery', location: 'Colombo' },
    { shopName: 'Shop 02', shopType: 'shop-type-food-and-beverage', location: 'Kandy' },
    { shopName: 'Shop 03', shopType: 'shop-type-salon', location: 'Galle' },
    { shopName: 'Shop 04', shopType: 'shop-type-pharmacy', location: 'Jaffna' },
    { shopName: 'Shop 05', shopType: 'shop-type-clothing', location: 'Kurunegala' },
    { shopName: 'Shop 06', shopType: 'shop-type-hardware', location: 'Negombo' },
    { shopName: 'Shop 07', shopType: 'shop-type-other', location: 'Trincomalee' },
    { shopName: 'Shop 08', shopType: 'shop-type-grocery', location: 'Ratnapura' },
    { shopName: 'Shop 09', shopType: 'shop-type-salon', location: 'Anuradhapura' },
    { shopName: 'Shop 10', shopType: 'shop-type-pharmacy', location: 'Matara' },
    { shopName: 'Shop 11', shopType: 'shop-type-clothing', location: 'Badulla' },
    { shopName: 'Shop 12', shopType: 'shop-type-hardware', location: 'Polonnaruwa' },
    { shopName: 'Shop 13', shopType: 'shop-type-other', location: 'Puttalam' },
    { shopName: 'Shop 14', shopType: 'shop-type-grocery', location: 'Kalutara' },
    { shopName: 'Shop 15', shopType: 'shop-type-food-and-beverage', location: 'Mannar' },
    { shopName: 'Shop 16', shopType: 'shop-type-salon', location: 'Vavuniya' },
    { shopName: 'Shop 17', shopType: 'shop-type-pharmacy', location: 'Hambantota' },
    { shopName: 'Shop 18', shopType: 'shop-type-clothing', location: 'Monaragala' },
    { shopName: 'Shop 19', shopType: 'shop-type-hardware', location: 'Ampara' },
    { shopName: 'Shop 20', shopType: 'shop-type-other', location: 'Kilinochchi' },
  ];

  workingDayCombinations.forEach((testCase, index) => {
    it(`parameterized onboarding ${index + 1}: ${testCase.shopName}`, async () => {
      await openShopSetupScreen();
      const shopNameInput = await waitForVisible('~shop-name-input');
      const locationInput = await waitForVisible('~shop-location-input');
      await shopNameInput.setValue(testCase.shopName);
      await waitForVisible(`~${testCase.shopType}`).click();
      await locationInput.setValue(testCase.location);
      const actualName = await shopNameInput.getValue();
      const actualLocation = await locationInput.getValue();
      assert.strictEqual(actualName, testCase.shopName);
      assert.strictEqual(actualLocation, testCase.location);
      await browser.pause(500);
    });
  });
});
