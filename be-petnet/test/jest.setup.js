const fs = require('fs');
const os = require('os');
const path = require('path');

// Helper para crear/eliminar base de datos temporal
module.exports.createTestDb = () => {
  const dbPath = path.join(os.tmpdir(), `test-db-${Date.now()}.sqlite`);
  fs.writeFileSync(dbPath, '');
  return dbPath;
};

module.exports.deleteTestDb = (dbPath) => {
  if (fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath);
  }
};
