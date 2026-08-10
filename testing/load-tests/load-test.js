// GrowMark Load Tests Runner
'use strict';

const autocannon = require('autocannon');
const ExcelJS = require('exceljs');
const path = require('path');

// ================================================================
// CONFIGURATION — Supabase Backend (GrowMark)
// ================================================================
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://sklmxtvmpmudofuqtsxq.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_KEY || 'sb_publishable__6sdUhbPyp__VzpxJP14HQ_Id2n-DRo';

const CONCURRENT_USERS = 300;
const DURATION_IN_SECONDS = 60; // 1 minute

// Target the Supabase REST health check — no auth needed for this route.
// All other REST endpoints need the apikey header (added below).
const TARGET_URL = `${SUPABASE_URL}/rest/v1/`;

// ================================================================
// METRICS COLLECTION — capture a snapshot every second
// ================================================================
const perSecondMetrics = [];
let secondCounter = 0;

async function runLoadTest() {
    console.log('====================================================');
    console.log('  GrowMark — Baseline Load Test');
    console.log('====================================================');
    console.log(`  Target URL      : ${TARGET_URL}`);
    console.log(`  Virtual Users   : ${CONCURRENT_USERS}`);
    console.log(`  Duration        : ${DURATION_IN_SECONDS} seconds`);
    console.log('====================================================\n');

    const instance = autocannon({
        url: TARGET_URL,
        connections: CONCURRENT_USERS,
        duration: DURATION_IN_SECONDS,
        headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json'
        }
    });

    // Capture per-second data as the test runs
    instance.on('tick', (counter) => {
        secondCounter++;
        perSecondMetrics.push({
            second: secondCounter,
            requests: counter.counter || 0,
            errors: counter.errors || 0
        });
    });

    autocannon.track(instance, { renderProgressBar: true, renderResultsTable: true });

    return new Promise((resolve, reject) => {
        instance.on('done', resolve);
        instance.on('error', reject);
    });
}

// ================================================================
// COLOR PALETTE (matches Appium / Selenium reporters)
// ================================================================
const NAVY       = 'FF1B2A4A';
const WHITE      = 'FFFFFFFF';
const LIGHT_BLUE = 'FFD6E4F0';
const LIGHT_GREEN = 'FFD4EDDA';
const LIGHT_RED  = 'FFFDEDED';
const DARK_TEXT  = 'FF1A1A2E';

// Shared styling helpers
function styleNavyHeader(cell, value) {
    cell.value = value;
    cell.font = { bold: true, size: 11, color: { argb: WHITE }, name: 'Arial' };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = {
        top:    { style: 'thin', color: { argb: WHITE } },
        bottom: { style: 'thin', color: { argb: WHITE } },
        left:   { style: 'thin', color: { argb: WHITE } },
        right:  { style: 'thin', color: { argb: WHITE } }
    };
}

function styleDataCell(cell, idx, alignCenter = false) {
    cell.font = { size: 10, name: 'Arial', color: { argb: DARK_TEXT } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: idx % 2 === 0 ? WHITE : LIGHT_BLUE } };
    cell.alignment = { vertical: 'middle', wrapText: true, horizontal: alignCenter ? 'center' : 'left' };
    cell.border = {
        top:    { style: 'thin', color: { argb: 'FFD0D0D0' } },
        bottom: { style: 'thin', color: { argb: 'FFD0D0D0' } },
        left:   { style: 'thin', color: { argb: 'FFD0D0D0' } },
        right:  { style: 'thin', color: { argb: 'FFD0D0D0' } }
    };
}

// ================================================================
// EXCEL REPORT GENERATION  (Navy / Gold style — same content as original)
// ================================================================
async function generateExcelReport(result) {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'GrowMark Load Test';
    workbook.created = new Date();

    // ════════════════════════════════════════════════════════════════
    // SHEET 1 — SUMMARY
    // Same rows/sections as original; styled with Navy/White palette.
    // ════════════════════════════════════════════════════════════════
    const summary = workbook.addWorksheet('Summary');
    summary.getColumn(1).width = 35;
    summary.getColumn(2).width = 28;
    summary.getColumn(3).width = 55;

    // ── Title banner ──
    summary.mergeCells('A1:C1');
    const titleCell = summary.getCell('A1');
    titleCell.value = 'GROWMARK BACKEND — LOAD TEST REPORT';
    titleCell.font = { bold: true, size: 16, color: { argb: WHITE }, name: 'Arial' };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    summary.getRow(1).height = 40;
    summary.getRow(2).height = 8;

    // ── Column headers ──
    ['Metric', 'Value', 'Description'].forEach((h, i) => {
        styleNavyHeader(summary.getCell(3, i + 1), h);
    });
    summary.getRow(3).height = 26;

    // Helper: styled Navy section separator (same text labels as original)
    function addSection(label) {
        const r = summary.addRow([label, '', '']);
        r.font = { bold: true, italic: true, size: 10, color: { argb: WHITE }, name: 'Arial' };
        r.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } };
        r.height = 22;
        r.eachCell((cell) => {
            cell.border = {
                top:    { style: 'thin', color: { argb: WHITE } },
                bottom: { style: 'thin', color: { argb: WHITE } },
                left:   { style: 'thin', color: { argb: WHITE } },
                right:  { style: 'thin', color: { argb: WHITE } }
            };
        });
        summary.mergeCells(`A${r.number}:C${r.number}`);
        summary.getCell(`A${r.number}`).alignment = { horizontal: 'left', vertical: 'middle' };
        dataRowIdx = 0; // reset alternating fill per section
    }

    // Helper: alternating-fill data row
    let dataRowIdx = 0;
    function addDataRow(metric, value, description) {
        const r = summary.addRow([metric, value, description]);
        r.height = 20;
        r.eachCell((cell, colNum) => {
            styleDataCell(cell, dataRowIdx, colNum === 2);
            // Metric name (col 1) is bold
            if (colNum === 1) cell.font = { bold: true, size: 10, name: 'Arial', color: { argb: DARK_TEXT } };
        });
        dataRowIdx++;
    }

    // ── TEST CONFIGURATION (same rows as original) ──
    addSection('--- TEST CONFIGURATION ---');
    addDataRow('Target URL', TARGET_URL, 'Supabase REST API endpoint under test');
    addDataRow('Virtual Users (Connections)', CONCURRENT_USERS, 'Number of simulated concurrent users');
    addDataRow('Duration', `${DURATION_IN_SECONDS} seconds (1 minute)`, 'Total load test duration');
    addDataRow('Start Time', new Date(result.start).toLocaleString(), 'When the test started');
    addDataRow('End Time', new Date(result.finish).toLocaleString(), 'When the test finished');

    // ── THROUGHPUT (same rows as original) ──
    addSection('--- THROUGHPUT (Requests Per Second) ---');
    addDataRow('Total Requests Sent', result.requests.total, 'Total number of HTTP requests fired during the test');
    addDataRow('Average RPS', result.requests.average.toFixed(2), 'Average requests served per second');
    addDataRow('Max RPS', result.requests.max, 'Highest requests per second observed in any 1-second window');
    addDataRow('Min RPS', result.requests.min, 'Lowest requests per second observed in any 1-second window');

    // ── RESPONSE TIME / LATENCY (same rows as original) ──
    addSection('--- RESPONSE TIME (Latency in ms) ---');
    addDataRow('Average Response Time', `${result.latency.average.toFixed(2)} ms`, 'Mean time server took to respond');
    addDataRow('Min Response Time', `${result.latency.min} ms`, 'Fastest response observed');
    addDataRow('Max Response Time', `${result.latency.max} ms`, 'Slowest response observed');
    addDataRow('p50 (Median)', `${result.latency.p50} ms`, '50% of requests responded within this time');
    addDataRow('p75', `${result.latency.p75} ms`, '75% of requests responded within this time');
    addDataRow('p99', `${result.latency.p99} ms`, '99% of requests responded within this time');
    addDataRow('p99.9', `${result.latency.p999} ms`, '99.9% of requests responded within this time');

    // ── ERRORS (same rows as original) ──
    addSection('--- ERRORS ---');
    addDataRow('Errors', result.errors, 'Number of connection-level errors');
    addDataRow('Timeouts', result.timeouts, 'Requests that exceeded the timeout threshold');
    addDataRow('Non-2xx Responses', result.non2xx, 'HTTP responses with a non-success status code');

    // ── DATA TRANSFER (same rows as original) ──
    addSection('--- DATA TRANSFER ---');
    addDataRow('Total Bytes Read', `${(result.throughput.total / 1024).toFixed(2)} KB`, 'Total data received from the server');
    addDataRow('Average Throughput', `${(result.throughput.average / 1024).toFixed(2)} KB/s`, 'Average data received per second');

    // ════════════════════════════════════════════════════════════════
    // SHEET 2 — PER-SECOND TIMELINE
    // Same columns/data as original; styled with Navy headers + alternating rows.
    // ════════════════════════════════════════════════════════════════
    const timeline = workbook.addWorksheet('Per-Second Timeline');
    timeline.getColumn(1).width = 12;
    timeline.getColumn(2).width = 24;
    timeline.getColumn(3).width = 28;
    timeline.getColumn(4).width = 24;
    timeline.getColumn(5).width = 18;

    // Title banner
    timeline.mergeCells('A1:E1');
    const tlTitle = timeline.getCell('A1');
    tlTitle.value = 'PER-SECOND REQUEST TIMELINE';
    tlTitle.font = { bold: true, size: 14, color: { argb: WHITE }, name: 'Arial' };
    tlTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } };
    tlTitle.alignment = { horizontal: 'center', vertical: 'middle' };
    timeline.getRow(1).height = 36;
    timeline.getRow(2).height = 8;

    // Column headers (same as original)
    ['Second', 'Virtual Users Active', 'Requests in This Second', 'Errors in This Second', 'Status'].forEach((h, i) => {
        styleNavyHeader(timeline.getCell(3, i + 1), h);
    });
    timeline.getRow(3).height = 26;

    const tlData = perSecondMetrics.length > 0
        ? perSecondMetrics
        : [{ second: '-', requests: result.requests.total, errors: result.errors }];

    tlData.forEach((m, idx) => {
        const hasErrors = m.errors > 0;
        const rowNum = idx + 4;
        // Same columns as original
        const rowData = [m.second, CONCURRENT_USERS, m.requests, m.errors, hasErrors ? '⚠ Has Errors' : '✓ OK'];

        rowData.forEach((val, ci) => {
            const cell = timeline.getCell(rowNum, ci + 1);
            cell.value = val;
            styleDataCell(cell, idx, true);
            // Status cell — colored text + fill (mirrors Appium/Selenium status cell)
            if (ci === 4) {
                cell.font = { bold: true, size: 10, name: 'Arial', color: { argb: hasErrors ? 'FFDC3545' : 'FF28A745' } };
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: hasErrors ? LIGHT_RED : LIGHT_GREEN } };
            }
        });
        timeline.getRow(rowNum).height = 20;
    });

    // ════════════════════════════════════════════════════════════════
    // SHEET 3 — VIRTUAL USERS LOG
    // Same columns/data as original; styled with Navy headers + alternating rows.
    // ════════════════════════════════════════════════════════════════
    const usersSheet = workbook.addWorksheet('Virtual Users Log');
    usersSheet.getColumn(1).width = 12;
    usersSheet.getColumn(2).width = 24;
    usersSheet.getColumn(3).width = 28;
    usersSheet.getColumn(4).width = 30;

    // Title banner
    usersSheet.mergeCells('A1:D1');
    const ulTitle = usersSheet.getCell('A1');
    ulTitle.value = 'VIRTUAL USER SIMULATION LOG (300 Users)';
    ulTitle.font = { bold: true, size: 14, color: { argb: WHITE }, name: 'Arial' };
    ulTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } };
    ulTitle.alignment = { horizontal: 'center', vertical: 'middle' };
    usersSheet.getRow(1).height = 36;
    usersSheet.getRow(2).height = 8;

    // Column headers (same as original)
    ['User #', 'Status', 'Estimated Avg Requests', 'Estimated Avg Latency (ms)'].forEach((h, i) => {
        styleNavyHeader(usersSheet.getCell(3, i + 1), h);
    });
    usersSheet.getRow(3).height = 26;

    const avgReqsPerUser = result.requests.total > 0 ? (result.requests.total / CONCURRENT_USERS).toFixed(1) : 0;
    const isOk = result.errors === 0;
    const userStatus = isOk ? 'Active — OK' : 'Active — Some Errors';

    // Each of the 300 virtual users gets an entry (same as original)
    for (let u = 1; u <= CONCURRENT_USERS; u++) {
        const rowNum = u + 3;
        const rowData = [u, userStatus, avgReqsPerUser, result.latency.average.toFixed(2)];
        rowData.forEach((val, ci) => {
            const cell = usersSheet.getCell(rowNum, ci + 1);
            cell.value = val;
            styleDataCell(cell, u, ci === 0);
            // Status cell — colored text + fill
            if (ci === 1) {
                cell.font = { bold: true, size: 10, name: 'Arial', color: { argb: isOk ? 'FF28A745' : 'FFDC3545' } };
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: isOk ? LIGHT_GREEN : LIGHT_RED } };
            }
        });
        usersSheet.getRow(rowNum).height = 18;
    }

    // Save the report
    const reportPath = path.join(__dirname, 'Load_Test_Report.xlsx');
    await workbook.xlsx.writeFile(reportPath);
    console.log(`\n✅ Excel report saved to: ${reportPath}`);
    return reportPath;
}

// ================================================================
// MAIN
// ================================================================
async function main() {
    try {
        const result = await runLoadTest();
        await generateExcelReport(result);
        console.log('\n🎉 Load testing completed successfully!\n');
    } catch (err) {
        console.error('❌ Load test failed:', err.message);
        process.exit(1);
    }
}

main();
