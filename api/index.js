const app = require('../backend/app');
const { initDatabase } = require('../backend/database');

let initialized = false;

module.exports = async (req, res) => {
  if (!initialized) {
    await initDatabase();
    initialized = true;
  }
  return app(req, res);
};
