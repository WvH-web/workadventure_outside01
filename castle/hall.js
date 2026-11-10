import { castleRoomReady } from "./room.js?v=20261109-rounds1";

const audioUrl = "https://together.deine-schule.com/castle-audio/";
const gamesUrl = "https://together.deine-schule.com/castle-school/games";
const ownUrl = (file) => new URL(file, import.meta.url).toString();
const noticeUrl = ownUrl("hall-notices.html?v=20261110-notices1");
const props = (o) => Object.fromEntries((o.properties || []).map((p) => [p.name, p.value]));
const inside = (p, a) => p.x >= a.x && p.y >= a.y && p.x < a.x + a.width && p.y < a.y + a.height;
function hallObjects(layers, result = []) {
  for (const layer of layers || []) {
    if (layer.layers) hallObjects(layer.layers, result);
    for (const object of layer.objects || []) result.push({...object, settings: props(object)});
  }
  return result;
}

export class GreatHall {
  constructor(wa, room, map) {
    this.wa = wa; this.room = room;
    this.objects = hallObjects(map.layers);
    this.actionIds = new Set(); this.closed = false;
  }
  async start() {
    this.refresh();
    this.timer = setInterval(() => this.refresh(), 400);
    const display = this.objects.find((o) => o.settings.hallBoardDisplay);
    if (display) {
      try {
        this.board = await this.wa.room.website.create({name:"hall-noticeboard", url:ownUrl("hall-board.html?v=20261110-notices1"),
          position:{x:display.x,y:display.y,width:display.width,height:display.height},visible:true,origin:"map"});
        if (this.closed) { await this.wa.room.website.delete("hall-noticeboard"); return this; }
      } catch (error) { console.warn("Hall noticeboard:", error.message); }
    }
    if (this.closed) return this;
    try {
      const website = await this.wa.ui.website.open({url:audioUrl, allowApi:true, allowPolicy:"microphone; autoplay",
        visible:true,position:{vertical:"bottom",horizontal:"right"},size:{width:"min(340px, calc(100vw - 76px))",height:"220px"},
        margin:{right:"64px",bottom:"12px"}});
      if (this.closed) await website.close(); else this.audio = website;
    } catch (error) { console.warn("Hall audio panel:", error.message); }
    return this;
  }
  refresh() {
    if (this.closed) return;
    const active = new Set();
    for (const object of this.objects.filter((o) => o.settings.hallAction && inside(this.room.position,o))) {
      const kind = object.settings.hallAction;
      if (!["noticeboard","games"].includes(kind)) continue;
      const id = "hall-action-"+kind; active.add(id);
      if (this.actionIds.has(id)) continue;
      this.wa.ui.actionBar.addButton({id,label:kind==="games"?"Spielrunden":"Schlossbrett",
        callback:()=>this.wa.nav.openCoWebSite(kind==="games"?gamesUrl:noticeUrl,false)});
    }
    for (const id of this.actionIds) if (!active.has(id)) this.wa.ui.actionBar.removeButton(id);
    this.actionIds = active;
  }
  dispose() {
    if (this.closed) return;
    this.closed = true; clearInterval(this.timer);
    for (const id of this.actionIds) this.wa.ui.actionBar.removeButton(id);
    this.actionIds.clear();
    Promise.resolve(this.audio?.close?.()).catch(() => {});
    if (this.board) Promise.resolve(this.wa.room.website.delete("hall-noticeboard")).catch(() => {});
  }
}

if (typeof WA !== "undefined") castleRoomReady.then(async (room) => {
  if (!room) return;
  const hall = new GreatHall(WA, room, await WA.room.getTiledMap());
  window.greatHall = hall;
  window.addEventListener("pagehide",()=>hall.dispose(),{once:true});
  await hall.start();
}).catch((error) => console.error("Great Hall initialization:",error.message));
