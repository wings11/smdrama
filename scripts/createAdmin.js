#!/usr/bin/env node
/*
  Create an admin user in the MongoDB database using the existing User model.
  Usage:
    node scripts/createAdmin.js --email=admin@example.com --password=secret123
  Or set environment variables: ADMIN_EMAIL and ADMIN_PASSWORD
  The script uses the project's config (MONGODB_URI) and the User model so passwords are hashed correctly.
*/

const mongoose = require('mongoose');
const path = require('path');
const readline = require('readline');

// Load project env via dotenv if available
require('dotenv').config({ path: path.resolve(process.cwd(), '.env') });

const config = require(path.resolve(process.cwd(), 'config', 'index.js'));
const User = require(path.resolve(process.cwd(), 'models', 'User.js'));

function ask(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => rl.question(question, ans => { rl.close(); resolve(ans); }));
}

async function main() {
  try {
    const argv = require('minimist')(process.argv.slice(2));

  const role = (argv.role || process.env.ADMIN_ROLE || 'admin').toLowerCase();
  const email = argv.email || process.env.ADMIN_EMAIL || await ask(`${role} email: `);
  const password = argv.password || process.env.ADMIN_PASSWORD || await ask(`${role} password (min 6 chars): `);

    if (!email || !password) {
      console.error('Email and password are required');
      process.exit(1);
    }

    if (password.length < 6) {
      console.error('Password must be at least 6 characters');
      process.exit(1);
    }

    console.log('Connecting to MongoDB...');
    await mongoose.connect(config.mongodbUri, { autoIndex: true });

    // Check for existing user
    const normalizedEmail = email.toLowerCase().trim();
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      console.log('A user with that email already exists:');
      console.log(existing.toJSON());
      process.exit(0);
    }

    // Create with requested role (admin or client)
    const user = new User({ email: normalizedEmail, password, role: role === 'client' ? 'client' : 'admin', isActive: true });
    await user.save();

    console.log('Admin user created successfully:');
    console.log({ id: user._id, email: user.email, role: user.role, createdAt: user.createdAt });
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Failed to create admin user:', err);
    try { await mongoose.disconnect(); } catch (e) {}
    process.exit(1);
  }
}

main();
