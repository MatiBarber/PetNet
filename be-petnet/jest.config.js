module.exports = {
  testEnvironment: 'node',
  // Crea y migra una DB SQLite temporal antes de los tests y la borra al final
  globalSetup: '<rootDir>/test/jest.globalSetup.js',
  globalTeardown: '<rootDir>/test/jest.globalTeardown.js',
  // Asegura que los workers de Jest tengan DATABASE_URL configurada antes de cargar módulos
  setupFiles: ['<rootDir>/test/jest.env.js'],
  // Utilidades y helpers opcionales para tests
  setupFilesAfterEnv: ['<rootDir>/test/jest.setup.js'],
  testPathIgnorePatterns: ['/node_modules/', '/public/'],
};
