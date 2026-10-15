// Auto-recover from stale chunk hashes after a redeploy.
// When a dynamic import() fails because the hashed asset no longer exists,
// reload once to fetch the new index.html + chunk graph.
export const isChunkLoadError = (msg: string) =>
  /Importing a module script failed|Failed to fetch dynamically imported module|error loading dynamically imported module|ChunkLoadError/i.test(msg);

/** Reloads the page, at most once per ten seconds. Returns true when a reload was started. */
export const tryReload = (): boolean => {
  try {
    const key = "__chunk_reload_at";
    const last = Number(sessionStorage.getItem(key) || 0);
    if (Date.now() - last > 10_000) {
      sessionStorage.setItem(key, String(Date.now()));
      window.location.reload();
      return true;
    }
    return false;
  } catch {
    window.location.reload();
    return true;
  }
};
