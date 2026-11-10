export const noticeEndpoint = "https://deutsche-online-schule.com/schooltools/verwaltung/api/workadventure_castle_notices.php";
const iso = (value) => typeof value === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().replace(".000Z", "Z") === value;
export function validateNotices(value) {
  if (!value || value.version !== 1 || !Number.isSafeInteger(value.checkedAt) || value.checkedAt < 946684800000 ||
      value.checkedAt > 7289654400000 || !Array.isArray(value.items) || value.items.length > 100) throw Error("notice_feed");
  const ids = new Set();
  for (const item of value.items) {
    if (!item || !Number.isSafeInteger(item.id) || item.id < 1 || ids.has(item.id) ||
        typeof item.title !== "string" || !item.title.trim() || item.title.length > 220 ||
        typeof item.body !== "string" || !item.body.trim() || item.body.length > 1200 || !iso(item.expiresAt) ||
        item.eventStart !== null && !iso(item.eventStart) || item.eventEnd !== null && (!iso(item.eventEnd) || !item.eventStart || item.eventEnd <= item.eventStart)) throw Error("notice_feed");
    ids.add(item.id);
  }
  return value;
}

export class NoticeFeed {
  constructor({fetcher = fetch, clock = () => performance.now()} = {}) {
    this.fetcher = (...args) => fetcher(...args); this.clock = clock; this.items = []; this.available = false; this.generation = 0;
  }
  async refresh() {
    const generation = ++this.generation, started = this.clock();
    this.abort?.abort(); const abort = new AbortController(); this.abort = abort;
    const timer = setTimeout(() => abort.abort(), 5000);
    try {
      const response = await this.fetcher(noticeEndpoint, {cache: "no-store", credentials: "omit", signal: abort.signal});
      if (!response.ok || !/^application\/json(?:;|$)/i.test(response.headers.get("content-type") || "")) throw Error("notice_feed");
      const text = await response.text(); if (text.length > 524288) throw Error("notice_feed");
      const value = validateNotices(JSON.parse(text));
      if (generation !== this.generation) return;
      this.receivedAt = this.clock();
      // Use server time and a monotonic clock, conservatively including transit time; a wrong device clock cannot extend a notice.
      this.serverTime = value.checkedAt + Math.max(0, this.receivedAt - started);
      this.items = value.items; this.available = true;
    } catch {
      if (generation !== this.generation) return;
      this.items = []; this.available = false;
    } finally { clearTimeout(timer); }
  }
  current() {
    if (!this.available) return [];
    const now = this.serverTime + Math.max(0, this.clock() - this.receivedAt);
    return this.items.filter(item => Date.parse(item.expiresAt) > now);
  }
  dispose() { this.generation++; this.abort?.abort(); this.items = []; this.available = false; }
}

export function eventLabel(item) {
  if (!item.eventStart) return "";
  const date = new Date(item.eventStart), time = new Intl.DateTimeFormat("de-DE", {timeZone: "Europe/Berlin", hour: "2-digit", minute: "2-digit"});
  let label = new Intl.DateTimeFormat("de-DE", {timeZone: "Europe/Berlin", day: "2-digit", month: "2-digit", year: "numeric"}).format(date) + " · " + time.format(date);
  if (item.eventEnd) {
    const end = new Date(item.eventEnd);
    label += " bis " + new Intl.DateTimeFormat("de-DE", {timeZone: "Europe/Berlin", day: "2-digit", month: "2-digit"}).format(end) + " " + time.format(end);
  }
  return label + " (Schulzeit)";
}
