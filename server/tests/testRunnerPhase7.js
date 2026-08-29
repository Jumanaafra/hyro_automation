/**
 * HYRO Automation — Phase 7 Test Runner
 * Runs P7-001 through P7-009 (Slack + Discord + Notification Persistence)
 * Plus Full Product Regression Suite (Phases 1, 2, 3, 4, 5, 6)
 */
const http = require('http');
const app = require('../src/app');
const { connectDB } = require('../src/config/db');
const userRepository = require('../src/services/userRepository');
const workflowRepository = require('../src/services/workflowRepository');
const documentService = require('../src/services/documentService');
const vectorStore = require('../src/rag/vectorStore');
const ragService = require('../src/services/ragService');
const orchestrator = require('../src/agents/orchestrator');
const integrationService = require('../src/services/integrationService');
const notificationService = require('../src/services/notificationService');
const slackIntegration = require('../src/integrations/slackIntegration');
const discordIntegration = require('../src/integrations/discordIntegration');

const PORT = 5007;
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
  console.log('HYRO AUTOMATION — PHASE 7 TEST SUITE');
  console.log('========================================\n');

  userRepository.clearInMemoryStore();
  workflowRepository.clearInMemoryStore();
  documentService.clearInMemoryStore();
  vectorStore.clearInMemoryStore();
  ragService.clearInMemoryStore();
  orchestrator.clearInMemoryStore();
  integrationService.clearInMemoryStore();
  notificationService.clearInMemoryStore();

  await connectDB();
  server = app.listen(PORT);

  const u1 = await req('POST', '/api/auth/register', { name: 'Notif User A', email: `notif_a_${Date.now()}@hyro.ai`, password: 'password123' });
  const u2 = await req('POST', '/api/auth/register', { name: 'Notif User B', email: `notif_b_${Date.now()}@hyro.ai`, password: 'password123' });
  const token1 = u1.body.data?.token;
  const token2 = u2.body.data?.token;
  const auth1 = { Authorization: `Bearer ${token1}` };
  const auth2 = { Authorization: `Bearer ${token2}` };

  // Connect Slack for user1
  await req('GET', `/api/integrations/oauth/slack/callback?code=slack_code_${Date.now()}`, null, auth1);

  // P7-001: Slack Connection (status shows connected)
  const slackStatus = await req('GET', '/api/integrations/status?provider=slack', null, auth1);
  const p1Ok = slackStatus.status === 200 && slackStatus.body.data?.isConnected === true;
  record('P7-001', 'Slack Connection Status', 'isConnected: true', `connected:${slackStatus.body.data?.isConnected}`, p1Ok ? 'PASS' : 'FAIL');

  // P7-002: Slack Test Message
  const slackMsgRes = await req('POST', '/api/notifications/slack/test', { message: 'Hello from HYRO ✅', channel: '#general' }, auth1);
  const p2Ok = slackMsgRes.status === 200 && slackMsgRes.body.data?.result?.ok === true;
  record('P7-002', 'Slack Message Posted', 'result.ok: true', `ok:${slackMsgRes.body.data?.result?.ok}`, p2Ok ? 'PASS' : 'FAIL');

  // P7-003: Slack Success Notification
  const slackSuccessRes = await req('POST', '/api/notifications/slack', { workflowName: 'Gmail Tracker', type: 'SUCCESS', result: 'Processed 12 emails' }, auth1);
  const p3Ok = slackSuccessRes.status === 201 && slackSuccessRes.body.data?.notification?.type === 'SUCCESS';
  record('P7-003', 'Slack Success Notification', 'type: SUCCESS, status: 201', `type:${slackSuccessRes.body.data?.notification?.type}`, p3Ok ? 'PASS' : 'FAIL');

  // P7-004: Slack Failure Notification
  const slackFailRes = await req('POST', '/api/notifications/slack', { workflowName: 'Gmail Tracker', type: 'FAILURE', error: 'API rate limit exceeded' }, auth1);
  const p4Ok = slackFailRes.status === 201 && slackFailRes.body.data?.notification?.type === 'FAILURE';
  record('P7-004', 'Slack Failure Notification', 'type: FAILURE, status: 201', `type:${slackFailRes.body.data?.notification?.type}`, p4Ok ? 'PASS' : 'FAIL');

  // P7-005: Discord Connection
  await req('GET', `/api/integrations/oauth/discord/callback?code=discord_code_${Date.now()}`, null, auth1);
  const discordStatus = await req('GET', '/api/integrations/status?provider=discord', null, auth1);
  const p5Ok = discordStatus.status === 200 && discordStatus.body.data?.isConnected === true;
  record('P7-005', 'Discord Connection Status', 'isConnected: true', `connected:${discordStatus.body.data?.isConnected}`, p5Ok ? 'PASS' : 'FAIL');

  // P7-006: Discord Test Message
  const discordMsgRes = await req('POST', '/api/notifications/discord/test', { message: 'HYRO Discord test 👾' }, auth1);
  const p6Ok = discordMsgRes.status === 200 && discordMsgRes.body.data?.result?.ok === true;
  record('P7-006', 'Discord Message Posted', 'result.ok: true', `ok:${discordMsgRes.body.data?.result?.ok}`, p6Ok ? 'PASS' : 'FAIL');

  // P7-007: Integration Failure — Slack with no connection for user2
  const failRes = await req('POST', '/api/notifications/slack', { workflowName: 'Orphan WF', type: 'SUCCESS', result: 'done' }, auth2);
  // Should fail gracefully — error recorded in DB
  const p7Ok = failRes.status !== 200; // expect non-200 (400/500) because user2 has no Slack
  record('P7-007', 'Integration Failure — Clear Error Response', 'non-200 status', `status:${failRes.status}`, p7Ok ? 'PASS' : 'FAIL');

  // P7-008: Notification Persistence
  const notifListRes = await req('GET', '/api/notifications', null, auth1);
  const notifs = notifListRes.body.data?.notifications;
  const p8Ok = notifListRes.status === 200 && Array.isArray(notifs) && notifs.length >= 2;
  record('P7-008', 'Notification Persistence', 'At least 2 persisted notifications', `count:${notifs?.length}`, p8Ok ? 'PASS' : 'FAIL');

  // P7-008b: Mark notification as read
  const firstNotifId = notifs?.[0]?._id;
  if (firstNotifId) {
    const markRes = await req('PATCH', `/api/notifications/${firstNotifId}/read`, null, auth1);
    const markOk = markRes.status === 200 && markRes.body.data?.notification?.read === true;
    record('P7-008b', 'Mark Notification Read', 'read: true', `read:${markRes.body.data?.notification?.read}`, markOk ? 'PASS' : 'FAIL');
  }

  // P7-009: Notification Ownership — user2 cannot see user1's notifications
  const u2NotifRes = await req('GET', '/api/notifications', null, auth2);
  const u2Notifs = u2NotifRes.body.data?.notifications || [];
  const u1NotifIds = (notifs || []).map((n) => String(n._id));
  const noLeak = u2Notifs.every((n) => !u1NotifIds.includes(String(n._id)));
  record('P7-009', 'Notification Ownership Isolation', 'User2 cannot see User1 notifications', `leak:${!noLeak}`, noLeak ? 'PASS' : 'FAIL');

  // ── Full Product Regression Suite (Phases 1–6) ──────────────────────────────
  console.log('\n--- Full Product Regression Suite (Phases 1–6) ---\n');

  const health = await req('GET', '/api/health');
  record('P1-003-R', 'Health Endpoint [REGRESSION]', 'status:200', `status:${health.status}`, health.status === 200 ? 'PASS' : 'FAIL');

  const wf = await req('POST', '/api/workflows', { name: 'Phase 7 Reg WF', nodes: [{ id: 'n1', type: 'slackNotify', position: { x: 0, y: 0 } }], edges: [] }, auth1);
  record('P2-001-R', 'Create Workflow [REGRESSION]', 'status:201', `status:${wf.status}`, wf.status === 201 ? 'PASS' : 'FAIL');

  const gen = await req('POST', '/api/workflows/generate', { prompt: 'Watch Gmail and send Slack notification on new job email.' }, auth1);
  record('P3-001-R', 'AI Workflow Generation [REGRESSION]', 'status:200', `status:${gen.status}`, gen.status === 200 ? 'PASS' : 'FAIL');

  const chat = await req('POST', '/api/chat', { message: 'How do Slack notifications work in HYRO?' }, auth1);
  record('P4-001-R', 'RAG Chat [REGRESSION]', 'status:200', `status:${chat.status}`, chat.status === 200 ? 'PASS' : 'FAIL');

  const exec = await req('POST', `/api/workflows/${wf.body.data?.workflow?._id}/execute`, null, auth1);
  record('P5-002-R', 'Agentic Execution [REGRESSION]', 'status:200', `status:${exec.status}`, exec.status === 200 ? 'PASS' : 'FAIL');

  const gmailCB = await req('GET', `/api/integrations/oauth/gmail/callback?code=gmail_r_${Date.now()}`, null, auth1);
  record('P6-002-R', 'Gmail Integration [REGRESSION]', 'status:200', `status:${gmailCB.status}`, gmailCB.status === 200 ? 'PASS' : 'FAIL');

  // ── Summary ──
  const total = results.length;
  console.log('\n========================================');
  console.log(`SUMMARY: ${passed}/${total} PASS | ${failed} FAIL`);
  console.log('========================================\n');

  if (failed > 0) {
    console.error('Phase 7 Gate Status: FAIL ❌');
    server.close(() => process.exit(1));
  } else {
    console.log('Phase 7 Gate Status: PASS ✅');
    server.close(() => process.exit(0));
  }
}

runTests().catch((err) => {
  console.error('Phase 7 Test Runner fatal error:', err);
  if (server) server.close();
  process.exit(1);
});
