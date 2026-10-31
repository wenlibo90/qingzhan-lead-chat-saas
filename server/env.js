'use strict';

const fs = require('node:fs');
const path = require('node:path');

const file = process.env.ENV_FILE || path.join(__dirname, '..', '.env');
if (fs.existsSync(file)) {
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    if (!line || /^\s*#/.test(line)) continue;
    const match = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/.exec(line);
    if (!match) continue;
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    value = value.replace(/\\n/g, '\n');
    if (process.env[match[1]] == null) process.env[match[1]] = value;
  }
}

module.exports = file;
