/* ═══════════════════════════════════════════
   TRACKER — KimetsuCTF
   Silent player heartbeat · completely isolated
   from gameplay · never blocks application init

   Architecture
   ─────────────
   KimetsuTracker.initialize(trackerUrl)
          │
   fetchPublicIP()  ← called once; result cached
          │
   cache IP
          │
   heartbeat every 30 s
          │
   POST <trackerUrl>/api/player  { ip, username, points }

   All errors are silently swallowed. The tracker
   has zero surface area on the rest of the app.
═══════════════════════════════════════════ */
(function () {
  'use strict';

  /* ── Public IP services tried in order ── */
  const IP_SERVICES = [
    'https://api.ipify.org?format=json',
    'https://api4.my-ip.io/v2/ip.json',
  ];

  const HEARTBEAT_INTERVAL_MS = 30000;
  const FETCH_TIMEOUT_MS      = 4000;

  /* localStorage keys — must match keys used in auth.js and script.js */
  const USERNAME_KEY = 'kimetsu_username';
  const SCORE_KEY    = 'kimetsu_score';

  /* Singleton guard — only one instance may ever run */
  let _initialized = false;
  let _intervalId  = null;

  /* Cached public IP — fetched once, reused for every heartbeat */
  let _cachedIp    = null;

  /* ──────────────────────────────────────────
     fetchWithTimeout — lightweight wrapper
  ──────────────────────────────────────────── */
  function fetchWithTimeout(url, options, timeoutMs) {
    const controller = new AbortController();
    const tid = setTimeout(() => controller.abort(), timeoutMs);
    return fetch(url, { ...options, signal: controller.signal })
      .finally(() => clearTimeout(tid));
  }

  /* ──────────────────────────────────────────
     fetchPublicIP
     Tries each IP service in turn, returns the
     first valid dotted-quad / IPv6 string found,
     or null on total failure.
  ──────────────────────────────────────────── */
  async function fetchPublicIP() {
    for (const serviceUrl of IP_SERVICES) {
      try {
        const res = await fetchWithTimeout(serviceUrl, { method: 'GET' }, FETCH_TIMEOUT_MS);
        if (!res.ok) continue;

        const data = await res.json();

        /* Most services return { ip: "..." } or { address: "..." } */
        const ip = data.ip || data.address || data.query || null;

        if (typeof ip === 'string' && ip.trim()) {
          return ip.trim();
        }
      } catch (_) {
        /* This service failed — try the next one */
      }
    }
    return null;
  }

  /* ──────────────────────────────────────────
     sendHeartbeat
     Single fire-and-forget POST. Any failure
     is silently absorbed — the next tick retries.
     Points are read fresh from localStorage each
     call so they always reflect the latest score.
  ──────────────────────────────────────────── */
  async function sendHeartbeat(endpoint) {
    if (!_cachedIp) return;   /* IP not yet available — skip */

    const username = localStorage.getItem(USERNAME_KEY);
    if (!username) return;    /* No player registered — skip */

    const points = parseInt(localStorage.getItem(SCORE_KEY) || '0', 10);

    try {
      await fetchWithTimeout(
        endpoint,
        {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ ip: _cachedIp, username, points }),
        },
        FETCH_TIMEOUT_MS
      );
      /* Response body is intentionally ignored */
    } catch (_) {
      /* CORS, DNS, timeout, offline — all silently dropped */
    }
  }

  /* ──────────────────────────────────────────
     initialize
     Entry point — called by video.js after
     kny.json has been successfully parsed.

     Parameters
       trackerUrl  {string|null}  root "tracker" value from kny.json.
                                  If null/empty the tracker does nothing.
  ──────────────────────────────────────────── */
  function initialize(trackerUrl) {
    if (_initialized) return;
    _initialized = true;

    if (!trackerUrl || typeof trackerUrl !== 'string' || !trackerUrl.trim()) {
      return;
    }

    const endpoint = trackerUrl.trim().replace(/\/$/, '') + '/api/player';

    /* Fetch public IP once; then start the heartbeat loop */
    fetchPublicIP()
      .then(ip => {
        _cachedIp = ip;   /* null if all services failed — heartbeats will skip */

        sendHeartbeat(endpoint);
        _intervalId = setInterval(() => sendHeartbeat(endpoint), HEARTBEAT_INTERVAL_MS);
      })
      .catch(() => {
        /* fetchPublicIP already swallows errors; this is a safety net */
      });
  }

  /* ──────────────────────────────────────────
     teardown
     Clears the interval if the host app ever
     needs to shut the tracker down cleanly
     (e.g. SPA navigation, test cleanup).
  ──────────────────────────────────────────── */
  function teardown() {
    if (_intervalId !== null) {
      clearInterval(_intervalId);
      _intervalId = null;
    }
  }

  /* ── Public API ── */
  window.KimetsuTracker = {
    initialize,
    teardown,
  };

})();