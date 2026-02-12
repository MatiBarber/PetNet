const fs = require('fs');
const os = require('os');
const path = require('path');

// Cargar DATABASE_URL para cada worker antes de cargar módulos (como @prisma/client)
(() => {
  // Buscar el marker más reciente si no conocemos el PID
  const files = fs.readdirSync(os.tmpdir()).filter(f => f.startsWith('be-petnet-jest-') && f.endsWith('.json'));
  if (files.length === 0) {
    // Nada que hacer si no hay marker; dejar que falle claramente después
    return;
  }
  // Elegimos el más reciente por timestamp de FS
  const entries = files.map(f => ({
    file: f,
    mtime: fs.statSync(path.join(os.tmpdir(), f)).mtimeMs,
  })).sort((a, b) => b.mtime - a.mtime);

  const markerPath = path.join(os.tmpdir(), entries[0].file);
  const { dbUrl } = JSON.parse(fs.readFileSync(markerPath, 'utf8'));

  process.env.DATABASE_URL = dbUrl;
  process.env.NODE_ENV = process.env.NODE_ENV || 'test';
  process.env.BE_PETNET_JEST_MARKER = markerPath;
})();
