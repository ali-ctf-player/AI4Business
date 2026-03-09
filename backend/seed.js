// ~/Downloads/AI4Business/backend/seed.js
const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./models/User');
const Startup = require('./models/Startup');
const Hackathon = require('./models/Hackathon');
const ItHub = require('./models/ItHub');

async function seed() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    
    // Clear old demo data to start fresh
    await Promise.all([
      Startup.deleteMany({}),
      Hackathon.deleteMany({}),
      ItHub.deleteMany({})
    ]);

    const founder = await User.findOne({ role: 'startup' }) || 
                    await User.create({ email: "demo@nexus.io", fullName: "Demo User", role: "startup", passwordHash: "123" });

    // 🚀 1. ADD DIVERSE STARTUPS
    await Startup.insertMany([
      { founderId: founder._id, companyName: "EcoFlow AI", industry: "GreenTech", stage: "Series A", status: "approved" },
      { founderId: founder._id, companyName: "CyberShield", industry: "Cybersecurity", stage: "Seed", status: "approved" },
      { founderId: founder._id, companyName: "HealthLink", industry: "HealthTech", stage: "Idea", status: "pending" },
      { founderId: founder._id, companyName: "Finura", industry: "FinTech", stage: "Seed", status: "approved" }
    ]);

    // 🏆 2. ADD MULTIPLE HACKATHONS
    await Hackathon.insertMany([
      { 
        title: "Baku FinTech Week", 
        description: "Build the next generation of digital payment solutions.", 
        startDate: new Date(), endDate: new Date(Date.now() + 604800000),
        location: { type: 'Point', coordinates: [49.8671, 40.4093] }, status: "ongoing" 
      },
      { 
        title: "Smart City Expo 2026", 
        description: "IoT and AI solutions for urban living challenges.", 
        startDate: new Date(Date.now() + 1209600000), endDate: new Date(Date.now() + 1509600000),
        location: { type: 'Point', coordinates: [49.89, 40.45] }, status: "upcoming" 
      }
    ]);

    // 🏢 3. ADD VARIOUS IT HUBS
    await ItHub.insertMany([
      { name: "Sabah Lab", description: "Acceleration center for high-growth startups.", location: "Baku, AZ", website: "https://sabahlab.az" },
      { name: "The Terminal", description: "Silicon Valley style coworking and networking.", location: "White City, Baku", website: "https://terminal.az" },
      { name: "Technovate", description: "Early-stage incubator for student entrepreneurs.", location: "Ganjlik", website: "https://technovate.vc" }
    ]);

    console.log("✅ Mega Seed Successful! Your app is now full of data.");
    process.exit();
  } catch (err) {
    console.error("❌ Seed Error:", err);
    process.exit(1);
  }
}
seed();
