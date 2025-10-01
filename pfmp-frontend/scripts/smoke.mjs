#!/usr/bin/env node
// Simple frontend-side smoke test hitting backend API.
// Usage: node scripts/smoke.mjs [baseUrl]
// Default baseUrl: http://localhost:5052

import assert from 'node:assert/strict';

const base = process.argv[2] || 'http://localhost:5052';
const fetchJson = async (url, opts) => {
  const res = await fetch(url, opts);
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = null; }
  return { res, json, raw: text };
};

const results = [];
const record = (name, pass, details) => { results.push({ name, pass, details }); };

console.log(`Frontend smoke: base=${base}`);

// 1. Health
try {
  const { res, json } = await fetchJson(`${base}/health`);
  assert.equal(res.status, 200);
  assert.equal(json.status, 'OK');
  record('health', true, 'OK');
} catch (e) { record('health', false, e.message); }

// 2. Advice list (user 1)
try {
  const { res, json } = await fetchJson(`${base}/api/Advice/user/1`);
  assert.equal(res.status, 200);
  assert.ok(Array.isArray(json));
  record('advice_list', true, `count=${json.length}`);
} catch (e) { record('advice_list', false, e.message); }

// 3. Generate advice
let generatedAdviceId;
try {
  const { res, json } = await fetchJson(`${base}/api/Advice/generate/1`, { method: 'POST' });
  assert.equal(res.status, 200);
  assert.ok(json.adviceId);
  generatedAdviceId = json.adviceId;
  record('advice_generate', true, `id=${generatedAdviceId}`);
} catch (e) { record('advice_generate', false, e.message); }

// 4. Accept generated advice
if (generatedAdviceId) {
  try {
    const { res, json } = await fetchJson(`${base}/api/Advice/${generatedAdviceId}/accept`, { method: 'POST' });
    assert.equal(res.status, 200);
    assert.equal(json.status, 'Accepted');
    record('advice_accept', true, 'Accepted');
  } catch (e) { record('advice_accept', false, e.message); }
} else {
  record('advice_accept', false, 'skipped (no id)');
}

// 5. Tasks list verify
try {
  const { res, json } = await fetchJson(`${base}/api/Tasks?userId=1`);
  assert.equal(res.status, 200);
  assert.ok(Array.isArray(json));
  const found = generatedAdviceId && json.some(t => t.sourceAdviceId === generatedAdviceId);
  record('tasks_link_check', !!found, found ? 'Task linked' : 'No linked task found');
} catch (e) { record('tasks_link_check', false, e.message); }

// Report summary
const pad = (s, w) => s.padEnd(w);
const width = 22;
console.log('\nSmoke Summary');
for (const r of results) {
  console.log(`${pad(r.name, width)} ${r.pass ? 'PASS' : 'FAIL'} - ${r.details}`);
}

const failures = results.filter(r => !r.pass);
if (failures.length) {
  console.error(`\nFAILURES: ${failures.length}`);
  process.exit(1);
} else {
  console.log('\nAll smoke checks passed.');
}
