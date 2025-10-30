#!/usr/bin/env node

/**
 * Stage 1 API Verification Script
 *
 * Confirms the presence of read-only mock endpoints exposed by the Drogon backend.
 * The script performs lightweight structural checks and reports PASS/WARN/FAIL results.
 */

const API_BASE_URL = process.env.VITE_API_BASE_URL || 'http://45.85.147.236:33931';

type TestStatus = 'PASS' | 'WARN' | 'FAIL';

interface TestResult {
  name: string;
  status: TestStatus;
  message: string;
  duration: number;
}

const colour = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
};

async function fetchJson(path: string) {
  const url = `${API_BASE_URL}${path}`;
  const response = await fetch(url);
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`HTTP ${response.status}: ${response.statusText} -> ${text}`);
  }
  return response.json();
}

async function main() {
  console.log(`Stage 1 API verification (base URL: ${API_BASE_URL})\n`);

  const results: TestResult[] = [];

  // -------------------------------------------------------------------------
  // Datasets
  // -------------------------------------------------------------------------
  results.push(await runTest('List indicator datasets', async () => {
    const data = await fetchJson('/api/indicators/datasets');
    if (!Array.isArray(data)) {
      throw new Error('Expected an array');
    }
    if (data.length === 0) {
      return { status: 'WARN' as TestStatus, message: 'Endpoint returned empty array' };
    }
    const sample = data[0];
    const required = ['dataset_id', 'questdb_tag', 'row_count'];
    missingFields(sample, required);
    return { status: 'PASS' as TestStatus, message: `${data.length} dataset(s)` };
  }));

  // -------------------------------------------------------------------------
  // Walk-forward runs
  // -------------------------------------------------------------------------
  let sampleRunId: string | undefined;

  results.push(await runTest('List walk-forward runs', async () => {
    const data = await fetchJson('/api/walkforward/runs');
    if (!Array.isArray(data)) {
      throw new Error('Expected an array');
    }
    if (data.length === 0) {
      return { status: 'WARN' as TestStatus, message: 'No walk-forward runs available' };
    }
    sampleRunId = data[0].run_id;
    missingFields(data[0], ['run_id', 'status', 'dataset_id']);
    return { status: 'PASS' as TestStatus, message: `${data.length} run(s)` };
  }));

  if (sampleRunId) {
    results.push(await runTest('Walk-forward run detail', async () => {
      const data = await fetchJson(`/api/walkforward/runs/${sampleRunId}`);
      if (!data || typeof data !== 'object') {
        throw new Error('Expected object payload');
      }
      missingFields(data, ['run', 'folds']);
      if (!Array.isArray(data.folds)) {
        throw new Error('folds should be an array');
      }
      return { status: 'PASS' as TestStatus, message: `${data.folds.length} fold(s)` };
    }));
  }

  // -------------------------------------------------------------------------
  // Trade simulation runs
  // -------------------------------------------------------------------------
  let sampleSimulationId: string | undefined;

  results.push(await runTest('List trade simulation runs', async () => {
    const data = await fetchJson('/api/tradesim/runs');
    if (!Array.isArray(data)) {
      throw new Error('Expected an array');
    }
    if (data.length === 0) {
      return { status: 'WARN' as TestStatus, message: 'No trade simulations available' };
    }
    sampleSimulationId = data[0].simulation_id;
    missingFields(data[0], ['simulation_id', 'status', 'dataset_id']);
    return { status: 'PASS' as TestStatus, message: `${data.length} simulation(s)` };
  }));

  if (sampleSimulationId) {
    results.push(await runTest('Trade simulation detail', async () => {
      const data = await fetchJson(`/api/tradesim/runs/${sampleSimulationId}`);
      if (!data || typeof data !== 'object') {
        throw new Error('Expected object payload');
      }
      missingFields(data, ['run', 'buckets']);
      return { status: 'PASS' as TestStatus, message: Array.isArray(data.buckets) ? `${data.buckets.length} bucket(s)` : 'No buckets array' };
    }));
  }

  renderResults(results);
}

async function runTest(name: string, fn: () => Promise<{ status: TestStatus; message: string }>): Promise<TestResult> {
  const start = Date.now();
  try {
    const { status, message } = await fn();
    return { name, status, message, duration: Date.now() - start };
  } catch (error: any) {
    return {
      name,
      status: 'FAIL',
      message: error?.message || String(error),
      duration: Date.now() - start,
    };
  }
}

function missingFields(obj: Record<string, unknown>, fields: string[]) {
  const missing = fields.filter((field) => !(field in obj));
  if (missing.length > 0) {
    throw new Error(`Missing fields: ${missing.join(', ')}`);
  }
}

function renderResults(results: TestResult[]) {
  const passed = results.filter((r) => r.status === 'PASS').length;
  const warned = results.filter((r) => r.status === 'WARN').length;
  const failed = results.filter((r) => r.status === 'FAIL').length;

  results.forEach((result) => {
    const colourCode = result.status === 'PASS' ? colour.green : result.status === 'WARN' ? colour.yellow : colour.red;
    console.log(`${colourCode}${result.status}${colour.reset} ${result.name}`);
    console.log(`  ${result.message} (${result.duration} ms)\n`);
  });

  console.log('---------------------------');
  console.log(`Summary: ${passed} pass, ${warned} warn, ${failed} fail`);
  console.log('---------------------------');

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

