const ExcelReporter = require('./excel-reporter');

async function generateSampleReport() {
    const reporter = new ExcelReporter({});
    
    // Simulate passes
    for (let i = 1; i <= 150; i++) {
        reporter.onTestPass({ title: `TestCase_Sales_${i}: Should handle quantity...`, _duration: Math.random() * 50 });
    }
    
    for (let i = 1; i <= 145; i++) {
        reporter.onTestPass({ title: `TestCase_HealthScore_${i}: Calculated correctly`, _duration: Math.random() * 30 });
    }
    
    // Simulate a few fails
    for (let i = 146; i <= 150; i++) {
        reporter.onTestFail(
            { title: `TestCase_HealthScore_${i}: Calculated correctly`, _duration: 150 }, 
            { message: "Element '~HealthScoreValue' not found after 5000ms" }
        );
    }
    
    await reporter.onRunnerEnd();
}

generateSampleReport();
