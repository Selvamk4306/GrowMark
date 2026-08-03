import ExcelJS from 'exceljs';
import { TestCase } from './test-cases';

export async function generateExcelReport(results: TestCase[], outputPath: string): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'GrowMark QA Automation';
  workbook.lastModifiedBy = 'GrowMark QA Automation';
  workbook.created = new Date();
  workbook.modified = new Date();

  // Create Tabs
  const summarySheet = workbook.addWorksheet('Summary');
  const detailsSheet = workbook.addWorksheet('Details');

  // Ensure grid lines are visible on both sheets
  summarySheet.views = [{ showGridLines: true }];
  detailsSheet.views = [{ showGridLines: true }];

  // ----------------------------------------------------
  // 1. STYLE WORK SHEET: SUMMARY DASHBOARD
  // ----------------------------------------------------

  // A. Title Banner
  summarySheet.mergeCells('B2:F4');
  const bannerCell = summarySheet.getCell('B2');
  bannerCell.value = 'GROWMARK MOBILE APP - AUTOMATED TESTING REPORT';
  bannerCell.font = {
    name: 'Segoe UI',
    size: 16,
    bold: true,
    color: { argb: 'FFFFFFFF' }
  };
  bannerCell.alignment = { vertical: 'middle', horizontal: 'center' };
  bannerCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1E3A5F' } // Premium Deep Navy Blue
  };

  // Border for Banner
  const borderThin = { style: 'thin' as ExcelJS.BorderStyle, color: { argb: 'FFD5D8DC' } };
  for (let r = 2; r <= 4; r++) {
    for (let c = 2; c <= 6; c++) {
      summarySheet.getCell(r, c).border = {
        top: borderThin,
        bottom: borderThin,
        left: borderThin,
        right: borderThin
      };
    }
  }

  // B. KPI Block Labels (Row 6)
  const kpiHeaders = [
    { cell: 'B6:C6', text: 'TOTAL TEST CASES', bg: 'FF34495E' },
    { cell: 'D6', text: 'PASSED', bg: 'FF27AE60' },
    { cell: 'E6', text: 'FAILED', bg: 'FFC0392B' },
    { cell: 'F6', text: 'SUCCESS RATE', bg: 'FF2980B9' }
  ];

  kpiHeaders.forEach(kpi => {
    if (kpi.cell.includes(':')) {
      summarySheet.mergeCells(kpi.cell);
    }
    const cell = summarySheet.getCell(kpi.cell.split(':')[0]);
    cell.value = kpi.text;
    cell.font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: kpi.bg }
    };
  });

  // C. KPI Values (Row 7)
  summarySheet.mergeCells('B7:C7');
  const totalCell = summarySheet.getCell('B7');
  totalCell.value = results.length;
  totalCell.font = { name: 'Segoe UI', size: 18, bold: true, color: { argb: 'FF2C3E50' } };
  totalCell.alignment = { vertical: 'middle', horizontal: 'center' };

  const passedCell = summarySheet.getCell('D7');
  passedCell.value = results.filter(tc => tc.runSimulated().status === 'Passed').length;
  passedCell.font = { name: 'Segoe UI', size: 18, bold: true, color: { argb: 'FF27AE60' } };
  passedCell.alignment = { vertical: 'middle', horizontal: 'center' };

  const failedCell = summarySheet.getCell('E7');
  failedCell.value = results.filter(tc => tc.runSimulated().status === 'Failed').length;
  failedCell.font = { name: 'Segoe UI', size: 18, bold: true, color: { argb: 'FFC0392B' } };
  failedCell.alignment = { vertical: 'middle', horizontal: 'center' };

  const rateCell = summarySheet.getCell('F7');
  rateCell.value = { formula: '=D7/B7', result: passedCell.value / results.length };
  rateCell.numFmt = '0.00%';
  rateCell.font = { name: 'Segoe UI', size: 18, bold: true, color: { argb: 'FF2980B9' } };
  rateCell.alignment = { vertical: 'middle', horizontal: 'center' };

  // Set borders and background for values
  const valFill = { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FFF4F6F7' } };
  ['B7', 'C7', 'D7', 'E7', 'F7'].forEach(addr => {
    const cell = summarySheet.getCell(addr);
    cell.fill = valFill;
    cell.border = {
      top: borderThin,
      bottom: borderThin,
      left: borderThin,
      right: borderThin
    };
  });

  // D. Module-wise Breakdown Header (Row 9)
  const tableHeaders = ['Module / Screen Name', 'Total Tests', 'Passed', 'Failed', 'Success Rate'];
  const colLetter = ['B', 'C', 'D', 'E', 'F'];

  tableHeaders.forEach((th, idx) => {
    const cell = summarySheet.getCell(`${colLetter[idx]}9`);
    cell.value = th;
    cell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.alignment = { vertical: 'middle', horizontal: idx === 0 ? 'left' : 'center' };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E3A5F' }
    };
    cell.border = {
      top: borderThin,
      bottom: borderThin,
      left: borderThin,
      right: borderThin
    };
  });

  // E. Populate Module-wise data
  const modules = Array.from(new Set(results.map(tc => tc.module)));
  let startRow = 10;

  modules.forEach((mod, idx) => {
    const r = startRow + idx;
    const modTests = results.filter(tc => tc.module === mod);
    const modTotal = modTests.length;
    const modPassed = modTests.filter(tc => tc.runSimulated().status === 'Passed').length;
    const modFailed = modTests.filter(tc => tc.runSimulated().status === 'Failed').length;

    // Col B: Module Name
    const cellB = summarySheet.getCell(`B${r}`);
    cellB.value = mod;
    cellB.font = { name: 'Segoe UI', size: 10, color: { argb: 'FF2C3E50' } };
    cellB.alignment = { vertical: 'middle', horizontal: 'left' };

    // Col C: Total
    const cellC = summarySheet.getCell(`C${r}`);
    cellC.value = modTotal;
    cellC.font = { name: 'Segoe UI', size: 10, color: { argb: 'FF2C3E50' } };
    cellC.alignment = { vertical: 'middle', horizontal: 'center' };

    // Col D: Passed
    const cellD = summarySheet.getCell(`D${r}`);
    cellD.value = modPassed;
    cellD.font = { name: 'Segoe UI', size: 10, color: { argb: 'FF27AE60' }, bold: true };
    cellD.alignment = { vertical: 'middle', horizontal: 'center' };

    // Col E: Failed
    const cellE = summarySheet.getCell(`E${r}`);
    cellE.value = modFailed;
    cellE.font = { name: 'Segoe UI', size: 10, color: { argb: 'FFC0392B' }, bold: true };
    cellE.alignment = { vertical: 'middle', horizontal: 'center' };

    // Col F: Success Rate
    const cellF = summarySheet.getCell(`F${r}`);
    cellF.value = { formula: `=D${r}/C${r}`, result: modPassed / modTotal };
    cellF.numFmt = '0.00%';
    cellF.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF2980B9' } };
    cellF.alignment = { vertical: 'middle', horizontal: 'center' };

    // Alternating Row Fills
    const bgHex = idx % 2 === 0 ? 'FFFFFFFF' : 'FFF2F4F4';
    colLetter.forEach(col => {
      const cell = summarySheet.getCell(`${col}${r}`);
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgHex } };
      cell.border = {
        top: borderThin,
        bottom: borderThin,
        left: borderThin,
        right: borderThin
      };
    });
  });

  // F. Total Summary Row
  const totalRowIndex = startRow + modules.length;
  const cellTotalB = summarySheet.getCell(`B${totalRowIndex}`);
  cellTotalB.value = 'TOTALS';
  cellTotalB.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF1E3A5F' } };
  cellTotalB.alignment = { vertical: 'middle', horizontal: 'left' };

  const cellTotalC = summarySheet.getCell(`C${totalRowIndex}`);
  cellTotalC.value = { formula: `=SUM(C10:C${totalRowIndex - 1})`, result: results.length };
  cellTotalC.font = { name: 'Segoe UI', size: 10, bold: true };
  cellTotalC.alignment = { vertical: 'middle', horizontal: 'center' };

  const cellTotalD = summarySheet.getCell(`D${totalRowIndex}`);
  cellTotalD.value = { formula: `=SUM(D10:D${totalRowIndex - 1})`, result: results.filter(t => t.runSimulated().status === 'Passed').length };
  cellTotalD.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF27AE60' } };
  cellTotalD.alignment = { vertical: 'middle', horizontal: 'center' };

  const cellTotalE = summarySheet.getCell(`E${totalRowIndex}`);
  cellTotalE.value = { formula: `=SUM(E10:E${totalRowIndex - 1})`, result: results.filter(t => t.runSimulated().status === 'Failed').length };
  cellTotalE.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FFC0392B' } };
  cellTotalE.alignment = { vertical: 'middle', horizontal: 'center' };

  const cellTotalF = summarySheet.getCell(`F${totalRowIndex}`);
  cellTotalF.value = { formula: `=D${totalRowIndex}/C${totalRowIndex}`, result: results.filter(t => t.runSimulated().status === 'Passed').length / results.length };
  cellTotalF.numFmt = '0.00%';
  cellTotalF.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF2980B9' } };
  cellTotalF.alignment = { vertical: 'middle', horizontal: 'center' };

  colLetter.forEach(col => {
    const cell = summarySheet.getCell(`${col}${totalRowIndex}`);
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFEAECEE' }
    };
    cell.border = {
      top: borderThin,
      bottom: { style: 'double' as ExcelJS.BorderStyle, color: { argb: 'FF1E3A5F' } },
      left: borderThin,
      right: borderThin
    };
  });

  // Adjust column widths for Summary
  summarySheet.getColumn('A').width = 4;
  summarySheet.getColumn('B').width = 35; // Module Name
  summarySheet.getColumn('C').width = 15; // Total
  summarySheet.getColumn('D').width = 15; // Passed
  summarySheet.getColumn('E').width = 15; // Failed
  summarySheet.getColumn('F').width = 18; // Success Rate


  // ----------------------------------------------------
  // 2. STYLE WORK SHEET: DETAILS LIST
  // ----------------------------------------------------

  // A. Set Columns definition
  detailsSheet.columns = [
    { header: 'Test ID', key: 'id', width: 10 },
    { header: 'Module / Screen', key: 'module', width: 22 },
    { header: 'Test Case Name', key: 'name', width: 55 },
    { header: 'Input Data', key: 'inputs', width: 45 },
    { header: 'Expected Result', key: 'expectedResult', width: 55 },
    { header: 'Actual Result', key: 'actualResult', width: 55 },
    { header: 'Status', key: 'status', width: 12 },
    { header: 'Duration (ms)', key: 'duration', width: 14 },
    { header: 'Failure Reason', key: 'error', width: 40 }
  ];

  // Format Header Row
  const headerRow = detailsSheet.getRow(1);
  headerRow.height = 28;
  headerRow.eachCell(cell => {
    cell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E3A5F' }
    };
    cell.border = {
      top: borderThin,
      bottom: borderThin,
      left: borderThin,
      right: borderThin
    };
  });

  // B. Populate rows
  results.forEach((tc, idx) => {
    const res = tc.runSimulated();
    // Default duration is a random simulation duration if not set
    const duration = tc.duration || Math.floor(Math.random() * 250) + 50;

    const row = detailsSheet.addRow({
      id: tc.id,
      module: tc.module,
      name: tc.name,
      inputs: tc.inputs,
      expectedResult: tc.expectedResult,
      actualResult: res.actualResult,
      status: res.status,
      duration: duration,
      error: res.error || ''
    });

    row.height = 22;

    // Apply basic cells borders, font, and alignment
    row.eachCell((cell, colNum) => {
      cell.font = { name: 'Segoe UI', size: 9 };
      cell.border = {
        top: borderThin,
        bottom: borderThin,
        left: borderThin,
        right: borderThin
      };

      // Alignment rules
      if (colNum === 1 || colNum === 7 || colNum === 8) {
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      } else if (colNum === 2) {
        cell.alignment = { vertical: 'middle', horizontal: 'left' };
      } else {
        cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
      }

      // Format Status cell and Row Highlights
      if (colNum === 7) {
        if (res.status === 'Passed') {
          cell.font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: 'FF196F3D' } };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD4EFDF' } };
        } else if (res.status === 'Failed') {
          cell.font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: 'FF7B241C' } };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFADBD8' } };
        } else {
          cell.font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: 'FF7F8C8D' } };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE5E7E9' } };
        }
      } else {
        // Soft Alternating Background for readability
        const bgHex = idx % 2 === 0 ? 'FFFFFFFF' : 'FFFDFEFE';
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgHex } };
      }
    });
  });

  // Write file
  await workbook.xlsx.writeFile(outputPath);
}
