/**
 * Simple test script to verify API endpoints work
 * Run with: node scripts/test_api.js
 */

import http from 'http';

const BASE_URL = 'http://localhost:3000';

function testEndpoint(path, method = 'GET') {
  return new Promise((resolve) => {
    const url = new URL(path, BASE_URL);

    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    });

    req.on('error', (error) => {
      resolve({
        error: error.message
      });
    });

    if (method === 'POST') {
      req.write(JSON.stringify({ test: true }));
    }

    req.end();
  });
}

async function runTests() {
  console.log('🧪 Testing My Circle API\n');
  console.log('Make sure the server is running: npm run dev\n');

  // Test health endpoint
  console.log('1. Testing GET /health');
  const health = await testEndpoint('/health');
  console.log(`   Status: ${health.status}`);
  console.log(`   Body: ${health.body}\n`);

  // Test register endpoint (will fail without valid token, but shows endpoint exists)
  console.log('2. Testing POST /v1/auth/register (without auth)');
  const register = await testEndpoint('/v1/auth/register', 'POST');
  console.log(`   Status: ${register.status} (expected 401 without valid token)`);
  console.log(`   Body: ${register.body?.substring(0, 100)}\n`);

  // Test me endpoint
  console.log('3. Testing GET /v1/me (without auth)');
  const me = await testEndpoint('/v1/me');
  console.log(`   Status: ${me.status} (expected 401 without valid token)`);
  console.log(`   Body: ${me.body?.substring(0, 100)}\n`);

  console.log('✅ Basic API structure tests complete!');
  console.log('\nNext steps:');
  console.log('1. Configure Firebase credentials in .env');
  console.log('2. Get a real Firebase ID token from the Flutter app');
  console.log('3. Test with valid authentication');
}

runTests().catch(console.error);
