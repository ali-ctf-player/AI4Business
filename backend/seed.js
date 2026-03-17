require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs'); // Assuming you use bcrypt for passwords
const User = require('./models/User'); // Check this path matches your User model

const seedDatabase = async () => {
  try {
    // 1. Connect to your external MongoDB
    console.log('⏳ Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // 2. Delete ALL existing users
    console.log('🗑️ Deleting all existing users...');
    await User.deleteMany({});
    console.log('✅ All users deleted');

    // 3. Prepare the default password (e.g., 'password123')
    // Note: If your User model has a pre('save') hook that hashes passwords automatically, 
    // you don't need bcrypt here. But doing it manually ensures it works either way.
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('demo1234', salt);

    // 4. Define the 4 Demo Users matching your UI
    const demoUsers = [
      {
        fullName: 'Demo Investor',
        email: 'investor@demo.com',
        password: hashedPassword,
        role: 'investor',
        isVerified: true
      },
      {
        fullName: 'Demo Startup',
        email: 'startup@demo.com',
        password: hashedPassword,
        role: 'startup',
        isVerified: true
      },
      {
        fullName: 'Compliance Officer',
        email: 'admin@demo.com',
        password: hashedPassword,
        role: 'admin',
        isVerified: true
      },
      {
        fullName: 'Ecosystem Manager',
        email: 'superadmin@demo.com',
        password: hashedPassword,
        role: 'superadmin',
        isVerified: true
      }
    ];

    // 5. Insert the 4 users into the database
    console.log('🌱 Planting new demo users...');
    await User.insertMany(demoUsers);
    
    console.log('✅ Database seeded successfully!');
    console.log('🔑 You can now log in with these emails and the password: demo1234');

  } catch (error) {
    console.error('❌ Error seeding database:', error);
  } finally {
    // 6. Close the connection so the script finishes
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
    process.exit();
  }
};

// Run the function
seedDatabase();
