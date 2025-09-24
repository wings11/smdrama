#!/usr/bin/env node
/**
 * Clear data script
 * Usage:
 *   node scripts/clearData.js      # will prompt for confirmation
 *   node scripts/clearData.js --yes # run non-interactively
 */

const path = require('path');
const readline = require('readline');
const mongoose = require('mongoose');

require('dotenv').config({ path: path.resolve(process.cwd(), '.env') });
const config = require(path.resolve(process.cwd(), 'config', 'index.js'));

const Movie = require(path.resolve(process.cwd(), 'models', 'Movie.js'));
const Episode = require(path.resolve(process.cwd(), 'models', 'Episode.js'));
const Click = require(path.resolve(process.cwd(), 'models', 'Click.js'));

function ask(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => rl.question(question, ans => { rl.close(); resolve(ans); }));
}

async function main() {
  const argv = process.argv.slice(2);
  const auto = argv.includes('--yes') || argv.includes('-y');

  console.log('WARNING: This will permanently delete ALL documents in the movies, episodes, and clicks collections.');
  if (!auto) {
    const ans = (await ask('Type DELETE to confirm: ')).trim();
    if (ans !== 'DELETE') {
      console.log('Aborted. No data was changed.');
      process.exit(0);
    }
  }

  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(config.mongodbUri, { autoIndex: true });

    console.log('Deleting clicks...');
    await Click.deleteMany({});
    console.log('Deleting episodes...');
    await Episode.deleteMany({});
    console.log('Deleting movies...');
    await Movie.deleteMany({});

    console.log('Data cleared successfully. Users collection left intact.');
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Failed to clear data:', err);
    try { await mongoose.disconnect(); } catch (e) {}
    process.exit(1);
  }
}

main();
