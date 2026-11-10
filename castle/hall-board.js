import {NoticeFeed} from "./notice-feed.js?v=20261110-notices1";
const endpoint = "https://deutsche-online-schule.com/schooltools/verwaltung/api/workadventure_museum.php?board=hallnotice01";
const feed = new NoticeFeed(), title = document.getElementById("title"), picture = document.getElementById("picture"), status = document.getElementById("status");
let legacy = null, legacyUntil = 0, generation = 0, closed = false;
function render() {
  const items = feed.current(), item = items.length ? items[Math.floor(performance.now() / 15000) % items.length] : null;
  title.textContent = item?.title || legacy?.title || "Schlossbrett";
  title.style.fontSize = title.textContent.length > 65 ? "10px" : "12px";
  const image = item ? null : legacy?.image;
  if (image) { if (picture.src !== image) picture.src = image; picture.hidden = false; }
  else { picture.hidden = true; picture.removeAttribute("src"); }
  status.hidden = !!image;
  status.textContent = item ? item.eventStart ? new Intl.DateTimeFormat("de-DE", {timeZone:"Europe/Berlin",day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"}).format(new Date(item.eventStart)) + " Uhr" : "Neues im Schloss" : legacy ? "Aktuelle Ankündigung" : feed.available ? "Noch keine Ankündigung" : "Schlossbrett wird aktualisiert";
}
async function refresh() {
  if (closed || document.hidden) return;
  const current = ++generation;
  await feed.refresh(); if (closed || current !== generation) return;
  if (feed.current().length) { legacy = null; legacyUntil = 0; render(); return; }
  if (performance.now() < legacyUntil) { render(); return; }
  legacy = null; render();
  try {
    const response = await fetch(endpoint, {cache:"no-store", credentials:"omit", signal:AbortSignal.timeout(5000)});
    if (!response.ok) return;
    const {item} = await response.json();
    if (closed || current !== generation || !item) return;
    let image = null;
    if (item.image_url) { const url = new URL(item.image_url); if (url.protocol === "https:" && url.hostname === "deutsche-online-schule.com" && !url.username && !url.password) image = url.href; }
    legacy = {title:typeof item.title === "string" ? item.title : "Schlossbrett", image}; legacyUntil = performance.now() + 60000; render();
  } catch {}
}
const polling = setInterval(refresh, 30000), rotation = setInterval(() => { if (!document.hidden) render(); }, 1000);
document.addEventListener("visibilitychange", () => { if (!document.hidden) { render(); refresh(); } });
window.addEventListener("pageshow", event => { if (event.persisted) refresh(); });
window.addEventListener("pagehide", event => { if (event.persisted) return; closed = true; generation++; feed.dispose(); clearInterval(polling); clearInterval(rotation); });
refresh();
