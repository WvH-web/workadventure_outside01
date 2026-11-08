'use strict';

(() => {
  const byId = id => document.getElementById(id);
  const ui = Object.fromEntries(['panel', 'status', 'claim', 'code', 'start', 'stop', 'mute', 'unlock', 'error', 'audio'].map(id => [id, byId(id)]));
  const LK = window.LivekitClient;
  const base = '/castle-audio/';
  const retiredGateways = new Set();
  let config, sessionId, state, widget, position, positionAt = 0, onPodium = false;
  let listener, listenerEpoch, listenerPending = false, listenGeneration = 0;
  let speakerRoom, micTrack, ownLease, published = false, claiming = false, speakerGeneration = 0;
  let claimCancelled = false;
  let validUntil = 0, closed = false, fatal = false, statePending = false, heartbeatPending = false;
  let positionPending = false, resizing = false, lastHeight = 0, failure = '';
  const now = () => performance.now();
  const messages = {
    unauthorized: 'Bitte erneut anmelden.', session_expired: 'Die Verbindung ist abgelaufen. Karte erneut betreten.',
    wrong_code: 'Der Pultcode stimmt nicht.', rate_limited: 'Zu viele Versuche. Bitte kurz warten.',
    occupied: 'Das Pult ist bereits belegt.', wrong_map: 'Diese Hallenverbindung passt nicht zur Karte.',
    off_podium: 'Das Pult wurde verlassen.', role_required: 'F\u00fcr diese Ansage fehlt die Berechtigung.',
    unavailable: 'Hallenansagen sind gerade nicht erreichbar.', lease_expired: 'Die Ansage wurde beendet.',
    epoch_changed: 'Die Hallenverbindung wird erneuert.', cancelled: 'Ansage abgebrochen.',
    wrong_origin: 'Die Hallenverbindung wurde nicht freigegeben.',
  };

  function showError(message) { failure = message || ''; render(); }
  function fresh() { return state && now() < validUntil && !fatal && !closed; }
  function positionFresh() { return position && now() - positionAt <= 1000; }
  function wantsMicrophone() { return ownLease || (claiming && !claimCancelled); }
  function inside(p, r) { return p && p.x >= r.x && p.y >= r.y && p.x < r.x + r.width && p.y < r.y + r.height; }

  async function api(route, body, { keepalive = false, timeout = 3500 } = {}) {
    const token = localStorage.getItem('authToken');
    if (!token) { const error = new Error('unauthorized'); error.code = 'unauthorized'; throw error; }
    const abort = new AbortController();
    const timer = setTimeout(() => abort.abort(), timeout);
    try {
      const response = await fetch(base + route, {
        method: body === undefined ? 'GET' : 'POST', credentials: 'same-origin', cache: 'no-store',
        headers: { Authorization: 'Bearer ' + token, ...(sessionId ? { 'X-Hall-Session': sessionId } : {}),
          ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }), keepalive, signal: abort.signal,
      });
      const data = await response.json();
      if (!response.ok) { const error = new Error('request'); error.code = data.error || 'unavailable'; throw error; }
      return data;
    } finally { clearTimeout(timer); }
  }

  function detachAudio() {
    for (const element of ui.audio.querySelectorAll('audio')) {
      element.pause(); element.srcObject = null; element.remove();
    }
    ui.unlock.hidden = true;
  }

  function disconnectListener() {
    listenGeneration++;
    const old = listener; listener = null; listenerEpoch = null;
    detachAudio();
    if (old) void old.disconnect().catch(() => {});
  }

  function stopTrack(track) {
    if (!track) return;
    try { track.mediaStreamTrack.stop(); } catch {}
    try { track.stop(); } catch {}
  }

  function release(leaseId, keepalive = false) {
    if (!sessionId) return;
    void api('release', leaseId ? { leaseId } : {}, { keepalive }).catch(() => {});
  }

  function stopPublishing(reason, { notify = true, keepalive = false } = {}) {
    const pendingClaim = claiming && !claimCancelled;
    claimCancelled = true;
    speakerGeneration++;
    const lease = ownLease; ownLease = null; published = false;
    stopTrack(micTrack); micTrack = null;
    const old = speakerRoom; speakerRoom = null;
    if (old) void old.disconnect().catch(() => {});
    ui.code.value = '';
    if (notify && (lease || pendingClaim)) release(lease?.leaseId, keepalive);
    if (reason) failure = reason;
    render();
  }

  function applyState(next, startedAt) {
    if (!next || typeof next.epoch !== 'string' || typeof next.gatewayId !== 'string') return false;
    if (retiredGateways.has(next.gatewayId)) return false;
    if (state?.gatewayId === next.gatewayId && (next.revision < state.revision ||
        (next.revision === state.revision && next.serverTime < state.serverTime))) return false;
    if (state && state.gatewayId !== next.gatewayId) retiredGateways.add(state.gatewayId);
    if (state && (state.epoch !== next.epoch || state.gatewayId !== next.gatewayId)) {
      disconnectListener();
      if (ownLease && ownLease.epoch !== next.epoch) stopPublishing('', { notify: false });
    }
    state = next;
    validUntil = startedAt + Math.min(config.freshnessMs, 4500);
    if (!next.available || !fresh() || !next.speaker || next.speaker.sameAccount) disconnectListener();
    if (ownLease && (!next.speaker?.owned || ownLease.epoch !== next.epoch || !next.available)) {
      stopPublishing('Die Ansage wurde beendet.', { notify: false });
    }
    render();
    return true;
  }

  function makeRoom() {
    return new LK.Room({ adaptiveStream: false, dynacast: false,
      reconnectPolicy: { nextRetryDelayInMs: () => null } });
  }

  async function ensureListener() {
    if (!fresh() || !state.available || !state.speaker || state.speaker.sameAccount || claiming || ownLease || listenerPending ||
        (listener && listenerEpoch === state.epoch)) return;
    disconnectListener();
    const generation = listenGeneration;
    listenerPending = true;
    let room;
    try {
      const started = now();
      const grant = await api('listen', {});
      if (generation !== listenGeneration || !applyState(grant, started) || grant.suppressed || !grant.speaker || !fresh() ||
          grant.epoch !== state.epoch || !grant.available || state.speaker?.sameAccount || ownLease || claiming) return;
      room = makeRoom(); listener = room; listenerEpoch = grant.epoch;
      room.on(LK.RoomEvent.TrackSubscribed, (track, publication, participant) => {
        if (room !== listener || !fresh() || grant.epoch !== state.epoch || state.speaker?.sameAccount ||
            track.kind !== LK.Track.Kind.Audio || participant.identity === ownLease?.identity) return;
        const element = track.attach();
        element.autoplay = true; ui.audio.append(element);
        void element.play().catch(() => { if (room === listener) ui.unlock.hidden = false; });
      });
      room.on(LK.RoomEvent.TrackUnsubscribed, track => {
        for (const element of track.detach()) { element.srcObject = null; element.remove(); }
      });
      room.on(LK.RoomEvent.AudioPlaybackStatusChanged, () => {
        if (room === listener) ui.unlock.hidden = room.canPlaybackAudio;
      });
      room.on(LK.RoomEvent.Reconnecting, () => { if (room === listener) disconnectListener(); });
      room.on(LK.RoomEvent.Disconnected, () => { if (room === listener) disconnectListener(); });
      await room.connect(grant.url, grant.token);
      if (generation !== listenGeneration || room !== listener || !fresh() || grant.epoch !== state.epoch) {
        await room.disconnect();
      }
    } catch {
      if (room === listener || !room) disconnectListener();
      else void room.disconnect().catch(() => {});
    } finally { listenerPending = false; }
  }

  async function pollState() {
    if (closed || fatal || !sessionId || statePending) return;
    statePending = true;
    const started = now();
    try {
      const next = await api('state', undefined);
      if (closed) return;
      if (applyState(next, started)) {
        if (!ownLease && !claiming && failure === messages.unavailable) failure = '';
        await ensureListener();
      }
    } catch (error) {
      validUntil = 0; disconnectListener();
      stopPublishing(messages[error.code] || messages.unavailable);
      if (['unauthorized', 'session_expired'].includes(error.code)) fatal = true;
    } finally { statePending = false; render(); }
  }

  async function pollPosition() {
    if (closed || fatal || positionPending || !config) return;
    positionPending = true;
    try {
      const p = await Promise.race([WA.player.getPosition(), new Promise((_, reject) => setTimeout(() => reject(new Error('position')), 900))]);
      if (closed) return;
      position = p; positionAt = now();
      const previous = onPodium;
      onPodium = inside(position, config.podium);
      if (!onPodium && wantsMicrophone()) stopPublishing('');
      if (onPodium && !previous) { failure = ''; render(); }
      render();
    } catch {
      positionAt = 0; onPodium = false;
      if (wantsMicrophone()) stopPublishing('Die Pultposition ist nicht erreichbar.');
      render();
    } finally { positionPending = false; }
  }

  async function heartbeat() {
    if (!ownLease || heartbeatPending || closed) return;
    if (!onPodium || !positionFresh() || !fresh()) { stopPublishing(messages.off_podium); return; }
    heartbeatPending = true;
    const lease = ownLease, started = now();
    try {
      const next = await api('heartbeat', { leaseId: lease.leaseId, position, active: published }, { timeout: 2000 });
      if (ownLease === lease) applyState(next, started);
    } catch (error) {
      if (ownLease === lease) stopPublishing(messages[error.code] || messages.unavailable);
    } finally { heartbeatPending = false; }
  }

  async function start(event) {
    event.preventDefault();
    if (claiming || ownLease || !onPodium || !positionFresh() || !fresh() || !state.available || state.speaker) return;
    claiming = true; claimCancelled = false; failure = ''; disconnectListener();
    const generation = ++speakerGeneration;
    let code = ui.code.value; ui.code.value = '';
    let grant, track, room;
    const startedAt = now();
    render();
    try {
      grant = await api('claim', { code, position }, { timeout: 10000 });
      code = '';
      if (closed || generation !== speakerGeneration || !onPodium || !positionFresh()) {
        release(grant.leaseId); return;
      }
      ownLease = grant;
      applyState(grant, startedAt);
      if (ownLease !== grant || !fresh()) { release(grant.leaseId); return; }
      render();
      track = await LK.createLocalAudioTrack({ echoCancellation: true, noiseSuppression: true, autoGainControl: true });
      if (closed || generation !== speakerGeneration || ownLease !== grant || !onPodium || !positionFresh() || !fresh()) {
        stopTrack(track); release(grant.leaseId); return;
      }
      micTrack = track;
      track.mediaStreamTrack.addEventListener('ended', () => {
        if (track === micTrack) stopPublishing('Das Mikrofon wurde ausgeschaltet.');
      }, { once: true });
      room = makeRoom(); speakerRoom = room;
      room.on(LK.RoomEvent.Reconnecting, () => { if (room === speakerRoom) stopPublishing(messages.unavailable); });
      room.on(LK.RoomEvent.Disconnected, () => { if (room === speakerRoom) stopPublishing('Die Ansage wurde beendet.'); });
      await room.connect(grant.url, grant.token, { autoSubscribe: false });
      if (generation !== speakerGeneration || ownLease !== grant || !fresh() || !onPodium || !positionFresh()) {
        stopTrack(track); await room.disconnect(); release(grant.leaseId); return;
      }
      await room.localParticipant.publishTrack(track, { source: LK.Track.Source.Microphone });
      if (generation !== speakerGeneration || ownLease !== grant || !fresh() || !onPodium) {
        stopTrack(track); await room.disconnect(); release(grant.leaseId); return;
      }
      published = true;
      await heartbeat();
    } catch (error) {
      stopTrack(track);
      if (room) void room.disconnect().catch(() => {});
      if (generation === speakerGeneration) stopPublishing(messages[error.code] || 'Das Mikrofon konnte nicht gestartet werden.');
      if (grant) release(grant.leaseId);
    } finally { code = ''; claiming = false; render(); }
  }

  async function resize(height) {
    if (!widget || resizing || height === lastHeight) return;
    resizing = true;
    try { widget.size.width = '340px'; widget.size.height = height + 'px'; lastHeight = height; }
    catch { widget = null; }
    finally { resizing = false; }
  }

  function render() {
    const expanded = onPodium || claiming || ownLease || Boolean(failure);
    ui.claim.hidden = !onPodium || Boolean(ownLease) || Boolean(state?.speaker) || fatal;
    ui.start.disabled = claiming || !fresh() || !positionFresh() || !state?.available;
    ui.code.disabled = claiming;
    ui.stop.hidden = !wantsMicrophone();
    ui.mute.hidden = !published;
    ui.error.textContent = failure; ui.error.hidden = !failure;
    ui.panel.dataset.live = String(Boolean(state?.speaker?.phase === 'active' && fresh()));
    ui.status.textContent = ownLease
      ? (published ? 'Du sprichst in der Halle' : 'Mikrofon wird freigegeben')
      : state?.speaker && fresh()
        ? state.speaker.name + (state.speaker.phase === 'active' ? ' spricht' : ' bereitet eine Ansage vor')
        : fresh() && state.available ? 'Keine Ansage' : 'Hallenverbindung unterbrochen';
    void resize(expanded ? 220 : 84);
  }

  function close() {
    if (closed) return;
    stopPublishing('', { keepalive: true });
    closed = true; disconnectListener();
    for (const timer of timers) clearInterval(timer);
  }
  const timers = [];
  ui.claim.addEventListener('submit', start);
  ui.stop.addEventListener('click', () => stopPublishing(''));
  ui.mute.addEventListener('click', () => stopPublishing(''));
  ui.unlock.addEventListener('click', async () => {
    try {
      if (listener && fresh()) {
        await listener.startAudio();
        await Promise.all([...ui.audio.querySelectorAll('audio')].map(element => element.play()));
        ui.unlock.hidden = true;
      }
    } catch { showError('Die Audiowiedergabe konnte nicht gestartet werden.'); }
  });
  window.addEventListener('pagehide', close, { once: true });
  window.addEventListener('beforeunload', close, { once: true });
  window.addEventListener('storage', event => {
    if (event.key === 'authToken') { fatal = true; stopPublishing(messages.unauthorized); disconnectListener(); }
  });
  document.addEventListener('visibilitychange', () => {
    void pollPosition(); void pollState();
  });

  async function initialize() {
    if (!LK || typeof WA === 'undefined') throw new Error('initialization');
    LK.setLogLevel?.('silent');
    window.lucide?.createIcons();
    const response = await fetch(base + 'config', { cache: 'no-store' });
    if (!response.ok) throw new Error('config');
    config = await response.json();
    await WA.onInit();
    if (WA.room.id !== config.map.id) { const error = new Error('map'); error.code = 'wrong_map'; throw error; }
    try {
      const websites = await WA.ui.website.getAll();
      const own = websites.find(site => {
        const url = new URL(site.url, location.href);
        return url.origin === location.origin && url.pathname === location.pathname;
      });
      if (own) widget = await WA.ui.website.getById(own.id);
    } catch {}
    sessionId = (await api('session', { mapId: WA.room.id })).sessionId;
    await pollPosition();
    await pollState();
    timers.push(setInterval(() => { void pollPosition(); }, 500));
    timers.push(setInterval(() => { void pollState(); }, 2000));
    timers.push(setInterval(() => { void heartbeat(); }, 1000));
    timers.push(setInterval(() => {
      if (!fresh()) {
        if (listener) disconnectListener();
        if (wantsMicrophone()) stopPublishing(messages.unavailable);
      }
      if (wantsMicrophone() && !positionFresh()) stopPublishing('Die Pultposition ist nicht erreichbar.');
    }, 100));
    render();
  }
  void initialize().catch(error => {
    fatal = true; stopPublishing(messages[error.code] || messages.unavailable); disconnectListener(); render();
  });
})();
