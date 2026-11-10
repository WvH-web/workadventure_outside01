import {NoticeFeed, eventLabel} from "./notice-feed.js?v=20261110-notices1";
const feed = new NoticeFeed(), list = document.getElementById("notices"), status = document.getElementById("state");
let rendered, closed = false;
function render() {
  const items = feed.current(), key = JSON.stringify(items);
  status.textContent = feed.available ? items.length ? "" : "Zurzeit sind keine weiteren Aushänge veröffentlicht." : "Das Schlossbrett ist gerade nicht erreichbar.";
  status.hidden = feed.available && items.length > 0;
  if (key === rendered) return;
  rendered = key; list.replaceChildren();
  for (const item of items) {
    const article = document.createElement("article"), heading = document.createElement("h2"), body = document.createElement("p");
    heading.textContent = item.title; body.textContent = item.body; article.append(heading);
    if (item.eventStart) { const time = document.createElement("time"); time.dateTime = item.eventStart; time.textContent = eventLabel(item); article.append(time); }
    article.append(body); list.append(article);
  }
}
async function refresh() { if (closed || document.hidden) return; await feed.refresh(); if (!closed) render(); }
const polling = setInterval(refresh, 30000), expiry = setInterval(() => { if (!document.hidden) render(); }, 1000);
document.addEventListener("visibilitychange", () => { if (!document.hidden) { render(); refresh(); } });
window.addEventListener("pageshow", event => { if (event.persisted) refresh(); });
window.addEventListener("pagehide", event => { if (event.persisted) return; closed = true; feed.dispose(); clearInterval(polling); clearInterval(expiry); });
refresh();
