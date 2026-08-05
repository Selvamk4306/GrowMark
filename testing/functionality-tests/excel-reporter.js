const ExcelJS = require('exceljs');
const path = require('path');

const reportPath = path.join(__dirname, 'Functionality_Test_Report.xlsx');

// Colors
const NAVY = 'FF1B2A4A';
const GOLD = 'FFF4A833';
const WHITE = 'FFFFFFFF';
const LIGHT_BLUE = 'FFD6E4F0';
const GREEN = 'FF28A745';
const RED = 'FFDC3545';
const LIGHT_GREEN = 'FFD4EDDA';
const LIGHT_RED = 'FFFDEDED';
const GRAY = 'FFF5F7FA';
const DARK_TEXT = 'FF1A1A2E';

class ExcelReporter {
    constructor(options) {
        this.options = options;
        this.workbook = new ExcelJS.Workbook();
        this.summarySheet = this.workbook.addWorksheet('Summary');
        this.detailsSheet = this.workbook.addWorksheet('Details');

        this.summary = { passed: 0, failed: 0, skipped: 0, total: 0 };
        this.testResults = [];
    }

    extractModule(testName) {
        if (!testName) return 'Unknown';
        const match = testName.match(/TestCase_([A-Za-z]+)_/);
        if (match) return match[1];
        return testName.split(' ')[0] || 'Unknown';
    }

    onTestPass(test) {
        this.summary.passed++;
        this.summary.total++;
        this.testResults.push({
            testName: test.title,
            status: 'Passed',
            duration: Math.round(test._duration || 0),
            inputData: test.inputData || '',
            expectedResult: test.expectedResult || '',
            actualResult: test.actualResult || '',
            error: ''
        });
    }

    onTestFail(test, error) {
        this.summary.failed++;
        this.summary.total++;
        this.testResults.push({
            testName: test.title,
            status: 'Failed',
            duration: Math.round(test._duration || 0),
            inputData: test.inputData || '',
            expectedResult: test.expectedResult || '',
            actualResult: test.actualResult || '',
            error: error.message || 'Unknown Error'
        });
    }

    onTestSkip(test) {
        this.summary.skipped++;
        this.summary.total++;
        this.testResults.push({
            testName: test.title,
            status: 'Skipped',
            duration: 0,
            inputData: test.inputData || '',
            expectedResult: test.expectedResult || '',
            actualResult: test.actualResult || '',
            error: ''
        });
    }

    async onRunnerEnd() {
        await this.buildSummarySheet();
        await this.buildDetailsSheet();
        await this.workbook.xlsx.writeFile(reportPath);
        console.log(`\n✅ Functionality Test Report Generated: ${reportPath}`);
    }

    async buildSummarySheet() {
        const ws = this.summarySheet;

        ws.getColumn(1).width = 5;
        ws.getColumn(2).width = 35;
        ws.getColumn(3).width = 18;
        ws.getColumn(4).width = 18;
        ws.getColumn(5).width = 18;
        ws.getColumn(6).width = 18;

        ws.mergeCells('B1:F1');
        const titleCell = ws.getCell('B1');
        titleCell.value = 'GROWMARK FUNCTIONALITY TESTS - AUTOMATED TESTING REPORT';
        titleCell.font = { bold: true, size: 16, color: { argb: WHITE }, name: 'Arial' };
        titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } };
        titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
        ws.getRow(1).height = 40;

        ws.getRow(2).height = 8;
        ws.getRow(3).height = 8;

        const statHeaders = ['', 'TOTAL TEST CASES', '', 'PASSED', 'FAILED', 'SUCCESS RATE'];
        statHeaders.forEach((val, i) => {
            const cell = ws.getCell(4, i + 1);
            cell.value = val;
            cell.font = { bold: true, size: 11, color: { argb: WHITE }, name: 'Arial' };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } };
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
        });
        ws.getRow(4).height = 28;

        const successRate = this.summary.total > 0
            ? ((this.summary.passed / this.summary.total) * 100).toFixed(1) + '%'
            : '0%';

        const statValues = ['', this.summary.total, '', this.summary.passed, this.summary.failed, successRate];
        statValues.forEach((val, i) => {
            const cell = ws.getCell(5, i + 1);
            cell.value = val;
            cell.font = { bold: true, size: 20, color: { argb: GOLD }, name: 'Arial' };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } };
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
        });
        ws.getRow(5).height = 50;

        ws.getRow(6).height = 12;

        const moduleHeaders = ['', 'Module / Screen Name', 'Total Tests', 'Passed', 'Failed', 'Success Rate'];
        moduleHeaders.forEach((val, i) => {
            const cell = ws.getCell(7, i + 1);
            cell.value = val;
            cell.font = { bold: true, size: 11, color: { argb: WHITE }, name: 'Arial' };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } };
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            cell.border = {
                top: { style: 'thin', color: { argb: WHITE } },
                bottom: { style: 'thin', color: { argb: WHITE } },
                left: { style: 'thin', color: { argb: WHITE } },
                right: { style: 'thin', color: { argb: WHITE } }
            };
        });
        ws.getRow(7).height = 26;

        const moduleMap = {};
        this.testResults.forEach(r => {
            const mod = this.extractModule(r.testName);
            if (!moduleMap[mod]) moduleMap[mod] = { passed: 0, failed: 0, total: 0 };
            moduleMap[mod].total++;
            if (r.status === 'Passed') moduleMap[mod].passed++;
            else if (r.status === 'Failed') moduleMap[mod].failed++;
        });

        let rowIdx = 8;
        Object.entries(moduleMap).forEach(([mod, stats], i) => {
            const rate = stats.total > 0
                ? ((stats.passed / stats.total) * 100).toFixed(1) + '%'
                : '0%';
            const rowFill = i % 2 === 0 ? LIGHT_BLUE : WHITE;

            const rowData = ['', mod, stats.total, stats.passed, stats.failed, rate];
            rowData.forEach((val, ci) => {
                const cell = ws.getCell(rowIdx, ci + 1);
                cell.value = val;
                cell.font = { size: 11, name: 'Arial', color: { argb: DARK_TEXT } };
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowFill } };
                cell.alignment = { horizontal: ci === 1 ? 'left' : 'center', vertical: 'middle' };
                cell.border = {
                    top: { style: 'thin', color: { argb: 'FFD0D0D0' } },
                    bottom: { style: 'thin', color: { argb: 'FFD0D0D0' } },
                    left: { style: 'thin', color: { argb: 'FFD0D0D0' } },
                    right: { style: 'thin', color: { argb: 'FFD0D0D0' } }
                };
            });
            ws.getRow(rowIdx).height = 22;
            rowIdx++;
        });

        const totalRate = this.summary.total > 0
            ? ((this.summary.passed / this.summary.total) * 100).toFixed(1) + '%'
            : '0%';
        const totalsData = ['', 'TOTALS', this.summary.total, this.summary.passed, this.summary.failed, totalRate];
        totalsData.forEach((val, ci) => {
            const cell = ws.getCell(rowIdx, ci + 1);
            cell.value = val;
            cell.font = { bold: true, size: 11, color: { argb: WHITE }, name: 'Arial' };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } };
            cell.alignment = { horizontal: ci === 1 ? 'left' : 'center', vertical: 'middle' };
        });
        ws.getRow(rowIdx).height = 26;
    }

    async buildDetailsSheet() {
        const ws = this.detailsSheet;

        ws.getColumn(1).width = 8;
        ws.getColumn(2).width = 20;
        ws.getColumn(3).width = 40;
        ws.getColumn(4).width = 30;
        ws.getColumn(5).width = 45;
        ws.getColumn(6).width = 45;
        ws.getColumn(7).width = 12;
        ws.getColumn(8).width = 16;
        ws.getColumn(9).width = 35;

        const headers = ['Test ID', 'Module / Screen', 'Test Case Name', 'Input Data', 'Expected Result', 'Actual Result', 'Status', 'Duration (ms)', 'Failure Reason'];
        headers.forEach((h, i) => {
            const cell = ws.getCell(1, i + 1);
            cell.value = h;
            cell.font = { bold: true, size: 11, color: { argb: WHITE }, name: 'Arial' };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } };
            cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
            cell.border = {
                top: { style: 'thin', color: { argb: WHITE } },
                bottom: { style: 'thin', color: { argb: WHITE } },
                left: { style: 'thin', color: { argb: WHITE } },
                right: { style: 'thin', color: { argb: WHITE } }
            };
        });
        ws.getRow(1).height = 30;

        this.testResults.forEach((result, idx) => {
            const rowNum = idx + 2;
            const isPassed = result.status === 'Passed';
            const rowFill = isPassed ? LIGHT_GREEN : LIGHT_RED;
            const mod = this.extractModule(result.testName);

            const rowData = [
                `TC${String(idx + 1).padStart(3, '0')}`,
                mod,
                result.testName,
                result.inputData || '',
                result.expectedResult || '',
                result.actualResult || '',
                result.status,
                result.duration,
                result.error || ''
            ];

            rowData.forEach((val, ci) => {
                const cell = ws.getCell(rowNum, ci + 1);
                cell.value = val;
                cell.font = { size: 10, name: 'Arial', color: { argb: DARK_TEXT } };
                cell.alignment = { vertical: 'middle', wrapText: true, horizontal: ci === 6 ? 'center' : 'left' };
                cell.border = {
                    top: { style: 'thin', color: { argb: 'FFE0E0E0' } },
                    bottom: { style: 'thin', color: { argb: 'FFE0E0E0' } },
                    left: { style: 'thin', color: { argb: 'FFE0E0E0' } },
                    right: { style: 'thin', color: { argb: 'FFE0E0E0' } }
                };

                if (ci === 6) {
                    cell.font = {
                        bold: true, size: 10, name: 'Arial',
                        color: { argb: isPassed ? GREEN : RED }
                    };
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowFill } };
                } else {
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: idx % 2 === 0 ? WHITE : GRAY } };
                }
            });
            ws.getRow(rowNum).height = 20;
        });
    }
}

module.exports = ExcelReporter;
