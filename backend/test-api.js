const app = require('./server');
const http = require('http');

let server;
let baseUrl;

async function request(path, options = {}) {
  const url = `${baseUrl}${path}`;
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options
  });
  let body = null;
  const text = await response.text();
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }
  return { status: response.status, body };
}

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  PASS: ${message}`);
    passed++;
  } else {
    console.error(`  FAIL: ${message}`);
    failed++;
  }
}

async function runTests() {
  console.log('\n--- STARTING BLOOD-IN-TIME BACKEND API TESTS ---\n');

  // 1. GET /api/health
  console.log('1. Testing GET /api/health');
  const healthRes = await request('/api/health');
  assert(healthRes.status === 200, 'Health check returns 200');
  assert(healthRes.body.status === 'success', 'Health status is "success"');

  // 2. GET /api/inventory
  console.log('\n2. Testing GET /api/inventory');
  const invRes = await request('/api/inventory');
  assert(invRes.status === 200, 'Inventory returns 200');
  assert(Array.isArray(invRes.body), 'Inventory is an array');
  assert(invRes.body.length === 8, 'Inventory has 8 blood groups');
  const aPos = invRes.body.find((i) => i.group === 'A+');
  assert(aPos && typeof aPos.stock === 'number', 'A+ blood item exists with numeric stock');

  // 3. PUT /api/inventory/:group
  console.log('\n3. Testing PUT /api/inventory/:group');
  // 3a. Valid update
  const updateRes = await request('/api/inventory/A+', {
    method: 'PUT',
    body: JSON.stringify({ stock: 25 })
  });
  assert(updateRes.status === 200, 'Valid stock update returns 200');
  assert(updateRes.body.inventory.stock === 25, 'A+ stock updated to 25');

  // 3b. Reject negative stock
  const negRes = await request('/api/inventory/A+', {
    method: 'PUT',
    body: JSON.stringify({ stock: -5 })
  });
  assert(negRes.status === 400, 'Negative stock returns 400');

  // 3c. Reject invalid non-numeric stock
  const invalidRes = await request('/api/inventory/A+', {
    method: 'PUT',
    body: JSON.stringify({ stock: 'invalid' })
  });
  assert(invalidRes.status === 400, 'Invalid non-numeric stock returns 400');

  // 3d. Non-existent blood group
  const nonExistentRes = await request('/api/inventory/XYZ', {
    method: 'PUT',
    body: JSON.stringify({ stock: 10 })
  });
  assert(nonExistentRes.status === 404, 'Non-existent blood group returns 404');

  // 4. GET /api/banks
  console.log('\n4. Testing GET /api/banks');
  const banksRes = await request('/api/banks');
  assert(banksRes.status === 200, 'Banks returns 200');
  assert(Array.isArray(banksRes.body) && banksRes.body.length >= 5, 'Returns demonstration blood banks list (>= 5 banks)');
  const bankB = banksRes.body.find((b) => b.id === 'bank-b');
  assert(bankB && Array.isArray(bankB.inventory), 'Bank B exists and has inventory');

  // 5. POST /api/requests
  console.log('\n5. Testing POST /api/requests');
  // Read current O+ stock first
  const currentInvBefore = await request('/api/inventory');
  const oStockBefore = currentInvBefore.body.find((i) => i.group === 'O+').stock;

  // 5a. Valid request
  const createReqRes = await request('/api/requests', {
    method: 'POST',
    body: JSON.stringify({
      bloodGroup: 'O+',
      units: 2,
      urgency: 'Emergency',
      hospitalName: 'Memorial Hospital'
    })
  });
  assert(createReqRes.status === 201, 'Create request returns 201 Created');
  assert(createReqRes.body.request.status === 'Pending', 'New request status is Pending');
  const createdReqId = createReqRes.body.request.id;

  // 5b. Verify inventory NOT deducted on submission
  const currentInvAfter = await request('/api/inventory');
  const oStockAfter = currentInvAfter.body.find((i) => i.group === 'O+').stock;
  assert(oStockBefore === oStockAfter, 'Stock is NOT deducted upon request creation');

  // 5c. Reject invalid blood group
  const badGroupReq = await request('/api/requests', {
    method: 'POST',
    body: JSON.stringify({ bloodGroup: 'UNKNOWN', units: 2 })
  });
  assert(badGroupReq.status === 400, 'Reject request with invalid blood group (400)');

  // 5d. Reject zero/negative units
  const badUnitsReq = await request('/api/requests', {
    method: 'POST',
    body: JSON.stringify({ bloodGroup: 'O+', units: 0 })
  });
  assert(badUnitsReq.status === 400, 'Reject request with 0 or negative units (400)');

  // 6. GET /api/requests
  console.log('\n6. Testing GET /api/requests');
  const allReqsRes = await request('/api/requests');
  assert(allReqsRes.status === 200, 'Get requests returns 200');
  assert(Array.isArray(allReqsRes.body), 'Requests is an array');
  assert(allReqsRes.body.some((r) => r.id === createdReqId), 'Created request found in history');

  // 7. POST /api/requests/:id/issue
  console.log('\n7. Testing POST /api/requests/:id/issue');
  // 7a. Confirm issue successfully
  const issueRes = await request(`/api/requests/${createdReqId}/issue`, {
    method: 'POST',
    body: JSON.stringify({ bankId: 'bank-a' })
  });
  assert(issueRes.status === 200, 'Issue blood returns 200 OK');
  assert(issueRes.body.request.status === 'Issued', 'Request status changed to Issued');

  // Verify stock was deducted after issue
  const invAfterIssue = await request('/api/inventory');
  const oStockAfterIssue = invAfterIssue.body.find((i) => i.group === 'O+').stock;
  assert(oStockAfterIssue === oStockBefore - 2, 'Stock deducted by 2 after confirmed issue');

  // 7b. Prevent duplicate deduction / double issue
  const duplicateIssueRes = await request(`/api/requests/${createdReqId}/issue`, {
    method: 'POST',
    body: JSON.stringify({ bankId: 'bank-a' })
  });
  assert(duplicateIssueRes.status === 409, 'Duplicate issue rejected with 409 Conflict');

  // 7c. Insufficient stock issue
  const hugeReqRes = await request('/api/requests', {
    method: 'POST',
    body: JSON.stringify({ bloodGroup: 'O+', units: 9999, urgency: 'Normal' })
  });
  const hugeReqId = hugeReqRes.body.request.id;
  const insufficientIssueRes = await request(`/api/requests/${hugeReqId}/issue`, {
    method: 'POST',
    body: JSON.stringify({ bankId: 'bank-a' })
  });
  assert(insufficientIssueRes.status === 400, 'Issue exceeding stock rejected with 400');

  // 8. POST /api/redistribution/transfer
  console.log('\n8. Testing POST /api/redistribution/transfer');
  // Check source and destination stock before transfer
  const allBanksBefore = await request('/api/banks');
  const bankBBefore = allBanksBefore.body.find((b) => b.id === 'bank-b');
  const bankBOposBefore = bankBBefore.inventory.find((i) => i.group === 'O+').stock;

  const bankABefore = allBanksBefore.body.find((b) => b.id === 'bank-a');
  const bankAOposBefore = bankABefore.inventory.find((i) => i.group === 'O+').stock;

  // 8a. Valid transfer from Bank B to Bank A (3 units of O+)
  const transferRes = await request('/api/redistribution/transfer', {
    method: 'POST',
    body: JSON.stringify({
      sourceBank: 'Blood Bank B',
      destinationBank: 'Blood Bank A',
      group: 'O+',
      units: 3,
      note: 'Routine shortage rebalance'
    })
  });
  assert(transferRes.status === 200, 'Valid transfer returns 200 OK');
  assert(transferRes.body.transfer.units === 3, 'Transfer records 3 units');

  // Verify stock changes
  const allBanksAfter = await request('/api/banks');
  const bankBAfter = allBanksAfter.body.find((b) => b.id === 'bank-b');
  const bankBOposAfter = bankBAfter.inventory.find((i) => i.group === 'O+').stock;
  assert(bankBOposAfter === bankBOposBefore - 3, 'Source bank stock decreased by 3');

  const bankAAfter = allBanksAfter.body.find((b) => b.id === 'bank-a');
  const bankAOposAfter = bankAAfter.inventory.find((i) => i.group === 'O+').stock;
  assert(bankAOposAfter === bankAOposBefore + 3, 'Destination bank stock increased by 3');

  // 8b. Reject self-transfer
  const selfTransferRes = await request('/api/redistribution/transfer', {
    method: 'POST',
    body: JSON.stringify({
      sourceBank: 'bank-a',
      destinationBank: 'bank-a',
      group: 'A+',
      units: 2
    })
  });
  assert(selfTransferRes.status === 400, 'Transfer to self rejected with 400');

  // 8c. Reject transfer exceeding source stock
  const excessTransferRes = await request('/api/redistribution/transfer', {
    method: 'POST',
    body: JSON.stringify({
      sourceBank: 'bank-b',
      destinationBank: 'bank-a',
      group: 'O+',
      units: 9999
    })
  });
  assert(excessTransferRes.status === 400, 'Transfer exceeding available stock rejected with 400');

  // 9. GET /api/redistribution/history
  console.log('\n9. Testing GET /api/redistribution/history');
  const historyRes = await request('/api/redistribution/history');
  assert(historyRes.status === 200, 'Transfer history returns 200 OK');
  assert(Array.isArray(historyRes.body), 'Transfer history is an array');
  assert(historyRes.body.length >= 1, 'Transfer history contains completed transfers');

  console.log(`\n--- SUMMARY: ${passed} PASSED, ${failed} FAILED ---\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

// Start test server on random port
const testPort = 5999;
server = http.createServer(app);
server.listen(testPort, async () => {
  baseUrl = `http://localhost:${testPort}`;
  try {
    await runTests();
  } catch (err) {
    console.error('Unexpected test error:', err);
    process.exit(1);
  } finally {
    server.close();
  }
});
