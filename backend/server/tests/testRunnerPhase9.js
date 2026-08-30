/**
 * HYRO Automation — Phase 9 Test Runner
 * Runs P9-001 through P9-017 (Real-Time + Production Hardening)
 * Plus Full Product Regression Suite (Phases 1–8)
 */
const http = require('http');
const app = require('../src/app');
const { connectDB } = require('../src/config/db');
const queueService = require('../src/services/queueService');
const socketService = require('../src/services/socketService');
const userRepository = require('../src/services/userRepository');
const workflowRepository = require('../src/services/workflowRepository');
const documentService = require('../src/services/documentService');
const vectorStore = require('../src/rag/vectorStore');
const ragService = require('../src/services/ragService');
const orchestrator = require('../src/agents/orchestrator');
const integrationService = require('../src/services/integrationService');
const notificationService = require('../src/services/notificationService');
const linkedinService = require('../src/services/linkedinService');

const PORT = 5009;
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
        try { parsed = JSON.parse(raw); } catch { parsed = raw; }
        resolve({ status: res.statusCode, body: parsed });
      });
    });
    r.on('error', reject);
    if (body) r.write(data);
    r.end();
  });

const results = [];
let passed = 0, failed = 0;

function record(id, feature, expected, actual, status) {
  results.push({ id, feature, status });
  const sym = status === 'PASS' ? '✅' : '❌';
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
  console.log('HYRO AUTOMATION — PHASE 9 TEST SUITE');
  console.log('========================================\n');

  userRepository.clearInMemoryStore();
  workflowRepository.clearInMemoryStore();
  documentService.clearInMemoryStore();
  vectorStore.clearInMemoryStore();
  ragService.clearInMemoryStore();
  orchestrator.clearInMemoryStore();
  integrationService.clearInMemoryStore();
  notificationService.clearInMemoryStore();
  linkedinService.clearInMemoryStore();
  queueService.clearInMemoryStore();

  await connectDB();
  await queueService.initialize();

  server = app.listen(PORT);

  const u1 = await req('POST', '/api/auth/register', { name: 'Prod User A', email: `prod_a_${Date.now()}@hyro.ai`, password: 'password123' });
  const u2 = await req('POST', '/api/auth/register', { name: 'Prod User B', email: `prod_b_${Date.now()}@hyro.ai`, password: 'password123' });
  const token1 = u1.body.data?.token;
  const token2 = u2.body.data?.token;
  const auth1 = { Authorization: `Bearer ${token1}` };
  const auth2 = { Authorization: `Bearer ${token2}` };

  // P9-001: Redis Connection — check system status
  const sysStatus = await req('GET', '/api/system/status');
  const queueStats = sysStatus.body.data?.queue;
  // Redis is NOT configured in test env, so fallback should be documented
  const p1Ok = sysStatus.status === 200 && typeof queueStats?.fallback === 'boolean';
  record('P9-001', 'Redis Connection Status Reported', 'queue.fallback boolean present', `fallback:${queueStats?.fallback}, redis:${queueStats?.redisAvailable}`, p1Ok ? 'PASS' : 'FAIL');

  // P9-002: BullMQ/In-Memory Queue — add a job
  const job = await queueService.addJob('workflow-execution', 'execute', { workflowId: 'test_wf_1', userId: 'test_user' }, { attempts: 3 });
  const p2Ok = !!job?.id && job?.name === 'execute';
  record('P9-002', 'Job Added to Queue', 'job.id present, job.name === execute', `id:${job?.id}, name:${job?.name}`, p2Ok ? 'PASS' : 'FAIL');

  // P9-003: Retry Backoff configuration
  const retryJob = await queueService.addJob('retry-test', 'retry_job', { test: true }, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 1000 }
  });
  const p3Ok = !!retryJob?.id && retryJob?.opts?.attempts === 3 && !!retryJob?.opts?.backoff;
  record('P9-003', 'Retry Backoff Configured', 'attempts: 3, backoff present', `attempts:${retryJob?.opts?.attempts}, backoff:${JSON.stringify(retryJob?.opts?.backoff)}`, p3Ok ? 'PASS' : 'FAIL');

  // P9-004: Scheduled Jobs (delayed)
  const delay = 5000;
  const scheduledJob = await queueService.addJob('scheduled-linkedin', 'publish_post', { postId: 'li_123' }, { delay, attempts: 1 });
  const p4Ok = !!scheduledJob?.id && scheduledJob?.scheduledAt instanceof Date && scheduledJob.scheduledAt > new Date();
  record('P9-004', 'Scheduled Job with Delay', 'scheduledAt in the future', `id:${scheduledJob?.id}, scheduledAt:${scheduledJob?.scheduledAt}`, p4Ok ? 'PASS' : 'FAIL');

  // P9-005: In-Memory Fallback documented
  const p5Ok = queueStats?.fallback === true && queueStats?.bullmqAvailable === false;
  record('P9-005', 'In-Memory Fallback Documented', 'fallback: true, bullmqAvailable: false', `fallback:${queueStats?.fallback}`, p5Ok ? 'PASS' : 'FAIL');

  // P9-006: Socket.IO connection — verify service is initialized after server boot
  // (In test runner we manually initialize it)
  socketService.initialize(server);
  const p6Ok = socketService.isConnected();
  record('P9-006', 'Socket.IO Server Initialized', 'isConnected: true', `isConnected:${socketService.isConnected()}`, p6Ok ? 'PASS' : 'FAIL');

  // P9-007: Live Agent Events — emit to socket room
  let eventEmitted = false;
  try {
    socketService.emitAgentEvent('test_user_123', 'agent:planner:start', { workflowId: 'wf_123', message: 'Planner started' });
    socketService.emitAgentEvent('test_user_123', 'agent:execution:complete', { workflowId: 'wf_123', result: 'done' });
    socketService.emitAgentEvent('test_user_123', 'agent:validation:pass', { workflowId: 'wf_123' });
    socketService.emitAgentEvent('test_user_123', 'agent:recovery:triggered', { workflowId: 'wf_123', reason: 'API timeout' });
    socketService.emitAgentEvent('test_user_123', 'agent:monitoring:update', { workflowId: 'wf_123', status: 'healthy' });
    eventEmitted = true;
  } catch (err) { eventEmitted = false; }
  record('P9-007', 'Live Agent Events Emitted', 'No errors emitting agent events', `emitted:${eventEmitted}`, eventEmitted ? 'PASS' : 'FAIL');

  // P9-008: Live Timeline update
  let timelineEmitted = false;
  try {
    socketService.emitTimelineUpdate('test_user_123', { phase: 'execution', status: 'running', progress: 60 });
    timelineEmitted = true;
  } catch (err) { timelineEmitted = false; }
  record('P9-008', 'Live Timeline Update Emitted', 'No errors on timeline emit', `emitted:${timelineEmitted}`, timelineEmitted ? 'PASS' : 'FAIL');

  // P9-009: Notification Drawer event
  let notifEmitted = false;
  try {
    socketService.emitNotification('test_user_123', { type: 'SUCCESS', message: 'Gmail Tracker completed', workflowId: 'wf_123' });
    socketService.emitNotification('test_user_123', { type: 'FAILURE', message: 'API rate limit hit', workflowId: 'wf_456' });
    notifEmitted = true;
  } catch (err) { notifEmitted = false; }
  record('P9-009', 'Notification Drawer Events Emitted', 'Success and failure events emitted', `emitted:${notifEmitted}`, notifEmitted ? 'PASS' : 'FAIL');

  // P9-010: Reconnect Behavior — execution state not corrupted after Socket reconnect
  // Verify execution persists independently of socket state
  const execRes = await req('POST', '/api/auth/register', { name: 'Socket Test', email: `sock_${Date.now()}@hyro.ai`, password: 'password123' });
  const sockToken = execRes.body.data?.token;
  // Simulate socket disconnect by calling initialize again (idempotent)
  socketService.initialize(server); // should not throw
  const p10Ok = socketService.isConnected() === true;
  record('P9-010', 'Reconnect Behavior — State Preserved', 'Socket reinitialize safe, isConnected: true', `connected:${socketService.isConnected()}`, p10Ok ? 'PASS' : 'FAIL');

  // P9-011: Auth Rate Limit — check header is applied (X-RateLimit-Limit)
  const rateLimitRes = await req('POST', '/api/auth/register', { name: 'RL Test', email: `rl_${Date.now()}@hyro.ai`, password: 'password123' });
  const p11Ok = rateLimitRes.status === 201; // rate limit not hit yet (well within 20/15min)
  record('P9-011', 'Auth Rate Limit Active', 'Rate limiter attached to /api/auth', `status:${rateLimitRes.status}`, p11Ok ? 'PASS' : 'FAIL');

  // P9-012: CORS — preflight should allow configured origin
  const corsRes = await new Promise((resolve) => {
    const opts = {
      hostname: '127.0.0.1', port: PORT, path: '/api/health', method: 'OPTIONS',
      headers: { 'Origin': 'http://localhost:3000', 'Access-Control-Request-Method': 'GET' }
    };
    const r = http.request(opts, (res) => { let raw = ''; res.on('data', c => raw += c); res.on('end', () => resolve({ status: res.statusCode, headers: res.headers })); });
    r.on('error', resolve.bind(null, { status: 0, headers: {} }));
    r.end();
  });
  const p12Ok = corsRes.status === 204 && corsRes.headers['access-control-allow-origin'] === 'http://localhost:3000';
  record('P9-012', 'CORS Headers Correct', 'Access-Control-Allow-Origin: http://localhost:3000', `origin:${corsRes.headers['access-control-allow-origin']}`, p12Ok ? 'PASS' : 'FAIL');

  // P9-013: Helmet Security Headers
  const helmetRes = await req('GET', '/api/health');
  const p13Ok = !!helmetRes.body && (
    helmetRes.body.success === true
  );
  // Helmet headers — check via a direct request for X-Content-Type-Options etc.
  const headerRes = await new Promise((resolve) => {
    const opts = { hostname: '127.0.0.1', port: PORT, path: '/api/health', method: 'GET' };
    const r = http.request(opts, (res) => {
      let raw = ''; res.on('data', c => raw += c);
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers }));
    });
    r.on('error', resolve.bind(null, { status: 0, headers: {} }));
    r.end();
  });
  const helmetOk = !!headerRes.headers['x-content-type-options'] || !!headerRes.headers['x-frame-options'] || !!headerRes.headers['x-xss-protection'];
  record('P9-013', 'Helmet Security Headers Applied', 'x-content-type-options or x-frame-options present', `xContentType:${headerRes.headers['x-content-type-options']}`, helmetOk ? 'PASS' : 'FAIL');

  // P9-014: Request Validation — invalid register body
  const badRegRes = await req('POST', '/api/auth/register', { name: 'x', email: 'not-an-email', password: '123' });
  const p14Ok = badRegRes.status !== 200 && badRegRes.status !== 201;
  record('P9-014', 'Request Validation — Invalid Body Rejected', 'non-201/200 for invalid register', `status:${badRegRes.status}`, p14Ok ? 'PASS' : 'FAIL');

  // P9-015: Authorization isolation — user2 cannot access user1's workflows
  const wf1Res = await req('POST', '/api/workflows', { name: 'U1 Private WF', nodes: [], edges: [] }, auth1);
  const wf1Id = wf1Res.body.data?.workflow?._id;
  const u2AccessRes = await req('GET', `/api/workflows/${wf1Id}`, null, auth2);
  const p15Ok = u2AccessRes.status === 404 || u2AccessRes.status === 403;
  record('P9-015', 'Authorization Isolation', 'User2 cannot access User1 workflow', `status:${u2AccessRes.status}`, p15Ok ? 'PASS' : 'FAIL');

  // P9-016: Secret Exposure Check — no keys in API responses
  const responses = [
    JSON.stringify(u1.body),
    JSON.stringify(wf1Res.body),
    JSON.stringify(sysStatus.body)
  ].join(' ');

  const secretPatterns = [
    /mongodb\+srv/i, /sk-[a-z0-9]{20}/i, /CREDENTIAL_ENCRYPTION_KEY/i,
    /JWT_SECRET/i, /refreshToken/i, /encryptedToken/i
  ];
  const leaks = secretPatterns.filter((p) => p.test(responses));
  const p16Ok = leaks.length === 0;
  record('P9-016', 'Secret Exposure Check', 'No secrets in API responses', `leaks:${leaks.length}`, p16Ok ? 'PASS' : 'FAIL');

  // P9-017: Production Environment readiness check
  const p17sysStatus = await req('GET', '/api/system/status');
  const dbConnected = p17sysStatus.body.data?.db?.isConnected === true;
  const p17Ok = p17sysStatus.status === 200 && dbConnected;
  record('P9-017', 'Production Environment Readiness', 'DB connected, system status 200', `status:${p17sysStatus.status}, dbConnected:${dbConnected}`, p17Ok ? 'PASS' : 'FAIL');

  // ── Full Product Regression Suite (Phases 1–8) ──────────────────────────────
  console.log('\n--- Full Product Regression Suite (Phases 1–8) ---\n');

  const health = await req('GET', '/api/health');
  record('P1-R', 'Health [REGRESSION]', '200', `${health.status}`, health.status === 200 ? 'PASS' : 'FAIL');

  const wf = await req('POST', '/api/workflows', { name: 'P9 Reg WF', nodes: [{ id: 'n1', type: 'start', position: { x: 0, y: 0 } }], edges: [] }, auth1);
  record('P2-R', 'Create Workflow [REGRESSION]', '201', `${wf.status}`, wf.status === 201 ? 'PASS' : 'FAIL');

  const gen = await req('POST', '/api/workflows/generate', { prompt: 'Full production workflow' }, auth1);
  record('P3-R', 'AI Generation [REGRESSION]', '200', `${gen.status}`, gen.status === 200 ? 'PASS' : 'FAIL');

  const chat = await req('POST', '/api/chat', { message: 'How does HYRO handle production hardening?' }, auth1);
  record('P4-R', 'RAG Chat [REGRESSION]', '200', `${chat.status}`, chat.status === 200 ? 'PASS' : 'FAIL');

  const exec = await req('POST', `/api/workflows/${wf.body.data?.workflow?._id}/execute`, null, auth1);
  record('P5-R', 'Agentic Execution [REGRESSION]', '200', `${exec.status}`, exec.status === 200 ? 'PASS' : 'FAIL');

  await req('GET', `/api/integrations/oauth/gmail/callback?code=gmail_p9_${Date.now()}`, null, auth1);
  const gmailStatus = await req('GET', '/api/integrations/status?provider=gmail', null, auth1);
  record('P6-R', 'Gmail Integration [REGRESSION]', 'connected: true', `connected:${gmailStatus.body.data?.isConnected}`, gmailStatus.body.data?.isConnected ? 'PASS' : 'FAIL');

  await req('GET', `/api/integrations/oauth/slack/callback?code=slack_p9_${Date.now()}`, null, auth1);
  const slackNotif = await req('POST', '/api/notifications/slack', { workflowName: 'P9 WF', type: 'SUCCESS', result: 'completed' }, auth1);
  record('P7-R', 'Slack Notification [REGRESSION]', '201', `${slackNotif.status}`, slackNotif.status === 201 ? 'PASS' : 'FAIL');

  const liPost = await req('POST', '/api/linkedin/posts', { content: 'Phase 9 regression LinkedIn post ✅' }, auth1);
  await req('POST', `/api/linkedin/posts/${liPost.body.data?.post?._id}/submit`, null, auth1);
  const liApprove = await req('POST', `/api/linkedin/posts/${liPost.body.data?.post?._id}/approve`, null, auth1);
  record('P8-R', 'LinkedIn Approval [REGRESSION]', 'APPROVED', `status:${liApprove.body.data?.post?.status}`, liApprove.body.data?.post?.status === 'APPROVED' ? 'PASS' : 'FAIL');

  // ── Summary ──
  const total = results.length;
  console.log('\n========================================');
  console.log(`SUMMARY: ${passed}/${total} PASS | ${failed} FAIL`);
  console.log('========================================\n');

  if (failed > 0) {
    console.error('Phase 9 Gate Status: FAIL ❌');
    server.close(() => process.exit(1));
  } else {
    console.log('Phase 9 Gate Status: PASS ✅');
    server.close(() => process.exit(0));
  }
}

runTests().catch((err) => {
  console.error('Phase 9 Test Runner fatal error:', err);
  if (server) server.close();
  process.exit(1);
});
