#!/usr/bin/env node
// Wrapper: node cleardata.js --yes
const path = require('path');
const child = require('child_process');

const args = process.argv.slice(2);
const script = path.resolve(__dirname, 'scripts', 'clearData.js');

const proc = child.spawn(process.execPath, [script, ...args], { stdio: 'inherit' });
proc.on('exit', code => process.exit(code));
