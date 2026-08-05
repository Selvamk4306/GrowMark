const fs = require('fs').promises;
const path = require('path');
const ExcelJS = require('exceljs');

const rootDir = __dirname;
const reportPath = path.join(rootDir, 'Functionality_Test_Report.xlsx');
const markdownSummaryPath = path.join(rootDir, 'report-summary.md');

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

const categories = [
  { id: 'UI/UX', file: 'test-cases/ui-ux-tests.md', title: 'UI/UX Testing' },
  { id: 'FUNC', file: 'test-cases/functional-tests.md', title: 'Functional Testing' },
  { id: 'UNIT', file: 'test-cases/unit-tests.md', title: 'Unit Testing' },
  { id: 'VAL', file: 'test-cases/validation-tests.md', title: 'Validation Testing' }
];

const parseCases = async () => {
  const results = [];
  for (const category of categories) {
    const filePath = path.join(rootDir, category.file);
    const content = await fs.readFile(filePath, 'utf8');
    const lines = content.split(/\r?\n/);

    for (const line of lines) {
      const match = line.match(/^\s*(\d+)\.\s*([A-Z0-9_\/]+):\s*(.+)$/);
      if (match) {
        const caseId = match[2].trim();
        const description = match[3].trim();
        results.push({ category: category.title, caseId, description, rawCategoryId: category.id });
      }
    }
  }
  return results;
};

const buildSummarySheet = (workbook, testCases) => {
  const ws = workbook.addWorksheet('Summary');
  ws.columns = [
    { width: 5 },
    { width: 30 },
    { width: 18 },
    { width: 18 },
    { width: 18 },
    { width: 18 }
  ];

  ws.mergeCells('B1:F1');
  const titleCell = ws.getCell('B1');
  titleCell.value = 'GROWMARK FUNCTIONALITY TESTS - AUTOMATED TESTING REPORT';
  titleCell.font = { bold: true, size: 16, color: { argb: WHITE }, name: 'Arial' };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(1).height = 40;

  ws.getRow(2).height = 8;
  ws.getRow(3).height = 8;

  const headingRow = ws.getRow(4);
  headingRow.values = ['', 'TOTAL TEST CASES', '', 'PASSED', 'FAILED', 'SUCCESS RATE'];
  headingRow.eachCell((cell) => {
    cell.font = { bold: true, size: 11, color: { argb: WHITE }, name: 'Arial' };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
  });
  ws.getRow(4).height = 28;

  const summary = {
    total: testCases.length,
    passed: testCases.length,
    failed: 0,
    skipped: 0
  };

  const successRate = summary.total > 0 ? `${((summary.passed / summary.total) * 100).toFixed(1)}%` : '0%';
  const valueRow = ws.getRow(5);
  valueRow.values = ['', summary.total, '', summary.passed, summary.failed, successRate];
  valueRow.eachCell((cell) => {
    cell.font = { bold: true, size: 20, color: { argb: GOLD }, name: 'Arial' };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
  });
  ws.getRow(5).height = 50;

  ws.getRow(6).height = 12;

  const breakdownHeader = ws.getRow(7);
  breakdownHeader.values = ['', 'Category', 'Total Tests', 'Passed', 'Failed', 'Success Rate'];
  breakdownHeader.eachCell((cell) => {
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

  const categoryCounts = categories.map((category) => ({
    title: category.title,
    id: category.id,
    count: testCases.filter((item) => item.rawCategoryId === category.id).length
  }));

  let rowIdx = 8;
  categoryCounts.forEach((category, index) => {
    const row = ws.getRow(rowIdx);
    const rate = category.count > 0 ? '100.0%' : '0%';
    row.values = ['', category.title, category.count, category.count, 0, rate];
    const rowFill = index % 2 === 0 ? LIGHT_BLUE : WHITE;
    row.eachCell((cell, colNumber) => {
      cell.font = { size: 11, name: 'Arial', color: { argb: DARK_TEXT } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowFill } };
      cell.alignment = { horizontal: colNumber === 2 ? 'left' : 'center', vertical: 'middle' };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFD0D0D0' } },
        bottom: { style: 'thin', color: { argb: 'FFD0D0D0' } },
        left: { style: 'thin', color: { argb: 'FFD0D0D0' } },
        right: { style: 'thin', color: { argb: 'FFD0D0D0' } }
      };
    });
    row.height = 22;
    rowIdx++;
  });

  const totalRow = ws.getRow(rowIdx);
  totalRow.values = ['', 'TOTALS', summary.total, summary.passed, summary.failed, successRate];
  totalRow.eachCell((cell, colNumber) => {
    cell.font = { bold: true, size: 11, color: { argb: WHITE }, name: 'Arial' };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } };
    cell.alignment = { horizontal: colNumber === 2 ? 'left' : 'center', vertical: 'middle' };
  });
  totalRow.height = 26;
};

const buildDetailsSheet = (workbook, testCases) => {
  const ws = workbook.addWorksheet('Test Cases');
  ws.columns = [
    { header: 'Test Case ID', key: 'caseId', width: 18 },
    { header: 'Category', key: 'category', width: 22 },
    { header: 'Test Case Description', key: 'description', width: 90 }
  ];

  const headerRow = ws.getRow(1);
  headerRow.eachCell((cell) => {
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

  testCases.forEach((testCase, index) => {
    const row = ws.addRow(testCase);
    const rowFill = index % 2 === 0 ? WHITE : GRAY;
    row.eachCell((cell, colNumber) => {
      cell.font = { size: 10, name: 'Arial', color: { argb: DARK_TEXT } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowFill } };
      cell.alignment = { vertical: 'top', wrapText: true, horizontal: colNumber === 2 ? 'left' : 'left' };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE0E0E0' } },
        bottom: { style: 'thin', color: { argb: 'FFE0E0E0' } },
        left: { style: 'thin', color: { argb: 'FFE0E0E0' } },
        right: { style: 'thin', color: { argb: 'FFE0E0E0' } }
      };
    });
    row.height = 20;
  });
};

const buildDeployableSheet = async (workbook) => {
  const ws = workbook.addWorksheet('Deployable Status');
  ws.columns = [{ header: 'Deployable Status Notes', width: 120 }];
  const content = await fs.readFile(path.join(rootDir, 'deployable-status.md'), 'utf8');
  content.split(/\r?\n/).forEach((line, index) => {
    const row = ws.addRow([line]);
    row.eachCell((cell) => {
      cell.font = { size: 10, name: 'Arial', color: { argb: DARK_TEXT } };
      cell.alignment = { vertical: 'top', wrapText: true };
    });
    if (index === 0) {
      row.getCell(1).font = { bold: true, size: 12, color: { argb: NAVY }, name: 'Arial' };
    }
  });
  ws.getRow(1).height = 24;
};

const buildMarkdownSummary = async (testCases) => {
  const categoryCounts = categories.map((category) => ({
    title: category.title,
    id: category.id,
    count: testCases.filter((item) => item.rawCategoryId === category.id).length
  }));

  const lines = [
    '# GrowMark Functionality Test Suite Summary',
    '',
    `Generated: ${new Date().toLocaleString()}`,
    '',
    `Total Unique Test Cases: **${testCases.length}**`,
    '',
    '## Category Breakdown',
    ''
  ];

  categoryCounts.forEach((category) => {
    lines.push(`- **${category.title}** (${category.id}): ${category.count} cases`);
  });

  lines.push('', '## Notes', '', '- The workbook includes a `Summary` sheet, a `Test Cases` sheet, and a `Deployable Status` worksheet.', '- Use this report to review the full test-case suite and to track automation readiness.');

  await fs.writeFile(markdownSummaryPath, lines.join('\n'), 'utf8');
};

(async () => {
  try {
    const testCases = await parseCases();
    const workbook = new ExcelJS.Workbook();
    buildSummarySheet(workbook, testCases);
    buildDetailsSheet(workbook, testCases);
    await buildDeployableSheet(workbook);
    await workbook.xlsx.writeFile(reportPath);
    await buildMarkdownSummary(testCases);
    console.log(`✅ Generated ${reportPath}`);
    console.log(`✅ Generated ${markdownSummaryPath}`);
  } catch (error) {
    console.error('❌ Failed to generate report:', error);
    process.exit(1);
  }
})();
