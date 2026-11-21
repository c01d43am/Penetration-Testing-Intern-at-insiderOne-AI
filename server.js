// A small job board: a JSON API and one page. Run with `npm start`.
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { loadJobs, searchJobs } from "./lib/jobs.js";
import { createSavedJobsStore } from "./lib/saved-jobs.js";

const PORT = Number(process.env.PORT ?? 3000);

function sendJson(res, status, body) {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(body));
}

async function readJsonBody(req) {
  let body = "";
  for await (const chunk of req) body += chunk;
  return JSON.parse(body);
}

export function createApp({ savedPath = new URL("./saved.json", import.meta.url) } = {}) {
  const savedJobs = createSavedJobsStore(savedPath);

  return createServer(async (req, res) => {
    try {
      const url = new URL(req.url ?? "/", "http://localhost");
      if (req.method === "GET" && url.pathname === "/api/jobs") {
        const jobs = await loadJobs();
        return sendJson(res, 200, searchJobs(jobs, url.searchParams.get("q")));
      }
      if (req.method === "GET" && url.pathname === "/api/saved") {
        const [jobs, savedIds] = await Promise.all([loadJobs(), savedJobs.getIds()]);
        const jobsById = new Map(jobs.map((job) => [job.id, job]));
        return sendJson(res, 200, savedIds.map((id) => jobsById.get(id)).filter(Boolean));
      }
      if (req.method === "POST" && url.pathname === "/api/saved") {
        let body;
        try {
          body = await readJsonBody(req);
        } catch {
          return sendJson(res, 400, { error: "Request body must be valid JSON" });
        }
        if (typeof body?.jobId !== "string" || !body.jobId.trim()) {
          return sendJson(res, 400, { error: "jobId must be a non-empty string" });
        }
        const jobId = body.jobId.trim();
        const jobs = await loadJobs();
        if (!jobs.some((job) => job.id === jobId)) {
          return sendJson(res, 404, { error: `Unknown job id: ${jobId}` });
        }
        await savedJobs.add(jobId);
        return sendJson(res, 200, { success: true });
      }
      const savedJobMatch = url.pathname.match(/^\/api\/saved\/([^/]+)$/);
      if (req.method === "DELETE" && savedJobMatch) {
        await savedJobs.remove(savedJobMatch[1]);
        return sendJson(res, 200, { success: true });
      }
      if (req.method === "GET" && (url.pathname === "/" || url.pathname === "/app.js")) {
        const file = url.pathname === "/" ? "index.html" : "app.js";
        const type = file.endsWith(".html") ? "text/html" : "text/javascript";
        const body = await readFile(new URL(`./public/${file}`, import.meta.url));
        res.writeHead(200, { "content-type": `${type}; charset=utf-8` });
        return res.end(body);
      }
      sendJson(res, 404, { error: "Not found" });
    } catch (err) {
      console.error(err);
      sendJson(res, 500, { error: "Something went wrong" });
    }
  });
}

// Started directly (npm start), not imported by a test.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  createApp().listen(PORT, () => console.log(`Job board on http://localhost:${PORT}`));
}
