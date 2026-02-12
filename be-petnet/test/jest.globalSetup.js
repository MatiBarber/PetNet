const fs = require('fs');
const os = require('os');
const path = require('path');
const { execSync } = require('child_process');

module.exports = async () => {
  const dbPath = path.join(os.tmpdir(), `be-petnet-test-${Date.now()}-${Math.random().toString(36).slice(2)}.sqlite`);
  const dbUrl = `file:${dbPath}`;

  // Persistimos la ruta para los workers y para el teardown
  const markerPath = path.join(os.tmpdir(), `be-petnet-jest-${process.pid}.json`);
  fs.writeFileSync(markerPath, JSON.stringify({ dbPath, dbUrl }), 'utf8');

  // Seteamos en este proceso por si jest reusa env; los workers lo leerán desde jest.env.js
  process.env.DATABASE_URL = dbUrl;
  process.env.BE_PETNET_JEST_MARKER = markerPath;
  process.env.NODE_ENV = 'test';

  // Generar el cliente y aplicar el schema a la DB temporal
  try {
    execSync('npx prisma generate', { stdio: 'inherit' });
    execSync('npx prisma migrate deploy', { stdio: 'inherit', env: { ...process.env, DATABASE_URL: dbUrl } });
  } catch (err) {
    console.error('Error preparando la DB de test:', err.message);
    throw err;
  }
};
