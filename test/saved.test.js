import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createApp } from "../server.js";

async function startApp(savedPath) {
  const server = createApp({ savedPath });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  return {
    url: `http://127.0.0.1:${address.port}`,
    close: () => new Promise((resolve, reject) => {
      if (!server.listening) return resolve();
      server.close((error) => error ? reject(error) : resolve());
    }),
  };
}

async function createTempSavedPath(t) {
  const directory = await mkdtemp(join(tmpdir(), "job-board-saved-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  return join(directory, "saved.json");
}

test("saved jobs can be saved once, read after restart, and removed", async (t) => {
  const savedPath = await createTempSavedPath(t);
  let app = await startApp(savedPath);
  t.after(() => app.close());

  const page = await fetch(app.url);
  assert.match(await page.text(), /Saved jobs/);
  const script = await fetch(`${app.url}/app.js`);
  assert.match(await script.text(), /\/api\/saved/);

  const initial = await fetch(`${app.url}/api/saved`);
  assert.deepEqual(await initial.json(), []);

  const saveResponses = await Promise.all([
    fetch(`${app.url}/api/saved`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jobId: "j1" }),
    }),
    fetch(`${app.url}/api/saved`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jobId: "j1" }),
    }),
  ]);
  assert.ok(saveResponses.every((response) => response.ok));

  const saved = await fetch(`${app.url}/api/saved`);
  assert.deepEqual((await saved.json()).map((job) => job.id), ["j1"]);

  await app.close();
  app = await startApp(savedPath);
  const afterRestart = await fetch(`${app.url}/api/saved`);
  assert.deepEqual((await afterRestart.json()).map((job) => job.id), ["j1"]);

  const removed = await fetch(`${app.url}/api/saved/j1`, { method: "DELETE" });
  assert.equal(removed.status, 200);
  const afterRemove = await fetch(`${app.url}/api/saved`);
  assert.deepEqual(await afterRemove.json(), []);
});

test("saved jobs API rejects invalid requests and unknown job IDs clearly", async (t) => {
  const app = await startApp(await createTempSavedPath(t));
  t.after(() => app.close());

  const unknown = await fetch(`${app.url}/api/saved`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jobId: "missing" }),
  });
  assert.equal(unknown.status, 404);
  assert.deepEqual(await unknown.json(), { error: "Unknown job id: missing" });

  const missingId = await fetch(`${app.url}/api/saved`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({}),
  });
  assert.equal(missingId.status, 400);

  const invalidJson = await fetch(`${app.url}/api/saved`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: "{",
  });
  assert.equal(invalidJson.status, 400);
});
