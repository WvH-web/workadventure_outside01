const http = require("node:http"),
  fs = require("node:fs"),
  path = require("node:path");
const base = path.resolve(__dirname, "../castle"),
  port = Number(process.argv[2] || 4192);
const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json",
  ".tmj": "application/json",
  ".png": "image/png",
  ".gif": "image/gif",
};
http
  .createServer((req, res) => {
    if (!["GET", "HEAD"].includes(req.method)) {
      res.writeHead(405);
      res.end();
      return;
    }
    let name;
    try {
      name = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
    } catch {
      res.writeHead(400);
      res.end();
      return;
    }
    const file = path.resolve(
      base,
      "." + (name === "/" ? "/index.html" : name),
    );
    const relative = path.relative(base, file),
      type = types[path.extname(file)];
    if (relative.startsWith("..") || path.isAbsolute(relative) || !type) {
      res.writeHead(403);
      res.end();
      return;
    }
    fs.stat(file, (error, stat) => {
      if (error || !stat.isFile()) {
        res.writeHead(404);
        res.end();
        return;
      }
      res.writeHead(200, {
        "Content-Type": type,
        "Content-Length": stat.size,
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      });
      if (req.method === "HEAD") res.end();
      else fs.createReadStream(file).pipe(res);
    });
  })
  .listen(port, "127.0.0.1", () =>
    console.log(`Schlossvorschau: http://127.0.0.1:${port}/`),
  );
