#!/usr/bin/env node
// Onboarding persistence smoke test
// Usage: node scripts/onboarding-smoke.mjs [baseUrl] [userId]
// Defaults: baseUrl=http://localhost:5052, userId=1 (DevUserRegistry default)

import assert from 'node:assert/strict';

const base = process.argv[2] || 'http://localhost:5052';
const userId = Number(process.argv[3] ?? process.env.ONBOARDING_SMOKE_USER_ID ?? '1');

if (Number.isNaN(userId) || userId <= 0) {
  console.error('Invalid userId provided. Expected positive integer.');
  process.exit(2);
}

const qs = new URLSearchParams({ userId: String(userId) });

const fetchJson = async (path, init) => {
  const url = `${base}${path}`;
  const res = await fetch(url, init);
  const raw = await res.text();
  let json;
  try {
    json = raw ? JSON.parse(raw) : null;
  } catch (error) {
    json = null;
  }
  return { res, json, raw, url };
};

const results = [];
const record = (name, pass, details) => {
  results.push({ name, pass, details });
};

console.log(`Onboarding smoke: base=${base} userId=${userId}`);

try {
  // Step 1: Reset progress to ensure clean state
  const reset = await fetchJson(`/api/onboarding/progress/reset?${qs.toString()}`, { method: 'POST' });
  assert.ok(reset.res.status === 200 || reset.res.status === 204, `reset status ${reset.res.status}`);
  record('reset_initial', true, `status=${reset.res.status}`);
} catch (error) {
  record('reset_initial', false, error.message);
}

let snapshotAfterPut = null;

try {
  // Step 2: Expect 404 for fresh snapshot
  const res404 = await fetchJson(`/api/onboarding/progress?${qs.toString()}`);
  assert.equal(res404.res.status, 404);
  record('get_after_reset', true, '404 fresh state');
} catch (error) {
  record('get_after_reset', false, error.message);
}

try {
  // Step 3: Upsert baseline snapshot
  const payload = {
    currentStepId: 'demographics',
    completedStepIds: ['demographics'],
    stepPayloads: { demographics: { acknowledged: true } },
  };
  const upsert = await fetchJson(`/api/onboarding/progress?${qs.toString()}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  assert.ok(upsert.res.status === 200 || upsert.res.status === 204, `put status ${upsert.res.status}`);

  const read = await fetchJson(`/api/onboarding/progress?${qs.toString()}`);
  assert.equal(read.res.status, 200);
  assert.equal(read.json?.currentStepId, 'demographics');
  assert.ok(Array.isArray(read.json?.completedStepIds));
  assert.ok(read.json.completedStepIds.includes('demographics'));
  snapshotAfterPut = read.json;
  record('upsert_and_get', true, `steps=${read.json.completedStepIds.length}`);
} catch (error) {
  record('upsert_and_get', false, error.message);
}

try {
  // Step 4: Patch next step completion
  const patch = await fetchJson(`/api/onboarding/progress/step/risk?${qs.toString()}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ completed: true }),
  });
  assert.ok(patch.res.status === 200 || patch.res.status === 204, `patch status ${patch.res.status}`);

  const read = await fetchJson(`/api/onboarding/progress?${qs.toString()}`);
  assert.equal(read.res.status, 200);
  assert.ok(read.json?.completedStepIds.includes('risk'));
  record('patch_step', true, `completed=${read.json.completedStepIds.join(',')}`);
} catch (error) {
  record('patch_step', false, error.message);
}

try {
  // Step 5: Reset again and ensure 404
  const resetFinal = await fetchJson(`/api/onboarding/progress/reset?${qs.toString()}`, { method: 'POST' });
  assert.ok(resetFinal.res.status === 200 || resetFinal.res.status === 204, `reset status ${resetFinal.res.status}`);

  const res404 = await fetchJson(`/api/onboarding/progress?${qs.toString()}`);
  assert.equal(res404.res.status, 404);
  record('reset_final', true, 'fresh state restored');
} catch (error) {
  record('reset_final', false, error.message);
}

// Report results
const pad = (s, w) => s.padEnd(w);
const width = 20;
console.log('\nOnboarding Smoke Summary');
for (const r of results) {
  console.log(`${pad(r.name, width)} ${r.pass ? 'PASS' : 'FAIL'} - ${r.details}`);
}

const failures = results.filter(r => !r.pass);
if (failures.length) {
  console.error(`\nFAILURES: ${failures.length}`);
  process.exit(1);
}

if (snapshotAfterPut) {
  const stamp = snapshotAfterPut.updatedUtc;
  console.log(`\nSnapshot timestamp: ${stamp}`);
}

console.log('\nOnboarding smoke checks passed.');
```}