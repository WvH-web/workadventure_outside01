const path = require("node:path");
const { createRequire } = require("node:module");
module.exports = function dependency(name) {
  try {
    return require(name);
  } catch (original) {
    const candidates = [
      process.env.CODEX_NODE_MODULES,
      "C:/Program Files/WindowsApps/OpenAI.CodexPrimaryRuntime.v26-1104-2876-0_26.1104.2876.0_x64__3k8sg7r9htsxt/dependencies/node/node_modules",
    ];
    for (const directory of candidates.filter(Boolean)) {
      try {
        return createRequire(path.join(directory, "../package.json"))(name);
      } catch {}
    }
    throw original;
  }
};
