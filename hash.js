
const bcrypt = require('bcryptjs');

async function main() {
  const pass = process.argv[2];
  if (!pass) return console.error('Usage: node scripts/hashPassword.js <password>');
  const salt = await bcrypt.genSalt(12);
  const hash = await bcrypt.hash(pass, salt);
  console.log(hash);
}

main();


//haw
