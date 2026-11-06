require('dotenv').config();
const mongoose = require('mongoose');

// ATENȚIE: Ajustează calea către smartSync.js dacă se află în alt folder (ex: './services/smartSync')
const { runDailySmartSync } = require('./services/smartSync'); 

async function start() {
    try {
        console.log("⏳ Mă conectez la baza de date...");
        // Asigură-te că numele variabilei tale din .env este MONGO_URI (sau ajustează-l)
        await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
        console.log("✅ Conectat la MongoDB!");

        console.log("🚀 Încep repopularea bazei de date (10.000 jucători + Istoric)...");
        await runDailySmartSync();
        
        console.log("🏁 Baza de date a fost repopulată cu succes!");
        process.exit(0); // Închide scriptul automat când termină
    } catch (err) {
        console.error("❌ A apărut o eroare:", err);
        process.exit(1);
    }
}

start();