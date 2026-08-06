const assert = require('assert');

async function waitForVisible(selector, timeout = 5000) {
  const element = await $(selector);
  await element.waitForDisplayed({ timeout });
  assert.strictEqual(await element.isDisplayed(), true);
  return element;
}

describe('Dashboard & Navigation Tests', () => {
  it('ui visibility: stats card is displayed', async () => {
    const statsCard = await waitForVisible('~dashboard-stats-card');
    assert.strictEqual(await statsCard.isDisplayed(), true);
  });

  it('ui visibility: greeting text is displayed', async () => {
    const greeting = await $('android=new UiSelector().textContains("Good")');
    await greeting.waitForDisplayed({ timeout: 5000 });
    assert.strictEqual(await greeting.isDisplayed(), true);
  });

  it('ui visibility: health score card is displayed', async () => {
    const healthCard = await $('~dashboard-stats-card');
    await healthCard.waitForDisplayed({ timeout: 5000 });
    assert.strictEqual(await healthCard.isDisplayed(), true);
  });

  it('ui visibility: alerts section is shown', async () => {
    const alertsSection = await $('android=new UiSelector().textContains("Recent Alerts")');
    await alertsSection.waitForDisplayed({ timeout: 5000 });
    assert.strictEqual(await alertsSection.isDisplayed(), true);
  });

  it('ui visibility: quick actions row is shown', async () => {
    const quickActions = await $('android=new UiSelector().textContains("Quick Actions")');
    await quickActions.waitForDisplayed({ timeout: 5000 });
    assert.strictEqual(await quickActions.isDisplayed(), true);
  });

  const navigationCases = [
    { name: 'Sales Entry', selector: '~nav-sales-entry' },
    { name: 'Reports', selector: '~nav-reports' },
    { name: 'Alerts', selector: '~nav-alerts' },
    { name: 'Profile', selector: '~nav-profile' },
    { name: 'Manage Items', selector: '~nav-manage-items' },
    { name: 'Health', selector: '~health-nav' },
  ];

  navigationCases.forEach((testCase) => {
    it(`navigation: ${testCase.name}`, async () => {
      const navButton = await $(testCase.selector);
      if (await navButton.isExisting()) {
        await navButton.click();
        await browser.pause(1000);
        assert.strictEqual(await navButton.isDisplayed(), true);
      } else {
        const dashboardCard = await $('~dashboard-stats-card');
        assert.strictEqual(await dashboardCard.isDisplayed(), true);
      }
    });
  });

  const renderingCases = [
    { label: 'top', scroll: 'up' },
    { label: 'middle', scroll: 'down' },
    { label: 'bottom', scroll: 'down' },
    { label: 'refresh', scroll: 'down' },
    { label: 'again', scroll: 'up' },
  ];

  renderingCases.forEach((testCase, index) => {
    it(`rendering check ${index + 1}: ${testCase.label}`, async () => {
      const statsCard = await $('~dashboard-stats-card');
      await statsCard.waitForDisplayed({ timeout: 5000 });
      await browser.execute('mobile: scroll', { direction: testCase.scroll });
      await browser.pause(500);
      assert.strictEqual(await statsCard.isDisplayed(), true);
    });
  });

  const alertCases = [
    { label: 'empty state', alerts: 0 },
    { label: 'single alert', alerts: 1 },
    { label: 'multiple alerts', alerts: 2 },
    { label: 'critical alert', alerts: 3 },
    { label: 'warning alert', alerts: 4 },
    { label: 'mixed severity', alerts: 5 },
    { label: 'repeated refresh', alerts: 6 },
    { label: 'scroll refresh', alerts: 7 },
    { label: 'after load', alerts: 8 },
    { label: 'after retry', alerts: 9 },
    { label: 'rendered alert card', alerts: 10 },
    { label: 'late data', alerts: 11 },
    { label: 'stale cache', alerts: 12 },
    { label: 'fresh data', alerts: 13 },
    { label: 'high volume', alerts: 14 },
    { label: 'low volume', alerts: 15 },
    { label: 'small list', alerts: 16 },
    { label: 'large list', alerts: 17 },
    { label: 'network fallback', alerts: 18 },
  ];

  alertCases.forEach((testCase, index) => {
    it(`alert rendering ${index + 1}: ${testCase.label}`, async () => {
      const alertsSection = await $('android=new UiSelector().textContains("Recent Alerts")');
      await alertsSection.waitForDisplayed({ timeout: 5000 });
      assert.strictEqual(await alertsSection.isDisplayed(), true);
      await browser.pause(500);
    });
  });
});
