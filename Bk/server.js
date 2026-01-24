require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cron = require('node-cron');
const bcrypt = require('bcryptjs');

// --- IMPORTURI SERVICII ---
const { syncPlayers } = require('./services/syncService'); 
const { runDailyJob } = require('./services/smartSync');   
// 1. IMPORT NOU PENTRU RESETARE MANUALĂ
const { hardResetAndLoad } = require('./services/initialLoad'); 

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
// IMPORTANT: Mărim limita pentru JSON ca să putem primi POZE (Base64)
app.use(express.json({ limit: '10mb' })); 

// ==========================================
// 1. MODELE (User + Player + Listing)
// ==========================================

// A. USER
const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true }
});

userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (err) {
        next(err);
    }
});

const User = mongoose.models.User || mongoose.model('User', userSchema);

// B. PLAYER (Schema flexibilă pentru a accepta date noi gen height, weight)
const playerSchema = new mongoose.Schema({}, { strict: false });
const Player = mongoose.models.Player || mongoose.model('Player', playerSchema);

// C. LISTING
const listingSchema = new mongoose.Schema({
    title: String,
    category: String,
    price: String,
    condition: String,
    seller: String,
    location: String,
    phone: String,
    image: String,
    description: String,
    posted: { type: Date, default: Date.now }
});
const Listing = mongoose.models.Listing || mongoose.model('Listing', listingSchema);

// ==========================================
// 2. CONECTARE & RUTE
// ==========================================

const startServer = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Conectat la MongoDB.');

        // --- RUTE AUTH ---
        app.post('/api/users/login', async (req, res) => {
            try {
                const { email, password } = req.body;
                const user = await User.findOne({ email });
                if (!user) return res.status(401).json({ success: false, message: "Utilizator inexistent." });

                const isMatch = await bcrypt.compare(password, user.password);
                if (!isMatch) return res.status(401).json({ success: false, message: "Parolă incorectă." });

                res.status(200).json({ success: true, user: { name: user.name, email: user.email } });
            } catch (err) { 
                res.status(500).json({ error: "Eroare server." }); 
            }
        });

        app.post('/api/users/register', async (req, res) => {
            try {
                const { name, email, password } = req.body;
                if (await User.findOne({ email })) return res.status(400).json({ success: false, message: "Email folosit." });

                const newUser = new User({ name, email, password });
                await newUser.save();
                res.status(201).json({ success: true, user: { name: newUser.name, email: newUser.email } });
            } catch (err) { 
                res.status(500).json({ error: "Eroare server." }); 
            }
        });

        // --- RUTE JUCĂTORI ---
        app.get('/api/sport/players', async (req, res) => {
            const players = await Player.find().limit(600); 
            res.json(players);
        });

        // --- RUTE LISTINGS ---
        app.get('/api/listings', async (req, res) => {
            try {
                const listings = await Listing.find().sort({ posted: -1 });
                res.json(listings);
            } catch (err) {
                res.status(500).json({ error: "Eroare la încărcare produse" });
            }
        });

        app.post('/api/listings', async (req, res) => {
            try {
                const newListing = new Listing(req.body);
                await newListing.save();
                res.status(201).json(newListing);
            } catch (err) {
                res.status(500).json({ error: "Nu s-a putut salva produsul." });
            }
        });

        app.delete('/api/listings/:id', async (req, res) => {
            try {
                await Listing.findByIdAndDelete(req.params.id);
                res.json({ success: true });
            } catch (err) {
                res.status(500).json({ error: "Eroare la ștergere." });
            }
        });

        // ============================================================
        // 3. ZONA ADMINISTRATIVĂ & CRON JOBS
        // ============================================================

        // --- RUTĂ SPECIALĂ: RESET TOTAL (Folosește-o ACUM pentru API-ul nou) ---
        // Accesează: https://site-ul-tau.onrender.com/api/admin/hard-reset
        app.get('/api/admin/hard-reset', async (req, res) => {
            console.log("⚠️  Comandă de HARD RESET primită!");
            
            // Răspundem imediat browserului ca să nu dea timeout
            res.send("🚀 Operațiunea a început în fundal! Verifică consola (Logs) în Render. Durează câteva minute.");

            // Pornim scriptul în fundal
            hardResetAndLoad(); 
        });

        // --- CRON JOB ZILNIC (Sincronizare Rotativă) ---
        // Rulează automat la 4 dimineața (UTC) în fiecare zi
        cron.schedule('0 4 * * *', async () => {
            console.log('⏰ [CRON] Pornesc actualizarea zilnică...');
            await runDailyJob(); 
        });

        app.listen(PORT, () => console.log(`🚀 Serverul merge pe http://localhost:${PORT}`));

    } catch (error) { console.error("❌ Eroare critică:", error.message); }
};

startServer();