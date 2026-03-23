require('dotenv').config({ path: '.env' });
require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

async function updateAdmin() {
  try {
    await mongoose.connect(process.env.DATABASE);
    const Admin = require('./src/models/coreModels/Admin');
    const result = await Admin.findOneAndUpdate({ role: 'owner' }, { email: 'hello@bespokescript.com' }, { new: true });
    console.log('Admin email updated in seeded database! New email:', result.email);
    process.exit(0);
  } catch (err) {
    console.error('Error updating auth:', err);
    process.exit(1);
  }
}

updateAdmin();
