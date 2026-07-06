/* ══════════════════════════════════════════
   VIDEO SYSTEM — KimetsuCTF
   Hero autoplay + fullscreen challenge intro/outro
   + Remote task endpoint mapping
══════════════════════════════════════════ */
(function () {
  'use strict';

  /* ─────────────────────────────────────────
     CONFIG
  ───────────────────────────────────────── */
  const HERO_VIDEO_URL    = 'assets/hero/hero.mp4';
  const TASK_URL_ENDPOINT = 'https://gist.githubusercontent.com/R0GU3x/8de87a6a55f3bd174d33259c5fc147b2/raw/kny.json';
  const FETCH_TIMEOUT_MS  = 5000;

  /* ─────────────────────────────────────────
     REMOTE TASK ENDPOINT SYSTEM

     Data flow:

       fetchTaskUrls()            network call, runs once at init.
              │                   Fetches kny.json and merges every
              │                   entry into a flat { id: rawTuple } map.
              ▼
       parseEndpoint(raw, id)     Validates + normalizes ONE raw
              │                   [type, host, port] tuple. Malformed
              │                   entries are logged and dropped —
              │                   they never reach the cache.
              ▼
       _taskDataMap[id] = { protocol, host, port }
              │
              │   ... later, whenever a challenge modal opens ...
              ▼
       resolveTaskEndpoint(id)    Pure cache lookup. No network call.
              │
              ▼
       protocolRenderer(entry)    Picks a renderer by `entry.protocol`,
              │                   falling back to genericRenderer for
              │                   any protocol without a dedicated one.
              │
        ┌─────┼──────────────┬───────────────────┐
        ▼     ▼               ▼                   ▼
     httpRenderer        commandRenderer      genericRenderer
     (http, https)       (nc, ssh, telnet —   (any other/future
                          connection type +    protocol — host/port
                          host + port only)     only, no link)
        │
        ▼
     injectTaskUrlPanel(ch)   Appends the rendered DOM fragment into
                               #modal-lore. Renders nothing if there's
                               no mapping for this challenge.

     Supported entry shapes:
       ["http",  "10.108.221.44", "3005"]                  → http://10.108.221.44:3005
       ["https", "https://any-server.com"]                 → used exactly as given, no host/port synthesis
       ["nc",    "192.168.1.10",  "4002"]                  → nc 192.168.1.10 4002
       ["ssh",   "1.1.1.1", "3001"]                         → ssh 1.1.1.1 -p 3001
       ["ssh",   "1.1.1.1", "3001", "user", "pass"]         → ssh user@1.1.1.1 -p 3001
       ["ssh",   "1.1.1.1", "user", "pass"]  (legacy, no port) → ssh user@1.1.1.1
       ["https://tryhackme.com/jr/thehashiras"]             → legacy single-element direct link

     Adding support for a new protocol later (e.g. "ws") means adding
     one entry to PROTOCOL_RENDERERS — nothing else in this pipeline
     needs to change, and unknown protocols already degrade gracefully
     via genericRenderer.
  ───────────────────────────────────────── */
  let _taskDataMap = {};  /* populated by fetchTaskUrls(); keyed by challenge id */
  let _urlFetched  = false;

  /** Protocols that resolve to a clickable web URL. */
  const HTTP_LIKE_PROTOCOLS = new Set(['http', 'https']);

  /**
   * Parses + validates a single raw API entry against the
   * `[type, host, port]` contract, or a one-element direct URL
   * array such as `["https://example.com/path"]`.
   * Returns a normalized
   * { protocol, host, port, url?, isDirectUrl? } object,
   * or null if the entry is missing fields, malformed, or
   * otherwise unusable — callers never have to re-validate.
   *
   * Handles, without throwing: null entries, non-array entries
   * (including the legacy string/[ip,port] shapes), arrays shorter
   * than 3 elements, missing/blank protocol or host, and
   * missing/non-numeric/out-of-range ports. Unknown (but
   * well-formed) protocol values are accepted here — rendering
   * decides what to do with them, not parsing.
   */
  function parseDirectUrlEntry(rawUrl, challengeId) {
    try {
      const url = new URL(rawUrl.trim());
      const protocol = url.protocol.replace(':', '').toLowerCase();

      if (!HTTP_LIKE_PROTOCOLS.has(protocol)) {
        console.warn(`[KimetsuVideo] Direct URL for "${challengeId}" must use http or https. Skipping.`, rawUrl);
        return null;
      }

      return {
        protocol,
        host: url.hostname,
        port: url.port || null,
        url: url.href,
        isDirectUrl: true,
        username: null,
        password: null,
      };
    } catch (_) {
      console.warn(`[KimetsuVideo] Direct URL for "${challengeId}" is malformed. Skipping.`, rawUrl);
      return null;
    }
  }

  /**
   * Parses an SSH entry. Supports two shapes:
   *
   *   New   : ["ssh", host, port, username?, password?]
   *   Legacy: ["ssh", host, username, password]   (no port field)
   *
   * Disambiguation: element[2] is treated as a port when it parses as a
   * valid numeric port (1-65535); otherwise the entry is assumed to be
   * the legacy 4-element [host, username, password] shape. Username and
   * password are always optional in the new shape — never assumed.
   */
  function parseSshEntry(raw, hostRaw, challengeId) {
    if (raw.length < 3) {
      console.warn(`[KimetsuVideo] SSH entry for "${challengeId}" requires at least [ssh, host, port]. Skipping.`, raw);
      return null;
    }

    const portCandidate = raw[2];
    const portNum = Number(portCandidate);
    const looksLikePort =
      (typeof portCandidate === 'string' || typeof portCandidate === 'number') &&
      String(portCandidate).trim() !== '' &&
      Number.isFinite(portNum) && portNum > 0 && portNum <= 65535;

    if (looksLikePort) {
      /* New format: ["ssh", host, port, username?, password?] */
      const usernameRaw = raw[3];
      const passwordRaw = raw[4];
      const username = (typeof usernameRaw === 'string' && usernameRaw.trim()) ? usernameRaw.trim() : null;
      const password = (typeof passwordRaw === 'string' && passwordRaw.trim()) ? passwordRaw.trim() : null;

      return {
        protocol: 'ssh',
        host: hostRaw.trim(),
        port: String(portNum),
        username,
        password,
      };
    }

    /* Legacy format: ["ssh", host, username, password] — no port field.
       Both username and password are required in this legacy shape. */
    if (raw.length < 4) {
      console.warn(`[KimetsuVideo] Legacy SSH entry for "${challengeId}" requires [ssh, host, username, password]. Skipping.`, raw);
      return null;
    }
    const usernameRaw = raw[2];
    const passwordRaw = raw[3];
    if (typeof usernameRaw !== 'string' || !usernameRaw.trim()) {
      console.warn(`[KimetsuVideo] Legacy SSH entry for "${challengeId}" is missing a valid username. Skipping.`, raw);
      return null;
    }
    if (typeof passwordRaw !== 'string' || !passwordRaw.trim()) {
      console.warn(`[KimetsuVideo] Legacy SSH entry for "${challengeId}" is missing a valid password. Skipping.`, raw);
      return null;
    }

    return {
      protocol: 'ssh',
      host: hostRaw.trim(),
      port: null,
      username: usernameRaw.trim(),
      password: passwordRaw.trim(),
    };
  }

  function parseEndpoint(raw, challengeId) {
    if (raw == null) return null;

    if (!Array.isArray(raw)) {
      console.warn(`[KimetsuVideo] Task entry for "${challengeId}" is not an array — expected [type, host, ...]. Skipping.`, raw);
      return null;
    }

    /* Legacy direct external link: ["https://example.com/path"] */
    if (raw.length === 1) {
      const single = raw[0];
      if (typeof single === 'string' && /^https?:\/\//i.test(single.trim())) {
        return parseDirectUrlEntry(single, challengeId);
      }
      console.warn(`[KimetsuVideo] Task entry for "${challengeId}" has 1 element and isn't a valid URL. Skipping.`, raw);
      return null;
    }

    if (raw.length < 2) {
      console.warn(`[KimetsuVideo] Task entry for "${challengeId}" has ${raw.length} element(s) — too short. Skipping.`, raw);
      return null;
    }

    const [protocolRaw, secondRaw] = raw;

    if (typeof protocolRaw !== 'string' || !protocolRaw.trim()) {
      console.warn(`[KimetsuVideo] Task entry for "${challengeId}" is missing a valid protocol type. Skipping.`, raw);
      return null;
    }

    const protocol = protocolRaw.trim().toLowerCase();

    /* HTTPS complete-URL form: ["https", "https://any-server.com"].
       The second element is already a full URL — rendered exactly as
       provided, never reconstructed from host + port. */
    if (protocol === 'https' && raw.length === 2 &&
        typeof secondRaw === 'string' && /^https?:\/\//i.test(secondRaw.trim())) {
      return parseDirectUrlEntry(secondRaw, challengeId);
    }

    if (typeof secondRaw !== 'string' || !secondRaw.trim()) {
      console.warn(`[KimetsuVideo] Task entry for "${challengeId}" is missing a valid host. Skipping.`, raw);
      return null;
    }
    const hostRaw = secondRaw;

    /* SSH: delegate to its own parser (port optional-looking, creds optional) */
    if (protocol === 'ssh') {
      return parseSshEntry(raw, hostRaw, challengeId);
    }

    /* All remaining protocols (http, nc, telnet, future ones): ["type", host, port] */
    if (raw.length < 3) {
      console.warn(`[KimetsuVideo] Task entry for "${challengeId}" has ${raw.length} element(s) — expected [type, host, port]. Skipping.`, raw);
      return null;
    }

    const portRaw = raw[2];
    const portNum = Number(portRaw);
    if (!Number.isFinite(portNum) || portNum <= 0 || portNum > 65535) {
      console.warn(`[KimetsuVideo] Task entry for "${challengeId}" has an invalid port (${JSON.stringify(portRaw)}). Skipping.`, raw);
      return null;
    }

    return {
      protocol,
      host: hostRaw.trim(),
      port: String(portNum),
      username: null,
      password: null,
    };
  }

  /**
   * Fetches kny.json and populates _taskDataMap.
   * Returns the tracker URL string extracted from the root object, or null.
   *
   * New root format:
   *   { "tracker": "https://...", "play": [ { "a5": [...] }, ... ] }
   *
   * Play entries may be:
   *   ["http", "host", "port"]                    — web service
   *   ["https", "https://example.com"]            — web service, URL used as-is
   *   ["nc", "host", "port"]                      — netcat
   *   ["ssh", "host", "port"]                     — SSH, no credentials
   *   ["ssh", "host", "port", "user", "password"] — SSH, with credentials
   *   ["ssh", "host", "user", "password"]         — SSH legacy shape, no port
   *   ["https://example.com/path"]                — legacy direct external link
   *
   * Legacy formats (plain array-of-objects or flat object) are still
   * supported for backwards compatibility — tracker will be null in those
   * cases.
   */
  async function fetchTaskUrls() {
    if (_urlFetched) return null;
    _urlFetched = true;

    const controller = new AbortController();
    const tid = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
      const res = await fetch(TASK_URL_ENDPOINT, {
        method: 'GET',
        signal: controller.signal,
        headers: { 'Accept': 'application/json' },
      });
      clearTimeout(tid);

      if (!res.ok) {
        console.warn(`[KimetsuVideo] Task URL API returned HTTP ${res.status} — continuing without remote task data.`);
        return null;
      }

      const raw = await res.json();

      /* ── Detect format and extract play list + tracker URL ──
         New format  : { tracker: "...", play: [ {id: tuple}, ... ] }
         Legacy array: [ { id: tuple }, ... ]
         Legacy flat : { id: tuple, ... }                            */
      let playList   = null;   /* array-of-objects to merge, or null */
      let trackerUrl = null;   /* tracker server URL, or null        */

      if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
        if (Array.isArray(raw.play)) {
          /* New structured format */
          playList   = raw.play;
          trackerUrl = (typeof raw.tracker === 'string' && raw.tracker.trim())
            ? raw.tracker.trim()
            : null;
        } else {
          /* Legacy flat-object format — the whole object is the map */
          playList = [raw];
        }
      } else if (Array.isArray(raw)) {
        /* Legacy array-of-objects format */
        playList = raw;
      } else {
        console.warn('[KimetsuVideo] Unexpected API response shape — ignoring.', raw);
        return null;
      }

      /* Merge every item in playList into a flat { challengeId: rawValue } map */
      const merged = {};
      playList.forEach(item => {
        if (item && typeof item === 'object' && !Array.isArray(item)) {
          Object.assign(merged, item);
        }
      });

      /* Normalize every entry; silently drop anything malformed so a
         single bad record can't break the rest of the map. Diagnostics
         for *why* an entry was dropped are logged inside parseEndpoint. */
      Object.keys(merged).forEach(id => {
        const entry = parseEndpoint(merged[id], id);
        if (entry) {
          _taskDataMap[id] = entry;
        }
      });

      // console.info('[KimetsuVideo] Task endpoint map loaded:', _taskDataMap);
      return trackerUrl;
    } catch (err) {
      clearTimeout(tid);
      if (err.name === 'AbortError') {
        console.warn('[KimetsuVideo] Task URL fetch timed out — continuing without remote task data.');
      } else {
        console.warn('[KimetsuVideo] Task URL fetch failed:', err.message, '— continuing without remote task data.');
      }
      return null;
    }
  }

  /**
   * Returns the normalized, cached endpoint for a given challenge id —
   * a pure lookup, no network request. Shape: { protocol, host, port },
   * or null if no mapping exists / hasn't loaded yet.
   */
  function resolveTaskEndpoint(challengeId) {
    if (!challengeId) return null;
    return _taskDataMap[challengeId] || null;
  }
  /* Back-compat alias — same lookup, old name. */
  const getTaskEntry = resolveTaskEndpoint;

  /** Builds the navigable URL for an endpoint. */
  function buildEndpointUrl(entry) {
    if (entry.url) return entry.url;
    return `${entry.protocol}://${entry.host}:${entry.port}`;
  }

  /**
   * Backward-compatible helper: returns the direct URL string for a
   * challenge id, or null if there's no mapping OR the mapped protocol
   * isn't web-navigable (e.g. "nc", "ssh" — those are intentionally
   * never auto-converted into a clickable URL).
   */
  function getTaskUrl(challengeId) {
    const entry = resolveTaskEndpoint(challengeId);
    return entry && HTTP_LIKE_PROTOCOLS.has(entry.protocol) ? buildEndpointUrl(entry) : null;
  }

  /* ─────────────────────────────────────────
     VIDEO COORDINATOR
  ───────────────────────────────────────── */
  const VideoCoordinator = (function () {
    const registered = new Set();
    let heroVideo = null;
    let heroAutoPaused = false;

    function pauseOthers(activeVideo) {
      registered.forEach(v => {
        if (v === activeVideo) return;
        if (!v.paused) {
          if (v === heroVideo) heroAutoPaused = true;
          v.pause();
        }
      });
    }

    function onPlay(e) {
      pauseOthers(e.target);
      if (e.target === heroVideo) heroAutoPaused = false;
    }

    function onHeroPause() {
      if (!heroAutoPaused) heroVideo._manuallyPaused = true;
    }

    function onHeroPlay() {
      heroVideo._manuallyPaused = false;
    }

    let _heroObserver = null;

    function registerVideo(video, opts) {
      if (!video || registered.has(video)) return;
      registered.add(video);
      video.addEventListener('play', onPlay);

      if (opts && opts.isHero) {
        heroVideo = video;
        video._manuallyPaused = false;
        video.addEventListener('pause', onHeroPause);
        video.addEventListener('play',  onHeroPlay);
        observeHeroVisibility(video);
      }

      video._coordinatorCleanup = () => {
        registered.delete(video);
        video.removeEventListener('play', onPlay);
        if (opts && opts.isHero) {
          video.removeEventListener('pause', onHeroPause);
          video.removeEventListener('play',  onHeroPlay);
          if (_heroObserver) _heroObserver.disconnect();
          if (heroVideo === video) heroVideo = null;
        }
      };
    }

    function unregisterVideo(video) {
      if (video && video._coordinatorCleanup) {
        video._coordinatorCleanup();
        delete video._coordinatorCleanup;
      }
    }

    function observeHeroVisibility(video) {
      const target = video.closest('#hero') || video;
      if (!('IntersectionObserver' in window)) return;

      _heroObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            if (heroAutoPaused && video._manuallyPaused !== true && video.paused) {
              const p = video.play();
              if (p) p.catch(() => {});
              heroAutoPaused = false;
            }
          } else {
            if (!video.paused) {
              heroAutoPaused = true;
              video.pause();
            }
          }
        });
      }, { threshold: 0.1 });

      _heroObserver.observe(target);
    }

    return { registerVideo, unregisterVideo, pauseOthers };
  })();

  /* ─────────────────────────────────────────
     HERO VIDEO (background loop)

     Always starts UNMUTED on every load/refresh.
     This is intentional and must stay this way:
       - No mute preference is ever read from
         localStorage/sessionStorage on init —
         `video.muted` is hardcoded to `false`
         below and nothing upstream overrides it.
       - The browser's autoplay policy is the only
         thing allowed to force a mute (handled in
         attemptPlay() below), and even then we
         keep retrying unmuted playback on the
         user's first interaction with the page,
         since most browsers permit unmuted
         autoplay once a user gesture has been
         recorded.
       - Manual mute/unmute via the button below
         is a session-only UI toggle — it changes
         `video.muted` in memory only and is never
         written to storage, so a reload always
         returns to the unmuted default regardless
         of what the user chose last session.
  ───────────────────────────────────────── */
  function initHeroVideo() {
    const hero = document.getElementById('hero');
    if (!hero) return;

    const wrap = document.createElement('div');
    wrap.id = 'hero-video-wrap';
    wrap.setAttribute('aria-hidden', 'true');

    const loader = document.createElement('div');
    loader.id = 'hero-video-loader';
    loader.innerHTML = '<div class="hero-loader-bar"></div>';

    const errMsg = document.createElement('div');
    errMsg.id = 'hero-video-error';
    errMsg.textContent = '// VIDEO FEED UNAVAILABLE';

    const video = document.createElement('video');
    video.id          = 'hero-video';
    video.src         = HERO_VIDEO_URL;
    video.autoplay    = true;
    video.loop        = true;
    /* Hardcoded default — deliberately NOT sourced from any persisted
       preference. See header comment above. */
    video.muted       = false;
    video.playsInline = true;
    video.preload     = 'auto';
    video.setAttribute('aria-hidden',         'true');
    video.setAttribute('tabindex',            '-1');
    video.setAttribute('playsinline',         '');
    video.setAttribute('webkit-playsinline',  '');

    const muteBtn = document.createElement('button');
    muteBtn.id = 'hero-mute-btn';
    muteBtn.setAttribute('aria-label',   'Mute hero video');
    muteBtn.setAttribute('aria-pressed', 'false');
    muteBtn.innerHTML = '<span class="hero-mute-icon" aria-hidden="true">🔊</span>';

    wrap.appendChild(loader);
    wrap.appendChild(errMsg);
    wrap.appendChild(video);
    hero.insertBefore(wrap, hero.firstChild);
    hero.appendChild(muteBtn);

    let userMutedManually = false;

    function syncHeroMuteBtn() {
      const muted = video.muted;
      muteBtn.setAttribute('aria-pressed', String(muted));
      muteBtn.setAttribute('aria-label',   muted ? 'Unmute hero video' : 'Mute hero video');
      muteBtn.innerHTML = muted
        ? '<span class="hero-mute-icon" aria-hidden="true">🔇</span>'
        : '<span class="hero-mute-icon" aria-hidden="true">🔊</span>';
    }

    /* If the browser blocks unmuted autoplay, retry once a user gesture
       has occurred anywhere on the page — autoplay policies in every
       major browser permit unmuted playback after that point, so this
       gets the hero video back to the unmuted default as soon as
       possible without requiring the person to find the mute button. */
    function retryUnmutedAfterGesture() {
      const tryUnmute = () => {
        if (userMutedManually || !video.muted) return cleanup();
        video.muted = false;
        const p = video.play();
        if (p) p.catch(() => { video.muted = true; });
        syncHeroMuteBtn();
        cleanup();
      };
      function cleanup() {
        document.removeEventListener('click',    tryUnmute, true);
        document.removeEventListener('keydown',  tryUnmute, true);
        document.removeEventListener('touchstart', tryUnmute, true);
      }
      document.addEventListener('click',      tryUnmute, true);
      document.addEventListener('keydown',    tryUnmute, true);
      document.addEventListener('touchstart', tryUnmute, true);
    }

    function attemptPlay() {
      const p = video.play();
      if (p) p.catch(() => {
        /* Autoplay-with-sound was blocked — fall back to muted autoplay
           (the only way to guarantee playback starts at all), then try
           to recover unmuted playback after the next user gesture. */
        video.muted = true;
        syncHeroMuteBtn();
        video.play().catch(() => {});
        retryUnmutedAfterGesture();
      });
    }

    video.addEventListener('canplay', () => {
      video.classList.add('is-ready');
      loader.classList.add('is-hidden');
      attemptPlay();
    });

    video.addEventListener('error', () => {
      loader.classList.add('is-hidden');
      errMsg.classList.add('is-visible');
    });

    muteBtn.addEventListener('click', () => {
      if (video.paused) {
        video.muted = true;
        video.play().catch(() => {});
      }
      video.muted = !video.muted;
      userMutedManually = video.muted;
      syncHeroMuteBtn();
    });

    video.addEventListener('click', () => {
      if (video.paused) video.play().catch(() => {});
      else video.pause();
    });

    muteBtn.addEventListener('mouseenter', () => document.body.classList.add('cursor-hover'));
    muteBtn.addEventListener('mouseleave', () => document.body.classList.remove('cursor-hover'));
    muteBtn.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); muteBtn.click(); }
    });

    video.load();
    VideoCoordinator.registerVideo(video, { isHero: true });
  }

  /* ─────────────────────────────────────────
     DYNAMIC PLAYER SIZING
  ───────────────────────────────────────── */
  const PLAYER_MAX_WIDTH  = 1414;
  const PLAYER_MAX_HEIGHT = 712;

  function sizePlayerToVideo(overlay, video) {
    const wrap = overlay && overlay.querySelector('#intro-video-wrap');
    if (!wrap) return;

    const vw = video.videoWidth;
    const vh = video.videoHeight;
    if (!vw || !vh) return;

    const ratio = vw / vh;

    const overlayStyle = window.getComputedStyle(overlay);
    const padX = (parseFloat(overlayStyle.paddingLeft) || 0) + (parseFloat(overlayStyle.paddingRight) || 0);
    const padY = (parseFloat(overlayStyle.paddingTop)  || 0) + (parseFloat(overlayStyle.paddingBottom) || 0);

    const availW = Math.min(PLAYER_MAX_WIDTH,  window.innerWidth  - padX, window.innerWidth  * 0.90);
    const availH = Math.min(PLAYER_MAX_HEIGHT, window.innerHeight - padY, window.innerHeight * 0.85);

    let width  = availW;
    let height = width / ratio;

    if (height > availH) {
      height = availH;
      width  = height * ratio;
    }

    wrap.style.width  = `${Math.round(width)}px`;
    wrap.style.height = `${Math.round(height)}px`;
  }

  /* ─────────────────────────────────────────
     TIME FORMATTER
  ───────────────────────────────────────── */
  function fmtTime(sec) {
    if (!isFinite(sec) || isNaN(sec)) return '0:00';
    const s = Math.floor(sec);
    const m = Math.floor(s / 60);
    return `${m}:${String(s % 60).padStart(2, '0')}`;
  }

  /* ─────────────────────────────────────────
     REUSABLE CINEMATIC VIDEO PLAYER
     Used for both intro and outro videos.
     Controls: play/pause, seek, time display,
     mute/unmute, skip.
     Auto-hides controls after 1 s of inactivity;
     stays visible while paused or seeking.
  ───────────────────────────────────────── */
  let _introOverlay = null;

  function showIntroVideo(videoUrl, onContinue) {
    if (_introOverlay) teardownIntro();

    const ov = document.createElement('div');
    ov.id = 'intro-video-overlay';
    ov.setAttribute('role', 'dialog');
    ov.setAttribute('aria-modal', 'true');
    ov.setAttribute('aria-label', 'Challenge introduction video');

    ov.innerHTML = `
      <div id="intro-video-wrap">
        <video
          id="intro-video"
          playsinline
          webkit-playsinline
          preload="auto"
          tabindex="-1"
          aria-hidden="true"
        ></video>

        <!-- Loading ring -->
        <div id="intro-video-loader" role="status">
          <div class="task-loader-ring"></div>
        </div>

        <!-- Error state -->
        <div id="intro-video-error" aria-live="polite">
          <span>⚠</span>
          <span>VIDEO UNAVAILABLE</span>
        </div>

        <!-- Controls bar (bottom) -->
        <div id="intro-video-controls">
          <!-- Seek row -->
          <div class="intro-seek-row">
            <div class="intro-seek-wrap" id="intro-seek-wrap">
              <div class="intro-seek-track">
                <div class="intro-seek-fill" id="intro-seek-fill"></div>
              </div>
              <input
                class="intro-seek-input"
                id="intro-seek-input"
                type="range"
                min="0" max="100" step="0.01" value="0"
                aria-label="Seek"
              />
            </div>
            <div class="intro-time-display" id="intro-time-display">0:00 / 0:00</div>
          </div>

          <!-- Buttons row -->
          <div class="intro-btn-row">
            <button class="intro-ctrl-btn" id="intro-play-btn" type="button" aria-label="Play / Pause">⏸</button>
            <button class="intro-ctrl-btn" id="intro-mute-btn" type="button" aria-label="Mute" aria-pressed="false">🔊</button>
            <button id="intro-skip-btn" type="button" aria-label="Skip intro">⏭ SKIP</button>
          </div>
        </div>

        <!-- End-of-video panel -->
        <div id="intro-complete-overlay" aria-hidden="true">
          <div id="intro-complete-panel">
            <button class="task-video-action-btn" id="intro-replay-btn" type="button">↺ REPLAY</button>
            <button class="task-video-action-btn" id="intro-continue-btn" type="button">CONTINUE →</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(ov);
    _introOverlay = ov;

    const video       = ov.querySelector('#intro-video');
    const loader      = ov.querySelector('#intro-video-loader');
    const errEl       = ov.querySelector('#intro-video-error');
    const controls    = ov.querySelector('#intro-video-controls');
    const playBtn     = ov.querySelector('#intro-play-btn');
    const muteBtn     = ov.querySelector('#intro-mute-btn');
    const skipBtn     = ov.querySelector('#intro-skip-btn');
    const seekInput   = ov.querySelector('#intro-seek-input');
    const seekFill    = ov.querySelector('#intro-seek-fill');
    const timeDisplay = ov.querySelector('#intro-time-display');
    const completeOv  = ov.querySelector('#intro-complete-overlay');
    const replayBtn   = ov.querySelector('#intro-replay-btn');
    const continueBtn = ov.querySelector('#intro-continue-btn');

    let completed  = false;
    let started    = false;
    let isSeeking  = false;  /* true while user drags seek bar */

    /* ── Auto-hide controls logic ── */
    let _hideTimer = null;

    function showControls() {
      controls.classList.remove('ctrl-hidden');
    }

    function scheduleHide() {
      clearTimeout(_hideTimer);
      /* Don't hide while paused, seeking, or completed */
      if (video.paused || isSeeking || completed) return;
      _hideTimer = setTimeout(() => {
        if (!video.paused && !isSeeking && !completed) {
          controls.classList.add('ctrl-hidden');
        }
      }, 1000);
    }

    function onActivity() {
      showControls();
      scheduleHide();
    }

    /* Mouse interactions on the wrap */
    const wrap = ov.querySelector('#intro-video-wrap');
    wrap.addEventListener('mousemove',  onActivity, { passive: true });
    wrap.addEventListener('mouseenter', onActivity, { passive: true });
    wrap.addEventListener('mouseleave', () => {
      /* Fade controls when mouse leaves — unless paused / seeking */
      clearTimeout(_hideTimer);
      if (!video.paused && !isSeeking && !completed) {
        controls.classList.add('ctrl-hidden');
      }
    });

    /* Click on video toggles play/pause and shows controls */
    video.addEventListener('click', () => {
      togglePlayPause();
      onActivity();
    });

    /* Any interaction on the controls keeps them visible */
    controls.addEventListener('mouseenter', () => {
      clearTimeout(_hideTimer);
      showControls();
    });
    controls.addEventListener('mouseleave', scheduleHide);

    /* ── Helpers ── */
    function syncPlayBtn() {
      playBtn.textContent  = video.paused ? '▶' : '⏸';
      playBtn.setAttribute('aria-label', video.paused ? 'Play' : 'Pause');
    }

    function syncMuteBtn() {
      muteBtn.textContent = video.muted ? '🔇' : '🔊';
      muteBtn.setAttribute('aria-pressed', String(video.muted));
      muteBtn.setAttribute('aria-label',   video.muted ? 'Unmute' : 'Mute');
    }

    function updateSeek() {
      if (!isSeeking && video.duration) {
        const pct = (video.currentTime / video.duration) * 100;
        seekInput.value      = pct;
        seekFill.style.width = pct + '%';
      }
      const cur = fmtTime(video.currentTime);
      const dur = fmtTime(video.duration);
      timeDisplay.textContent = `${cur} / ${dur}`;
    }

    function togglePlayPause() {
      if (video.paused) {
        video.play().catch(() => {});
      } else {
        video.pause();
      }
    }

    function showComplete() {
      if (completed) return;
      completed = true;
      video.pause();
      clearTimeout(_hideTimer);
      showControls(); /* keep controls visible at end */
      completeOv.classList.add('is-visible');
      completeOv.setAttribute('aria-hidden', 'false');
    }

    function doSkip() {
      teardownIntro();
      onContinue();
    }

    /* ── Video lifecycle ── */
    video.addEventListener('loadedmetadata', () => {
      sizePlayerToVideo(ov, video);
      seekInput.max = '100';
      updateSeek();
    });

    video.addEventListener('canplay', () => {
      loader.classList.add('is-hidden');
      video.classList.add('is-ready');
    });

    video.addEventListener('playing', () => {
      started = true;
      loader.classList.add('is-hidden');
      video.classList.add('is-ready');
      syncMuteBtn();
      syncPlayBtn();
      scheduleHide();
    });

    video.addEventListener('pause', () => {
      syncPlayBtn();
      clearTimeout(_hideTimer);
      showControls(); /* always show while paused */
    });

    video.addEventListener('waiting', () => {
      if (!started) loader.classList.remove('is-hidden');
    });

    video.addEventListener('timeupdate', updateSeek);

    video.addEventListener('ended', showComplete);

    video.addEventListener('error', () => {
      loader.classList.add('is-hidden');
      errEl.classList.add('is-visible');
      setTimeout(doSkip, 1800);
    });

    /* ── Seek bar ── */
    seekInput.addEventListener('mousedown', () => {
      isSeeking = true;
      clearTimeout(_hideTimer);
      showControls();
    });

    seekInput.addEventListener('touchstart', () => {
      isSeeking = true;
      clearTimeout(_hideTimer);
      showControls();
    }, { passive: true });

    seekInput.addEventListener('input', () => {
      const pct = parseFloat(seekInput.value);
      seekFill.style.width = pct + '%';
      if (video.duration) {
        video.currentTime = (pct / 100) * video.duration;
      }
      timeDisplay.textContent = `${fmtTime(video.currentTime)} / ${fmtTime(video.duration)}`;
    });

    function endSeek() {
      isSeeking = false;
      scheduleHide();
    }

    seekInput.addEventListener('mouseup',   endSeek);
    seekInput.addEventListener('touchend',  endSeek, { passive: true });
    seekInput.addEventListener('change',    endSeek);

    /* ── Button controls ── */
    playBtn.addEventListener('click', () => {
      togglePlayPause();
      onActivity();
    });

    muteBtn.addEventListener('click', () => {
      video.muted = !video.muted;
      syncMuteBtn();
      onActivity();
    });

    skipBtn.addEventListener('click', doSkip);

    replayBtn.addEventListener('click', () => {
      completed = false;
      completeOv.classList.remove('is-visible');
      completeOv.setAttribute('aria-hidden', 'true');
      video.currentTime = 0;
      video.play().catch(() => {});
      scheduleHide();
    });

    continueBtn.addEventListener('click', () => {
      teardownIntro();
      onContinue();
    });

    /* Keyboard: Space = play/pause, Escape = skip, M = mute, Arrow keys = seek */
    function handleKey(e) {
      if (e.key === 'Escape') { doSkip(); return; }
      if (e.target === seekInput) return; /* let range handle arrows natively */
      if (e.key === ' ' || e.key === 'k') {
        e.preventDefault();
        togglePlayPause();
        onActivity();
      } else if (e.key === 'm' || e.key === 'M') {
        video.muted = !video.muted;
        syncMuteBtn();
        onActivity();
      } else if (e.key === 'ArrowRight') {
        video.currentTime = Math.min(video.duration || 0, video.currentTime + 5);
        updateSeek(); onActivity();
      } else if (e.key === 'ArrowLeft') {
        video.currentTime = Math.max(0, video.currentTime - 5);
        updateSeek(); onActivity();
      }
    }
    document.addEventListener('keydown', handleKey);
    ov._removeKey = () => document.removeEventListener('keydown', handleKey);

    function handleResize() {
      if (video.videoWidth && video.videoHeight) {
        sizePlayerToVideo(ov, video);
      }
    }
    window.addEventListener('resize', handleResize);
    ov._removeResize = () => window.removeEventListener('resize', handleResize);

    /* Cursor events */
    [playBtn, muteBtn, skipBtn, replayBtn, continueBtn].forEach(btn => {
      btn.addEventListener('mouseenter', () => document.body.classList.add('cursor-hover'));
      btn.addEventListener('mouseleave', () => document.body.classList.remove('cursor-hover'));
    });

    /* ── Load & play ── */
    video.muted = false;
    syncMuteBtn();
    syncPlayBtn();

    video.src = videoUrl;
    video.load();

    VideoCoordinator.registerVideo(video, { isHero: false });

    const playPromise = video.play();
    if (playPromise) {
      playPromise.catch(err => {
        if (err.name === 'NotAllowedError') {
          video.muted = true;
          syncMuteBtn();
          video.play().catch(() => {});
        }
      });
    }

    /* Show controls initially; they'll auto-hide once playing */
    showControls();

    requestAnimationFrame(() => {
      ov.classList.add('is-active');
    });
  }

  /* ─────────────────────────────────────────
     TEARDOWN
  ───────────────────────────────────────── */
  function teardownIntro() {
    if (!_introOverlay) return;

    const ov    = _introOverlay;
    const video = ov.querySelector('video');

    if (video) {
      video.pause();
      VideoCoordinator.unregisterVideo(video);
      video.removeAttribute('src');
      video.load();
    }

    if (ov._removeKey)    ov._removeKey();
    if (ov._removeResize) ov._removeResize();

    ov.classList.remove('is-active');
    setTimeout(() => { if (ov.parentNode) ov.remove(); }, 350);

    _introOverlay = null;
  }

  /* ─────────────────────────────────────────
     OUTRO / COMPLETION VIDEO
     Reuses the same showIntroVideo player.
  ───────────────────────────────────────── */
  function showOutroVideo(videoUrl, onContinue) {
    const modalBody = document.getElementById('modal-body');
    if (modalBody) modalBody.classList.add('video-intro-active');

    showIntroVideo(videoUrl, () => {
      if (modalBody) modalBody.classList.remove('video-intro-active');
      if (typeof onContinue === 'function') onContinue();
    });
  }

  function handleChallengeSolved(e) {
    const ch = e && e.detail && e.detail.challenge;
    const videoUrl = ch && ch.outroVideo;
    if (!videoUrl) return;

    showOutroVideo(videoUrl, () => {});
  }

  /* ─────────────────────────────────────────
     TASK CONNECTION INFO — inline in the lore box

     Renders the resolved remote task endpoint (read
     from the already-cached _taskDataMap via
     resolveTaskEndpoint() — no new network request
     is made here) directly inside #modal-lore, right
     after the lore text. Renders nothing if no
     mapping exists for this challenge: no
     placeholder, no "N/A", no empty container.

     Rendering is dispatched by protocol — see
     protocolRenderer() / PROTOCOL_RENDERERS below.
     This is the one place that needs touching to add
     UI for a new protocol; everything upstream
     (fetch → parse → cache → lookup) already treats
     `entry.protocol` as an opaque string.

     Called each time a challenge modal opens —
     openChallenge() (script.js) resets
     #modal-lore's textContent on every open,
     so this always runs after that and appends
     fresh, rather than leaving stale nodes.
  ───────────────────────────────────────── */

  /** Wires a copy-to-clipboard button against a fixed value, with a
   *  Clipboard-API-unavailable fallback. Shared by every field builder
   *  below so the copy/feedback behavior stays identical everywhere. */
  function wireCopyButton(copyBtn, value, labelText) {
    copyBtn.setAttribute('aria-label', `Copy ${labelText}`);
    copyBtn.innerHTML = '<span aria-hidden="true">⧉</span>';

    copyBtn.addEventListener('click', () => {
      const restoreLabel = () => {
        copyBtn.innerHTML = '<span aria-hidden="true">⧉</span>';
        copyBtn.classList.remove('is-copied');
      };

      const onCopied = () => {
        copyBtn.innerHTML = '<span aria-hidden="true">✓</span>';
        copyBtn.classList.add('is-copied');
        setTimeout(restoreLabel, 1200);
      };

      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(value).then(onCopied).catch(() => {});
      } else {
        /* Fallback for environments without Clipboard API access */
        const ta = document.createElement('textarea');
        ta.value = value;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand('copy'); onCopied(); } catch (e) { /* no-op */ }
        document.body.removeChild(ta);
      }
    });
  }

  /* ══════════════════════════════════════════
     INLINE CONNECTION STRIP
     A two-row, wrap-friendly card — shared by SSH, NETCAT, and HTTP.
     Row 1 is connection metadata (protocol/machine/port); row 2 is
     authentication (username/password) and only exists when the entry
     actually has credentials. Architecture:
       renderInlineConnectionCard(entry)
         ├── buildMetaFields(entry)   → ordered [{type, srLabel, value, copyValue?}]
         ├── buildAuthFields(entry)   → same shape, empty array if no creds
         └── buildSegment(field)      → [icon] value [copy], per field
             └── buildFieldIcon(type) → inline monochrome SVG for the field
     Nothing protocol-specific happens at the DOM-building layer —
     a protocol just contributes which fields exist on its entry;
     absent fields (no port, no credentials) are simply left out of
     the arrays, so each row reflows with no gaps or placeholders, and
     the auth row is omitted entirely when both fields are absent.
  ══════════════════════════════════════════ */

  const PROTOCOL_DISPLAY_LABELS = {
    ssh:    'SSH',
    nc:     'NETCAT',
    netcat: 'NETCAT',
    telnet: 'TELNET',
    http:   'HTTP',
    https:  'HTTPS',
  };

  function protocolDisplayLabel(protocol) {
    return PROTOCOL_DISPLAY_LABELS[protocol] || protocol.toUpperCase();
  }

  /* ── Field icons ──
     Monochrome, single-color inline SVGs (stroke="currentColor") so they
     inherit whatever text color is applied to their wrapping .tc-seg-icon
     span — no raster assets, no emoji, no per-icon color to keep in sync
     with the theme. Each is a 24x24 viewBox stroke icon (~0.4kb each),
     scaled to 1em via CSS so it tracks font-size automatically and stays
     crisp at any DPI since it's vector, not raster. */
  const FIELD_ICONS = {
    /* Protocol → terminal glyph */
    protocol:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
      'stroke-linecap="round" stroke-linejoin="round">' +
      '<polyline points="4 17 10 11 4 5"></polyline>' +
      '<line x1="12" y1="19" x2="20" y2="19"></line>' +
      '</svg>',
    /* Machine → server rack */
    machine:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
      'stroke-linecap="round" stroke-linejoin="round">' +
      '<rect x="2" y="2" width="20" height="8" rx="2" ry="2"></rect>' +
      '<rect x="2" y="14" width="20" height="8" rx="2" ry="2"></rect>' +
      '<line x1="6" y1="6" x2="6.01" y2="6"></line>' +
      '<line x1="6" y1="18" x2="6.01" y2="18"></line>' +
      '</svg>',
    /* Port → plug */
    port:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
      'stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M12 22v-5"></path>' +
      '<path d="M9 8V2"></path>' +
      '<path d="M15 8V2"></path>' +
      '<path d="M18 8v5a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4V8Z"></path>' +
      '</svg>',
    /* Username → person */
    username:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
      'stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>' +
      '<circle cx="12" cy="7" r="4"></circle>' +
      '</svg>',
    /* Password → key */
    password:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
      'stroke-linecap="round" stroke-linejoin="round">' +
      '<circle cx="7.5" cy="15.5" r="5.5"></circle>' +
      '<path d="m21 2-9.6 9.6"></path>' +
      '<path d="m15.5 7.5 3 3L22 7l-3-3"></path>' +
      '</svg>',
  };

  /** Builds the icon element for a field type. aria-hidden because the
   *  field's meaning is still conveyed to assistive tech via the
   *  sr-only label built alongside it in buildSegment(). */
  function buildFieldIcon(type) {
    const icon = document.createElement('span');
    icon.className = 'tc-seg-icon';
    icon.setAttribute('aria-hidden', 'true');
    icon.innerHTML = FIELD_ICONS[type] || '';
    return icon;
  }

  /** First-row (connection metadata) fields — always protocol + machine;
   *  port only when the entry actually has one, so an entry without a
   *  port simply omits that segment and the row reflows with no gap. */
  function buildMetaFields(entry) {
    const fields = [
      { type: 'protocol', srLabel: 'Protocol', value: protocolDisplayLabel(entry.protocol) },
      { type: 'machine',  srLabel: 'Machine',  value: entry.host, copyValue: entry.host },
    ];
    if (entry.port) fields.push({ type: 'port', srLabel: 'Port', value: entry.port, copyValue: entry.port });
    return fields;
  }

  /** Second-row (authentication) fields — only username/password, and
   *  only the ones actually present. Returns an empty array when there's
   *  no auth info at all, which callers use to skip rendering row two
   *  entirely (no empty row, no placeholders). */
  function buildAuthFields(entry) {
    const fields = [];
    if (entry.username) fields.push({ type: 'username', srLabel: 'Username', value: entry.username, copyValue: entry.username });
    if (entry.password) fields.push({ type: 'password', srLabel: 'Password', value: entry.password, copyValue: entry.password });
    return fields;
  }

  /** One "[icon] value [copy]" segment — the atomic unit of the strip.
   *  Labels are icon-only visually; a visually-hidden span preserves the
   *  label text for screen readers without reintroducing on-screen text
   *  prefixes. Vertically centered, sized to sit inline with neighbors. */
  function buildSegment(field) {
    const seg = document.createElement('div');
    seg.className = 'tc-seg';

    seg.appendChild(buildFieldIcon(field.type));

    const srLbl = document.createElement('span');
    srLbl.className = 'tc-sr-only';
    srLbl.textContent = field.srLabel + ': ';
    seg.appendChild(srLbl);

    const val = document.createElement('span');
    val.className = 'tc-seg-val';
    val.textContent = field.value;
    seg.appendChild(val);

    if (field.copyValue != null) {
      const copyBtn = document.createElement('button');
      copyBtn.type = 'button';
      copyBtn.className = 'tc-copy tc-seg-copy';
      wireCopyButton(copyBtn, field.copyValue, field.srLabel);
      seg.appendChild(copyBtn);
    }

    return seg;
  }

  /** Shared renderer for SSH, NETCAT, and HTTP — a two-row card:
   *  row one is connection metadata (protocol/machine/port), row two is
   *  authentication (username/password) and is only appended when at
   *  least one credential field exists on the entry. This is the only
   *  place that builds a <div class="tc-hcard">; every protocol just
   *  supplies field lists via buildMetaFields()/buildAuthFields() —
   *  no markup is duplicated between protocols. */
  function renderInlineConnectionCard(entry) {
    const frag = document.createDocumentFragment();
    const card = document.createElement('div');
    card.className = 'tc-hcard';

    const metaRow = document.createElement('div');
    metaRow.className = 'tc-hrow tc-row-meta';
    buildMetaFields(entry).forEach(field => metaRow.appendChild(buildSegment(field)));
    card.appendChild(metaRow);

    const authFields = buildAuthFields(entry);
    if (authFields.length) {
      const authRow = document.createElement('div');
      authRow.className = 'tc-hrow tc-row-auth';
      authFields.forEach(field => authRow.appendChild(buildSegment(field)));
      card.appendChild(authRow);
    }

    frag.appendChild(card);
    return frag;
  }

  /** Primary-action link styled like the app's "Start/Access Machine"
   *  button. Only ever attached to web-navigable (https) endpoints. */
  function buildAccessMachineButton(url) {
    const btn = document.createElement('a');
    btn.className = 'tc-access-btn';
    btn.href = url;
    btn.target = '_blank';
    btn.rel = 'noopener noreferrer';
    btn.textContent = 'ACCESS MACHINE';
    return btn;
  }

  /* ── Per-protocol renderers ─────────────────────────────────────
     SSH, NC, and HTTP all delegate to the one shared strip renderer.
     HTTPS is the sole exception, kept as a standalone button with no
     card wrapper at all — unchanged from before. */

  function httpRenderer(entry, ch) {
    /* HTTPS: no card, no field strip — just the standalone Access
       Machine button, sitting directly in the challenge info section.
       (Legacy single-element direct-URL entries also land here only
       when they resolve to protocol "https" — an "http://" legacy
       link falls through to the shared inline strip below instead.) */
    if (entry.protocol === 'https') {
      const frag = document.createDocumentFragment();
      const btn = buildAccessMachineButton(buildEndpointUrl(entry));
      frag.appendChild(btn);
      return frag;
    }

    return renderInlineConnectionCard(entry);
  }

  function ncRenderer(entry, ch) {
    return renderInlineConnectionCard(entry);
  }

  function sshRenderer(entry, ch) {
    return renderInlineConnectionCard(entry);
  }

  /** Fallback for future/unknown protocols — same shared strip. */
  function genericRenderer(entry, ch) {
    console.info(`[KimetsuVideo] No dedicated renderer for protocol "${entry.protocol}" — using generic.`);
    return renderInlineConnectionCard(entry);
  }

  /** Protocol → renderer registry. Add a new protocol's UI here only. */
  const PROTOCOL_RENDERERS = {
    http:   httpRenderer,
    https:  httpRenderer,
    nc:     ncRenderer,
    netcat: ncRenderer,
    ssh:    sshRenderer,
    telnet: ncRenderer,   /* telnet uses the same nc-style display */
  };

  function protocolRenderer(entry, ch) {
    const renderer = PROTOCOL_RENDERERS[entry.protocol] || genericRenderer;
    return renderer(entry, ch);
  }

  function injectTaskUrlPanel(ch) {
    const loreBox = document.getElementById('modal-lore');
    if (!loreBox) return;

    /* Defensive: drop any previously appended block before re-adding */
    const prev = document.getElementById('task-url-inline');
    if (prev) prev.remove();

    const entry = resolveTaskEndpoint(ch.id);
    if (!entry) return; /* no remote task data mapped for this challenge — render nothing */

    const wrap = document.createElement('div');
    wrap.id = 'task-url-inline';
    wrap.className = 'task-url-inline';

    try {
      wrap.appendChild(protocolRenderer(entry, ch));
    } catch (err) {
      /* Fail gracefully — a rendering bug for one challenge's endpoint
         must never take down the rest of the modal. */
      console.warn(`[KimetsuVideo] Failed to render task endpoint for "${ch.id}":`, err);
      return;
    }

    /* Append after the lore text node, inside the same box */
    loreBox.appendChild(wrap);
  }

  /* ─────────────────────────────────────────
     HOOK INTO MODAL — intercept openChallenge
  ───────────────────────────────────────── */
  function patchModalHooks() {
    const originalOpen  = window._kimetsuOpenChallenge;
    const originalClose = window._kimetsuCloseModal;

    window._kimetsuOpenChallenge = function (rank, ch) {
      const videoUrl = ch.introVideo || null;

      if (!videoUrl) {
        /* No intro video — open modal directly, then render the task URL panel */
        if (typeof originalOpen === 'function') originalOpen(rank, ch);
        /* originalOpen populates modal DOM synchronously; inject immediately after */
        injectTaskUrlPanel(ch);
        return;
      }

      /* Has intro video — play it first, open modal content after */
      const modalBody = document.getElementById('modal-body');
      if (modalBody) modalBody.classList.add('video-intro-active');

      showIntroVideo(videoUrl, () => {
        if (modalBody) modalBody.classList.remove('video-intro-active');
        /* originalOpen populates modal DOM, then we render the task URL panel */
        if (typeof originalOpen === 'function') originalOpen(rank, ch);
        injectTaskUrlPanel(ch);
      });
    };

    window._kimetsuCloseModal = function () {
      teardownIntro();
      const modalBody = document.getElementById('modal-body');
      if (modalBody) modalBody.classList.remove('video-intro-active');
      const urlInline = document.getElementById('task-url-inline');
      if (urlInline) urlInline.remove();
      if (typeof originalClose === 'function') originalClose();
    };
  }

  /* ─────────────────────────────────────────
     BOOT
  ───────────────────────────────────────── */
  function init() {
    initHeroVideo();
    patchModalHooks();
    document.addEventListener('kimetsu:challengeSolved', handleChallengeSolved);

    /* Fetch task URL map in background — non-blocking.
       On success, forward the tracker URL (may be null) to KimetsuTracker. */
    fetchTaskUrls()
      .then(trackerUrl => {
        if (window.KimetsuTracker && typeof window.KimetsuTracker.initialize === 'function') {
          window.KimetsuTracker.initialize(trackerUrl);
        }
      })
      .catch(() => {
        /* fetchTaskUrls already handles its own errors; nothing to do here */
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  /* Public API */
  window.KimetsuVideo = {
    teardownIntro,
    showOutroVideo,
    VideoCoordinator,
    getTaskUrl,
    resolveTaskEndpoint,
    getTaskEntry, /* back-compat alias for resolveTaskEndpoint */
    parseEndpoint,
  };
})();