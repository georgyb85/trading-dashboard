#!/usr/bin/env node

/**
 * Stage 1 API Verification Script
 *
 * This script validates that all Stage 1 backend endpoints are accessible
 * and returning expected data structures.
 */

const API_BASE_URL = process.env.VITE_API_BASE_URL || 'http://45.85.147.236:8080';

interface EndpointTest {
  name: string;
  method: 'GET' | 'POST';
  path: string;
  expectedStatus?: number;
  requiredFields?: string[];
  body?: any;
}

const endpoints: EndpointTest[] = [
  // Dataset endpoints
  {
    name: 'Get all datasets',
    method: 'GET',
    path: '/api/datasets',
    requiredFields: ['id', 'name', 'source_table'],
  },

  // Walkforward endpoints
  {
    name: 'Get walkforward runs',
    method: 'GET',
    path: '/api/walkforward/runs',
    requiredFields: ['data', 'total'],
  },

  // Trade simulation endpoints
  {
    name: 'Get trade simulation runs',
    method: 'GET',
    path: '/api/tradesim/runs',
    requiredFields: ['data', 'total'],
  },

  // LFS endpoints
  {
    name: 'Get LFS runs',
    method: 'GET',
    path: '/api/lfs/runs',
    requiredFields: ['data', 'total'],
  },
];

interface TestResult {
  name: string;
  status: 'PASS' | 'FAIL' | 'WARN';
  message: string;
  duration: number;
}

async function testEndpoint(endpoint: EndpointTest): Promise<TestResult> {
  const startTime = Date.now();
  const url = `${API_BASE_URL}${endpoint.path}`;

  try {
    const options: RequestInit = {
      method: endpoint.method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (endpoint.body) {
      options.body = JSON.stringify(endpoint.body);
    }

    const response = await fetch(url, options);
    const duration = Date.now() - startTime;

    // Check status code
    const expectedStatus = endpoint.expectedStatus || 200;
    if (response.status !== expectedStatus) {
      return {
        name: endpoint.name,
        status: 'FAIL',
        message: `Expected status ${expectedStatus}, got ${response.status}`,
        duration,
      };
    }

    // Parse response
    let data;
    try {
      data = await response.json();
    } catch (error) {
      return {
        name: endpoint.name,
        status: 'FAIL',
        message: 'Failed to parse JSON response',
        duration,
      };
    }

    // Check required fields
    if (endpoint.requiredFields && Array.isArray(data)) {
      if (data.length === 0) {
        return {
          name: endpoint.name,
          status: 'WARN',
          message: 'Endpoint returned empty array',
          duration,
        };
      }

      const firstItem = data[0];
      const missingFields = endpoint.requiredFields.filter(
        field => !(field in firstItem)
      );

      if (missingFields.length > 0) {
        return {
          name: endpoint.name,
          status: 'FAIL',
          message: `Missing required fields: ${missingFields.join(', ')}`,
          duration,
        };
      }
    } else if (endpoint.requiredFields) {
      const missingFields = endpoint.requiredFields.filter(
        field => !(field in data)
      );

      if (missingFields.length > 0) {
        return {
          name: endpoint.name,
          status: 'FAIL',
          message: `Missing required fields: ${missingFields.join(', ')}`,
          duration,
        };
      }
    }

    return {
      name: endpoint.name,
      status: 'PASS',
      message: 'All checks passed',
      duration,
    };
  } catch (error: any) {
    const duration = Date.now() - startTime;
    return {
      name: endpoint.name,
      status: 'FAIL',
      message: `Request failed: ${error.message}`,
      duration,
    };
  }
}

function printResults(results: TestResult[]) {
  console.log('\n========================================');
  console.log('  Stage 1 API Verification Results');
  console.log('========================================\n');

  const passed = results.filter(r => r.status === 'PASS').length;
  const warned = results.filter(r => r.status === 'WARN').length;
  const failed = results.filter(r => r.status === 'FAIL').length;

  results.forEach(result => {
    const icon = result.status === 'PASS' ? '✓' : result.status === 'WARN' ? '⚠' : '✗';
    const color = result.status === 'PASS' ? '\x1b[32m' : result.status === 'WARN' ? '\x1b[33m' : '\x1b[31m';
    const reset = '\x1b[0m';

    console.log(`${color}${icon}${reset} ${result.name}`);
    console.log(`  ${result.message} (${result.duration}ms)`);
    console.log('');
  });

  console.log('========================================');
  console.log(`Summary: ${passed} passed, ${warned} warnings, ${failed} failed`);
  console.log('========================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

async function main() {
  console.log(`Testing API endpoints at: ${API_BASE_URL}\n`);

  const results: TestResult[] = [];

  for (const endpoint of endpoints) {
    const result = await testEndpoint(endpoint);
    results.push(result);
  }

  printResults(results);
}

main().catch(error => {
  console.error('Verification script failed:', error);
  process.exit(1);
});
