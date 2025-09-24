#!/usr/bin/env node
// Convenience wrapper: node createclient.js --email=... --password=...
const path = require('path');
const child = require('child_process');

const args = process.argv.slice(2);
const script = path.resolve(__dirname, 'scripts', 'createAdmin.js');

const finalArgs = ['--role=client', ...args];
const proc = child.spawn(process.execPath, [script, ...finalArgs], { stdio: 'inherit' });
proc.on('exit', code => process.exit(code));
