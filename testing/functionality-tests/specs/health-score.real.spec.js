const assert = require('assert');

describe('Health Score screen', () => {
  it('loads correctly', async () => {
    await browser.url('/dashboard/health-score');

    const header = await $('//*[contains(text(), "Health Score")]');
    await header.waitForDisplayed({ timeout: 10000 });
    assert.ok(await header.isDisplayed(), 'Health Score header should be visible');

    const noDataMessage = await $('//*[contains(text(), "No Health Score data available") or contains(text(), "out of 100") or contains(text(), "Week of")]');
    await noDataMessage.waitForDisplayed({ timeout: 10000 });
    assert.ok(await noDataMessage.isDisplayed(), 'Health Score page content should render');
  });
});
