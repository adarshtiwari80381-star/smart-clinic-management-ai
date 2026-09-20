const mongoose = require('mongoose');
const dns = require('dns');

// Configure reliable DNS servers for Atlas SRV record resolution on Windows
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {}

// Mask sensitive credentials in URI before logging
const maskUri = (uri) => {
  if (!uri) return '';
  return uri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@');
};

const connectDB = async () => {
  try {
    let connUri = (process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/clinic_management_db').trim();
    if (connUri.startsWith('MONGO_URI=')) {
      connUri = connUri.replace(/^MONGO_URI=/, '').trim();
    }
    connUri = connUri.replace(/^["'](.*)["']$/, '$1').trim();

    // Ensure authSource=admin for MongoDB Atlas if not already specified
    if (connUri.includes('.mongodb.net') && !connUri.includes('authSource=')) {
      const sep = connUri.includes('?') ? '&' : '?';
      connUri = `${connUri}${sep}authSource=admin`;
    }

    console.log(`Connecting to MongoDB at: ${maskUri(connUri)}`);
    
    const conn = await mongoose.connect(connUri, {
      serverSelectionTimeoutMS: 10000,
    });

    console.log(`✅ MongoDB Connected successfully: ${conn.connection.host}/${conn.connection.name}`);
  } catch (error) {
    const safeError = error.message ? error.message.replace(/:([^:@]+)@/, ':****@') : 'Unknown error';
    console.error(`❌ MongoDB Connection Error: ${safeError}`);
    
    const connUri = process.env.MONGO_URI || '';
    if (connUri.includes('mongodb+srv://') || connUri.includes('.mongodb.net')) {
      console.error(`Atlas Troubleshooting Checklist:`);
      console.error(` 1. IP Access List: Ensure your current IP or 0.0.0.0/0 is whitelisted in MongoDB Atlas -> Network Access.`);
      console.error(` 2. Database User: Ensure the username and password in MONGO_URI are correct and have readWrite permissions.`);
      console.error(` 3. Special Characters: If the password contains special characters (@, #, %, etc.), ensure they are URL-encoded.`);
      console.error(` 4. Cluster Status: Verify the Atlas cluster is not paused or terminating.`);
    } else {
      console.error(`Ensure MongoDB service is running locally on 127.0.0.1:27017.`);
    }
    process.exit(1);
  }
};

module.exports = connectDB;

