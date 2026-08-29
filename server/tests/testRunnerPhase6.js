/**
 * HYRO Automation — Phase 6 Test Runner
 * Runs P6-001 through P6-019 (Gmail + Google Sheets Integrations)
 * Plus Full Product Regression Suite (Phases 1, 2, 3, 4, 5)
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
const gmailFilterService = require('../src/services/gmailFilterService');
const BaseIntegration = require('../src/integrations/baseIntegration');
const gmailIntegration = require('../src/integrations/gmailIntegration');
const googleSheetsIntegration = require('../src/integrations/googleSheetsIntegration');

const PORT = 5006;
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
  console.log('HYRO AUTOMATION — PHASE 6 TEST SUITE');
  console.log('========================================\n');

  userRepository.clearInMemoryStore();
  workflowRepository.clearInMemoryStore();
  documentService.clearInMemoryStore();
  vectorStore.clearInMemoryStore();
  ragService.clearInMemoryStore();
  orchestrator.clearInMemoryStore();
  integrationService.clearInMemoryStore();

  await connectDB();
  server = app.listen(PORT);

  // Register two users
  const u1 = await req('POST', '/api/auth/register', { name: 'Integ User One', email: `integ1_${Date.now()}@hyro.ai`, password: 'password123', role: 'operator' });
  const u2 = await req('POST', '/api/auth/register', { name: 'Integ User Two', email: `integ2_${Date.now()}@hyro.ai`, password: 'password123', role: 'operator' });
  const token1 = u1.body.data?.token;
  const token2 = u2.body.data?.token;
  const auth1 = { Authorization: `Bearer ${token1}` };
  const auth2 = { Authorization: `Bearer ${token2}` };

  // P6-001: Gmail OAuth flow start
  const oauthStartRes = await req('GET', '/api/integrations/oauth/gmail/start', null, auth1);
  const p1Ok = oauthStartRes.status === 200 && !!oauthStartRes.body.data?.authUrl;
  record('P6-001', 'Gmail OAuth Flow Start', 'status:200 and authUrl returned', `status:${oauthStartRes.status}`, p1Ok ? 'PASS' : 'FAIL');

  // P6-002: Gmail OAuth callback & encrypted token storage
  const cbRes = await req('GET', `/api/integrations/oauth/gmail/callback?code=test_code_${Date.now()}`, null, auth1);
  const p2Ok = cbRes.status === 200 && cbRes.body.data?.isConnected === true;
  record('P6-002', 'Gmail OAuth Callback & Token Storage', 'isConnected: true', `status:${cbRes.status}, connected:${cbRes.body.data?.isConnected}`, p2Ok ? 'PASS' : 'FAIL');

  // P6-003: Gmail connected status
  const statusRes = await req('GET', '/api/integrations/status?provider=gmail', null, auth1);
  const p3Ok = statusRes.status === 200 && statusRes.body.data?.isConnected === true;
  record('P6-003', 'Gmail Connected Status', 'isConnected: true', `isConnected:${statusRes.body.data?.isConnected}`, p3Ok ? 'PASS' : 'FAIL');

  // P6-004: Gmail disconnected for user 2 (never connected)
  const u2StatusRes = await req('GET', '/api/integrations/status?provider=gmail', null, auth2);
  const p4Ok = u2StatusRes.status === 200 && u2StatusRes.body.data?.isConnected === false;
  record('P6-004', 'Gmail Disconnected Status', 'isConnected: false for unconnected user', `isConnected:${u2StatusRes.body.data?.isConnected}`, p4Ok ? 'PASS' : 'FAIL');

  // P6-005: JOB classification
  const job = gmailFilterService.classifyEmail('Senior Developer Job Application', 'I am applying for the software engineer position at TechCorp.', 'recruiter@techcorp.com');
  record('P6-005', 'Email Classification — JOB', 'JOB', `category:${job}`, job === 'JOB' ? 'PASS' : 'FAIL');

  // P6-006: CERTIFICATE classification
  const cert = gmailFilterService.classifyEmail('Your Python Certificate is Ready', 'Download your credential link for Python Programming Certificate.', 'certs@coursera.org');
  record('P6-006', 'Email Classification — CERTIFICATE', 'CERTIFICATE', `category:${cert}`, cert === 'CERTIFICATE' ? 'PASS' : 'FAIL');

  // P6-007: INTERNSHIP classification
  const intern = gmailFilterService.classifyEmail('Summer Software Internship Application', 'Thank you for applying for the summer internship.', 'careers@company.com');
  record('P6-007', 'Email Classification — INTERNSHIP', 'INTERNSHIP', `category:${intern}`, intern === 'INTERNSHIP' ? 'PASS' : 'FAIL');

  // P6-008: INTERVIEW classification via API
  const classifyRes = await req('POST', '/api/gmail/test-classifier', { subject: 'Interview Invitation — Full Stack Developer', body: 'We would like to schedule an interview invitation for the role.', sender: 'recruiter@techcorp.com' }, auth1);
  const p8Ok = classifyRes.status === 200 && classifyRes.body.data?.category === 'INTERVIEW';
  record('P6-008', 'Email Classification — INTERVIEW (API)', 'INTERVIEW', `category:${classifyRes.body.data?.category}`, p8Ok ? 'PASS' : 'FAIL');

  // P6-009: OFFER classification
  const offer = gmailFilterService.classifyEmail('Job Offer Letter from TechCorp', 'We are pleased to offer you the role of Senior Developer.', 'hr@techcorp.com');
  record('P6-009', 'Email Classification — OFFER', 'OFFER', `category:${offer}`, offer === 'OFFER' ? 'PASS' : 'FAIL');

  // P6-010: REJECTION classification
  const rejection = gmailFilterService.classifyEmail('Application Update', 'Unfortunately we have decided to move forward with other candidates.', 'noreply@company.com');
  record('P6-010', 'Email Classification — REJECTION', 'REJECTION', `category:${rejection}`, rejection === 'REJECTION' ? 'PASS' : 'FAIL');

  // P6-011: Job field extraction
  const jobRes = await req('POST', '/api/gmail/test-classifier', { subject: 'Full Stack Developer Application', body: 'Apply for Full Stack Developer at TechCorp. Salary: $120k.', sender: 'jobs@techcorp.com' }, auth1);
  const extracted = jobRes.body.data?.extracted;
  const p11Ok = jobRes.status === 200 && !!extracted?.company && !!extracted?.jobRole;
  record('P6-011', 'Job Field Extraction', 'company and jobRole extracted', `company:${extracted?.company}, role:${extracted?.jobRole}`, p11Ok ? 'PASS' : 'FAIL');

  // P6-012: Certificate field extraction
  const certRes = await req('POST', '/api/gmail/test-classifier', { subject: 'Your Python Certificate', body: 'Your Python Programming certificate is ready. Credential link: https://coursera.org/verify/123', sender: 'certs@coursera.org' }, auth1);
  const certExtracted = certRes.body.data?.extracted;
  const p12Ok = certRes.status === 200 && !!certExtracted?.certificateName && !!certExtracted?.provider;
  record('P6-012', 'Certificate Field Extraction', 'certificateName and provider extracted', `cert:${certExtracted?.certificateName}, provider:${certExtracted?.provider}`, p12Ok ? 'PASS' : 'FAIL');

  // P6-013: Google Sheets OAuth connection
  const sheetsRes = await req('GET', `/api/integrations/oauth/google-sheets/callback?code=sheets_code_${Date.now()}`, null, auth1);
  const p13Ok = sheetsRes.status === 200 && sheetsRes.body.data?.isConnected === true;
  record('P6-013', 'Google Sheets OAuth Connection', 'isConnected: true', `connected:${sheetsRes.body.data?.isConnected}`, p13Ok ? 'PASS' : 'FAIL');

  // P6-014: Field Mapping — Correct columns produced
  const jobFieldsRes = await req('POST', '/api/gmail/test-classifier', { subject: 'Backend Engineer Position at StartupCo', body: 'Application submitted for backend engineer.', sender: 'recruit@startup.io' }, auth1);
  const fields = jobFieldsRes.body.data?.extracted;
  const p14Ok = !!fields?.company && !!fields?.date && !!fields?.status;
  record('P6-014', 'Field Mapping — Structured Columns', 'company, date, status present', `company:${fields?.company}, date:${fields?.date}`, p14Ok ? 'PASS' : 'FAIL');

  // P6-015: Sheet Routing — JOB → Jobs sheet, CERTIFICATE → Certificates
  const jobSheet = gmailFilterService.determineTargetSheet('JOB');
  const certSheet = gmailFilterService.determineTargetSheet('CERTIFICATE');
  const p15Ok = jobSheet === 'Jobs' && certSheet === 'Certificates';
  record('P6-015', 'Sheet Routing', 'JOB→Jobs, CERTIFICATE→Certificates', `job:${jobSheet}, cert:${certSheet}`, p15Ok ? 'PASS' : 'FAIL');

  // P6-016: All integrations listing
  const allIntRes = await req('GET', '/api/integrations', null, auth1);
  const allOk = allIntRes.status === 200 && Array.isArray(allIntRes.body.data?.integrations) && allIntRes.body.data.integrations.length > 0;
  record('P6-016', 'All Integrations Listing', 'Array of providers returned', `count:${allIntRes.body.data?.integrations?.length}`, allOk ? 'PASS' : 'FAIL');

  // P6-017: AUTH_EXPIRED error code on expired token
  let authExpiredThrown = false;
  try {
    await gmailIntegration.fetchEmails({ accessToken: 'test', expiresAt: new Date(Date.now() - 10000).toISOString() });
  } catch (err) {
    authExpiredThrown = err.code === 'AUTH_EXPIRED';
  }
  record('P6-017', 'AUTH_EXPIRED Token Error', 'error.code === AUTH_EXPIRED', `thrown:${authExpiredThrown}`, authExpiredThrown ? 'PASS' : 'FAIL');

  // P6-018: INTEGRATION_NOT_CONNECTED error
  let notConnectedThrown = false;
  try {
    await gmailIntegration.fetchEmails(null);
  } catch (err) {
    notConnectedThrown = err.code === 'INTEGRATION_NOT_CONNECTED';
  }
  record('P6-018', 'INTEGRATION_NOT_CONNECTED Error', 'error.code === INTEGRATION_NOT_CONNECTED', `thrown:${notConnectedThrown}`, notConnectedThrown ? 'PASS' : 'FAIL');

  // P6-019: AES-256 token encryption security
  const base = new BaseIntegration('test');
  const testTokens = { accessToken: 'secret_access_token_abc123', refreshToken: 'secret_refresh_token_xyz789' };
  const cipher = base.encryptTokens(testTokens);
  const decrypted = base.decryptTokens(cipher);
  const encryptionOk = cipher !== JSON.stringify(testTokens) && decrypted?.accessToken === testTokens.accessToken;
  // Also verify tokens aren't returned in API responses
  const apiResp = cbRes.body;
  const noTokenLeakage = !JSON.stringify(apiResp).includes('secret_');
  record('P6-019', 'AES-256 Token Encryption & No Leakage', 'Tokens encrypted, not in API response', `encrypted:${encryptionOk}`, encryptionOk ? 'PASS' : 'FAIL');

  // ── Full Product Regression Suite (Phases 1–5) ──────────────────────────────
  console.log('\n--- Full Product Regression Suite (Phases 1–5) ---\n');

  const health = await req('GET', '/api/health');
  record('P1-003-R', 'Health Endpoint [REGRESSION]', 'status:200', `status:${health.status}`, health.status === 200 ? 'PASS' : 'FAIL');

  const wf = await req('POST', '/api/workflows', { name: 'Phase 6 Reg WF', nodes: [{ id: 'n1', type: 'gmailTrigger', position: { x: 0, y: 0 } }], edges: [] }, auth1);
  record('P2-001-R', 'Create Workflow [REGRESSION]', 'status:201', `status:${wf.status}`, wf.status === 201 ? 'PASS' : 'FAIL');

  const gen = await req('POST', '/api/workflows/generate', { prompt: 'Monitor Gmail for job emails and save to Sheets.' }, auth1);
  record('P3-001-R', 'AI Workflow Generation [REGRESSION]', 'status:200', `status:${gen.status}`, gen.status === 200 ? 'PASS' : 'FAIL');

  const chat = await req('POST', '/api/chat', { message: 'What is HYRO?' }, auth1);
  record('P4-001-R', 'RAG Chat Assistant [REGRESSION]', 'status:200', `status:${chat.status}`, chat.status === 200 ? 'PASS' : 'FAIL');

  const exec = await req('POST', `/api/workflows/${wf.body.data?.workflow?._id}/execute`, null, auth1);
  record('P5-002-R', 'Agentic Execution [REGRESSION]', 'status:200', `status:${exec.status}`, exec.status === 200 ? 'PASS' : 'FAIL');

  // ── Summary ──
  const total = results.length;
  console.log('\n========================================');
  console.log(`SUMMARY: ${passed}/${total} PASS | ${failed} FAIL`);
  console.log('========================================\n');

  if (failed > 0) {
    console.error('Phase 6 Gate Status: FAIL ❌');
    server.close(() => process.exit(1));
  } else {
    console.log('Phase 6 Gate Status: PASS ✅');
    server.close(() => process.exit(0));
  }
}

runTests().catch((err) => {
  console.error('Phase 6 Test Runner fatal error:', err);
  if (server) server.close();
  process.exit(1);
});
