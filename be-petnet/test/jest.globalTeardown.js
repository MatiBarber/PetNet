const fs = require('fs');
const path = require('path');

module.exports = async () => {
  const markerPath = process.env.BE_PETNET_JEST_MARKER || null;
  let dbPath = null;

  try {
    let payload = null;
    if (markerPath && fs.existsSync(markerPath)) {
      payload = JSON.parse(fs.readFileSync(markerPath, 'utf8'));
    } else {
      // Fallback: tratar de encontrar el marker más reciente
      const os = require('os');
      const files = fs.readdirSync(os.tmpdir()).filter(f => f.startsWith('be-petnet-jest-') && f.endsWith('.json'));
      if (files.length > 0) {
        const entries = files.map(f => ({ file: f, mtime: fs.statSync(path.join(os.tmpdir(), f)).mtimeMs }))
          .sort((a, b) => b.mtime - a.mtime);
        const candidate = path.join(os.tmpdir(), entries[0].file);
        payload = JSON.parse(fs.readFileSync(candidate, 'utf8'));
      }
    }

    if (payload && payload.dbPath) {
      dbPath = payload.dbPath;
    }
  } catch (_) {
    // ignore
  }

  // Borrar el archivo de base de datos temporal
  if (dbPath && fs.existsSync(dbPath)) {
    try {
      fs.unlinkSync(dbPath);
    } catch (_) {}
  }

  // Borrar el marker
  if (markerPath && fs.existsSync(markerPath)) {
    try { fs.unlinkSync(markerPath); } catch (_) {}
  }
};
