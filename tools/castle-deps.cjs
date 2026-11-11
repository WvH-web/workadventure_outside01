const path = require("node:path");
const { createRequire } = require("node:module");
module.exports = function dependency(name) {
  if (name === 'playwright' && process.platform === 'win32') require('./castle-local-storage.cjs').configure();
  try {
    return require(name);
  } catch (original) {
    const candidates = [
      process.env.CODEX_NODE_MODULES,
      require('./castle-local-storage.cjs').dependencyDirectory(),
    ];
    for (const directory of candidates.filter(Boolean)) {
      try {
        return createRequire(path.join(directory, "../package.json"))(name);
      } catch {}
    }
    throw original;
  }
};
