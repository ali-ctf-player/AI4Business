require('dotenv').config();
const mongoose = require('mongoose');
const csv = require('csvtojson');
const Hackathon = require('./models/Hackathon');

const SHEET_ID = '1GEaI2w3kSD7lSSTDO7sqDEuKCx1ss7bYR6fQhx-t1rc';
const CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv`;

async function syncHackathons() {
    try {
        console.log('🔗 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected.');

        console.log('📥 Downloading Google Sheet...');
        
        // 🌟 Use Node's native fetch (more reliable than Axios) & masquerade as a browser
        const response = await fetch(CSV_URL, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });

        if (!response.ok) {
            throw new Error(`Google Sheets HTTP Error: ${response.status} ${response.statusText}`);
        }
        
        const textData = await response.text();
        
        console.log('🔄 Parsing CSV data...');
        const jsonArray = await csv().fromString(textData);

        console.log(`🧹 Clearing old hackathons...`);
        await Hackathon.deleteMany({});

        const colors = ['#00c2a8', '#6366f1', '#10b981', '#ef4444', '#f59e0b', '#8b5cf6'];
        const icons = ['🤖', '💳', '🌱', '🏥', '🏆', '📦'];

        const newHackathons = jsonArray.map((row, index) => {
            let sDate = new Date(row['Keçiriləcək tarix']);
            if (isNaN(sDate.getTime())) sDate = new Date(); 

            let eDate = new Date(row['Qeydiyyat üçün son tarix']);
            if (isNaN(eDate.getTime())) eDate = new Date(sDate.getTime() + 86400000); 

            // 🌟 SMART NAME EXTRACTOR: Converts URLs into Beautiful Titles
            let rawName = row['Keçiriləcək Hackatonlar'] || `Hackathon ${index + 1}`;
            let formattedName = String(rawName); // Ensure it is treated as a string
            
            if (formattedName.includes('http')) {
                try {
                    const urlObj = new URL(formattedName);
                    const paths = urlObj.pathname.split('/').filter(Boolean);
                    if (paths.length > 0) {
                        let slug = paths[paths.length - 1];
                        slug = slug.replace(/\d+$/, ''); // Remove random trailing numbers
                        slug = slug.replace(/[-_]/g, ' '); // Replace dashes with spaces
                        // Capitalize every word
                        formattedName = slug.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
                    }
                } catch (e) {
                    // Ignore if parsing fails
                }
            }

            return {
                title: formattedName,
                description: row['Əsas Sponsor və Dəstəkçilər'] ? `Əsas Sponsor və Dəstəkçilər: ${row['Əsas Sponsor və Dəstəkçilər']}` : 'Möhtəşəm hackatonumuza qoşulun!',
                startDate: sDate,
                endDate: eDate,
                status: 'upcoming', 
                location: {
                    type: 'Point',
                    coordinates: [49.8671, 40.4093] 
                },
                
                prize: 'TBA',
                theme: row['Mövzu / Platforma'] || 'İnnovasiya',
                tags: (row['Mövzu / Platforma'] || 'Texnologiya, İnnovasiya').split('/').map(t => t.trim()).filter(t => t),
                color: colors[index % colors.length],
                icon: icons[index % icons.length],
                spots: parseInt(row['İştirakçılar və Tətbiqlər']) || 100,
                registered: Math.floor(Math.random() * 50)
            };
        });

        await Hackathon.insertMany(newHackathons);
        console.log(`✅ Successfully synced ${newHackathons.length} hackathons!`);
        process.exit(0);

    } catch (error) {
        console.error('❌ Error syncing data:');
        console.error(error); // This will now print the FULL error trace so it's not blank!
        process.exit(1);
    }
}

syncHackathons();
