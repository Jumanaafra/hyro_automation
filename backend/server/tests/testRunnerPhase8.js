/**
 * HYRO Automation — Phase 8 Test Runner
 * Runs P8-001 through P8-017 (LinkedIn Scheduling)
 * Plus Full Product Regression Suite (Phases 1–7)
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
const linkedinService = require('../src/services/linkedinService');
const linkedinIntegration = require('../src/integrations/linkedinIntegration');

const PORT = 5008;
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
  console.log('HYRO AUTOMATION — PHASE 8 TEST SUITE');
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

  await connectDB();
  server = app.listen(PORT);

  const u1 = await req('POST', '/api/auth/register', { name: 'LinkedIn User A', email: `li_a_${Date.now()}@hyro.ai`, password: 'password123' });
  const token1 = u1.body.data?.token;
  const auth1 = { Authorization: `Bearer ${token1}` };

  // P8-001: LinkedIn OAuth Start
  const oauthStartRes = await req('GET', '/api/integrations/oauth/linkedin/start', null, auth1);
  const p1Ok = oauthStartRes.status === 200 && typeof oauthStartRes.body.data?.authUrl === 'string' && oauthStartRes.body.data.authUrl.includes('linkedin.com');
  record('P8-001', 'LinkedIn OAuth Start URL', 'authUrl includes linkedin.com', `authUrl:${oauthStartRes.body.data?.authUrl?.slice(0, 50)}`, p1Ok ? 'PASS' : 'FAIL');

  // Connect LinkedIn
  await req('GET', `/api/integrations/oauth/linkedin/callback?code=li_code_${Date.now()}`, null, auth1);

  // P8-002: LinkedIn Connection Status
  const liStatus = await req('GET', '/api/integrations/status?provider=linkedin', null, auth1);
  const p2Ok = liStatus.status === 200 && liStatus.body.data?.isConnected === true;
  record('P8-002', 'LinkedIn Connection Status', 'isConnected: true', `connected:${liStatus.body.data?.isConnected}`, p2Ok ? 'PASS' : 'FAIL');

  // P8-003: AI Content Generation
  const genRes = await req('POST', '/api/linkedin/generate', { prompt: 'Create a professional LinkedIn post about my recent project.' }, auth1);
  const p3Ok = genRes.status === 200 && typeof genRes.body.data?.content === 'string' && genRes.body.data.editable === true;
  record('P8-003', 'AI Content Generation', 'content string, editable: true', `hasContent:${!!genRes.body.data?.content}, editable:${genRes.body.data?.editable}`, p3Ok ? 'PASS' : 'FAIL');

  // P8-004: RAG-Grounded Content
  const ragGenRes = await req('POST', '/api/linkedin/generate', { prompt: 'Create a LinkedIn post using my uploaded project documentation.', useRag: true }, auth1);
  const p4Ok = ragGenRes.status === 200 && typeof ragGenRes.body.data?.content === 'string';
  record('P8-004', 'RAG-Grounded Content', 'content string returned', `hasContent:${!!ragGenRes.body.data?.content}, grounded:${ragGenRes.body.data?.ragGrounded}`, p4Ok ? 'PASS' : 'FAIL');

  // P8-005: Unsupported Claim Protection
  const validateRes = await req('POST', '/api/linkedin/validate', { content: 'I am the #1 in the world developer!' }, auth1);
  const p5Ok = validateRes.status === 200 && validateRes.body.data?.valid === false && Array.isArray(validateRes.body.data?.flagged) && validateRes.body.data.flagged.length > 0;
  record('P8-005', 'Unsupported Claim Detection', 'valid: false, flagged array non-empty', `valid:${validateRes.body.data?.valid}, flags:${validateRes.body.data?.flagged?.length}`, p5Ok ? 'PASS' : 'FAIL');

  // P8-006: Weekly Calendar
  const weekCalRes = await req('GET', '/api/linkedin/calendar?view=week', null, auth1);
  const p6Ok = weekCalRes.status === 200 && weekCalRes.body.data?.view === 'week' && Array.isArray(weekCalRes.body.data?.posts);
  record('P8-006', 'Weekly Calendar', 'view: week, posts array', `view:${weekCalRes.body.data?.view}`, p6Ok ? 'PASS' : 'FAIL');

  // P8-007: Monthly Calendar
  const monthCalRes = await req('GET', '/api/linkedin/calendar?view=month', null, auth1);
  const p7Ok = monthCalRes.status === 200 && monthCalRes.body.data?.view === 'month';
  record('P8-007', 'Monthly Calendar', 'view: month', `view:${monthCalRes.body.data?.view}`, p7Ok ? 'PASS' : 'FAIL');

  // P8-008: Approval workflow DRAFT → PENDING_APPROVAL → APPROVED
  const createRes = await req('POST', '/api/linkedin/posts', { content: 'Excited about my new project! 🚀' }, auth1);
  const postId = createRes.body.data?.post?._id;
  const p8aOk = createRes.body.data?.post?.status === 'DRAFT';
  record('P8-008a', 'Post Created as DRAFT', 'status: DRAFT', `status:${createRes.body.data?.post?.status}`, p8aOk ? 'PASS' : 'FAIL');

  const submitRes = await req('POST', `/api/linkedin/posts/${postId}/submit`, null, auth1);
  const p8bOk = submitRes.body.data?.post?.status === 'PENDING_APPROVAL';
  record('P8-008b', 'Submit for Approval → PENDING_APPROVAL', 'status: PENDING_APPROVAL', `status:${submitRes.body.data?.post?.status}`, p8bOk ? 'PASS' : 'FAIL');

  const approveRes = await req('POST', `/api/linkedin/posts/${postId}/approve`, null, auth1);
  const p8cOk = approveRes.body.data?.post?.status === 'APPROVED';
  record('P8-008c', 'Approval → APPROVED', 'status: APPROVED', `status:${approveRes.body.data?.post?.status}`, p8cOk ? 'PASS' : 'FAIL');

  // P8-009: Scheduling APPROVED → SCHEDULED
  const futureDate = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString();
  const schedRes = await req('POST', `/api/linkedin/posts/${postId}/schedule`, { scheduledAt: futureDate }, auth1);
  const p9Ok = schedRes.body.data?.post?.status === 'SCHEDULED' && !!schedRes.body.data?.post?.scheduledAt;
  record('P8-009', 'Scheduling APPROVED → SCHEDULED', 'status: SCHEDULED with scheduledAt', `status:${schedRes.body.data?.post?.status}, at:${!!schedRes.body.data?.post?.scheduledAt}`, p9Ok ? 'PASS' : 'FAIL');

  // P8-010: Rescheduling
  const newDate = new Date(Date.now() + 14 * 24 * 3600 * 1000).toISOString();
  const reschedRes = await req('PATCH', `/api/linkedin/posts/${postId}/schedule`, { scheduledAt: newDate }, auth1);
  const p10Ok = reschedRes.body.data?.post?.status === 'SCHEDULED' && reschedRes.body.data?.post?.scheduledAt !== futureDate;
  record('P8-010', 'Rescheduling', 'scheduledAt updated', `status:${reschedRes.body.data?.post?.status}`, p10Ok ? 'PASS' : 'FAIL');

  // P8-011: Cancellation
  const createRes2 = await req('POST', '/api/linkedin/posts', { content: 'Post to cancel test' }, auth1);
  const postId2 = createRes2.body.data?.post?._id;
  await req('POST', `/api/linkedin/posts/${postId2}/submit`, null, auth1);
  await req('POST', `/api/linkedin/posts/${postId2}/approve`, null, auth1);
  await req('POST', `/api/linkedin/posts/${postId2}/schedule`, { scheduledAt: new Date(Date.now() + 3600000).toISOString() }, auth1);
  const cancelRes = await req('POST', `/api/linkedin/posts/${postId2}/cancel`, null, auth1);
  const p11Ok = cancelRes.body.data?.post?.status === 'CANCELLED';
  record('P8-011', 'Cancellation', 'status: CANCELLED', `status:${cancelRes.body.data?.post?.status}`, p11Ok ? 'PASS' : 'FAIL');

  // P8-012: Publishing — approve a new post, set expiresAt far future, publish
  const createRes3 = await req('POST', '/api/linkedin/posts', { content: 'Publishing test post for Phase 8 ✅' }, auth1);
  const postId3 = createRes3.body.data?.post?._id;
  await req('POST', `/api/linkedin/posts/${postId3}/submit`, null, auth1);
  await req('POST', `/api/linkedin/posts/${postId3}/approve`, null, auth1);
  // Credentials have a future expiresAt from handleCallback so publishPost should pass
  const publishRes = await req('POST', `/api/linkedin/posts/${postId3}/publish`, null, auth1);
  const p12Ok = publishRes.status === 200 && publishRes.body.data?.post?.status === 'PUBLISHED';
  record('P8-012', 'Publishing', 'status: PUBLISHED', `status:${publishRes.body.data?.post?.status}`, p12Ok ? 'PASS' : 'FAIL');

  // P8-013: Publishing Failure (no LinkedIn connected for non-existent user)
  let publishFailed = false;
  try {
    await linkedinIntegration.publishPost(null, { content: 'test' });
  } catch (err) {
    publishFailed = err.code === 'INTEGRATION_NOT_CONNECTED';
  }
  record('P8-013', 'Publishing Failure Recorded', 'error.code === INTEGRATION_NOT_CONNECTED', `thrown:${publishFailed}`, publishFailed ? 'PASS' : 'FAIL');

  // P8-014: High-Impact Approval — cannot publish a DRAFT without approval
  const createRes4 = await req('POST', '/api/linkedin/posts', { content: 'Draft without approval' }, auth1);
  const postId4 = createRes4.body.data?.post?._id;
  const noApprovePublishRes = await req('POST', `/api/linkedin/posts/${postId4}/publish`, null, auth1);
  const p14Ok = noApprovePublishRes.status !== 200;
  record('P8-014', 'High-Impact Approval Gate', 'Cannot publish DRAFT without approval', `status:${noApprovePublishRes.status}`, p14Ok ? 'PASS' : 'FAIL');

  // P8-015: Duplicate Prevention
  const dupPublishRes = await req('POST', `/api/linkedin/posts/${postId3}/publish`, null, auth1);
  const p15Ok = dupPublishRes.status !== 200;
  record('P8-015', 'Duplicate Publish Prevention', 'Non-200 on re-publish attempt', `status:${dupPublishRes.status}`, p15Ok ? 'PASS' : 'FAIL');

  // P8-016: Credential Expiry
  let authExpired = false;
  try {
    await linkedinIntegration.publishPost({ accessToken: 'x' }, { content: 'test', expiresAt: new Date(Date.now() - 5000) });
  } catch (err) {
    authExpired = err.code === 'AUTH_EXPIRED';
  }
  record('P8-016', 'LinkedIn Credential Expiry', 'AUTH_EXPIRED thrown', `thrown:${authExpired}`, authExpired ? 'PASS' : 'FAIL');

  // P8-017: Unsupported Action Guard
  let unsupportedThrown = false;
  try {
    linkedinIntegration.assertSupportedAction('auto_connect');
  } catch (err) {
    unsupportedThrown = err.code === 'UNSUPPORTED_ACTION';
  }
  record('P8-017', 'Unsupported LinkedIn Action Blocked', 'UNSUPPORTED_ACTION thrown', `thrown:${unsupportedThrown}`, unsupportedThrown ? 'PASS' : 'FAIL');

  // ── Full Product Regression Suite (Phases 1–7) ──────────────────────────────
  console.log('\n--- Full Product Regression Suite (Phases 1–7) ---\n');

  const health = await req('GET', '/api/health');
  record('P1-003-R', 'Health [REGRESSION]', '200', `${health.status}`, health.status === 200 ? 'PASS' : 'FAIL');

  const wf = await req('POST', '/api/workflows', { name: 'P8 Reg WF', nodes: [{ id: 'n1', type: 'linkedinPost', position: { x: 0, y: 0 } }], edges: [] }, auth1);
  record('P2-001-R', 'Create Workflow [REGRESSION]', '201', `${wf.status}`, wf.status === 201 ? 'PASS' : 'FAIL');

  const gen = await req('POST', '/api/workflows/generate', { prompt: 'Post LinkedIn updates from approved workflows.' }, auth1);
  record('P3-001-R', 'AI Generation [REGRESSION]', '200', `${gen.status}`, gen.status === 200 ? 'PASS' : 'FAIL');

  const chat = await req('POST', '/api/chat', { message: 'How does LinkedIn scheduling work?' }, auth1);
  record('P4-001-R', 'RAG Chat [REGRESSION]', '200', `${chat.status}`, chat.status === 200 ? 'PASS' : 'FAIL');

  const exec = await req('POST', `/api/workflows/${wf.body.data?.workflow?._id}/execute`, null, auth1);
  record('P5-002-R', 'Agentic Execution [REGRESSION]', '200', `${exec.status}`, exec.status === 200 ? 'PASS' : 'FAIL');

  await req('GET', `/api/integrations/oauth/slack/callback?code=slack_r_${Date.now()}`, null, auth1);
  const slackNotif = await req('POST', '/api/notifications/slack', { workflowName: 'P8 WF', type: 'SUCCESS', result: 'done' }, auth1);
  record('P7-003-R', 'Slack Notification [REGRESSION]', '201', `${slackNotif.status}`, slackNotif.status === 201 ? 'PASS' : 'FAIL');

  // ── Summary ──
  const total = results.length;
  console.log('\n========================================');
  console.log(`SUMMARY: ${passed}/${total} PASS | ${failed} FAIL`);
  console.log('========================================\n');

  if (failed > 0) {
    console.error('Phase 8 Gate Status: FAIL ❌');
    server.close(() => process.exit(1));
  } else {
    console.log('Phase 8 Gate Status: PASS ✅');
    server.close(() => process.exit(0));
  }
}

runTests().catch((err) => {
  console.error('Phase 8 Test Runner fatal error:', err);
  if (server) server.close();
  process.exit(1);
});
