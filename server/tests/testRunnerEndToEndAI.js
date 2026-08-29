/**
 * HYRO AUTOMATION — END-TO-END AI WORKFLOW AUTOMATION TEST SUITE
 * Verifies Prompt Planning, Graph Generation, Real Node Dispatcher,
 * Variable Resolution, Integration Execution, Approval Gates, and Lifecycle Monitoring.
 */

const http = require('http');
const path = require('path');
const app = require('../src/app');
const { connectDB } = require('../src/config/db');
const userRepository = require('../src/services/userRepository');
const workflowService = require('../src/services/workflowService');
const executionService = require('../src/services/executionService');
const executionAgent = require('../src/agents/executionAgent');
const integrationService = require('../src/services/integrationService');

let server;
const PORT = 5003;

const request = (method, path, body = null, headers = {}) => {
  return new Promise((resolve, reject) => {
    const dataString = body ? JSON.stringify(body) : '';
    const reqHeaders = { 'Content-Type': 'application/json', ...headers };
    if (body) reqHeaders['Content-Length'] = Buffer.byteLength(dataString);

    const req = http.request(
      { hostname: '127.0.0.1', port: PORT, path, method, headers: reqHeaders },
      (res) => {
        let responseData = '';
        res.on('data', (chunk) => { responseData += chunk; });
        res.on('end', () => {
          let parsed;
          try { parsed = JSON.parse(responseData); } catch { parsed = responseData; }
          resolve({ status: res.statusCode, headers: res.headers, body: parsed });
        });
      }
    );
    req.on('error', reject);
    if (body) req.write(dataString);
    req.end();
  });
};

const results = [];
function record(id, title, expected, actual, pass) {
  results.push({ id, title, expected, actual, pass });
  const icon = pass ? '✅' : '❌';
  console.log(`${icon} [${id}] ${title}: ${pass ? 'PASS' : 'FAIL'}`);
  if (!pass) {
    console.log(`   Expected: ${expected}`);
    console.log(`   Actual:   ${actual}`);
  }
}

async function runEndToEndSuite() {
  console.log('\n==================================================');
  console.log('HYRO AUTOMATION — END-TO-END AI WORKFLOW TEST SUITE');
  console.log('==================================================\n');

  await connectDB();
  server = app.listen(PORT);

  try {
    const userEmail = `ai_operator_${Date.now()}@hyro.ai`;
    const regRes = await request('POST', '/api/auth/register', {
      name: 'AI Workflow Operator',
      email: userEmail,
      password: 'password123',
      role: 'operator'
    });
    const token = regRes.body.data?.token;
    const authHeaders = { Authorization: `Bearer ${token}` };

    // Connect mock integrations for this user
    await integrationService.connectProvider({
      owner: regRes.body.data?.user?.id || 'test_user',
      provider: 'gmail',
      tokens: { accessToken: 'gmail_valid_token' }
    });
    await integrationService.connectProvider({
      owner: regRes.body.data?.user?.id || 'test_user',
      provider: 'google-sheets',
      tokens: { accessToken: 'sheets_valid_token' }
    });
    await integrationService.connectProvider({
      owner: regRes.body.data?.user?.id || 'test_user',
      provider: 'slack',
      tokens: { webhookUrl: 'https://hooks.slack.com/services/TXXXXXXX/BXXXXXXX/mock' }
    });
    await integrationService.connectProvider({
      owner: regRes.body.data?.user?.id || 'test_user',
      provider: 'linkedin',
      tokens: { accessToken: 'linkedin_valid_token' }
    });

    // ─────────────────────────────────────────────────────────────
    // TEST 1: CORE PRODUCT FLOW (Prompt -> Plan -> Graph -> Save -> Execute)
    // ─────────────────────────────────────────────────────────────
    const prompt1 = 'Monitor my Gmail for job emails, extract the company name, job title and application link, save them to Google Sheets, and send me a Slack notification.';
    const genRes = await request('POST', '/api/workflows/generate', { prompt: prompt1 }, authHeaders);
    const wf1 = genRes.body.data?.workflow || genRes.body.data;
    const t1Ok = genRes.status === 200 &&
      wf1 &&
      Array.isArray(wf1.nodes) &&
      wf1.nodes.length >= 4 &&
      Array.isArray(wf1.edges) &&
      wf1.edges.length >= 3 &&
      wf1.nodes.some((n) => n.type === 'gmailTrigger') &&
      wf1.nodes.some((n) => n.type === 'googleSheetsAppend') &&
      wf1.nodes.some((n) => n.type === 'slackPostMessage');

    record('E2E-001', 'Core Prompt Graph Generation', 'Nodes for Gmail, Sheets, Slack connected', `nodes:${wf1?.nodes?.length} edges:${wf1?.edges?.length}`, t1Ok);

    // Save Generated Workflow
    const saveRes = await request('POST', '/api/workflows', {
      name: wf1.name,
      description: wf1.description,
      nodes: wf1.nodes,
      edges: wf1.edges
    }, authHeaders);
    const savedWorkflow = saveRes.body.data?.workflow || saveRes.body.data;
    const t2Ok = saveRes.status === 201 && !!savedWorkflow?._id;
    record('E2E-002', 'Save Generated Workflow Graph', 'Saved workflow ID returned', `id:${savedWorkflow?._id}`, t2Ok);

    // Execute Saved Workflow
    const execRes = await request('POST', `/api/workflows/${savedWorkflow._id}/execute`, {}, authHeaders);
    const execId = execRes.body.data?._id || execRes.body.data?.execution?._id;
    const t3Ok = execRes.status === 200 && !!execId;
    record('E2E-003', 'Trigger Workflow Execution', 'Execution record created', `execId:${execId}`, t3Ok);

    // Poll execution completion
    let finalExec = null;
    for (let i = 0; i < 15; i++) {
      await new Promise((r) => setTimeout(r, 200));
      const statusRes = await request('GET', `/api/executions/${execId}`, null, authHeaders);
      if (statusRes.body.data?.execution?.status === 'COMPLETED' || statusRes.body.data?.execution?.status === 'FAILED') {
        finalExec = statusRes.body.data.execution;
        break;
      }
    }
    const t4Ok = finalExec && finalExec.status === 'COMPLETED';
    if (!t4Ok && finalExec) {
      console.log('   FinalExec Error:', finalExec.error);
    }
    record('E2E-004', 'End-to-End Execution Completion', 'Status COMPLETED with all node outputs', `status:${finalExec?.status}`, t4Ok);

    // ─────────────────────────────────────────────────────────────
    // TEST 2: LINKEDIN PROMPT WITH SCHEDULE & APPROVAL
    // ─────────────────────────────────────────────────────────────
    const prompt2 = 'Every Friday at 6 PM create a short professional post and publish it to my LinkedIn';
    const genRes2 = await request('POST', '/api/workflows/generate', { prompt: prompt2 }, authHeaders);
    const wf2 = genRes2.body.data?.workflow || genRes2.body.data;
    const t5Ok = genRes2.status === 200 &&
      wf2.nodes.some((n) => n.type === 'scheduleTrigger') &&
      wf2.nodes.some((n) => n.type === 'approvalGate') &&
      wf2.nodes.some((n) => n.type === 'linkedinPost');
    record('E2E-005', 'LinkedIn Scheduled Graph Generation', 'Schedule Trigger -> Approval Gate -> LinkedIn Post', `nodes:${wf2?.nodes?.map(n=>n.type).join('->')}`, t5Ok);

    // Save & Execute LinkedIn workflow (Expect WAITING_FOR_APPROVAL)
    const saveRes2 = await request('POST', '/api/workflows', {
      name: wf2.name,
      description: wf2.description,
      nodes: wf2.nodes,
      edges: wf2.edges
    }, authHeaders);
    const savedWf2 = saveRes2.body.data?.workflow || saveRes2.body.data;
    const execRes2 = await request('POST', `/api/workflows/${savedWf2._id}/execute`, {}, authHeaders);
    const execId2 = execRes2.body.data?._id || execRes2.body.data?.execution?._id;

    let pausedExec = null;
    for (let i = 0; i < 15; i++) {
      await new Promise((r) => setTimeout(r, 200));
      const s = await request('GET', `/api/executions/${execId2}`, null, authHeaders);
      if (s.body.data?.execution?.status === 'WAITING_FOR_APPROVAL') {
        pausedExec = s.body.data.execution;
        break;
      }
    }
    const t6Ok = pausedExec && pausedExec.status === 'WAITING_FOR_APPROVAL';
    record('E2E-006', 'Approval Gate Pause Execution', 'Status is WAITING_FOR_APPROVAL', `status:${pausedExec?.status}`, t6Ok);

    // Approve Execution
    const approveRes = await request('POST', `/api/executions/${execId2}/approve`, {}, authHeaders);
    const t7Ok = approveRes.status === 200;
    record('E2E-007', 'Resume Execution via Approve API', 'Status updated and execution resumed', `status:${approveRes.status}`, t7Ok);

    // ─────────────────────────────────────────────────────────────
    // TEST 3: CONDITIONAL WORKFLOW GRAPH
    // ─────────────────────────────────────────────────────────────
    const prompt3 = 'Check Gmail for job emails. If it is a software engineering job, save it to Google Sheets, otherwise ignore it.';
    const genRes3 = await request('POST', '/api/workflows/generate', { prompt: prompt3 }, authHeaders);
    const wf3 = genRes3.body.data?.workflow || genRes3.body.data;
    const t8Ok = genRes3.status === 200 &&
      wf3.nodes.some((n) => n.type === 'conditionBranch') &&
      wf3.nodes.some((n) => n.type === 'googleSheetsAppend');
    record('E2E-008', 'Conditional Workflow Generation', 'Condition Branch node generated', `hasCondition:${wf3?.nodes?.some(n=>n.type==='conditionBranch')}`, t8Ok);

    // ─────────────────────────────────────────────────────────────
    // TEST 4: SAFE VARIABLE RESOLVER (NO EVAL)
    // ─────────────────────────────────────────────────────────────
    const templateStr = 'Opportunity Alert: {{records[0].role}} at {{records[0].company}} with salary {{records[0].salary}}!';
    const testContext = {
      lastOutput: {
        records: [{ company: 'Acme Corp', role: 'Staff AI Engineer', salary: '$180k' }]
      }
    };
    const resolved = executionAgent.resolveVariables(templateStr, testContext);
    const t9Ok = resolved === 'Opportunity Alert: Staff AI Engineer at Acme Corp with salary $180k!';
    record('E2E-009', 'Safe Variable Resolution', 'Interpolates nested expressions safely', `resolved:${resolved}`, t9Ok);

    // ─────────────────────────────────────────────────────────────
    // TEST 5: SAFE CONDITION EVALUATION (NO EVAL)
    // ─────────────────────────────────────────────────────────────
    const cond1 = executionAgent.evaluateCondition("category === 'JOB'", { lastOutput: { category: 'JOB' } });
    const cond2 = executionAgent.evaluateCondition("category in ['JOB', 'INTERVIEW']", { lastOutput: { category: 'INTERVIEW' } });
    const cond3 = executionAgent.evaluateCondition("salary > 100", { lastOutput: { salary: 120 } });
    const t10Ok = cond1 === true && cond2 === true && cond3 === true;
    record('E2E-010', 'Safe Condition Evaluation', 'Evaluates ==, in, > without eval()', `c1:${cond1}, c2:${cond2}, c3:${cond3}`, t10Ok);

  } catch (err) {
    console.error('[Test Suite Error]', err);
  } finally {
    if (server) server.close();
  }

  const passed = results.filter((r) => r.pass).length;
  const total = results.length;
  console.log('\n==================================================');
  console.log(`SUMMARY: ${passed}/${total} PASS | ${total - passed} FAIL`);
  console.log('==================================================\n');

  if (passed !== total) process.exit(1);
}

runEndToEndSuite();
