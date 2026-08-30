/**
 * HYRO Automation — Phase 2 Test Runner
 * Runs P2-001 through P2-014 (Workflow Builder)
 * Then runs P1-001 through P1-014 (Phase 1 Regression)
 */
const http = require('http');
const path = require('path');
const app = require('../src/app');
const { connectDB, getDbStatus } = require('../src/config/db');
const userRepository = require('../src/services/userRepository');
const workflowRepository = require('../src/services/workflowRepository');

const PORT = 5002;
let server;

// ── helpers ──────────────────────────────────────────────────────────────────
const req = (method, urlPath, body = null, headers = {}) =>
  new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : '';
    const opts = {
      hostname: '127.0.0.1', port: PORT, path: urlPath, method,
      headers: { 'Content-Type': 'application/json', ...headers, ...(body ? { 'Content-Length': Buffer.byteLength(data) } : {}) }
    };
    const r = http.request(opts, (res) => {
      let raw = '';
      res.on('data', (c) => (raw += c));
      res.on('end', () => {
        let parsed; try { parsed = JSON.parse(raw); } catch { parsed = raw; }
        resolve({ status: res.statusCode, headers: res.headers, body: parsed });
      });
    });
    r.on('error', reject);
    if (body) r.write(data);
    r.end();
  });

const results = [];
let passed = 0, failed = 0;

function record(id, feature, expected, actual, status, notes = '') {
  results.push({ id, feature, expected, actual, status, notes });
  const sym = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️';
  console.log(`${sym} [${id}] ${feature}: ${status}`);
  if (status === 'FAIL') {
    console.log(`   Expected: ${expected}`);
    console.log(`   Actual:   ${actual}`);
  }
  if (status === 'PASS') passed++; else failed++;
}

// ── Phase 1 Regression ───────────────────────────────────────────────────────
async function runPhase1Regression(userToken) {
  console.log('\n--- Phase 1 Regression Suite ---\n');

  const h = await req('GET', '/api/health');
  record('P1-003-R', 'Health Endpoint [REGRESSION]', 'status:ok', `status:${h.body.status}`, h.status === 200 && h.body.status === 'ok' ? 'PASS' : 'FAIL');

  const rr = await req('POST', '/api/auth/register', { name: 'Reg Regression', email: `regr_${Date.now()}@hyro.ai`, password: 'pass1234', role: 'operator' });
  record('P1-004-R', 'Registration [REGRESSION]', 'status:201, token returned', `status:${rr.status}`, rr.status === 201 && !!rr.body.data?.token ? 'PASS' : 'FAIL');

  const lr = await req('POST', '/api/auth/login', { email: `regr_${Date.now() - 100}@hyro.ai`, password: 'wrongpass' });
  record('P1-007-R', 'Invalid Login [REGRESSION]', 'status:401', `status:${lr.status}`, lr.status === 401 ? 'PASS' : 'FAIL');

  const noAuth = await req('GET', '/api/auth/me');
  record('P1-009-R', 'Protected Route [REGRESSION]', 'status:401', `status:${noAuth.status}`, noAuth.status === 401 ? 'PASS' : 'FAIL');

  if (userToken) {
    const me = await req('GET', '/api/auth/me', null, { Authorization: `Bearer ${userToken}` });
    record('P1-010-R', '/api/auth/me [REGRESSION]', 'status:200, user returned', `status:${me.status}`, me.status === 200 && !!me.body.data?.user ? 'PASS' : 'FAIL');
  }
}

// ── Phase 2 Tests ─────────────────────────────────────────────────────────────
async function runTests() {
  console.log('\n========================================');
  console.log('HYRO AUTOMATION — PHASE 2 TEST SUITE');
  console.log('========================================\n');

  userRepository.clearInMemoryStore();
  workflowRepository.clearInMemoryStore();
  await connectDB();
  server = app.listen(PORT);

  // ── Setup: register two users ──
  const u1 = await req('POST', '/api/auth/register', { name: 'User One', email: `u1_${Date.now()}@hyro.ai`, password: 'password123', role: 'operator' });
  const u2 = await req('POST', '/api/auth/register', { name: 'User Two', email: `u2_${Date.now()}@hyro.ai`, password: 'password123', role: 'operator' });
  const token1 = u1.body.data?.token;
  const token2 = u2.body.data?.token;
  const auth1 = { Authorization: `Bearer ${token1}` };
  const auth2 = { Authorization: `Bearer ${token2}` };

  let workflowId, cloneId;

  // P2-001: Create Workflow
  const createRes = await req('POST', '/api/workflows', {
    name: 'Gmail Job Tracker',
    description: 'Monitor Gmail for job emails and save to Google Sheets',
    nodes: [{ id: 'node-1', type: 'gmailTrigger', position: { x: 100, y: 100 }, data: { label: 'Gmail Trigger' }, config: {} }],
    edges: []
  }, auth1);
  const wfOk = createRes.status === 201 && !!createRes.body.data?.workflow;
  workflowId = createRes.body.data?.workflow?._id;
  record('P2-001', 'Create Workflow', 'status:201, workflow._id set, owner assigned', `status:${createRes.status}, id:${workflowId}`, wfOk ? 'PASS' : 'FAIL');

  // P2-002: Add Node
  const addNodeRes = await req('PUT', `/api/workflows/${workflowId}`, {
    nodes: [
      { id: 'node-1', type: 'gmailTrigger', position: { x: 100, y: 100 }, data: { label: 'Gmail Trigger' }, config: {} },
      { id: 'node-2', type: 'aiEmailClassifier', position: { x: 350, y: 100 }, data: { label: 'AI Classifier' }, config: {} }
    ],
    edges: []
  }, auth1);
  const addOk = addNodeRes.status === 200 && addNodeRes.body.data?.workflow?.nodes?.length === 2;
  record('P2-002', 'Add Node', '2 nodes in workflow', `nodeCount:${addNodeRes.body.data?.workflow?.nodes?.length}`, addOk ? 'PASS' : 'FAIL');

  // P2-003: Move Node position
  const moveRes = await req('PUT', `/api/workflows/${workflowId}`, {
    nodes: [
      { id: 'node-1', type: 'gmailTrigger', position: { x: 50, y: 200 }, data: { label: 'Gmail Trigger' }, config: {} },
      { id: 'node-2', type: 'aiEmailClassifier', position: { x: 350, y: 200 }, data: { label: 'AI Classifier' }, config: {} }
    ],
    edges: []
  }, auth1);
  const movedNode = moveRes.body.data?.workflow?.nodes?.find((n) => n.id === 'node-1');
  const moveOk = moveRes.status === 200 && movedNode?.position?.x === 50 && movedNode?.position?.y === 200;
  record('P2-003', 'Move Node', 'node-1 position x:50 y:200', `x:${movedNode?.position?.x} y:${movedNode?.position?.y}`, moveOk ? 'PASS' : 'FAIL');

  // P2-004: Connect Nodes
  const connectRes = await req('PUT', `/api/workflows/${workflowId}`, {
    nodes: [
      { id: 'node-1', type: 'gmailTrigger', position: { x: 50, y: 200 }, data: { label: 'Gmail Trigger' }, config: {} },
      { id: 'node-2', type: 'aiEmailClassifier', position: { x: 350, y: 200 }, data: { label: 'AI Classifier' }, config: {} }
    ],
    edges: [{ id: 'edge-1', source: 'node-1', target: 'node-2', animated: true }]
  }, auth1);
  const edgeOk = connectRes.status === 200 && connectRes.body.data?.workflow?.edges?.length === 1;
  record('P2-004', 'Connect Nodes', '1 edge (node-1 → node-2)', `edgeCount:${connectRes.body.data?.workflow?.edges?.length}`, edgeOk ? 'PASS' : 'FAIL');

  // P2-005: Invalid Connection (edge referencing non-existent node)
  const invalidEdgeRes = await req('PUT', `/api/workflows/${workflowId}`, {
    nodes: [{ id: 'node-1', type: 'gmailTrigger', position: { x: 100, y: 100 }, data: {}, config: {} }],
    edges: [{ id: 'edge-bad', source: 'node-1', target: 'node-GHOST', animated: true }]
  }, auth1);
  record('P2-005', 'Invalid Connection Prevention', 'status:400 for unknown target node', `status:${invalidEdgeRes.status}`, invalidEdgeRes.status === 400 ? 'PASS' : 'FAIL');

  // P2-006: Node Configuration
  const configRes = await req('PUT', `/api/workflows/${workflowId}`, {
    nodes: [
      { id: 'node-1', type: 'gmailTrigger', position: { x: 50, y: 200 }, data: { label: 'Gmail Trigger' }, config: { searchQuery: 'subject:job', maxResults: 10 } },
      { id: 'node-2', type: 'aiEmailClassifier', position: { x: 350, y: 200 }, data: { label: 'AI Classifier' }, config: { categories: ['JOB', 'CERTIFICATE'] } }
    ],
    edges: [{ id: 'edge-1', source: 'node-1', target: 'node-2', animated: true }]
  }, auth1);
  const configNode = configRes.body.data?.workflow?.nodes?.find((n) => n.id === 'node-1');
  const configOk = configRes.status === 200 && configNode?.config?.searchQuery === 'subject:job';
  record('P2-006', 'Node Configuration', 'config.searchQuery persisted', `value:${configNode?.config?.searchQuery}`, configOk ? 'PASS' : 'FAIL');

  // P2-007: Save Workflow (verify full persistence)
  const getRes = await req('GET', `/api/workflows/${workflowId}`, null, auth1);
  const savedOk = getRes.status === 200 && getRes.body.data?.workflow?.nodes?.length === 2 && getRes.body.data?.workflow?.edges?.length === 1;
  record('P2-007', 'Save Workflow', 'nodes:2 edges:1 persisted', `nodes:${getRes.body.data?.workflow?.nodes?.length} edges:${getRes.body.data?.workflow?.edges?.length}`, savedOk ? 'PASS' : 'FAIL');

  // P2-008: Reload Workflow
  const reloadRes = await req('GET', `/api/workflows/${workflowId}`, null, auth1);
  const reloadOk = reloadRes.status === 200 && reloadRes.body.data?.workflow?.name === 'Gmail Job Tracker';
  record('P2-008', 'Reload Workflow', 'name and graph reconstruct correctly', `name:${reloadRes.body.data?.workflow?.name}`, reloadOk ? 'PASS' : 'FAIL');

  // P2-009: Edit Workflow (version increments)
  const versionBefore = getRes.body.data?.workflow?.version || 1;
  const editRes = await req('PUT', `/api/workflows/${workflowId}`, {
    name: 'Gmail Job Tracker v2',
    nodes: [
      { id: 'node-1', type: 'gmailTrigger', position: { x: 50, y: 200 }, data: { label: 'Gmail Trigger' }, config: {} },
      { id: 'node-2', type: 'aiEmailClassifier', position: { x: 350, y: 200 }, data: { label: 'AI Classifier' }, config: {} },
      { id: 'node-3', type: 'googleSheetsAppend', position: { x: 600, y: 200 }, data: { label: 'Google Sheets' }, config: {} }
    ],
    edges: [
      { id: 'edge-1', source: 'node-1', target: 'node-2', animated: true },
      { id: 'edge-2', source: 'node-2', target: 'node-3', animated: true }
    ]
  }, auth1);
  const versionAfter = editRes.body.data?.workflow?.version;
  const editOk = editRes.status === 200 && versionAfter > versionBefore;
  record('P2-009', 'Edit Workflow / Versioning', `version incremented from ${versionBefore}`, `version:${versionAfter}`, editOk ? 'PASS' : 'FAIL');

  // P2-010: Duplicate Workflow
  const dupRes = await req('POST', `/api/workflows/${workflowId}/duplicate`, null, auth1);
  cloneId = dupRes.body.data?.workflow?._id;
  const dupOk = dupRes.status === 201 && !!cloneId && cloneId !== workflowId;
  record('P2-010', 'Duplicate Workflow', 'new _id, independent of original', `cloneId:${cloneId}`, dupOk ? 'PASS' : 'FAIL');

  // P2-011: Verify clone is independent (version should be reset to 1)
  const cloneGet = await req('GET', `/api/workflows/${cloneId}`, null, auth1);
  const cloneIndependent = cloneGet.body.data?.workflow?.version === 1;
  record('P2-011', 'Versioning (Clone Reset)', 'clone version=1', `clone version:${cloneGet.body.data?.workflow?.version}`, cloneIndependent ? 'PASS' : 'FAIL');

  // P2-012: Delete Workflow
  const delRes = await req('DELETE', `/api/workflows/${cloneId}`, null, auth1);
  const delOk = delRes.status === 200 && delRes.body.data?.deleted === true;
  record('P2-012', 'Delete Workflow', 'deleted:true, workflow removed', `status:${delRes.status}`, delOk ? 'PASS' : 'FAIL');

  // Verify deleted workflow is gone
  const afterDeleteRes = await req('GET', `/api/workflows/${cloneId}`, null, auth1);
  record('P2-012b', 'Deleted Workflow Not Accessible', 'status:404', `status:${afterDeleteRes.status}`, afterDeleteRes.status === 404 ? 'PASS' : 'FAIL');

  // P2-013: Ownership (User 2 cannot access User 1's workflow)
  const crossUserGet = await req('GET', `/api/workflows/${workflowId}`, null, auth2);
  record('P2-013', 'Ownership Check', 'User 2 gets 404 for User 1 workflow', `status:${crossUserGet.status}`, crossUserGet.status === 404 ? 'PASS' : 'FAIL');

  // Cross-user PUT also rejected
  const crossUserPut = await req('PUT', `/api/workflows/${workflowId}`, { name: 'Hijacked' }, auth2);
  record('P2-013b', 'Ownership — PUT Blocked', 'User 2 cannot modify User 1 workflow', `status:${crossUserPut.status}`, crossUserPut.status === 404 ? 'PASS' : 'FAIL');

  // P2-014: Placeholder Execution
  const execRes = await req('POST', `/api/workflows/${workflowId}/execute`, null, auth1);
  const execOk = execRes.status === 200 && execRes.body.data?.status === 'PENDING' && !!execRes.body.data?.workflowSnapshot;
  record('P2-014', 'Placeholder Execution', 'status:PENDING + workflowSnapshot returned', `execStatus:${execRes.body.data?.status}`, execOk ? 'PASS' : 'FAIL');

  // ── Phase 1 Regression ──
  await runPhase1Regression(token1);

  // ── Summary ──────────────────────────────────────────────────────────────────
  const total = results.length;
  console.log('\n========================================');
  console.log(`SUMMARY: ${passed}/${total} PASS | ${failed} FAIL`);
  console.log('========================================\n');

  if (failed > 0) {
    console.error('Phase 2 Gate Status: FAIL ❌');
    server.close(() => process.exit(1));
  } else {
    console.log('Phase 2 Gate Status: PASS ✅');
    server.close(() => process.exit(0));
  }
}

runTests().catch((err) => {
  console.error('Test runner fatal error:', err);
  if (server) server.close();
  process.exit(1);
});
