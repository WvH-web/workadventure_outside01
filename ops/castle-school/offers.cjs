'use strict';

const {validateRules, decision} = require('./policy.cjs');
const {GatewayError} = require('../hall-audio/errors.cjs');
const IDS = Object.freeze(['stumbleguysgame','haxballarea01','gamesarea01','gamesarea02','gamesarea03','gamesarea04','gamesarea05']);
const extraKeys = ['validFrom','validUntil','reviewedOrigin','reviewedPath','reviewed'];
const ruleKeys = ['id','published','audiences','staffPreview','minAge','maxAge','gradeLevels','classIds',...extraKeys].sort();
const exact = (value, keys) => value && !Array.isArray(value) && typeof value === 'object' &&
  JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...keys].sort());
const pathPattern = /^\/(?:[A-Za-z0-9._~-]+\/)*[A-Za-z0-9._~-]*$/;
function safePath(value, maximum = 512) {
  return typeof value === 'string' && value.length <= maximum && pathPattern.test(value) &&
    !value.split('/').some(segment => segment === '.' || segment === '..');
}
function target(value) {
  if (typeof value !== 'string' || value.length > 2048 || /[\u0000-\u0020\u007f\\]/.test(value)) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password || !/^[a-z0-9.-]+\.[a-z][a-z0-9-]*$/.test(url.hostname) ||
        url.hostname === 'together.deine-schule.com' || !safePath(url.pathname,2048)) return null;
    return url;
  } catch { return null; }
}
function validDate(value) {
  if (value === null) return true;
  if (typeof value !== 'string' || !/^(20\d\d|21\d\d|2200)-\d\d-\d\d$/.test(value)) return false;
  const date = new Date(value + 'T00:00:00Z');
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0,10) === value;
}
const schoolFormat = new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Berlin',year:'numeric',month:'2-digit',day:'2-digit'});
const schoolDay = now => {
  const parts = schoolFormat.formatToParts(now);
  const part = type => parts.find(value => value.type === type).value;
  return `${part('year')}-${part('month')}-${part('day')}`;
};
const pathMatches = (path, prefix) => path === prefix || prefix.endsWith('/') && path.startsWith(prefix);
const providerMinimum = url => ['garticphone.com','www.garticphone.com'].includes(url.hostname) ? 16 : 0;

function validateOffers(input, now = Date.now()) {
  if (!exact(input,['version','checkedAt','offers']) || input.version !== 1 || !Number.isSafeInteger(input.checkedAt) ||
      Math.abs(input.checkedAt - now) > 10000 || !Array.isArray(input.offers) || input.offers.length !== IDS.length) throw new GatewayError(503,'unavailable');
  const found = new Map();
  for (const offer of input.offers) {
    if (!exact(offer,['id','title','targetUrl','revision','presentation','rule']) || !IDS.includes(offer.id) || found.has(offer.id) ||
        typeof offer.title !== 'string' || !offer.title.trim() || offer.title.length > 380 ||
        !Number.isSafeInteger(offer.revision) || offer.revision < 1 || offer.revision > 4294967295 ||
        !['external','side'].includes(offer.presentation) || !exact(offer.rule,ruleKeys) || offer.rule.id !== offer.id ||
        typeof offer.rule.reviewed !== 'boolean' || !validDate(offer.rule.validFrom) || !validDate(offer.rule.validUntil) ||
        offer.rule.validFrom && offer.rule.validUntil && offer.rule.validFrom > offer.rule.validUntil ||
        offer.rule.reviewedOrigin !== null && target(offer.rule.reviewedOrigin)?.origin !== offer.rule.reviewedOrigin ||
        offer.rule.reviewedPath !== null && !safePath(offer.rule.reviewedPath) ||
        offer.targetUrl !== null && !target(offer.targetUrl)) throw new GatewayError(503,'unavailable');
    const base = Object.fromEntries(Object.entries(offer.rule).filter(([key]) => !extraKeys.includes(key)));
    let rule;
    try { rule = {...validateRules([base])[0],...Object.fromEntries(extraKeys.map(key => [key,offer.rule[key]]))}; }
    catch { throw new GatewayError(503,'unavailable'); }
    found.set(offer.id,Object.freeze({...offer,rule:Object.freeze(rule)}));
  }
  return Object.freeze(IDS.map(id => found.get(id)));
}

function reviewed(offer, now = Date.now()) {
  const rule = offer.rule, url = target(offer.targetUrl), day = schoolDay(now);
  return Boolean(url && rule.published && rule.reviewed && rule.validUntil && day <= rule.validUntil &&
    (!rule.validFrom || day >= rule.validFrom) && rule.reviewedOrigin === url.origin && rule.reviewedPath &&
    pathMatches(url.pathname,rule.reviewedPath) && rule.minAge >= providerMinimum(url));
}
function offerDecision(profile, offer, now = Date.now()) {
  const deny = {allowed:false,mode:null};
  if (!offer.targetUrl || !profile.eligible || !offer.rule.audiences.includes(profile.kind)) return deny;
  const approved = reviewed(offer,now);
  if (profile.kind === 'staff') return approved ? {allowed:true,mode:'participant'} :
    offer.rule.staffPreview ? {allowed:true,mode:'preview'} : deny;
  return approved ? decision(profile,offer.rule) : deny;
}
function offerMetadata(profile, offer, now = Date.now()) {
  const access = offerDecision(profile,offer,now);
  return {id:offer.id,title:offer.title,revision:offer.revision,presentation:offer.presentation,...access,
    status:!offer.targetUrl ? 'not_configured' : access.allowed ? (access.mode === 'preview' ? 'preview' : 'ready') : 'restricted'};
}
function approvedRoomChange(profile, offer, proposed, now = Date.now()) {
  const url = target(proposed), current = target(offer.targetUrl);
  if (!url || !current || !offerDecision(profile,offer,now).allowed) return false;
  if (reviewed(offer,now)) return url.origin === offer.rule.reviewedOrigin && pathMatches(url.pathname,offer.rule.reviewedPath) &&
    offer.rule.minAge >= providerMinimum(url);
  // Staff previews may change room codes, not silently change an unreviewed provider or path.
  return profile.kind === 'staff' && url.origin === current.origin && url.pathname === current.pathname;
}
module.exports = {IDS,validateOffers,offerDecision,offerMetadata,approvedRoomChange,target,schoolDay};
