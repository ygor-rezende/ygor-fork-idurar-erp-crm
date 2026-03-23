require('dotenv').config({ path: '.env' });
const mongoose = require('mongoose');

async function checkSettings() {
  try {
    await mongoose.connect(process.env.DATABASE);
    const Setting = require('./src/models/coreModels/Setting');
    const settings = await Setting.find({ settingCategory: 'company_settings' });
    console.log(JSON.stringify(settings, null, 2));
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkSettings();
