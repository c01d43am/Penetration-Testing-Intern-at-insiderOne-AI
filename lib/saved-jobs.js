import { readFile, writeFile } from "node:fs/promises";

export function createSavedJobsStore(path) {
  let pending = Promise.resolve();

  function serialize(operation) {
    const result = pending.then(operation);
    pending = result.catch(() => {});
    return result;
  }

  async function readIds() {
    let raw;
    try {
      raw = await readFile(path, "utf8");
    } catch (err) {
      if (err.code === "ENOENT") return [];
      throw err;
    }

    const ids = JSON.parse(raw);
    if (!Array.isArray(ids) || !ids.every((id) => typeof id === "string")) {
      throw new Error("Saved jobs file must contain an array of job IDs");
    }
    return ids;
  }

  async function writeIds(ids) {
    await writeFile(path, `${JSON.stringify(ids, null, 2)}\n`, "utf8");
  }

  return {
    getIds() {
      return serialize(readIds);
    },
    add(jobId) {
      return serialize(async () => {
        const ids = await readIds();
        if (!ids.includes(jobId)) await writeIds([...ids, jobId]);
      });
    },
    remove(jobId) {
      return serialize(async () => {
        const ids = await readIds();
        const remaining = ids.filter((id) => id !== jobId);
        if (remaining.length !== ids.length) await writeIds(remaining);
      });
    },
  };
}
