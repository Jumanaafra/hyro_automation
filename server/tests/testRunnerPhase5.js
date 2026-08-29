/**
 * HYRO Automation — Phase 5 Test Runner
 * Runs P5-001 through P5-019 (Agentic Execution Engine)
 * Plus Full Product Regression Suite (Phases 1, 2, 3, 4)
 */
const http = require('http');
const path = require('path');
const app = require('../src/app');
const { connectDB } = require('../src/config/db');
const userRepository = require('../src/services/userRepository');
const workflowRepository = require('../src/services/workflowRepository');
const documentService = require('../src/services/documentService');
const vectorStore = require('../src/rag/vectorStore');
const ragService = require('../src/services/ragService');
const orchestrator = require('../src/agents/orchestrator');
const plannerAgent = require('../src/agents/plannerAgent');
const validationAgent = require('../src/agents/validationAgent');
const recoveryAgent = require('../src/agents/recoveryAgent');

const PORT = 5005;
let server;

const req = (method, urlPath, body = null, headers = {}) =>
  new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : '';
    const opts = {
      hostname: '127.0.0.1',
      port: PORT,
      path: urlPath,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
        ...(body ? { 'Content-Length': Buffer.byteLength(data) } : {})
      }
    };
    const r = http.request(opts, (res) => {
      let raw = '';
      res.on('data', (c) => (raw += c));
      res.on('end', () => {
        let parsed;
        try {
          parsed = JSON.parse(raw);
        } catch {
          parsed = raw;
        }
        resolve({ status: res.statusCode, headers: res.headers, body: parsed });
      });
    });
    r.on('error', reject);
    if (body) r.write(data);
    r.end();
  });

const results = [];
let passed = 0,
  failed = 0;

function record(id, feature, expected, actual, status, notes = '') {
  results.push({ id, feature, expected, actual, status, notes });
  const sym = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️';
  console.log(`${sym} [${id}] ${feature}: ${status}`);
  if (status === 'FAIL') {
    console.log(`   Expected: ${expected}`);
    console.log(`   Actual:   ${actual}`);
  }
  if (status === 'PASS') passed++;
  else failed++;
}

async function runTests() {
  console.log('\n========================================');
  console.log('HYRO AUTOMATION — PHASE 5 TEST SUITE');
  console.log('========================================\n');

  userRepository.clearInMemoryStore();
  workflowRepository.clearInMemoryStore();
  documentService.clearInMemoryStore();
  vectorStore.clearInMemoryStore();
  ragService.clearInMemoryStore();
  orchestrator.clearInMemoryStore();

  await connectDB();
  server = app.listen(PORT);

  // Setup: Register User 1 & User 2
  const u1 = await req('POST', '/api/auth/register', {
    name: 'Agent User One',
    email: `agent1_${Date.now()}@hyro.ai`,
    password: 'password123',
    role: 'operator'
  });
  const u2 = await req('POST', '/api/auth/register', {
    name: 'Agent User Two',
    email: `agent2_${Date.now()}@hyro.ai`,
    password: 'password123',
    role: 'operator'
  });

  const token1 = u1.body.data?.token;
  const token2 = u2.body.data?.token;
  const auth1 = { Authorization: `Bearer ${token1}` };
  const auth2 = { Authorization: `Bearer ${token2}` };

  // Create workflow for User 1
  const wfRes = await req('POST', '/api/workflows', {
    name: 'Agentic Career Tracker',
    nodes: [
      { id: 'n1', type: 'gmailTrigger', position: { x: 0, y: 0 } },
      { id: 'n2', type: 'aiEmailClassifier', position: { x: 250, y: 0 } },
      { id: 'n3', type: 'googleSheetsAppend', position: { x: 500, y: 0 } }
    ],
    edges: [
      { id: 'e1', source: 'n1', target: 'n2' },
      { id: 'e2', source: 'n2', target: 'n3' }
    ]
  }, auth1);
  const wfId = wfRes.body.data?.workflow?._id;

  // P5-001: Planner Agent Test
  const plan = plannerAgent.planExecution(wfRes.body.data?.workflow?.nodes, wfRes.body.data?.workflow?.edges);
  const p1Ok = plan.executionPlan.join('->') === 'n1->n2->n3' && plan.confidenceScore > 0.8;
  record('P5-001', 'Planner Agent', 'topological order n1->n2->n3 with high confidence', `order:${plan.executionPlan.join('->')}, score:${plan.confidenceScore}`, p1Ok ? 'PASS' : 'FAIL');

  // P5-002: Execution Agent Test
  const execRes = await req('POST', `/api/workflows/${wfId}/execute`, null, auth1);
  const execId = execRes.body.data?._id;
  const p2Ok = execRes.status === 200 && !!execId;
  record('P5-002', 'Execution Agent / Start', 'status:200 and execution ID created', `status:${execRes.status}, id:${execId}`, p2Ok ? 'PASS' : 'FAIL');

  // Wait for background execution completion
  await new Promise((r) => setTimeout(r, 800));

  // P5-003: Validation Agent Test
  const valResult = validationAgent.validateOutput({ id: 'n1', type: 'gmailTrigger' }, { status: 'COMPLETED', output: { fetchedEmails: 3 } });
  record('P5-003', 'Validation Agent', 'isValid: true for valid node output', `isValid:${valResult.isValid}`, valResult.isValid ? 'PASS' : 'FAIL');

  // P5-004: Recovery Agent — Missing Fields
  const recMissing = recoveryAgent.classifyAndDecide('MISSING_FIELDS', 0);
  const p4Ok = recMissing.decision === 'ESCALATE' && recMissing.category === 'MISSING_FIELDS';
  record('P5-004', 'Recovery Agent — Missing Fields', 'decision: ESCALATE', `decision:${recMissing.decision}`, p4Ok ? 'PASS' : 'FAIL');

  // P5-005: Recovery Agent — API Failure
  const recApi = recoveryAgent.classifyAndDecide('API_FAILURE', 0);
  const p5Ok = recApi.decision === 'RETRY';
  record('P5-005', 'Recovery Agent — API Failure', 'decision: RETRY with backoff', `decision:${recApi.decision}`, p5Ok ? 'PASS' : 'FAIL');

  // P5-006: Recovery Agent — Auth Expired
  const recAuth = recoveryAgent.classifyAndDecide('AUTH_EXPIRED', 0);
  const p6Ok = recAuth.decision === 'ESCALATE';
  record('P5-006', 'Recovery Agent — Auth Expired', 'decision: ESCALATE', `decision:${recAuth.decision}`, p6Ok ? 'PASS' : 'FAIL');

  // P5-007: Recovery Agent — Rate Limit
  const recRate = recoveryAgent.classifyAndDecide('RATE_LIMIT', 1);
  const p7Ok = recRate.decision === 'RETRY' && recRate.backoffMs > 0;
  record('P5-007', 'Recovery Agent — Rate Limit', 'decision: RETRY with backoffMs > 0', `backoff:${recRate.backoffMs}ms`, p7Ok ? 'PASS' : 'FAIL');

  // P5-008: Recovery Agent — Transient Error
  const recTrans = recoveryAgent.classifyAndDecide('TRANSIENT', 0);
  const p8Ok = recTrans.decision === 'RETRY';
  record('P5-008', 'Recovery Agent — Transient Error', 'decision: RETRY', `decision:${recTrans.decision}`, p8Ok ? 'PASS' : 'FAIL');

  // P5-009 & P5-010: Monitoring Agent & Successful Execution Lifecycle
  const getExecRes = await req('GET', `/api/executions/${execId}`, null, auth1);
  const p10Ok = getExecRes.status === 200 && (getExecRes.body.data?.execution?.status === 'COMPLETED' || getExecRes.body.data?.execution?.status === 'RUNNING');
  record('P5-010', 'Successful Execution Lifecycle', 'status COMPLETED or RUNNING', `status:${getExecRes.body.data?.execution?.status}`, p10Ok ? 'PASS' : 'FAIL');

  // P5-009: Timeline Events & Logs
  const timeRes = await req('GET', `/api/executions/${execId}/timeline`, null, auth1);
  const p9Ok = timeRes.status === 200 && Array.isArray(timeRes.body.data?.events) && timeRes.body.data.events.length > 0;
  record('P5-009', 'Monitoring Agent / Timeline', 'Events array populated', `eventsCount:${timeRes.body.data?.events?.length}`, p9Ok ? 'PASS' : 'FAIL');

  // P5-013: Pause Execution
  const pauseRes = await req('POST', `/api/executions/${execId}/pause`, null, auth1);
  const p13Ok = pauseRes.status === 200 && pauseRes.body.data?.execution?.status === 'PAUSED';
  record('P5-013', 'Pause Execution', 'status: PAUSED', `status:${pauseRes.body.data?.execution?.status}`, p13Ok ? 'PASS' : 'FAIL');

  // P5-014: Resume Execution
  const resumeRes = await req('POST', `/api/executions/${execId}/resume`, null, auth1);
  const p14Ok = resumeRes.status === 200 && (resumeRes.body.data?.execution?.status === 'RUNNING' || resumeRes.body.data?.execution?.status === 'COMPLETED');
  record('P5-014', 'Resume Execution', 'status updated to RUNNING/COMPLETED', `status:${resumeRes.body.data?.execution?.status}`, p14Ok ? 'PASS' : 'FAIL');

  // P5-015: Cancel Execution
  const cancelRes = await req('POST', `/api/executions/${execId}/cancel`, null, auth1);
  const p15Ok = cancelRes.status === 200 && cancelRes.body.data?.execution?.status === 'CANCELLED';
  record('P5-015', 'Cancel Execution', 'status: CANCELLED', `status:${cancelRes.body.data?.execution?.status}`, p15Ok ? 'PASS' : 'FAIL');

  // P5-016: Immutable Workflow Snapshot
  const snapshot = getExecRes.body.data?.execution?.workflowSnapshot;
  const p16Ok = snapshot && snapshot.name === 'Agentic Career Tracker' && snapshot.nodes.length === 3;
  record('P5-016', 'Immutable Workflow Snapshot', 'Snapshot preserved at runtime', `snapshotName:${snapshot?.name}`, p16Ok ? 'PASS' : 'FAIL');

  // P5-017: Execution Logs Granularity
  const logsCount = timeRes.body.data?.events?.length || 0;
  record('P5-017', 'Execution Logs Granularity', 'Multiple agent logs recorded', `logsCount:${logsCount}`, logsCount >= 3 ? 'PASS' : 'FAIL');

  // P5-018: LangGraph Availability Reporting
  const lgStatus = timeRes.body.data?.langGraph;
  const p18Ok = lgStatus === 'available' || lgStatus === 'not-installed';
  record('P5-018', 'LangGraph Availability', 'langGraph reported as available or not-installed', `langGraph:${lgStatus}`, p18Ok ? 'PASS' : 'FAIL');

  // P5-019: Cross-User Execution Security
  const crossGet = await req('GET', `/api/executions/${execId}`, null, auth2);
  const p19Ok = crossGet.status === 404;
  record('P5-019', 'Cross-User Execution Security', 'User 2 gets 404 for User 1 execution', `status:${crossGet.status}`, p19Ok ? 'PASS' : 'FAIL');

  // ── Full Product Regression Suite (Phases 1, 2, 3, 4) ──────────────────────
  console.log('\n--- Full Product Regression Suite (Phases 1, 2, 3, 4) ---\n');

  const health = await req('GET', '/api/health');
  record('P1-003-R', 'Health Endpoint [REGRESSION]', 'status:200', `status:${health.status}`, health.status === 200 ? 'PASS' : 'FAIL');

  const createWf = await req('POST', '/api/workflows', { name: 'Phase 5 Reg WF', nodes: [{ id: 'n1', type: 'gmailTrigger', position: { x: 0, y: 0 } }], edges: [] }, auth1);
  record('P2-001-R', 'Create Workflow [REGRESSION]', 'status:201', `status:${createWf.status}`, createWf.status === 201 ? 'PASS' : 'FAIL');

  const aiGen = await req('POST', '/api/workflows/generate', { prompt: 'Process job emails and notify Slack.' }, auth1);
  record('P3-001-R', 'AI Workflow Generation [REGRESSION]', 'status:200', `status:${aiGen.status}`, aiGen.status === 200 ? 'PASS' : 'FAIL');

  const chat = await req('POST', '/api/chat', { message: 'Hello RAG Assistant' }, auth1);
  record('P4-001-R', 'RAG Chat Assistant [REGRESSION]', 'status:200', `status:${chat.status}`, chat.status === 200 ? 'PASS' : 'FAIL');

  // ── Summary ──
  const total = results.length;
  console.log('\n========================================');
  console.log(`SUMMARY: ${passed}/${total} PASS | ${failed} FAIL`);
  console.log('========================================\n');

  if (failed > 0) {
    console.error('Phase 5 Gate Status: FAIL ❌');
    server.close(() => process.exit(1));
  } else {
    console.log('Phase 5 Gate Status: PASS ✅');
    server.close(() => process.exit(0));
  }
}

runTests().catch((err) => {
  console.error('Phase 5 Test Runner fatal error:', err);
  if (server) server.close();
  process.exit(1);
});
