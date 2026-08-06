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
// EXCEL REPORT GENERATION
// ================================================================
async function generateExcelReport(result) {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'GrowMark Load Test';
    workbook.created = new Date();

    // ---- Sheet 1: Summary ----
    const summary = workbook.addWorksheet('Summary');
    summary.columns = [
        { header: 'Metric', key: 'metric', width: 30 },
        { header: 'Value', key: 'value', width: 20 },
        { header: 'Description', key: 'description', width: 55 }
    ];

    // Style header row
    const headerRow = summary.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A7A4A' } };
    headerRow.height = 20;

    // Test config
    summary.addRow(['--- TEST CONFIGURATION ---', '', '']);
    summary.lastRow.font = { bold: true, italic: true, color: { argb: 'FF555555' } };
    summary.addRow(['Target URL', TARGET_URL, 'Supabase REST API endpoint under test']);
    summary.addRow(['Virtual Users (Connections)', CONCURRENT_USERS, 'Number of simulated concurrent users']);
    summary.addRow(['Duration', `${DURATION_IN_SECONDS} seconds (1 minute)`, 'Total load test duration']);
    summary.addRow(['Start Time', new Date(result.start).toLocaleString(), 'When the test started']);
    summary.addRow(['End Time', new Date(result.finish).toLocaleString(), 'When the test finished']);
    summary.addRow([]);

    // Throughput
    summary.addRow(['--- THROUGHPUT (Requests Per Second) ---', '', '']);
    summary.lastRow.font = { bold: true, italic: true, color: { argb: 'FF555555' } };
    summary.addRow(['Total Requests Sent', result.requests.total, 'Total number of HTTP requests fired during the test']);
    summary.addRow(['Average RPS', result.requests.average.toFixed(2), 'Average requests served per second']);
    summary.addRow(['Max RPS', result.requests.max, 'Highest requests per second observed in any 1-second window']);
    summary.addRow(['Min RPS', result.requests.min, 'Lowest requests per second observed in any 1-second window']);
    summary.addRow([]);

    // Latency
    summary.addRow(['--- RESPONSE TIME (Latency in ms) ---', '', '']);
    summary.lastRow.font = { bold: true, italic: true, color: { argb: 'FF555555' } };
    summary.addRow(['Average Response Time', `${result.latency.average.toFixed(2)} ms`, 'Mean time server took to respond']);
    summary.addRow(['Min Response Time', `${result.latency.min} ms`, 'Fastest response observed']);
    summary.addRow(['Max Response Time', `${result.latency.max} ms`, 'Slowest response observed']);
    summary.addRow(['p50 (Median)', `${result.latency.p50} ms`, '50% of requests responded within this time']);
    summary.addRow(['p75', `${result.latency.p75} ms`, '75% of requests responded within this time']);
    summary.addRow(['p99', `${result.latency.p99} ms`, '99% of requests responded within this time']);
    summary.addRow(['p99.9', `${result.latency.p999} ms`, '99.9% of requests responded within this time']);
    summary.addRow([]);

    // Errors
    summary.addRow(['--- ERRORS ---', '', '']);
    summary.lastRow.font = { bold: true, italic: true, color: { argb: 'FF555555' } };
    summary.addRow(['Errors', result.errors, 'Number of connection-level errors']);
    summary.addRow(['Timeouts', result.timeouts, 'Requests that exceeded the timeout threshold']);
    summary.addRow(['Non-2xx Responses', result.non2xx, 'HTTP responses with a non-success status code']);
    summary.addRow([]);

    // Throughput bytes
    summary.addRow(['--- DATA TRANSFER ---', '', '']);
    summary.lastRow.font = { bold: true, italic: true, color: { argb: 'FF555555' } };
    summary.addRow(['Total Bytes Read', `${(result.throughput.total / 1024).toFixed(2)} KB`, 'Total data received from the server']);
    summary.addRow(['Average Throughput', `${(result.throughput.average / 1024).toFixed(2)} KB/s`, 'Average data received per second']);

    // Auto-fit style on data cells
    summary.eachRow((row, rowNum) => {
        if (rowNum > 1) {
            row.getCell(1).font = row.getCell(1).font || {};
            row.alignment = { vertical: 'middle', wrapText: true };
        }
    });

    // ---- Sheet 2: Per-Second Breakdown (300 Virtual Users Timeline) ----
    const timeline = workbook.addWorksheet('Per-Second Timeline');
    timeline.columns = [
        { header: 'Second', key: 'second', width: 12 },
        { header: 'Virtual Users Active', key: 'users', width: 22 },
        { header: 'Requests in This Second', key: 'requests', width: 28 },
        { header: 'Errors in This Second', key: 'errors', width: 24 },
        { header: 'Status', key: 'status', width: 18 }
    ];

    const tlHeader = timeline.getRow(1);
    tlHeader.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    tlHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A7A4A' } };
    tlHeader.height = 20;

    perSecondMetrics.forEach((m) => {
        const hasErrors = m.errors > 0;
        const row = timeline.addRow({
            second: m.second,
            users: CONCURRENT_USERS,
            requests: m.requests,
            errors: m.errors,
            status: hasErrors ? '⚠ Has Errors' : '✓ OK'
        });
        if (hasErrors) {
            row.getCell('status').font = { color: { argb: 'FFCC0000' } };
        } else {
            row.getCell('status').font = { color: { argb: 'FF1A7A4A' } };
        }
    });

    // If no tick data, add a note
    if (perSecondMetrics.length === 0) {
        timeline.addRow({ second: '-', users: CONCURRENT_USERS, requests: result.requests.total, errors: result.errors, status: 'Aggregate' });
    }

    // ---- Sheet 3: Virtual User Simulation Log ----
    const usersSheet = workbook.addWorksheet('Virtual Users Log');
    usersSheet.columns = [
        { header: 'User #', key: 'user', width: 12 },
        { header: 'Status', key: 'status', width: 20 },
        { header: 'Estimated Avg Requests', key: 'avgReqs', width: 28 },
        { header: 'Estimated Avg Latency (ms)', key: 'avgLatency', width: 30 }
    ];

    const ulHeader = usersSheet.getRow(1);
    ulHeader.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    ulHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A7A4A' } };
    ulHeader.height = 20;

    // Each of the 300 virtual users gets an entry
    const avgReqsPerUser = result.requests.total > 0 ? (result.requests.total / CONCURRENT_USERS).toFixed(1) : 0;
    for (let u = 1; u <= CONCURRENT_USERS; u++) {
        usersSheet.addRow({
            user: u,
            status: result.errors === 0 ? 'Active — OK' : 'Active — Some Errors',
            avgReqs: avgReqsPerUser,
            avgLatency: result.latency.average.toFixed(2)
        });
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
