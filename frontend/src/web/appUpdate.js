// Silent auto-update for the TuDienDaiNam PWA.
//
// On each load / tab refocus / network reconnect, ask the service worker to look
// for a new version and read the freshly-deployed app-version.json. If a newer
// build is available AND we are online, prefetch the new dictionary DB into the
// local IndexedDB store (so the next launch is instant & offline) and then
// reload once — but only while the tab is hidden, so an active session is never
// disrupted. The cached app keeps working offline regardless.

import { deleteAsset, setAssetBytes } from './localAssetCache';

const LS_KEY = 'tudien_app_version';

async function readDeployedVersion() {
  const res = await fetch('/app-version.json', { cache: 'reload' });
  if (!res.ok) return null;
  return res.json();
}

function localVersion() {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || 'null');
  } catch (_) {
    return null;
  }
}

function saveLocalVersion(v) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(v));
  } catch (_) {}
}

async function prefetchDb(dbUrl) {
  if (!dbUrl) return true;
  try {
    const res = await fetch(dbUrl, { cache: 'reload' });
    if (!res.ok) return false;
    const buf = await res.arrayBuffer();
    const ct = res.headers.get('content-type') || '';
    if (ct.includes('text/html')) {
      // Poisoned (HTML error page) — drop and let the next check retry.
      await deleteAsset(dbUrl).catch(() => {});
      return false;
    }
    await setAssetBytes(dbUrl, new Uint8Array(buf));
    return true;
  } catch (_) {
    return false;
  }
}

let reloadScheduled = false;

async function applyUpdate(version) {
  if (reloadScheduled) return;
  if (typeof navigator === 'undefined' || !navigator.onLine) return;
  reloadScheduled = true;
  // Prefetch the new DB so the reload — and the next launch — are offline-safe.
  try {
    await prefetchDb(version.dbUrl);
  } catch (_) {}
  const doReload = () => window.location.reload();
  // Non-disruptive: reload when the tab is hidden, otherwise wait for it.
  if (document.hidden) {
    doReload();
  } else {
    const onHide = () => {
      if (document.hidden) {
        document.removeEventListener('visibilitychange', onHide);
        doReload();
      }
    };
    document.addEventListener('visibilitychange', onHide);
    // Safety net: if the tab never hides, still apply within 2 minutes.
    setTimeout(() => {
      if (!reloadScheduled) return;
      document.removeEventListener('visibilitychange', onHide);
      doReload();
    }, 120000);
  }
}

export function registerAppUpdater() {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
  // Native RN has no serviceWorker in practice; this also guards non-web builds.
  if (!navigator.serviceWorker) return;

  let firstCheck = true;
  const check = async () => {
    try {
      const reg = await navigator.serviceWorker.ready;
      reg.update();
      const deployed = await readDeployedVersion();
      if (!deployed) return;
      const local = localVersion();
      saveLocalVersion(deployed);
      if (firstCheck) {
        firstCheck = false;
        return; // never reload on the very first check of a session
      }
      if (local && deployed.swCache && deployed.swCache !== local.swCache) {
        await applyUpdate(deployed);
      }
    } catch (_) {
      /* ignore — offline or no new version */
    }
  };

  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    check();
  } else {
    window.addEventListener('load', check);
  }
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) check();
  });
  window.addEventListener('online', check);
}
