const { join } = require('path');

module.exports = {
  serverScript: join(__dirname, 'scripts/hosted_mode/server.js'),
  cwd: join(__dirname),
};