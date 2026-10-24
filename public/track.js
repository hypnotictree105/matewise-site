// Anonymous usage beacons. A random ID per browser tab (no cookie) ties one visit's steps together.
// Browsers that send Do Not Track or Global Privacy Control are never tracked.
let sid = null;
// The owner can exclude their own browser from /stats ("Don't count this browser").
const excluded = () => { try { return localStorage.getItem('mw-no-track') === '1'; } catch { return false; } };
const optedOut = () => navigator.doNotTrack === '1' || window.doNotTrack === '1' || navigator.globalPrivacyControl === true || excluded();
function visitId() {
  if (sid) return sid;
  try { sid = sessionStorage.getItem('mw-visit'); } catch {}
  if (!sid) {
    sid = crypto.randomUUID ? crypto.randomUUID() : Array.from(crypto.getRandomValues(new Uint8Array(16)), b => b.toString(16).padStart(2, '0')).join('');
    try { sessionStorage.setItem('mw-visit', sid); } catch {}
  }
  return sid;
}
export function track(event, step, extra = {}) {
  try {
    if (optedOut()) return;
    const body = JSON.stringify({sid: visitId(), event, step, ...extra});
    const sent = navigator.sendBeacon && navigator.sendBeacon('/api/event', new Blob([body], {type: 'application/json'}));
    if (!sent) fetch('/api/event', {method: 'POST', headers: {'Content-Type': 'application/json'}, body, keepalive: true}).catch(() => {});
  } catch {}
}
