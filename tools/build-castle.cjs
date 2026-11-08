const fs = require("node:fs");
const path = require("node:path");
const dep = require("./castle-deps.cjs");
const { buildMiddleCommonRoom } = require("./build-middle-common-room.cjs");
const { buildGreatHall } = require("./build-great-hall.cjs");
const { buildCinema } = require("./build-cinema.cjs");
const { nativeTarget, writeWam } = require("./castle-wam.cjs");
const { createCanvas, loadImage } = dep("@napi-rs/canvas");
const sharp = dep("sharp");
const root = path.resolve(__dirname, "..");
const out = path.join(root, "castle");
const T = 32,
  columns = 32;
const cells = [],
  sprites = {},
  animations = [];
const P = (name, value) => ({
  name,
  type:
    typeof value === "boolean"
      ? "bool"
      : typeof value === "number"
        ? "float"
        : "string",
  value,
});
const png = (canvas) => canvas.toBuffer("image/png");

function sprite(name, width, height, draw, durations = [1000]) {
  const frames = [];
  for (let frame = 0; frame < durations.length; frame++) {
    const canvas = createCanvas(width * T, height * T),
      c = canvas.getContext("2d");
    draw(c, frame, canvas.width, canvas.height);
    const ids = [];
    for (let y = 0; y < height; y++)
      for (let x = 0; x < width; x++) {
        const cell = createCanvas(T, T);
        cell.getContext("2d").drawImage(canvas, x * T, y * T, T, T, 0, 0, T, T);
        ids.push(cells.length);
        cells.push(cell);
      }
    frames.push({ canvas, ids });
  }
  if (frames.length > 1)
    for (let n = 0; n < width * height; n++)
      animations.push({
        id: frames[0].ids[n],
        animation: frames.map((f, i) => ({
          tileid: f.ids[n],
          duration: durations[i],
        })),
      });
  return (sprites[name] = { name, width, height, frames, ids: frames[0].ids });
}
function rect(c, x, y, w, h, color) {
  c.fillStyle = color;
  c.fillRect(x, y, w, h);
}
function line(c, x1, y1, x2, y2, color, width = 1) {
  c.strokeStyle = color;
  c.lineWidth = width;
  c.beginPath();
  c.moveTo(x1, y1);
  c.lineTo(x2, y2);
  c.stroke();
}
function ellipse(c, x, y, rx, ry, color) {
  c.fillStyle = color;
  c.beginPath();
  c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  c.fill();
}
function polygon(c, points, color) {
  c.fillStyle = color;
  c.beginPath();
  points.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
  c.closePath();
  c.fill();
}
function texture(name, base, seam, kind = "stone") {
  return sprite(name, 1, 1, (c) => {
    rect(c, 0, 0, T, T, base);
    for (let i = 0; i < 42; i++) {
      const x = (i * 17 + 7) % 32,
        y = (i * 11 + 3) % 32;
      rect(c, x, y, 1 + (i % 2), 1, i % 2 ? "#ffffff0a" : "#00000009");
    }
    if (kind === "wood") {
      line(c, 0, 15, 32, 15, seam);
      line(c, 12, 0, 12, 15, seam);
      line(c, 25, 16, 25, 32, seam);
    } else if (kind === "stone") {
      line(c, 0, 0, 32, 0, seam);
      line(c, 0, 16, 32, 16, seam);
      line(c, 16, 0, 16, 16, seam);
      line(c, 5, 16, 5, 32, seam);
    } else {
      for (let i = 0; i < 5; i++)
        line(c, 4 + i * 6, 8 + (i % 3) * 7, 5 + i * 6, 6 + (i % 3) * 7, seam);
    }
  });
}

async function createArt() {
  sprite("marker", 1, 1, () => {});
  sprite("collision", 1, 1, () => {});
  texture("grass", "#496e4e", "#73905b", "grass");
  texture("grass-light", "#607b50", "#8d9e69", "grass");
  texture("paving", "#b2bab0", "#8e9a94");
  texture("stone", "#d8d9cd", "#babeb5");
  texture("oak", "#b78b60", "#967251", "wood");
  texture("rose", "#bf8c86", "#a37572", "wood");
  texture("teal", "#87aca4", "#71968d", "wood");
  texture("plum", "#b5a0b1", "#968792", "wood");
  texture("cinema", "#57545c", "#47464f", "wood");
  texture("sand", "#bfc49a", "#a4ae8a");
  texture("track", "#8d9694", "#747f7f");
  texture("roof", "#496b7a", "#335260");
  sprite("wall", 1, 1, (c) => {
    rect(c, 0, 0, 32, 32, "#7f8f91");
    rect(c, 1, 1, 30, 25, "#bdc6c4");
    line(c, 1, 1, 30, 1, "#e7ece3", 2);
    line(c, 0, 13, 32, 13, "#a6b2af");
    line(c, 16, 0, 16, 13, "#9aa7a5");
    line(c, 7, 14, 7, 25, "#9aa7a5");
    rect(c, 0, 26, 32, 6, "#364e5266");
  });
  sprite("column", 1, 1, (c) => {
    ellipse(c, 16, 26, 12, 5, "#324d5e55");
    rect(c, 7, 7, 18, 18, "#b2bebc");
    rect(c, 5, 5, 22, 6, "#dce0d4");
    rect(c, 5, 23, 22, 5, "#9faeaa");
    line(c, 11, 11, 11, 23, "#edf0e5");
  });
  sprite("window", 2, 1, (c) => {
    rect(c, 1, 0, 62, 31, "#435d68");
    rect(c, 5, 3, 54, 23, "#91c3ca");
    rect(c, 8, 5, 23, 19, "#c3e0d9");
    line(c, 32, 3, 32, 27, "#c7ba8e", 3);
    line(c, 5, 16, 59, 16, "#c7ba8e", 2);
    rect(c, 0, 28, 64, 4, "#e0dac2");
  });
  sprite("hedge", 1, 1, (c) => {
    ellipse(c, 16, 19, 16, 12, "#284b3f");
    ellipse(c, 16, 13, 15, 11, "#477452");
    ellipse(c, 12, 9, 9, 5, "#6a925d");
  });
  sprite("tree", 2, 3, (c) => {
    ellipse(c, 34, 85, 26, 8, "#203e3d55");
    rect(c, 28, 44, 9, 42, "#755d49");
    for (const [x, y, r, col] of [
      [18, 41, 18, "#315848"],
      [43, 42, 19, "#34614b"],
      [30, 20, 23, "#49764f"],
      [18, 20, 15, "#668d59"],
      [38, 12, 14, "#72955d"],
    ])
      ellipse(c, x, y, r, r, col);
  });
  sprite("table", 4, 2, (c) => {
    ellipse(c, 64, 55, 62, 7, "#3a394744");
    rect(c, 4, 10, 120, 43, "#674f43");
    rect(c, 3, 5, 122, 40, "#a87951");
    rect(c, 6, 7, 116, 31, "#c59c65");
    line(c, 9, 21, 119, 21, "#ad855b");
    rect(c, 8, 41, 6, 17, "#695345");
    rect(c, 114, 41, 6, 17, "#695345");
  });
  sprite("small-table", 2, 2, (c) => {
    ellipse(c, 32, 51, 27, 8, "#3a394744");
    ellipse(c, 32, 32, 28, 21, "#7c5a48");
    ellipse(c, 32, 27, 28, 21, "#bc9360");
    rect(c, 27, 43, 9, 15, "#775943");
  });
  for (const [name, col] of [
    ["chair", "#9b5659"],
    ["chair-teal", "#427c78"],
    ["chair-gold", "#bd9552"],
    ["chair-plum", "#8b6485"],
  ]) {
    sprite(name, 1, 1, (c) => {
      ellipse(c, 16, 28, 12, 3, "#262c3533");
      rect(c, 5, 3, 22, 17, "#684b3d");
      rect(c, 7, 4, 18, 13, col);
      rect(c, 5, 18, 22, 10, "#714e3d");
      rect(c, 7, 17, 18, 8, col);
    });
  }
  sprite("chair-front", 1, 1, (c) => {
    rect(c, 5, 24, 3, 7, "#684c3f");
    rect(c, 24, 24, 3, 7, "#684c3f");
    rect(c, 5, 24, 22, 3, "#a67f55");
  });
  sprite("sofa", 3, 2, (c) => {
    ellipse(c, 48, 55, 44, 7, "#26363833");
    rect(c, 5, 13, 86, 39, "#3d6862");
    rect(c, 8, 8, 80, 28, "#65908a");
    rect(c, 13, 32, 31, 18, "#82a79a");
    rect(c, 49, 32, 31, 18, "#82a79a");
    rect(c, 3, 29, 10, 27, "#527d74");
    rect(c, 81, 29, 12, 27, "#527d74");
  });
  sprite("bookshelf", 4, 2, (c) => {
    rect(c, 0, 1, 128, 61, "#6f5644");
    rect(c, 4, 4, 120, 51, "#443f3b");
    for (let row = 0; row < 2; row++)
      for (let i = 0; i < 17; i++) {
        const colors = ["#ac6863", "#839d78", "#c4a66e", "#77969e", "#9a809f"];
        rect(
          c,
          6 + i * 7,
          row * 26 + 7,
          5,
          18 - (i % 3),
          colors[(i + row) % 5],
        );
      }
    rect(c, 2, 27, 124, 4, "#9d7a53");
    rect(c, 2, 56, 124, 5, "#99734d");
  });
  sprite("rug", 4, 3, (c) => {
    rect(c, 0, 0, 128, 96, "#527f7b");
    rect(c, 3, 3, 122, 90, "#b7ad70");
    rect(c, 6, 6, 116, 84, "#638d82");
    for (let i = 0; i < 6; i++)
      polygon(
        c,
        [
          [16 + i * 19, 39],
          [23 + i * 19, 46],
          [16 + i * 19, 53],
          [9 + i * 19, 46],
        ],
        "#d5ca8a88",
      );
  });
  sprite("screen", 6, 2, (c) => {
    rect(c, 0, 0, 192, 64, "#3e414a");
    rect(c, 5, 5, 182, 48, "#e3e6df");
    rect(c, 10, 10, 172, 38, "#c6d6d5");
    rect(c, 0, 57, 192, 7, "#2e333c");
  });
  sprite("stage", 6, 2, (c) => {
    rect(c, 0, 0, 192, 64, "#7b5d53");
    rect(c, 3, 3, 186, 51, "#ad8466");
    for (let i = 0; i < 6; i++) line(c, i * 32, 3, i * 32, 54, "#947052");
    rect(c, 0, 54, 192, 10, "#624d49");
  });
  sprite("stairs", 4, 5, (c) => {
    rect(c, 0, 0, 128, 160, "#6e8287");
    for (let i = 0; i < 10; i++) {
      rect(c, 4, i * 16 + 1, 120, 12, "#c3ccc4");
      rect(c, 6, i * 16 + 2, 116, 3, "#e9ebe0");
    }
    rect(c, 0, 0, 4, 160, "#9b845b");
    rect(c, 124, 0, 4, 160, "#9b845b");
  });
  sprite("door", 3, 2, (c) => {
    rect(c, 0, 0, 96, 64, "#748a8c");
    rect(c, 5, 2, 86, 60, "#b4c3bc");
    rect(c, 10, 7, 76, 57, "#a57d54");
    line(c, 48, 7, 48, 64, "#765b45", 2);
    ellipse(c, 40, 36, 2, 3, "#ddbd69");
    ellipse(c, 56, 36, 2, 3, "#ddbd69");
  });
  sprite("house", 6, 6, (c) => {
    ellipse(c, 96, 182, 90, 9, "#263e3c33");
    rect(c, 13, 62, 166, 119, "#dbd1ae");
    rect(c, 18, 62, 9, 120, "#785d47");
    rect(c, 91, 42, 10, 140, "#785d47");
    rect(c, 166, 62, 9, 120, "#785d47");
    rect(c, 14, 110, 165, 7, "#785d47");
    polygon(
      c,
      [
        [0, 76],
        [96, 0],
        [192, 76],
      ],
      "#345566",
    );
    polygon(
      c,
      [
        [14, 70],
        [96, 12],
        [179, 70],
      ],
      "#52798a",
    );
    for (let j = 0; j < 4; j++)
      line(c, 24 + j * 17, 61 - j * 10, 162 - j * 17, 61 - j * 10, "#6d92a0");
    for (const x of [38, 124]) {
      rect(c, x, 85, 28, 34, "#665744");
      rect(c, x + 3, 88, 22, 28, "#f0d38c");
      line(c, x + 14, 88, x + 14, 116, "#a27d52", 2);
    }
    rect(c, 78, 139, 34, 43, "#85634c");
    ellipse(c, 103, 160, 2, 2, "#dfbe65");
  });
  sprite("stall", 4, 3, (c) => {
    rect(c, 4, 42, 120, 48, "#9e794f");
    for (let i = 0; i < 8; i++)
      rect(c, i * 16, 7, 16, 37, i % 2 ? "#e1c88c" : "#96666c");
    polygon(
      c,
      [
        [0, 7],
        [64, 0],
        [128, 7],
      ],
      "#b88f63",
    );
    rect(c, 10, 70, 108, 9, "#d3ae73");
    for (let i = 0; i < 7; i++)
      ellipse(
        c,
        18 + i * 15,
        64,
        6,
        6,
        ["#c27b68", "#8da16c", "#d6b55f"][i % 3],
      );
  });
  sprite("cart", 2, 2, (c) => {
    ellipse(c, 14, 44, 8, 13, "#333b41");
    ellipse(c, 50, 44, 8, 13, "#333b41");
    rect(c, 13, 12, 38, 40, "#af5555");
    rect(c, 17, 16, 30, 18, "#dbb16f");
    rect(c, 21, 4, 22, 12, "#4c606a");
    rect(c, 18, 38, 28, 9, "#d67761");
  });
  sprite("plant", 2, 2, (c) => {
    ellipse(c, 32, 58, 19, 5, "#334b4033");
    polygon(
      c,
      [
        [19, 42],
        [45, 42],
        [41, 61],
        [23, 61],
      ],
      "#b47e62",
    );
    for (const [x, y] of [
      [18, 20],
      [43, 19],
      [31, 8],
      [15, 35],
      [47, 34],
    ]) {
      line(c, 32, 46, x, y, "#4a7450", 3);
      ellipse(c, x, y, 10, 6, "#6e9b61");
    }
  });
  sprite("cushion", 1, 1, (c) => {
    ellipse(c, 16, 23, 14, 8, "#97617b");
    ellipse(c, 16, 19, 13, 9, "#c28594");
    ellipse(c, 14, 16, 7, 4, "#d49ba4");
  });
  sprite("landscape", 3, 2, (c) => {
    rect(c, 0, 0, 96, 64, "#b69b60");
    rect(c, 5, 5, 86, 54, "#6a9fa7");
    polygon(
      c,
      [
        [5, 47],
        [33, 15],
        [62, 48],
      ],
      "#647487",
    );
    polygon(
      c,
      [
        [38, 55],
        [68, 20],
        [91, 55],
      ],
      "#899b85",
    );
    rect(c, 5, 47, 86, 12, "#93a978");
  });
  sprite("piano", 5, 2, (c) => {
    rect(c, 3, 2, 154, 52, "#574344");
    rect(c, 9, 7, 142, 20, "#785a51");
    rect(c, 7, 33, 146, 22, "#eee0bd");
    for (let i = 0; i < 22; i++) {
      line(c, 8 + i * 6, 34, 8 + i * 6, 53, "#a69b89");
      if (i % 7 !== 2 && i % 7 !== 6) rect(c, 11 + i * 6, 33, 3, 12, "#444549");
    }
    rect(c, 4, 55, 7, 8, "#55433e");
    rect(c, 149, 55, 7, 8, "#55433e");
  });
  sprite("easel", 2, 3, (c) => {
    line(c, 31, 2, 10, 92, "#94744e", 5);
    line(c, 31, 2, 54, 92, "#94744e", 5);
    rect(c, 6, 13, 51, 58, "#d5c49b");
    rect(c, 10, 17, 43, 50, "#dddcc3");
    ellipse(c, 27, 37, 13, 12, "#80a9a5");
    polygon(
      c,
      [
        [11, 65],
        [31, 37],
        [51, 65],
      ],
      "#9e6e88",
    );
    rect(c, 4, 69, 55, 5, "#94744e");
  });
  sprite("chessboard", 1, 1, (c) => {
    rect(c, 4, 4, 24, 24, "#d7cba5");
    for (let y = 0; y < 6; y++)
      for (let x = 0; x < 6; x++)
        if ((x + y) % 2) rect(c, 4 + x * 4, 4 + y * 4, 4, 4, "#5f7872");
    for (let x = 0; x < 6; x++) {
      ellipse(c, 6 + x * 4, 7, 1.5, 2, "#f5ebd0");
      ellipse(c, 6 + x * 4, 25, 1.5, 2, "#4b535a");
    }
  });
  sprite("cinema-screen", 14, 3, (c) => {
    rect(c, 0, 0, 448, 96, "#3d4651");
    rect(c, 6, 6, 436, 75, "#d5e0da");
    rect(c, 12, 12, 424, 61, "#afc9ca");
    rect(c, 0, 83, 448, 13, "#29363f");
    polygon(
      c,
      [
        [220, 26],
        [220, 57],
        [244, 42],
      ],
      "#e6e6cb",
    );
  });
  sprite("tower", 6, 10, (c) => {
    rect(c, 29, 114, 134, 202, "#a8b7b5");
    polygon(
      c,
      [
        [9, 128],
        [96, 0],
        [183, 128],
      ],
      "#42677d",
    );
    polygon(
      c,
      [
        [21, 125],
        [96, 19],
        [159, 125],
      ],
      "#597e90",
    );
    for (let y = 145; y < 300; y += 52)
      for (const x of [52, 119]) {
        rect(c, x, y, 21, 31, "#496978");
        rect(c, x + 3, y + 3, 15, 24, "#e2c47c");
      }
    rect(c, 26, 308, 140, 12, "#7e9696");
  });
  sprite("castle-facade", 64, 32, (c) => {
    const stone = (x, y, w, h) => {
      rect(c, x, y, w, h, "#b1beba");
      for (let yy = y + 28; yy < y + h; yy += 32) {
        line(c, x, yy, x + w, yy, "#9cadaa", 2);
        for (let xx = x + (Math.floor(yy / 32) % 2) * 24; xx < x + w; xx += 52)
          line(c, xx, yy - 28, xx, yy, "#a5b4b0");
      }
      rect(c, x, y, 8, h, "#cbd2c3");
    };
    const windows = (x, y, w, h) => {
      for (let yy = y; yy < y + h; yy += 91)
        for (let xx = x; xx < x + w; xx += 73) {
          rect(c, xx, yy, 28, 48, "#466477");
          rect(c, xx + 4, yy + 5, 20, 36, "#d9bd75");
          line(c, xx + 14, yy + 5, xx + 14, yy + 41, "#8c805e", 2);
        }
    };
    stone(165, 575, 430, 430);
    stone(1453, 575, 430, 430);
    stone(540, 400, 968, 605);
    polygon(
      c,
      [
        [104, 578],
        [380, 356],
        [654, 578],
      ],
      "#54788b",
    );
    polygon(
      c,
      [
        [1396, 578],
        [1670, 356],
        [1944, 578],
      ],
      "#54788b",
    );
    polygon(
      c,
      [
        [500, 408],
        [1024, 168],
        [1550, 408],
      ],
      "#426b83",
    );
    polygon(
      c,
      [
        [550, 402],
        [1024, 197],
        [1500, 402],
      ],
      "#5c8294",
    );
    windows(225, 650, 300, 280);
    windows(1510, 650, 300, 280);
    windows(612, 495, 800, 430);
    for (const [x, y, w, h] of [
      [72, 358, 200, 647],
      [1776, 358, 200, 647],
      [890, 160, 268, 845],
      [467, 460, 140, 545],
      [1441, 460, 140, 545],
    ]) {
      stone(x, y, w, h);
      polygon(
        c,
        [
          [x - 34, y + 8],
          [x + w / 2, Math.max(4, y - 230)],
          [x + w + 34, y + 8],
        ],
        "#3f657d",
      );
      polygon(
        c,
        [
          [x - 16, y + 5],
          [x + w / 2, Math.max(18, y - 204)],
          [x + w - 2, y + 5],
        ],
        "#5a8294",
      );
      windows(x + 35, y + 65, w - 65, h - 90);
    }
    rect(c, 940, 861, 168, 144, "#526169");
    rect(c, 949, 873, 150, 132, "#83674c");
    line(c, 1024, 873, 1024, 1005, "#b29a62", 4);
    rect(c, 866, 1005, 316, 19, "#8faaa7");
  });
  sprite(
    "water",
    1,
    1,
    (c, f) => {
      rect(c, 0, 0, 32, 32, "#4c8e9e");
      for (let y = 4; y < 32; y += 10) {
        line(c, (f * 3 + y) % 22, y, ((f * 3 + y) % 22) + 10, y, "#a2d6d5", 2);
      }
    },
    [180, 180, 180, 180],
  );
  sprite(
    "fireplace",
    2,
    3,
    (c, f) => {
      rect(c, 0, 0, 64, 91, "#7e8783");
      rect(c, 3, 4, 58, 76, "#b3b7a9");
      rect(c, 8, 27, 48, 55, "#39454a");
      rect(c, 0, 19, 64, 8, "#d3ccb0");
      rect(c, 3, 84, 58, 10, "#7d847b");
      for (let i = 0; i < 3; i++) {
        const h = 20 + ((f * 7 + i * 11) % 19);
        polygon(
          c,
          [
            [12 + i * 13, 78],
            [20 + i * 13, 78 - h],
            [29 + i * 13, 78],
          ],
          i % 2 ? "#f1b553" : "#e98143",
        );
        polygon(
          c,
          [
            [16 + i * 13, 78],
            [21 + i * 13, 64 - h / 3],
            [25 + i * 13, 78],
          ],
          "#ffe2a0",
        );
      }
      line(c, 12, 80, 52, 75, "#9b6650", 5);
    },
    Array(8).fill(120),
  );
  sprite(
    "fountain",
    4,
    4,
    (c, f) => {
      ellipse(c, 64, 100, 60, 24, "#6d8688");
      ellipse(c, 64, 89, 58, 25, "#bdc8bc");
      ellipse(c, 64, 86, 50, 19, "#68aab4");
      ellipse(c, 64, 86, 36 + f * 2, 9, "#9fcecd");
      rect(c, 57, 29, 14, 60, "#b6bfad");
      ellipse(c, 64, 36, 23, 9, "#d2ceb0");
      line(c, 64, 16, 64, 34, "#dce7d0", 4);
      for (let i = 0; i < 4; i++) {
        const x = 37 + i * 18;
        line(c, 64, 35, x, 61 + ((f + i) % 4) * 5, "#cae3da", 2);
      }
    },
    [160, 160, 160, 160],
  );
  sprite(
    "candle",
    1,
    1,
    (c, f) => {
      rect(c, 12, 17, 8, 12, "#e9dbaa");
      ellipse(c, 16 + (f % 2), 12, 3, 6, "#ffc976");
      ellipse(c, 16, 12, 1.5, 3, "#fff2bc");
      rect(c, 9, 29, 14, 3, "#a18a50");
    },
    [180, 140, 220, 170],
  );
  sprite(
    "teacup",
    1,
    1,
    (c, f) => {
      ellipse(c, 15, 27, 12, 3, "#e0d7bb");
      rect(c, 7, 16, 16, 9, "#d1dfd5");
      ellipse(c, 15, 16, 8, 3, "#a88360");
      ellipse(c, 25, 20, 4, 4, "#d1dfd5");
      ellipse(c, 25, 20, 2, 2, "#b99268");
      if (f) {
        line(c, 12, 11, 11 + (f % 3), 4, "#e6e4d799", 1);
        line(c, 18, 11, 19 - (f % 3), 3, "#e6e4d799", 1);
      }
    },
    [60000, 250, 250, 250, 250, 250],
  );
  sprite(
    "clock",
    1,
    2,
    (c, f) => {
      rect(c, 6, 4, 20, 52, "#7d6352");
      ellipse(c, 16, 18, 13, 13, "#bea071");
      ellipse(c, 16, 18, 10, 10, "#e3ddbe");
      const a = (f * Math.PI) / 6;
      line(c, 16, 18, 16 + Math.sin(a) * 8, 18 - Math.cos(a) * 8, "#4f5f61", 2);
      line(c, 16, 18, 11, 15, "#4f5f61", 2);
      line(c, 16, 32, 16 + Math.sin(a) * 5, 47, "#c6aa69", 2);
      ellipse(c, 16 + Math.sin(a) * 5, 47, 4, 4, "#d2bc7d");
    },
    Array(12).fill(5000),
  );
  sprite(
    "book",
    1,
    1,
    (c, f) => {
      const dy = [0, -1, -3, -4, -3, -1, 0, 0][f];
      rect(c, 4, 15 + dy, 24, 12, "#8f5967");
      polygon(
        c,
        [
          [5, 14 + dy],
          [16, 17 + dy],
          [27, 14 + dy],
          [27, 23 + dy],
          [16, 26 + dy],
          [5, 23 + dy],
        ],
        "#e2d6ab",
      );
      line(c, 16, 17 + dy, 16, 25 + dy, "#ad9a72");
    },
    [27000, 150, 180, 180, 180, 150, 150, 1600],
  );
  sprite(
    "comet",
    3,
    2,
    (c, f) => {
      if (f === 0) return;
      const x = 12 + f * 12;
      line(c, x - 24, 28, x, 15, "#c4dcd8", 3);
      ellipse(c, x, 15, 3, 3, "#f4e9bc");
    },
    [180000, 150, 150, 150, 150, 150],
  );
  const source =
    process.argv[2] ||
    process.env.CASTLE_PORTRAIT_SOURCE ||
    path.join(out, "art", "portrait-source.png");
  if (!fs.existsSync(source)) throw Error("Missing portrait source: " + source);
  fs.mkdirSync(path.join(out, "art"), { recursive: true });
  if (
    path.resolve(source) !==
    path.resolve(path.join(out, "art", "portrait-source.png"))
  )
    fs.copyFileSync(source, path.join(out, "art", "portrait-source.png"));
  const portrait = await loadImage(
    await sharp(source).resize(256, 192).png().toBuffer(),
  );
  sprite(
    "portrait",
    2,
    3,
    (c, f) =>
      c.drawImage(
        portrait,
        (f % 4) * 64,
        Math.floor(f / 4) * 96,
        64,
        96,
        0,
        0,
        64,
        96,
      ),
    [5500, 2400, 100, 140, 3000, 2500, 2200, 4000],
  );
}

class World {
  constructor(id, width, height) {
    this.id = id;
    this.w = width;
    this.h = height;
    this.rooms = [];
    this.seats = [];
    this.areas = [];
    this.rides = [];
    this.links = [];
    this.entries = {};
    this.blocked = new Set();
    this.oid = 1;
    this.layers = Object.fromEntries(
      [
        "ground",
        "floors",
        "walls",
        "furniture",
        "animations",
        "labels",
        "fronts",
      ].map((n) => [n, Array(width * height).fill(0)]),
    );
    this.fill("ground", 0, 0, width, height, "grass");
  }
  fill(layer, x, y, w, h, name) {
    for (let yy = y; yy < y + h; yy++)
      for (let xx = x; xx < x + w; xx++)
        if (xx >= 0 && xx < this.w && yy >= 0 && yy < this.h)
          this.layers[layer][yy * this.w + xx] = sprites[name].ids[0] + 1;
  }
  block(x, y, w, h, value = true) {
    for (let yy = y; yy < y + h; yy++)
      for (let xx = x; xx < x + w; xx++)
        if (xx >= 0 && xx < this.w && yy >= 0 && yy < this.h)
          value
            ? this.blocked.add(yy * this.w + xx)
            : this.blocked.delete(yy * this.w + xx);
  }
  put(name, x, y, layer = "furniture", collides = false) {
    const s = sprites[name];
    for (let yy = 0; yy < s.height; yy++)
      for (let xx = 0; xx < s.width; xx++)
        this.layers[layer][(y + yy) * this.w + x + xx] =
          s.ids[yy * s.width + xx] + 1;
    if (collides) this.block(x, y, s.width, s.height);
    return s;
  }
  label(text, x, y, color = "#f4e8b6", size = 22) {
    const name = "label-" + Object.keys(sprites).length;
    const w = Math.max(2, Math.ceil((text.length * size * 0.56 + 26) / T));
    sprite(name, w, 1, (c) => {
      rect(c, 0, 0, w * T, 30, "#344e51");
      rect(c, 1, 1, w * T - 2, 2, "#b9a46d");
      c.fillStyle = color;
      c.font = `500 ${size}px Georgia`;
      c.textAlign = "center";
      c.fillText(text, (w * T) / 2, 24, w * T - 12);
    });
    this.put(name, x, y, "labels");
  }
  room(id, title, x, y, w, h, floor, doors = []) {
    this.fill("floors", x, y, w, h, floor);
    this.fill("walls", x, y, w, 1, "wall");
    this.fill("walls", x, y + h - 1, w, 1, "wall");
    this.fill("walls", x, y, 1, h, "wall");
    this.fill("walls", x + w - 1, y, 1, h, "wall");
    this.block(x, y, w, 1);
    this.block(x, y + h - 1, w, 1);
    this.block(x, y, 1, h);
    this.block(x + w - 1, y, 1, h);
    for (const [dx, dy, dw, dh] of doors) {
      this.fill("walls", dx, dy, dw, dh, "marker");
      this.block(dx, dy, dw, dh, false);
    }
    this.label(title, x + 2, y + 1);
    this.rooms.push({
      id,
      title,
      x: x * T,
      y: y * T,
      width: w * T,
      height: h * T,
      floor: this.id,
    });
  }
  table(id, x, y, chairs = "chair-teal", group = id) {
    this.put("table", x, y, "furniture", true);
    this.put("candle", x + 1, y, "animations");
    for (const [i, cx] of [0, 2].entries()) {
      this.chair(id + "-n" + i, cx + x, y - 1, "down", group, chairs);
      this.chair(id + "-s" + i, cx + x, y + 2, "up", group, chairs);
    }
  }
  chair(id, x, y, facing, group, name = "chair") {
    this.put(name, x, y);
    this.put("chair-front", x, y, "fronts");
    const d = { up: [0, 1], down: [0, -1], left: [1, 0], right: [-1, 0] }[
      facing
    ];
    this.block(x, y, 1, 1, false);
    this.block(x + d[0], y + d[1], 1, 1, false);
    this.seats.push({
      id,
      label: "Sitzplatz",
      x: x * T + 16,
      y: y * T + 16,
      standX: (x + d[0]) * T + 16,
      standY: (y + d[1]) * T + 16,
      facing,
      audioGroup: group || "",
    });
  }
  area(name, x, y, w, h, properties) {
    this.areas.push({
      id: this.oid++,
      name,
      type: "area",
      x: x * T,
      y: y * T,
      width: w * T,
      height: h * T,
      rotation: 0,
      visible: true,
      properties: properties.map(([n, v]) => P(n, v)),
    });
  }
  portal(name, x, y, w, h, target, entry) {
    this.links.push({
      name,
      x: x * T,
      y: y * T,
      width: w * T,
      height: h * T,
      target,
      entry,
    });
  }
  finish() {
    this.block(0, 0, this.w, 1);
    this.block(0, this.h - 1, this.w, 1);
    this.block(0, 0, 1, this.h);
    this.block(this.w - 1, 0, 1, this.h);
    for (const link of this.links)
      this.block(
        link.x / T,
        link.y / T,
        link.width / T,
        link.height / T,
        false,
      );
    let lid = 1;
    const tile = (name, data, properties = []) => ({
      id: lid++,
      name,
      type: "tilelayer",
      x: 0,
      y: 0,
      width: this.w,
      height: this.h,
      visible: true,
      opacity: 1,
      data,
      ...(properties.length ? { properties } : {}),
    });
    const markers = (points) => {
      const a = Array(this.w * this.h).fill(0);
      for (const [x, y] of points) a[y * this.w + x] = 1;
      return a;
    };
    const objects = (name, items) => ({
      id: lid++,
      name,
      type: "objectgroup",
      draworder: "topdown",
      x: 0,
      y: 0,
      visible: true,
      opacity: 1,
      objects: items,
    });
    const layers = [tile("start", markers([this.entries.start]))];
    for (const [name, pt] of Object.entries(this.entries))
      if (name !== "start")
        layers.push(tile(name, markers([pt]), [P("startLayer", true)]));
    for (const name of [
      "ground",
      "floors",
      "walls",
      "furniture",
      "animations",
      "labels",
    ])
      layers.push(tile(name, this.layers[name]));
    layers.push(
      tile(
        "collisions",
        Array.from({ length: this.w * this.h }, (_, i) =>
          this.blocked.has(i) ? 2 : 0,
        ),
      ),
    );
    for (const link of this.links) {
      const points = [];
      for (let y = link.y / T; y < (link.y + link.height) / T; y++)
        for (let x = link.x / T; x < (link.x + link.width) / T; x++)
          points.push([x, y]);
      layers.push(
        tile("door-" + link.name, markers(points), [
          P("exitUrl", nativeTarget(link.target + (link.entry ? "#" + link.entry : ""))),
        ]),
      );
    }
    layers.push(
      objects(
        "seating",
        this.seats.map((s) => ({
          id: this.oid++,
          name: "seat-" + s.id,
          type: "area",
          x: s.x - 16,
          y: s.y - 16,
          width: 32,
          height: 32,
          rotation: 0,
          visible: true,
          properties: [
            P("seatId", s.id),
            P("seatLabel", s.label),
            P("seatX", s.x),
            P("seatY", s.y),
            P("standX", s.standX),
            P("standY", s.standY),
            P("facing", s.facing),
            P("audioGroup", s.audioGroup),
          ],
        })),
      ),
    );
    layers.push(
      objects("activities", this.areas),
      objects("floorLayer", []),
      tile("furniture-fronts", this.layers.fronts),
    );
    return {
      compressionlevel: -1,
      width: this.w,
      height: this.h,
      tilewidth: T,
      tileheight: T,
      infinite: false,
      orientation: "orthogonal",
      renderorder: "right-down",
      tiledversion: "1.11.2",
      type: "map",
      version: "1.10",
      nextlayerid: lid,
      nextobjectid: this.oid,
      layers,
      properties: [
        P(
          "mapName",
          {
            erdgeschoss: "Schulschloss Erdgeschoss",
            obergeschoss: "Schulschloss Obergeschoss",
            umgebung: "Sternendorf und Schlossgarten",
            kino: "Schulschloss Kino",
          }[this.id],
        ),
        P("script", "room.js?v=20261108-wam1"),
        P("castleNativeMeetings", true),
        P("castleNativeRoomUrl", nativeTarget(this.id + ".tmj")),
        P("castleMapId", this.id),
        P("castleHallUrl", nativeTarget("grosse-halle.tmj")),
        P(
          "mapDescription",
          "Begehbare Grundriss-Vorschau. Bestehende Schulangebote bleiben unveraendert.",
        ),
      ],
      tilesets: [
        {
          firstgid: 1,
          name: "Schulschloss",
          columns,
          image: "art/castle-atlas.png",
          imagewidth: columns * T,
          imageheight: Math.ceil(cells.length / columns) * T,
          tilewidth: T,
          tileheight: T,
          tilecount: cells.length,
          margin: 0,
          spacing: 0,
          tiles: [{ id: 1, properties: [P("collides", true)] }, ...animations],
        },
      ],
    };
  }
}

function campus() {
  const m = new World("erdgeschoss", 128, 116);
  m.fill("floors", 20, 10, 88, 70, "stone");
  m.fill("walls", 20, 10, 88, 1, "wall");
  m.fill("walls", 20, 79, 88, 1, "wall");
  m.fill("walls", 20, 10, 1, 70, "wall");
  m.fill("walls", 107, 10, 1, 70, "wall");
  m.block(20, 10, 88, 1);
  m.block(20, 79, 88, 1);
  m.block(20, 10, 1, 70);
  m.block(107, 10, 1, 70);
  for (const [x, y, w, h] of [
    [62, 79, 4, 1],
    [107, 70, 1, 4],
  ]) {
    m.fill("walls", x, y, w, h, "marker");
    m.block(x, y, w, h, false);
  }
  m.fill("floors", 24, 32, 80, 6, "paving");
  m.fill("floors", 24, 57, 80, 6, "paving");
  m.fill("floors", 59, 12, 10, 66, "paving");
  m.room("lehrersalon", "Lehrersalon", 22, 12, 20, 19, "oak", [[30, 30, 4, 1]]);
  m.room("museum", "Museum", 44, 12, 14, 19, "stone", [[49, 30, 4, 1]]);
  m.room("musik", "Musikzimmer", 70, 12, 14, 19, "teal", [[75, 30, 4, 1]]);
  m.room("kino", "Kino", 86, 12, 20, 19, "cinema", [[94, 30, 4, 1]]);
  m.room("grundschule", "Grundschulstube", 22, 39, 26, 17, "rose", [
    [47, 46, 1, 4],
    [34, 55, 4, 1],
  ]);
  m.room("halle", "Grosse Halle", 50, 39, 28, 17, "stone", [
    [62, 39, 4, 1],
    [62, 55, 4, 1],
    [50, 46, 1, 4],
    [77, 46, 1, 4],
  ]);
  m.room("mittelstufe", "Mittelstufenraum", 80, 39, 26, 17, "teal", [
    [80, 46, 1, 4],
    [92, 55, 4, 1],
  ]);
  m.room("bibliothek", "Bibliothek", 22, 64, 26, 14, "oak", [[34, 64, 4, 1]]);
  m.room("atelier", "Atelier", 50, 64, 14, 14, "sand", [[54, 64, 4, 1]]);
  m.room("wohnen", "Wohnfluegel", 66, 64, 12, 14, "oak", [[70, 64, 4, 1]]);
  m.room("spiele", "Spielesaal", 80, 64, 26, 14, "oak", [[92, 64, 4, 1]]);
  m.table("lehrersalon", 27, 21);
  m.put("fireplace", 37, 17, "animations", true);
  m.put("door", 30, 14);
  m.portal(
    "lehrerzimmer",
    30,
    16,
    3,
    1,
    "../teachersmeetingground.tmj",
    "south",
  );
  m.put("portrait", 46, 16, "animations", true);
  m.put("portrait", 53, 16, "animations", true);
  m.put("small-table", 49, 23);
  m.table("musik", 74, 23, "chair-gold");
  m.put("book", 78, 18, "animations");
  m.put("screen", 93, 15, "furniture", true);
  m.label("Ruhezone", 91, 18, "#e3dcb7", 18);
  for (let row = 0; row < 2; row++)
    for (let col = 0; col < 4; col++)
      m.chair(
        "kino-front-" + row + "-" + col,
        90 + col * 4,
        21 + row * 3,
        "up",
        "",
        "chair-plum",
      );
  m.table("kino-hinten", 94, 27, "chair-plum");
  m.area("kino-film", 87, 14, 18, 16, [
    ["openWebsite", "https://deutsche-online-schule.com/kino/public/kino.php"],
    ["openWebsiteTrigger", "onaction"],
    ["openWebsiteTriggerMessage", "Kino oeffnen"],
    ["openWebsiteWidth", 60],
    [
      "openWebsitePolicy",
      "fullscreen; autoplay; encrypted-media; picture-in-picture",
    ],
  ]);
  m.area("kino-ruhezone", 87, 18, 18, 8, [["silent", true]]);
  m.put("stairs", 62, 15, "furniture");
  m.label("Obergeschoss", 60, 22, "#e4d39e", 17);
  m.portal("oben", 63, 17, 2, 1, "obergeschoss.tmj", "vom-eg");
  m.put("rug", 32, 45, "floors");
  m.table("gs-malen", 26, 44, "chair-gold");
  m.table("gs-puzzle", 39, 49, "chair");
  m.put("sofa", 26, 50);
  m.put("book", 39, 42, "animations");
  m.table("halle-west", 54, 45, "chair-gold");
  m.table("halle-ost", 69, 45, "chair-gold");
  m.put("fountain", 62, 44, "animations", true);
  m.table("ms-spiele", 85, 44);
  m.table("ms-reden", 97, 49);
  m.put("sofa", 84, 50);
  m.put("fireplace", 101, 42, "animations", true);
  m.put("bookshelf", 24, 67, "furniture", true);
  m.put("bookshelf", 41, 67, "furniture", true);
  m.table("lesen-1", 27, 72);
  m.table("lesen-2", 39, 72);
  m.put("book", 32, 68, "animations");
  m.table("atelier-1", 54, 70, "chair-gold");
  m.put("portrait", 59, 66, "animations", true);
  m.put("door", 71, 67);
  m.table("wohnfluegel", 69, 73, "chair");
  m.table("schach", 84, 69);
  m.table("zeichnen", 98, 69, "chair");
  m.table("karten", 91, 73, "chair-gold");
  for (const [x, y] of [
    [23, 33],
    [53, 33],
    [77, 33],
    [101, 33],
    [23, 59],
    [52, 59],
    [76, 59],
    [102, 59],
  ])
    m.put("candle", x, y, "animations");
  m.put("portrait", 40, 33, "animations");
  m.put("portrait", 85, 58, "animations");
  for (let y = 82; y < 116; y++) m.fill("animations", 56, y, 4, 1, "water");
  m.block(56, 82, 4, 34);
  m.fill("floors", 62, 79, 4, 18, "paving");
  m.fill("floors", 22, 97, 77, 4, "paving");
  m.fill("floors", 54, 96, 8, 6, "paving");
  m.fill("animations", 54, 96, 8, 6, "marker");
  m.block(54, 96, 8, 6, false);
  m.fill("floors", 15, 91, 25, 18, "paving");
  m.put("fountain", 25, 97, "animations", true);
  m.label("Dorfplatz", 19, 91);
  for (const [x, y] of [
    [5, 84],
    [17, 83],
    [33, 83],
    [5, 101],
    [36, 101],
  ])
    m.put("house", x, y, "furniture", true);
  m.fill("floors", 80, 95, 31, 16, "sand");
  for (const [x, y] of [
    [81, 96],
    [91, 96],
    [102, 96],
    [81, 105],
    [102, 105],
  ])
    m.put("stall", x, y, "furniture", true);
  m.label("Sternenmarkt", 85, 92);
  m.fill("floors", 83, 82, 37, 10, "grass-light");
  m.fill("floors", 106, 71, 6, 29, "paving");
  m.put("fountain", 95, 85, "animations", true);
  m.table("garten", 86, 87, "chair-gold");
  m.label("Schlossgarten", 86, 82);
  for (let x = 82; x < 121; x += 2) {
    m.put("hedge", x, 81);
    m.put("hedge", x, 92);
  }
  for (const [x, y] of [
    [81, 84],
    [116, 84],
    [72, 89],
    [43, 89],
    [11, 74],
    [4, 56],
    [120, 105],
    [70, 107],
  ])
    m.put("tree", x, y, "furniture", true);
  m.fill("floors", 3, 23, 13, 52, "track");
  m.fill("floors", 7, 28, 5, 42, "grass");
  m.label("Rundkurs", 3, 20);
  m.put("cart", 4, 68);
  m.put("cart", 12, 68);
  m.fill("floors", 112, 24, 9, 5, "paving");
  m.fill("animations", 115, 29, 3, 43, "water");
  m.fill("animations", 110, 72, 14, 8, "water");
  m.label("Rutschenturm", 110, 21, "#f4e8b6", 17);
  m.put("stairs", 111, 24);
  const waypoints = [
    [116, 28],
    [116, 40],
    [116, 54],
    [116, 68],
    [116, 76],
    [109, 76],
  ].map(([x, y]) => ({ x: x * T + 16, y: y * T + 16 }));
  m.rides.push({
    id: "wasserrutsche",
    x: 114 * T,
    y: 27 * T,
    width: 3 * T,
    height: 2 * T,
    waypoints,
  });
  m.area("wasserrutsche", 114, 27, 3, 2, [
    ["castleRide", JSON.stringify(waypoints)],
  ]);
  m.area("kamin-ms", 98, 41, 7, 6, [
    ["playAudio", "../village/fire.mp3"],
    ["audioLoop", true],
    ["audioVolume", 0.1],
  ]);
  m.label("Schlossterrasse", 59, 81);
  m.label("Sternenbruecke", 51, 103, "#f4e8b6", 17);
  m.rooms.push(
    {
      id: "dorf",
      title: "Dorfplatz & Bruecke",
      x: 15 * T,
      y: 90 * T,
      width: 25 * T,
      height: 20 * T,
      floor: m.id,
    },
    {
      id: "markt",
      title: "Markt & Schlossgarten",
      x: 80 * T,
      y: 82 * T,
      width: 40 * T,
      height: 28 * T,
      floor: m.id,
    },
    {
      id: "rutsche",
      title: "Rutschenturm",
      x: 110 * T,
      y: 21 * T,
      width: 14 * T,
      height: 59 * T,
      floor: m.id,
    },
    {
      id: "kurs",
      title: "Garten-Rundkurs",
      x: 3 * T,
      y: 20 * T,
      width: 14 * T,
      height: 55 * T,
      floor: m.id,
    },
  );
  m.put("rug", 54, 44, "floors");
  m.put("rug", 69, 44, "floors");
  m.put("column", 52, 41);
  m.put("column", 75, 41);
  m.put("sofa", 24, 17, "furniture", true);
  m.put("plant", 24, 25, "furniture", true);
  m.put("landscape", 34, 14, "furniture");
  m.put("bookshelf", 38, 41, "furniture", true);
  m.put("plant", 43, 51, "furniture", true);
  m.put("cushion", 29, 51);
  m.put("cushion", 30, 52);
  m.put("window", 40, 39);
  m.put("landscape", 88, 41);
  m.put("bookshelf", 94, 41, "furniture", true);
  m.put("plant", 82, 52, "furniture", true);
  m.put("cushion", 87, 52);
  m.put("sofa", 33, 67, "furniture", true);
  m.put("plant", 24, 73, "furniture", true);
  m.put("plant", 44, 73, "furniture", true);
  m.chair("lesen-nische", 35, 71, "up", "lesen-nische");
  m.put("piano", 72, 17, "furniture", true);
  m.put("plant", 80, 26, "furniture", true);
  m.put("easel", 59, 72, "furniture", true);
  m.put("easel", 51, 67, "furniture", true);
  m.put("chessboard", 85, 69, "animations");
  m.put("book", 99, 69, "animations");
  m.put("plant", 103, 74, "furniture", true);
  m.put("sofa", 69, 68, "furniture", true);
  m.put("teacup", 28, 21, "animations");
  m.put("teacup", 40, 72, "animations");
  m.put("clock", 45, 66, "animations");
  m.area("lesekreis-bibliothek", 25, 70, 20, 6, [
    ["conversationGroup", "bibliothek-lesekreis"],
    ["conversationLabel", "Lesekreis"],
  ]);
  m.label("Lesekreis", 33, 69, "#e8d6ae", 17);
  m.area("vorlesekreis-grundschule", 34, 44, 11, 9, [
    ["conversationGroup", "grundschule-vorlesen"],
    ["conversationLabel", "Vorlesekreis"],
  ]);
  m.area("gartenrunde", 84, 85, 11, 7, [
    ["conversationGroup", "gartenrunde"],
    ["conversationLabel", "Gartenrunde"],
  ]);
  m.entries = {
    start: [64, 52],
    "vom-og": [64, 26],
    hof: [64, 75],
    garten: [104, 72],
    kino: [96, 28],
  };
  return m;
}
function upstairs() {
  const m = new World("obergeschoss", 96, 74);
  m.fill("floors", 12, 12, 72, 50, "stone");
  m.room("oberstufe", "Oberstufenraum", 14, 14, 26, 20, "plum", [
    [26, 33, 4, 1],
  ]);
  m.room("leseturm", "Leseturm", 42, 14, 20, 20, "oak", [[50, 33, 4, 1]]);
  m.room("sternwarte", "Sternwarte", 64, 14, 18, 20, "teal", [[70, 33, 4, 1]]);
  m.room("wandelsaal", "Wandelsaal", 14, 42, 26, 18, "sand", [[26, 42, 4, 1]]);
  m.room("festsaal", "Festsaal", 42, 42, 24, 18, "oak", [[52, 42, 4, 1]]);
  m.room("werkstatt", "Werkstatt", 68, 42, 14, 18, "stone", [[72, 42, 4, 1]]);
  m.fill("floors", 14, 35, 68, 6, "paving");
  m.table("og-gespraech", 19, 23, "chair-plum");
  m.table("og-lernen", 31, 27, "chair-plum");
  m.put("fireplace", 33, 18, "animations", true);
  m.put("bookshelf", 44, 17, "furniture", true);
  m.table("leseturm", 49, 26);
  m.put("book", 55, 19, "animations");
  m.put("rug", 69, 22, "floors");
  m.put("comet", 71, 18, "animations");
  m.put("window", 70, 17);
  m.table("sterne", 68, 27, "chair-gold");
  m.put("portrait", 17, 46, "animations", true);
  m.put("portrait", 33, 46, "animations", true);
  m.table("ausstellung", 24, 52);
  m.put("stage", 50, 45, "furniture", true);
  for (let row = 0; row < 2; row++)
    for (let col = 0; col < 4; col++)
      m.chair(
        "buehne-" + row + "-" + col,
        47 + col * 4,
        51 + row * 4,
        "up",
        "festsaal",
        "chair-gold",
      );
  m.table("werkstatt", 72, 52);
  m.put("book", 77, 46, "animations");
  m.label("Wandelgang", 45, 36, "#f4e8b6", 18);
  m.put("stairs", 37, 35);
  m.put("sofa", 18, 28, "furniture", true);
  m.put("plant", 16, 19, "furniture", true);
  m.put("landscape", 25, 17);
  m.put("rug", 19, 22, "floors");
  m.put("sofa", 54, 19, "furniture", true);
  m.put("plant", 58, 28, "furniture", true);
  m.put("easel", 75, 45, "furniture", true);
  m.area("leseturm-runde", 44, 19, 16, 13, [
    ["conversationGroup", "leseturm"],
    ["conversationLabel", "Leseturm-Runde"],
  ]);
  m.portal("unten", 38, 38, 2, 1, "grosse-halle.tmj", "vom-og");
  m.entries = { start: [44, 38], "vom-eg": [44, 38] };
  return m;
}
function crop(source, id, x, y, width, height) {
  const m = new World(id, width, height);
  for (const layer of Object.keys(m.layers))
    m.layers[layer] = Array.from(
      { length: width * height },
      (_, i) =>
        source.layers[layer][
          (y + Math.floor(i / width)) * source.w + x + (i % width)
        ],
    );
  m.blocked = new Set(
    [...source.blocked]
      .filter(
        (i) =>
          i % source.w >= x &&
          i % source.w < x + width &&
          Math.floor(i / source.w) >= y &&
          Math.floor(i / source.w) < y + height,
      )
      .map((i) => (Math.floor(i / source.w) - y) * width + (i % source.w) - x),
  );
  const contained = (o) =>
    o.x >= x * T &&
    o.x < (x + width) * T &&
    o.y >= y * T &&
    o.y < (y + height) * T;
  const shift = (o) => ({ ...o, x: o.x - x * T, y: o.y - y * T });
  m.rooms = source.rooms
    .filter(contained)
    .map((o) => ({ ...shift(o), floor: id }));
  m.seats = source.seats
    .filter(contained)
    .map((o) => ({
      ...shift(o),
      standX: o.standX - x * T,
      standY: o.standY - y * T,
    }));
  m.areas = source.areas
    .filter(contained)
    .map((o) => ({
      ...shift(o),
      properties: o.properties.map((p) =>
        p.name === "castleRide"
          ? {
              ...p,
              value: JSON.stringify(
                JSON.parse(p.value).map((pt) => ({
                  x: pt.x - x * T,
                  y: pt.y - y * T,
                })),
              ),
            }
          : p,
      ),
    }));
  m.rides = source.rides
    .filter(contained)
    .map((o) => ({
      ...shift(o),
      waypoints: o.waypoints.map((pt) => ({
        x: pt.x - x * T,
        y: pt.y - y * T,
      })),
    }));
  m.links = source.links.filter(contained).map(shift);
  m.entries = Object.fromEntries(
    Object.entries(source.entries).map(([k, p]) => [k, [p[0] - x, p[1] - y]]),
  );
  m.oid = source.oid;
  return m;
}
function splitCampus() {
  const all = campus();
  const eg = crop(all, "erdgeschoss", 20, 10, 88, 70);
  eg.seats = eg.seats.filter((s) => !s.id.startsWith("kino-"));
  eg.areas = eg.areas.filter((a) => !a.name.startsWith("kino-"));
  const foyer = eg.rooms.find((r) => r.id === "kino");
  foyer.title = "Kinofoyer";
  for (const layer of ["furniture", "animations", "fronts", "labels"])
    eg.fill(layer, 67, 3, 18, 17, "marker");
  eg.block(67, 3, 18, 17, false);
  eg.label("Kinofoyer", 68, 3);
  eg.put("sofa", 69, 6, "furniture", true);
  eg.put("sofa", 79, 6, "furniture", true);
  eg.put("plant", 69, 15, "furniture", true);
  eg.table("foyer-tisch", 75, 13);
  eg.put("door", 75, 5);
  eg.portal("kinosaal", 75, 7, 3, 1, "kino.tmj", "foyer");
  eg.put("door", 71, 31);
  eg.portal("mittelstufenraum", 71, 33, 3, 1, "mittelstufe.tmj", "vom-flur");
  eg.entries["mittelstufe-anreise"] = [72, 36];
  eg.entries["bibliothek-anreise"] = [15, 55];
  eg.entries["halle"] = [44, 40];
  eg.put("door", 42, 31);
  eg.portal("grosse-halle", 42, 33, 3, 1, "grosse-halle.tmj", "bibliothek");
  eg.portal("hof", 42, 69, 4, 1, "umgebung.tmj", "schlosstor");
  eg.portal("garten", 87, 60, 1, 4, "umgebung.tmj", "garten");
  const exterior = all;
  exterior.id = "umgebung";
  exterior.rooms = all.rooms
    .filter((r) => ["dorf", "markt", "rutsche", "kurs"].includes(r.id))
    .map((r) => ({ ...r, floor: "umgebung" }));
  exterior.seats = all.seats.filter((s) => s.y >= 80 * T);
  exterior.areas = all.areas.filter(
    (a) => a.y >= 80 * T || a.name === "wasserrutsche",
  );
  exterior.links = [];
  for (const layer of [
    "floors",
    "walls",
    "furniture",
    "animations",
    "labels",
    "fronts",
  ])
    exterior.fill(layer, 20, 10, 88, 70, "marker");
  exterior.fill("floors", 20, 10, 88, 70, "roof");
  exterior.block(20, 10, 88, 70);
  exterior.put("tower", 19, 7, "furniture", true);
  exterior.put("tower", 102, 7, "furniture", true);
  exterior.put("tower", 19, 69, "furniture", true);
  exterior.put("tower", 102, 69, "furniture", true);
  exterior.put("tower", 61, 4, "furniture", true);
  exterior.label("Schulschloss", 58, 73);
  exterior.put("door", 63, 78);
  exterior.rooms.unshift({
    id: "schloss",
    title: "Schlossterrasse",
    x: 58 * T,
    y: 80 * T,
    width: 14 * T,
    height: 12 * T,
    floor: "umgebung",
  });
  exterior.portal("schloss", 62, 80, 4, 1, "grosse-halle.tmj", "schlosstor");
  exterior.portal("garten", 108, 70, 1, 4, "erdgeschoss.tmj", "garten");
  for (const layer of [
    "floors",
    "walls",
    "furniture",
    "animations",
    "labels",
    "fronts",
  ])
    exterior.fill(layer, 19, 4, 89, 76, "marker");
  exterior.block(19, 4, 89, 76, false);
  exterior.put("castle-facade", 32, 48, "fronts");
  exterior.block(36, 69, 56, 11);
  exterior.label("Schulschloss", 58, 77);
  exterior.fill("floors", 3, 23, 13, 52, "grass");
  exterior.fill("floors", 3, 45, 13, 30, "track");
  exterior.fill("floors", 7, 49, 5, 22, "grass");
  exterior.label("Rundkurs", 3, 42);
  exterior.fill("animations", 115, 40, 3, 6, "marker");
  exterior.fill("floors", 112, 42, 9, 5, "paving");
  exterior.put("stairs", 111, 42);
  exterior.label("Rutschenturm", 110, 40, "#f4e8b6", 17);
  exterior.put("door", 107, 70);
  exterior.label("Gartentor", 104, 74, "#f4e8b6", 17);
  const route = [
    [116, 46],
    [116, 54],
    [116, 68],
    [116, 76],
    [109, 76],
  ].map(([x, y]) => ({ x: x * T + 16, y: y * T + 16 }));
  exterior.areas = exterior.areas.filter((a) => a.name !== "wasserrutsche");
  exterior.rides = [
    {
      id: "wasserrutsche",
      x: 114 * T,
      y: 45 * T,
      width: 3 * T,
      height: 2 * T,
      waypoints: route,
    },
  ];
  exterior.area("wasserrutsche", 114, 45, 3, 2, [
    ["castleRide", JSON.stringify(route)],
  ]);
  const course = exterior.rooms.find((r) => r.id === "kurs");
  course.y = 42 * T;
  course.height = 34 * T;
  const slide = exterior.rooms.find((r) => r.id === "rutsche");
  slide.y = 40 * T;
  slide.height = 40 * T;
  exterior.entries = {
    start: [64, 84],
    schlosstor: [64, 83],
    garten: [110, 72],
  };
  return [eg, crop(exterior, "umgebung", 0, 40, 128, 76)];
}
async function main() {
  // Animated source files are read and rebuilt in one run on Windows.
  sharp.cache(false);
  fs.mkdirSync(out, { recursive: true });
  await createArt();
  const worlds = [...splitCampus(), upstairs()];
  // Collision tile 2 is deliberately transparent, separate from the visible ground.
  cells[1] = createCanvas(T, T);
  const atlas = createCanvas(
      columns * T,
      Math.ceil(cells.length / columns) * T,
    ),
    ctx = atlas.getContext("2d");
  cells.forEach((cell, i) =>
    ctx.drawImage(cell, (i % columns) * T, Math.floor(i / columns) * T),
  );
  await sharp(png(atlas))
    .png({ compressionLevel: 9 })
    .toFile(path.join(out, "art", "castle-atlas.png"));
  const maps = {};
  for (const world of worlds) {
    const map = world.finish();
    maps[world.id] = map;
    fs.writeFileSync(
      path.join(out, world.id + ".tmj"),
      JSON.stringify(map) + "\n",
    );
    writeWam(map, out);
  }
  const middle = await buildMiddleCommonRoom();
  const hall = await buildGreatHall();
  const cinema = await buildCinema();
  const manifest = {
    version: 1,
    tileSize: T,
    sprites: Object.fromEntries(
      Object.entries(sprites).map(([k, s]) => [
        k,
        { width: s.width, height: s.height, ids: s.ids },
      ]),
    ),
    animations,
    worlds: [
      ...worlds.map((w) => ({
        id: w.id,
        width: w.w,
        height: w.h,
        rooms: w.rooms,
        seats: w.seats,
        rides: w.rides,
        links: w.links,
        entries: w.entries,
      })),
      middle.world,
      hall.world,
      cinema.world,
    ],
  };
  fs.writeFileSync(
    path.join(out, "layout.json"),
    JSON.stringify(manifest) + "\n",
  );
  for (const name of [
    "portrait",
    "fireplace",
    "fountain",
    "book",
    "teacup",
    "clock",
  ]) {
    const s = sprites[name];
    await sharp(
      s.frames.map((f) => png(f.canvas)),
      { join: { animated: true } },
    )
      .gif({
        delay: animations
          .find((a) => a.id === s.ids[0])
          .animation.map((a) => a.duration),
        loop: 0,
      })
      .toFile(path.join(out, "art", name + ".gif"));
  }
  for (const w of worlds) {
    const c = createCanvas(w.w * T, w.h * T),
      g = c.getContext("2d");
    for (const layer of maps[w.id].layers.filter(
      (l) =>
        l.type === "tilelayer" &&
        !["collisions", "start"].includes(l.name) &&
        !l.name.startsWith("door-") &&
        !Object.keys(w.entries).includes(l.name),
    )) {
      layer.data.forEach((gid, i) => {
        if (gid)
          g.drawImage(cells[gid - 1], (i % w.w) * T, Math.floor(i / w.w) * T);
      });
    }
    await sharp(png(c))
      .resize({ width: w.id === "erdgeschoss" ? 1536 : 1280 })
      .png()
      .toFile(path.join(out, "art", w.id + "-overview.png"));
  }
  console.log(
    JSON.stringify({
      maps: manifest.worlds.map((w) => ({
        id: w.id,
        rooms: w.rooms.length,
        seats: w.seats.length,
        tiles: w.width * w.height,
      })),
      tiles: cells.length,
      animations: animations.length,
    }),
  );
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
