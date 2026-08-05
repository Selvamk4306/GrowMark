const ExcelJS = require('exceljs');
const path = require('path');

const reportPath = path.join(__dirname, 'Test_Report.xlsx');

class ExcelReporter {
    constructor(options) {
        this.options = options;
        this.workbook = new ExcelJS.Workbook();
        this.summarySheet = this.workbook.addWorksheet('Summary');
        this.detailsSheet = this.workbook.addWorksheet('Details');
        
        this.summary = { passed: 0, failed: 0, skipped: 0, total: 0 };
        this.testResults = [];
        
        this.setupSheets();
    }

    setupSheets() {
        this.summarySheet.columns = [
            { header: 'Metric', key: 'metric', width: 20 },
            { header: 'Value', key: 'value', width: 15 }
        ];
        
        this.detailsSheet.columns = [
            { header: 'Test Name', key: 'testName', width: 40 },
            { header: 'Status', key: 'status', width: 15 },
            { header: 'Duration (ms)', key: 'duration', width: 15 },
            { header: 'Error Message', key: 'error', width: 50 }
        ];
    }

    onTestPass(test) {
        this.summary.passed++;
        this.summary.total++;
        this.testResults.push({
            testName: test.title,
            status: 'Passed',
            duration: test._duration,
            error: ''
        });
    }

    onTestFail(test, error) {
        this.summary.failed++;
        this.summary.total++;
        this.testResults.push({
            testName: test.title,
            status: 'Failed',
            duration: test._duration,
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
            error: ''
        });
    }

    async onRunnerEnd() {
        this.summarySheet.addRow({ metric: 'Total Tests', value: this.summary.total });
        this.summarySheet.addRow({ metric: 'Passed', value: this.summary.passed });
        this.summarySheet.addRow({ metric: 'Failed', value: this.summary.failed });
        this.summarySheet.addRow({ metric: 'Skipped', value: this.summary.skipped });
        
        this.testResults.forEach(result => {
            this.detailsSheet.addRow(result);
        });

        // Style header rows
        [this.summarySheet, this.detailsSheet].forEach(sheet => {
            sheet.getRow(1).font = { bold: true };
            sheet.getRow(1).fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFD3D3D3' }
            };
        });
        
        await this.workbook.xlsx.writeFile(reportPath);
        console.log(`\nExcel Test Report Generated: ${reportPath}`);
    }
}

module.exports = ExcelReporter;
