/**
 * HYRO Automation — Phase 4 Test Runner
 * Runs P4-001 through P4-014 (RAG Assistant)
 * Plus Phase 1, Phase 2, and Phase 3 Regression Suites
 */
const http = require('http');
const path = require('path');
const app = require('../src/app');
const { connectDB } = require('../src/config/db');
const userRepository = require('../src/services/userRepository');
const workflowRepository = require('../src/services/workflowRepository');
const documentService = require('../src/services/documentService');
const ragService = require('../src/services/ragService');
const vectorStore = require('../src/rag/vectorStore');

const PORT = 5004;
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
  console.log('HYRO AUTOMATION — PHASE 4 TEST SUITE');
  console.log('========================================\n');

  userRepository.clearInMemoryStore();
  workflowRepository.clearInMemoryStore();
  documentService.clearInMemoryStore();
  vectorStore.clearInMemoryStore();
  ragService.clearInMemoryStore();

  await connectDB();
  server = app.listen(PORT);

  // Setup: Register User 1 & User 2
  const u1 = await req('POST', '/api/auth/register', {
    name: 'RAG User One',
    email: `rag1_${Date.now()}@hyro.ai`,
    password: 'password123',
    role: 'operator'
  });
  const u2 = await req('POST', '/api/auth/register', {
    name: 'RAG User Two',
    email: `rag2_${Date.now()}@hyro.ai`,
    password: 'password123',
    role: 'operator'
  });

  const token1 = u1.body.data?.token;
  const token2 = u2.body.data?.token;
  const auth1 = { Authorization: `Bearer ${token1}` };
  const auth2 = { Authorization: `Bearer ${token2}` };

  let doc1Id, conversationId;

  // P4-001: Chat UI / Conversation Creation
  const chat1 = await req('POST', '/api/chat', { message: 'Hello HYRO Assistant' }, auth1);
  const c1Ok = chat1.status === 200 && !!chat1.body.data?.conversationId;
  conversationId = chat1.body.data?.conversationId;
  record('P4-001', 'Chat Conversation Creation', 'status:200 and conversationId returned', `status:${chat1.status}, id:${conversationId}`, c1Ok ? 'PASS' : 'FAIL');

  // P4-002: Document Upload
  const docText = `
HYRO Automation Platform Technical Manual:
HYRO stands for Hybrid Robotics Orchestration.
Project Alpha is a high-speed AI email processing pipeline developed in 2026.
It integrates Gmail with Google Sheets and Slack for automated career tracking.
  `.trim();

  const uploadRes = await req('POST', '/api/knowledge/documents', {
    name: 'HYRO_Manual.md',
    type: 'markdown',
    content: docText,
    metadata: { author: 'DeepMind Team' }
  }, auth1);

  const docOk = uploadRes.status === 201 && uploadRes.body.data?.document?.status === 'indexed';
  doc1Id = uploadRes.body.data?.document?._id;
  record('P4-002', 'Document Upload & Indexing', 'status:201, document status: indexed', `status:${uploadRes.status}, docStatus:${uploadRes.body.data?.document?.status}`, docOk ? 'PASS' : 'FAIL');

  // P4-003: Text Extraction Verification
  const getDocRes = await req('GET', `/api/knowledge/documents/${doc1Id}`, null, auth1);
  const extOk = getDocRes.status === 200 && getDocRes.body.data?.document?.name === 'HYRO_Manual.md';
  record('P4-003', 'Text Extraction Verification', 'Document metadata and name preserved', `name:${getDocRes.body.data?.document?.name}`, extOk ? 'PASS' : 'FAIL');

  // P4-004: Chunking
  const chunkCount = getDocRes.body.data?.document?.chunkCount;
  record('P4-004', 'Document Chunking', 'chunkCount > 0', `chunks:${chunkCount}`, chunkCount > 0 ? 'PASS' : 'FAIL');

  // P4-005 & P4-006: Embedding & Vector Storage
  const searchRes = await req('POST', '/api/chat', { message: 'What is Project Alpha?' }, auth1);
  const searchOk = searchRes.status === 200 && searchRes.body.data?.sources?.length > 0;
  record('P4-005', 'Vector Storage & Search', 'Query returned relevant chunks', `sources:${searchRes.body.data?.sources?.length}`, searchOk ? 'PASS' : 'FAIL');

  // P4-007: Semantic Retrieval
  const retRes = await req('POST', '/api/chat', { message: 'What does HYRO stand for?' }, auth1);
  const retOk = retRes.status === 200 && retRes.body.data?.answer?.includes('Hybrid Robotics Orchestration');
  record('P4-007', 'Semantic Retrieval', 'Retrieved exact term from document', `answerOk:${retOk}`, retOk ? 'PASS' : 'FAIL');

  // P4-008: Grounded Answer with Source References
  const hasSources = retRes.body.data?.sources && retRes.body.data.sources.length > 0 && retRes.body.data.sources[0].documentName === 'HYRO_Manual.md';
  record('P4-008', 'Grounded Answer & Sources', 'Sources include documentName: HYRO_Manual.md', `hasSources:${hasSources}`, hasSources ? 'PASS' : 'FAIL');

  // P4-009: Unsupported Question (No Hallucination)
  const unsuppRes = await req('POST', '/api/chat', { message: 'What is the secret recipe for quantum fusion rocket fuel?' }, auth1);
  const unsuppOk = unsuppRes.status === 200 && unsuppRes.body.data?.answer?.includes('does not contain information');
  record('P4-009', 'Unsupported Question Protection', 'Indicates information is unavailable in knowledge base', `answer:${unsuppRes.body.data?.answer}`, unsuppOk ? 'PASS' : 'FAIL');

  // P4-010: Multi-Turn Conversation Context
  const followUpRes = await req('POST', '/api/chat', { conversationId, message: 'What year was Project Alpha developed?' }, auth1);
  const multiOk = followUpRes.status === 200 && followUpRes.body.data?.messages?.length >= 4;
  record('P4-010', 'Multi-Turn Conversation Context', 'Conversation history preserved across turns', `messages:${followUpRes.body.data?.messages?.length}`, multiOk ? 'PASS' : 'FAIL');

  // P4-011: Document Isolation (User 2 cannot access User 1 document or knowledge)
  const u2Query = await req('POST', '/api/chat', { message: 'What does HYRO stand for?' }, auth2);
  const isoOk = u2Query.status === 200 && u2Query.body.data?.sources?.length === 0;
  record('P4-011', 'Document Isolation', 'User 2 receives 0 sources from User 1 document', `sources:${u2Query.body.data?.sources?.length}`, isoOk ? 'PASS' : 'FAIL');

  // P4-012: Delete Document
  const delDocRes = await req('DELETE', `/api/knowledge/documents/${doc1Id}`, null, auth1);
  const delDocOk = delDocRes.status === 200 && delDocRes.body.data?.deleted === true;
  record('P4-012', 'Delete Document', 'deleted:true', `status:${delDocRes.status}`, delDocOk ? 'PASS' : 'FAIL');

  // Verify deleted document chunks no longer retrieved
  const postDelQuery = await req('POST', '/api/chat', { message: 'What does HYRO stand for?' }, auth1);
  const delClean = postDelQuery.body.data?.sources?.length === 0;
  record('P4-012b', 'Deleted Document Not Retrievable', '0 sources returned after deletion', `sources:${postDelQuery.body.data?.sources?.length}`, delClean ? 'PASS' : 'FAIL');

  // P4-013: Re-index Document
  const doc2 = await req('POST', '/api/knowledge/documents', { name: 'Reindex_Test.txt', type: 'txt', content: 'Initial version of reindex content.' }, auth1);
  const doc2Id = doc2.body.data?.document?._id;
  const reindexRes = await req('POST', `/api/knowledge/documents/${doc2Id}/reindex`, { content: 'Updated content version 2 for reindexing test.' }, auth1);
  const reindexOk = reindexRes.status === 200 && reindexRes.body.data?.document?.status === 'indexed';
  record('P4-013', 'Re-index Document', 'Re-index returns status: indexed', `status:${reindexRes.status}`, reindexOk ? 'PASS' : 'FAIL');

  // P4-014: RAG-to-Workflow Hand-off
  const wfGenRes = await req('POST', '/api/workflows/generate', { prompt: 'Create a workflow based on project documents: monitor Gmail and save to Sheets.' }, auth1);
  const wfHandoffOk = wfGenRes.status === 200 && wfGenRes.body.data?.nodes?.length > 0;
  record('P4-014', 'RAG-to-Workflow Handoff', 'Generated valid workflow from context', `nodes:${wfGenRes.body.data?.nodes?.length}`, wfHandoffOk ? 'PASS' : 'FAIL');

  // ── Full Regression Suites (Phases 1, 2, 3) ──────────────────────────────────
  console.log('\n--- Full Regression Suite (Phases 1, 2, 3) ---\n');

  const health = await req('GET', '/api/health');
  record('P1-003-R', 'Health Endpoint [REGRESSION]', 'status:200', `status:${health.status}`, health.status === 200 ? 'PASS' : 'FAIL');

  const createWf = await req('POST', '/api/workflows', { name: 'Phase 4 Reg WF', nodes: [{ id: 'n1', type: 'gmailTrigger', position: { x: 0, y: 0 } }], edges: [] }, auth1);
  record('P2-001-R', 'Create Workflow [REGRESSION]', 'status:201', `status:${createWf.status}`, createWf.status === 201 ? 'PASS' : 'FAIL');

  const aiGen = await req('POST', '/api/workflows/generate', { prompt: 'Process invoices and notify on Slack.' }, auth1);
  record('P3-001-R', 'AI Workflow Generation [REGRESSION]', 'status:200', `status:${aiGen.status}`, aiGen.status === 200 ? 'PASS' : 'FAIL');

  // ── Summary ──
  const total = results.length;
  console.log('\n========================================');
  console.log(`SUMMARY: ${passed}/${total} PASS | ${failed} FAIL`);
  console.log('========================================\n');

  if (failed > 0) {
    console.error('Phase 4 Gate Status: FAIL ❌');
    server.close(() => process.exit(1));
  } else {
    console.log('Phase 4 Gate Status: PASS ✅');
    server.close(() => process.exit(0));
  }
}

runTests().catch((err) => {
  console.error('Phase 4 Test Runner fatal error:', err);
  if (server) server.close();
  process.exit(1);
});
