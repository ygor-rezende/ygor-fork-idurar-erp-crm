require('dotenv').config({ path: '.env' });
const mongoose = require('mongoose');

async function fixDuplicateSettings() {
  try {
    await mongoose.connect(process.env.DATABASE);
    const Setting = require('./src/models/coreModels/Setting');
    const settings = await Setting.find({ removed: false });
    
    const keyMap = {};
    for (const doc of settings) {
      if (!keyMap[doc.settingKey]) {
        keyMap[doc.settingKey] = [];
      }
      keyMap[doc.settingKey].push(doc);
    }
    
    for (const key of Object.keys(keyMap)) {
      const docs = keyMap[key];
      if (docs.length > 1) {
        // Pre-defined defaults to identify which to delete
        const defaultValues = [null, 'COMPANY Name', '25 , Your Company Address', 'New York', 'United State', 'youremail@example.com', '+1 345234654', 'www.example.com', '91231255234', '00001231421', 'iban : 00001231421', 'public/uploads/setting/company-logo.png'];
        
        docs.sort((a, b) => {
          const aIsDefault = defaultValues.includes(a.settingValue);
          const bIsDefault = defaultValues.includes(b.settingValue);
          if (aIsDefault && !bIsDefault) return 1;
          if (!aIsDefault && bIsDefault) return -1;
          return a._id.getTimestamp() - b._id.getTimestamp();
        });
        
        // delete the rest
        for (let i = 1; i < docs.length; i++) {
          await Setting.deleteOne({ _id: docs[i]._id });
          console.log(`Deleted duplicate for ${key} (${docs[i].settingValue})`);
        }
      }
    }
    console.log('Duplicates removed.');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

fixDuplicateSettings();
