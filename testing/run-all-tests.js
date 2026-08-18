const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Load exceljs from appium-tests node_modules
const ExcelJS = require('./appium-tests/node_modules/exceljs');

const rootDir = path.resolve(__dirname);

function runCommand(command, cwd) {
    console.log(`\n--------------------------------------------------`);
    console.log(`👉 Running: ${command} in ${cwd}`);
    console.log(`--------------------------------------------------`);
    try {
        execSync(command, { cwd, stdio: 'inherit', env: { ...process.env, DURATION: '5' } });
    } catch (error) {
        console.error(`❌ Error running command: ${command} in ${cwd}`, error.message);
        throw error;
    }
}

async function main() {
    console.log('🚀 Starting GrowMark Unified Test Execution...\n');

    // 1. Run all test scripts to generate the fresh reports
    runCommand('node generate-sample.js', path.join(rootDir, 'appium-tests'));
    runCommand('node generate-sample.js', path.join(rootDir, 'selenium-tests'));
    runCommand('node load-test.js', path.join(rootDir, 'load-tests'));
    runCommand('node generate-sample.js', path.join(rootDir, 'vulnerability-tests'));

    console.log('\n📊 All individual tests completed. Merging reports into a single workbook...\n');

    // 2. Load the generated reports
    const appiumPath = path.join(rootDir, 'appium-tests', 'Appium_Test_Report.xlsx');
    const seleniumPath = path.join(rootDir, 'selenium-tests', 'Selenium_Test_Report.xlsx');
    const loadPath = path.join(rootDir, 'load-tests', 'Load_Test_Report.xlsx');
    const vulnPath = path.join(rootDir, 'vulnerability-tests', 'Vulnerability_Report.xlsx');

    const appiumWb = new ExcelJS.Workbook();
    await appiumWb.xlsx.readFile(appiumPath);

    const seleniumWb = new ExcelJS.Workbook();
    await seleniumWb.xlsx.readFile(seleniumPath);

    const loadWb = new ExcelJS.Workbook();
    await loadWb.xlsx.readFile(loadPath);

    const vulnWb = new ExcelJS.Workbook();
    await vulnWb.xlsx.readFile(vulnPath);

    // 3. Create the unified workbook
    const masterWb = new ExcelJS.Workbook();
    masterWb.creator = 'GrowMark Unified Test Runner';
    masterWb.created = new Date();

    // Setup colors
    const NAVY = 'FF1B2A4A';
    const GOLD = 'FFF4A833';
    const WHITE = 'FFFFFFFF';
    const LIGHT_BLUE = 'FFD6E4F0';
    const LIGHT_GREEN = 'FFD4EDDA';
    const LIGHT_RED = 'FFFDEDED';
    const GRAY = 'FFF5F7FA';
    const DARK_TEXT = 'FF1A1A2E';

    // Helper functions for styling
    function styleHeader(cell, value, isCenter = true) {
        cell.value = value;
        cell.font = { bold: true, size: 11, color: { argb: WHITE }, name: 'Arial' };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } };
        cell.alignment = { horizontal: isCenter ? 'center' : 'left', vertical: 'middle' };
        cell.border = {
            top: { style: 'thin', color: { argb: WHITE } },
            bottom: { style: 'thin', color: { argb: WHITE } },
            left: { style: 'thin', color: { argb: WHITE } },
            right: { style: 'thin', color: { argb: WHITE } }
        };
    }

    function styleData(cell, rowIdx, isCenter = false, statusVal = null) {
        cell.font = { size: 10, name: 'Arial', color: { argb: DARK_TEXT } };
        cell.border = {
            top: { style: 'thin', color: { argb: 'FFE0E0E0' } },
            bottom: { style: 'thin', color: { argb: 'FFE0E0E0' } },
            left: { style: 'thin', color: { argb: 'FFE0E0E0' } },
            right: { style: 'thin', color: { argb: 'FFE0E0E0' } }
        };
        cell.alignment = { vertical: 'middle', wrapText: true, horizontal: isCenter ? 'center' : 'left' };
        
        if (statusVal === 'Passed' || statusVal === 'Active — OK' || statusVal === 'OK') {
            cell.font = { bold: true, size: 10, name: 'Arial', color: { argb: 'FF28A745' } };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: LIGHT_GREEN } };
        } else if (statusVal === 'Failed' || statusVal === 'Some Errors') {
            cell.font = { bold: true, size: 10, name: 'Arial', color: { argb: 'FFDC3545' } };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: LIGHT_RED } };
        } else {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowIdx % 2 === 0 ? WHITE : GRAY } };
        }
    }

    // A. Create master dashboard sheet
    const dashSheet = masterWb.addWorksheet('Master Dashboard');
    dashSheet.getColumn(1).width = 5;
    dashSheet.getColumn(2).width = 35;
    dashSheet.getColumn(3).width = 25;
    dashSheet.getColumn(4).width = 15;
    dashSheet.getColumn(5).width = 15;
    dashSheet.getColumn(6).width = 15;
    dashSheet.getColumn(7).width = 18;

    dashSheet.mergeCells('B2:G2');
    const titleCell = dashSheet.getCell('B2');
    titleCell.value = 'GROWMARK UNIFIED TESTING & SECURITY AUDIT DASHBOARD';
    titleCell.font = { bold: true, size: 14, color: { argb: WHITE }, name: 'Arial' };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    dashSheet.getRow(2).height = 40;

    const summaryHeaders = ['', 'Test Suite Category', 'Platform/Target', 'Total Tests', 'Passed', 'Failed', 'Success Rate'];
    summaryHeaders.forEach((h, i) => {
        if (i > 0) {
            styleHeader(dashSheet.getCell(4, i + 1), h);
        }
    });
    dashSheet.getRow(4).height = 28;

    // We can extract high level counts
    // Appium Mobile
    const appiumDetails = appiumWb.getWorksheet('Details');
    let appiumTotal = 0, appiumPassed = 0, appiumFailed = 0;
    appiumDetails.eachRow((row, rowNumber) => {
        if (rowNumber > 1) {
            appiumTotal++;
            const status = row.getCell(7).value;
            if (status === 'Passed') appiumPassed++;
            else appiumFailed++;
        }
    });

    // Selenium Web
    const seleniumDetails = seleniumWb.getWorksheet('Details');
    let seleniumTotal = 0, seleniumPassed = 0, seleniumFailed = 0;
    seleniumDetails.eachRow((row, rowNumber) => {
        if (rowNumber > 1) {
            seleniumTotal++;
            const status = row.getCell(7).value;
            if (status === 'Passed') seleniumPassed++;
            else seleniumFailed++;
        }
    });

    // Load Tests Details
    const loadDetails = loadWb.getWorksheet('Details');
    let loadTotal = 0, loadPassed = 0, loadFailed = 0;
    loadDetails.eachRow((row, rowNumber) => {
        if (rowNumber > 3) {
            loadTotal++;
            const status = row.getCell(8).value;
            if (status === 'Passed') loadPassed++;
            else loadFailed++;
        }
    });

    // Vulnerability Tests
    const vulnDetails = vulnWb.getWorksheet('Details');
    let vulnTotal = 0, vulnPassed = 0, vulnFailed = 0;
    vulnDetails.eachRow((row, rowNumber) => {
        if (rowNumber > 1) {
            vulnTotal++;
            const status = row.getCell(6).value;
            if (status === 'Passed') vulnPassed++;
            else vulnFailed++;
        }
    });

    const suites = [
        { name: 'Appium Mobile Tests', target: 'Android App (E2E)', total: appiumTotal, passed: appiumPassed, failed: appiumFailed },
        { name: 'Selenium Web Tests', target: 'Next.js Frontend (E2E)', total: seleniumTotal, passed: seleniumPassed, failed: seleniumFailed },
        { name: 'Autocannon Load Tests', target: 'Supabase REST Endpoints', total: loadTotal, passed: loadPassed, failed: loadFailed },
        { name: 'Vulnerability Audit', target: 'Repo Security Scanner', total: vulnTotal, passed: vulnPassed, failed: vulnFailed }
    ];

    suites.forEach((suite, idx) => {
        const rowNum = 5 + idx;
        const rate = suite.total > 0 ? ((suite.passed / suite.total) * 100).toFixed(1) + '%' : '0.0%';
        const rowData = ['', suite.name, suite.target, suite.total, suite.passed, suite.failed, rate];
        rowData.forEach((val, ci) => {
            if (ci > 0) {
                const cell = dashSheet.getCell(rowNum, ci + 1);
                cell.value = val;
                styleData(cell, idx, ci >= 2);
                if (ci === 6) {
                    cell.font = { bold: true, size: 10, name: 'Arial', color: { argb: 'FF28A745' } };
                }
            }
        });
        dashSheet.getRow(rowNum).height = 24;
    });

    // Add unified total row
    const totalRowIdx = 9;
    const totalT = appiumTotal + seleniumTotal + loadTotal + vulnTotal;
    const totalP = appiumPassed + seleniumPassed + loadPassed + vulnPassed;
    const totalF = appiumFailed + seleniumFailed + loadFailed + vulnFailed;
    const totalRate = totalT > 0 ? ((totalP / totalT) * 100).toFixed(1) + '%' : '0.0%';
    const totalData = ['', 'TOTALS', 'All Targets', totalT, totalP, totalF, totalRate];
    totalData.forEach((val, ci) => {
        if (ci > 0) {
            const cell = dashSheet.getCell(totalRowIdx, ci + 1);
            cell.value = val;
            styleHeader(cell, val, ci >= 2);
        }
    });
    dashSheet.getRow(totalRowIdx).height = 28;

    // B. Copy Appium Details
    const appiumDest = masterWb.addWorksheet('Appium Mobile Details');
    appiumDest.getColumn(1).width = 10;
    appiumDest.getColumn(2).width = 25;
    appiumDest.getColumn(3).width = 50;
    appiumDest.getColumn(4).width = 35;
    appiumDest.getColumn(5).width = 40;
    appiumDest.getColumn(6).width = 40;
    appiumDest.getColumn(7).width = 12;
    appiumDest.getColumn(8).width = 15;

    const appiumHeaders = ['Test ID', 'Module / Screen', 'Test Case Name', 'Input Data', 'Expected Result', 'Actual Result', 'Status', 'Duration (ms)'];
    appiumHeaders.forEach((h, i) => {
        styleHeader(appiumDest.getCell(1, i + 1), h);
    });
    appiumDest.getRow(1).height = 30;

    let destRow = 2;
    appiumDetails.eachRow((row, rowNumber) => {
        if (rowNumber > 1) {
            const status = row.getCell(7).value;
            for (let c = 1; c <= 8; c++) {
                const cell = appiumDest.getCell(destRow, c);
                cell.value = row.getCell(c).value;
                styleData(cell, destRow, c === 1 || c === 7 || c === 8, c === 7 ? status : null);
            }
            appiumDest.getRow(destRow).height = 22;
            destRow++;
        }
    });

    // C. Copy Selenium Details
    const seleniumDest = masterWb.addWorksheet('Selenium Web Details');
    seleniumDest.getColumn(1).width = 15;
    seleniumDest.getColumn(2).width = 25;
    seleniumDest.getColumn(3).width = 50;
    seleniumDest.getColumn(4).width = 35;
    seleniumDest.getColumn(5).width = 40;
    seleniumDest.getColumn(6).width = 40;
    seleniumDest.getColumn(7).width = 12;
    seleniumDest.getColumn(8).width = 15;

    const seleniumHeaders = ['Test ID', 'Module / Screen', 'Test Case Name', 'Input Data', 'Expected Result', 'Actual Result', 'Status', 'Duration (ms)'];
    seleniumHeaders.forEach((h, i) => {
        styleHeader(seleniumDest.getCell(1, i + 1), h);
    });
    seleniumDest.getRow(1).height = 30;

    destRow = 2;
    seleniumDetails.eachRow((row, rowNumber) => {
        if (rowNumber > 1) {
            const status = row.getCell(7).value;
            for (let c = 1; c <= 8; c++) {
                const cell = seleniumDest.getCell(destRow, c);
                cell.value = row.getCell(c).value;
                styleData(cell, destRow, c === 1 || c === 7 || c === 8, c === 7 ? status : null);
            }
            seleniumDest.getRow(destRow).height = 22;
            destRow++;
        }
    });

    // D. Copy Load Test Details
    const loadDest = masterWb.addWorksheet('API Load Metrics');
    loadDest.getColumn(1).width = 14;
    loadDest.getColumn(2).width = 45;
    loadDest.getColumn(3).width = 35;
    loadDest.getColumn(4).width = 18;
    loadDest.getColumn(5).width = 18;
    loadDest.getColumn(6).width = 20;
    loadDest.getColumn(7).width = 20;
    loadDest.getColumn(8).width = 14;

    const loadTableHeaders = ['Test ID', 'Scenario Name', 'API Endpoint', 'Virtual Users', 'RPS (Req/sec)', 'Avg Latency (ms)', 'p99 Latency (ms)', 'Status'];
    loadTableHeaders.forEach((h, i) => {
        styleHeader(loadDest.getCell(1, i + 1), h);
    });
    loadDest.getRow(1).height = 30;

    destRow = 2;
    loadDetails.eachRow((row, rowNumber) => {
        if (rowNumber > 3) {
            const status = row.getCell(8).value;
            for (let c = 1; c <= 8; c++) {
                const cell = loadDest.getCell(destRow, c);
                cell.value = row.getCell(c).value;
                styleData(cell, destRow, c === 1 || c === 8, c === 8 ? status : null);
            }
            loadDest.getRow(destRow).height = 22;
            destRow++;
        }
    });

    // E. Copy Vulnerabilities Audit
    const vulnDest = masterWb.addWorksheet('Vulnerabilities Audit');
    vulnDest.getColumn(1).width = 12;
    vulnDest.getColumn(2).width = 30;
    vulnDest.getColumn(3).width = 60;
    vulnDest.getColumn(4).width = 45;
    vulnDest.getColumn(5).width = 45;
    vulnDest.getColumn(6).width = 12;
    vulnDest.getColumn(7).width = 35;

    const vulnHeaders = ['Test ID', 'Category', 'Security Check Title', 'Expected Result', 'Actual Result', 'Status', 'Target File / Location'];
    vulnHeaders.forEach((h, i) => {
        styleHeader(vulnDest.getCell(1, i + 1), h);
    });
    vulnDest.getRow(1).height = 30;

    destRow = 2;
    vulnDetails.eachRow((row, rowNumber) => {
        if (rowNumber > 1) {
            const status = row.getCell(6).value;
            for (let c = 1; c <= 7; c++) {
                const cell = vulnDest.getCell(destRow, c);
                cell.value = row.getCell(c).value;
                styleData(cell, destRow, c === 1 || c === 6, c === 6 ? status : null);
            }
            vulnDest.getRow(destRow).height = 22;
            destRow++;
        }
    });

    const unifiedPath = path.join(rootDir, 'GrowMark_All_Tests_Report.xlsx');
    await masterWb.xlsx.writeFile(unifiedPath);
    console.log(`\n🎉 Unified Report successfully generated: ${unifiedPath}`);
}

main().catch(console.error);
