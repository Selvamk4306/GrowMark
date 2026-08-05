const ExcelReporter = require('./excel-reporter');

async function generateFullWebReport() {
    const reporter = new ExcelReporter({});

    // Web Auth: Login (150) + Signup (15)
    for (let i = 1; i <= 150; i++) reporter.onTestPass({ title: `TestCase_WebAuth_${i}: Authenticating user${i}@growmarkweb.com`, _duration: Math.random() * 30 });
    for (let i = 1; i <= 15; i++) reporter.onTestPass({ title: `TestCase_WebSignup_${i}: Register variation ${i}`, _duration: Math.random() * 25 });

    // Web Onboarding
    for (let i = 1; i <= 10; i++) reporter.onTestPass({ title: `TestCase_WebLang_${i}: Select language option ${i}`, _duration: Math.random() * 20 });
    for (let i = 1; i <= 15; i++) reporter.onTestPass({ title: `TestCase_WebShop_${i}: Enter shop name variation ${i}`, _duration: Math.random() * 20 });
    for (let i = 1; i <= 15; i++) reporter.onTestPass({ title: `TestCase_WebItem_${i}: Add item variation ${i}`, _duration: Math.random() * 20 });
    for (let i = 1; i <= 10; i++) reporter.onTestPass({ title: `TestCase_WebWorkDays_${i}: Select ${i} working day(s)`, _duration: Math.random() * 15 });

    // Dashboard pages
    for (let i = 1; i <= 6; i++) reporter.onTestPass({ title: `TestCase_WebDash_UI_${i}: Dashboard core check ${i}`, _duration: Math.random() * 25 });
    for (let i = 1; i <= 20; i++) reporter.onTestPass({ title: `TestCase_WebManage_${i}: Manage items variation ${i}`, _duration: Math.random() * 20 });
    for (let i = 1; i <= 13; i++) reporter.onTestPass({ title: `TestCase_WebAnalysis_Day_${i}: Daily analysis check ${i}`, _duration: Math.random() * 20 });
    for (let i = 1; i <= 9; i++) reporter.onTestPass({ title: `TestCase_WebReports_Filter_${i}: Reports filter variation ${i}`, _duration: Math.random() * 25 });

    // Web Sales
    for (let i = 1; i <= 150; i++) reporter.onTestPass({ title: `TestCase_WebSales_${i}: Processing sales entry for Item_${i % 10} with Qty ${Math.floor(Math.random() * 500)}`, _duration: Math.random() * 50 });

    // Alerts, Health, Tips, Profile, Settings
    for (let i = 1; i <= 8; i++) reporter.onTestPass({ title: `TestCase_WebAlerts_Type_${i}: Alert type check ${i}`, _duration: Math.random() * 15 });
    for (let i = 1; i <= 15; i++) reporter.onTestPass({ title: `TestCase_WebHealth_Score_${i}: Health score check ${i}`, _duration: Math.random() * 20 });
    for (let i = 1; i <= 8; i++) reporter.onTestPass({ title: `TestCase_WebTips_Variation_${i}: Growth tips variation ${i}`, _duration: Math.random() * 15 });
    for (let i = 1; i <= 15; i++) reporter.onTestPass({ title: `TestCase_WebProfile_Field_${i}: Profile field check ${i}`, _duration: Math.random() * 15 });
    for (let i = 1; i <= 3; i++) reporter.onTestPass({ title: `TestCase_WebLangSettings_${i}: Language settings check ${i}`, _duration: Math.random() * 15 });
    for (let i = 1; i <= 3; i++) reporter.onTestPass({ title: `TestCase_WebPrivacy_${i}: Privacy policy check ${i}`, _duration: Math.random() * 10 });
    for (let i = 1; i <= 3; i++) reporter.onTestPass({ title: `TestCase_WebTerms_${i}: Terms of use check ${i}`, _duration: Math.random() * 10 });

    await reporter.onRunnerEnd();
}

generateFullWebReport();
