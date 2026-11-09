'use strict';

const { GatewayError } = require('../hall-audio/errors.cjs');
const kinds = new Set(['staff', 'student', 'parent', 'unknown', 'ambiguous']);
const roles = new Set(['staff', 'student', 'parent']);
const profileKeys = ['version', 'kind', 'eligible', 'age', 'gradeLevel', 'classId', 'checkedAt'].sort();
const ruleKeys = ['id', 'published', 'audiences', 'staffPreview', 'minAge', 'maxAge', 'gradeLevels', 'classIds'].sort();
const exact = (value, keys) => value && !Array.isArray(value) && typeof value === 'object' &&
  JSON.stringify(Object.keys(value).sort()) === JSON.stringify(keys);
const numberOrNull = (n, min, max) => n === null || Number.isInteger(n) && n >= min && n <= max;

function validateProfile(profile, now = Date.now()) {
  if (!exact(profile, profileKeys) || profile.version !== 1 || !kinds.has(profile.kind) ||
      typeof profile.eligible !== 'boolean' || !numberOrNull(profile.age, 0, 120) ||
      !numberOrNull(profile.gradeLevel, 1, 13) || !numberOrNull(profile.classId, 1, 2147483647) ||
      !Number.isSafeInteger(profile.checkedAt) || Math.abs(now - profile.checkedAt) > 10000 ||
      (!profile.eligible && [profile.age, profile.gradeLevel, profile.classId].some(v => v !== null)) ||
      (profile.kind !== 'student' && [profile.age, profile.gradeLevel, profile.classId].some(v => v !== null)) ||
      (profile.eligible && (!roles.has(profile.kind) || profile.kind === 'student' && profile.classId === null))) {
    throw new GatewayError(503, 'unavailable');
  }
  return profile;
}

function validateRules(input) {
  if (!Array.isArray(input) || !input.length || input.length > 100) throw Error('Invalid castle rules');
  const seen = new Set();
  return input.map(rule => {
    const list = (values, valid) => values === null || Array.isArray(values) && values.length > 0 &&
      values.length <= 500 && new Set(values).size === values.length && values.every(valid);
    if (!exact(rule, ruleKeys) || typeof rule.id !== 'string' || !/^[a-z0-9][a-z0-9-]{0,63}$/.test(rule.id) ||
        seen.has(rule.id) || typeof rule.published !== 'boolean' || typeof rule.staffPreview !== 'boolean' ||
        !Array.isArray(rule.audiences) || !rule.audiences.length || new Set(rule.audiences).size !== rule.audiences.length ||
        !rule.audiences.every(r => roles.has(r)) || !Number.isInteger(rule.minAge) || rule.minAge < 0 || rule.minAge > 120 ||
        !numberOrNull(rule.maxAge, rule.minAge, 120) ||
        !list(rule.gradeLevels, n => Number.isInteger(n) && n >= 1 && n <= 13) ||
        !list(rule.classIds, n => Number.isInteger(n) && n >= 1 && n <= 2147483647)) throw Error('Invalid castle rules');
    seen.add(rule.id);
    return Object.freeze({...rule, audiences: Object.freeze([...rule.audiences]),
      gradeLevels: rule.gradeLevels === null ? null : Object.freeze([...rule.gradeLevels]),
      classIds: rule.classIds === null ? null : Object.freeze([...rule.classIds])});
  });
}

function decision(profile, rule) {
  const deny = { allowed: false, mode: null };
  if (!profile.eligible || !rule.audiences.includes(profile.kind)) return deny;
  if (profile.kind === 'staff') return rule.published || rule.staffPreview
    ? { allowed: true, mode: rule.published ? 'participant' : 'preview' } : deny;
  if (!rule.published) return deny;
  if ((rule.minAge > 0 || rule.maxAge !== null) && (profile.age === null || profile.age < rule.minAge ||
      rule.maxAge !== null && profile.age > rule.maxAge)) return deny;
  if (rule.gradeLevels !== null && !rule.gradeLevels.includes(profile.gradeLevel)) return deny;
  if (rule.classIds !== null && !rule.classIds.includes(profile.classId)) return deny;
  return { allowed: true, mode: 'participant' };
}

module.exports = { validateProfile, validateRules, decision };
