import ExcelJS from 'exceljs';
import { WebTestResult } from './tests/test-data';

export async function generateWebExcelReport(results: WebTestResult[], outputPath: string): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'GrowMark QA Automation';
  workbook.lastModifiedBy = 'GrowMark QA Automation';
  workbook.created = new Date();
  workbook.modified = new Date();

  const summarySheet = workbook.addWorksheet('Summary');
  const detailsSheet = workbook.addWorksheet('Details');

  summarySheet.columns = [
    { header: 'Metric', key: 'metric', width: 25 },
    { header: 'Value', key: 'value', width: 20 }
  ];

  const total = results.length;
  const passed = results.filter(r => r.status === 'Passed').length;
  const failed = results.filter(r => r.status === 'Failed').length;
  const skipped = results.filter(r => r.status === 'Skipped').length;
  const successRate = total === 0 ? 0 : passed / total;

  summarySheet.addRow({ metric: 'Total Test Cases', value: total });
  summarySheet.addRow({ metric: 'Passed', value: passed });
  summarySheet.addRow({ metric: 'Failed', value: failed });
  summarySheet.addRow({ metric: 'Skipped', value: skipped });
  summarySheet.addRow({ metric: 'Success Rate', value: `${(successRate * 100).toFixed(2)}%` });

  detailsSheet.columns = [
    { header: 'TC ID', key: 'id', width: 12 },
    { header: 'Module', key: 'module', width: 22 },
    { header: 'Name', key: 'name', width: 52 },
    { header: 'Expected', key: 'expected', width: 55 },
    { header: 'Actual', key: 'actual', width: 55 },
    { header: 'Status', key: 'status', width: 12 },
    { header: 'Duration ms', key: 'duration', width: 14 },
    { header: 'Error Message', key: 'error', width: 40 }
  ];

  results.forEach(result => {
    detailsSheet.addRow({
      id: result.id,
      module: result.module,
      name: result.name,
      expected: result.expected,
      actual: result.actual,
      status: result.status,
      duration: result.duration,
      error: result.error || ''
    });
  });

  await workbook.xlsx.writeFile(outputPath);
}
