require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cron = require('node-cron');
const bcrypt = require('bcryptjs'); // <--- 1. IMPORT NOU
const { syncPlayers } = require('./services/syncService');

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

// --- 2. MODIFICARE SCHEMA: Criptare automată la înregistrare ---
userSchema.pre('save', async function(next) {
    // Dacă parola nu s-a schimbat, trecem mai departe
    if (!this.isModified('password')) return next();
    
    // Criptăm parola
    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (err) {
        next(err);
    }
});

const User = mongoose.models.User || mongoose.model('User', userSchema);

// B. PLAYER
const playerSchema = new mongoose.Schema({}, { strict: false });
const Player = mongoose.models.Player || mongoose.model('Player', playerSchema);

// C. LISTING (PRODUS DE COLECȚIE)
const listingSchema = new mongoose.Schema({
    title: String,
    category: String,
    price: String,
    condition: String,
    seller: String,   // Cine l-a postat
    location: String,
    phone: String,
    image: String,    // Aici stocăm poza ca text lung (Base64)
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

        // --- RUTE AUTH (MODIFICAT) ---
        
        // LOGIN SECURIZAT
        app.post('/api/users/login', async (req, res) => {
            try {
                const { email, password } = req.body;
                
                // 1. Căutăm userul
                const user = await User.findOne({ email });
                if (!user) {
                    return res.status(401).json({ success: false, message: "Utilizator inexistent." });
                }

                // 2. Verificăm parola criptată
                const isMatch = await bcrypt.compare(password, user.password);
                if (!isMatch) {
                    return res.status(401).json({ success: false, message: "Parolă incorectă." });
                }

                // 3. Succes
                res.status(200).json({ success: true, user: { name: user.name, email: user.email } });

            } catch (err) { 
                console.error(err);
                res.status(500).json({ error: "Eroare server." }); 
            }
        });

        // REGISTER (Nu trebuie modificat mult, hook-ul 'pre save' face treaba)
        app.post('/api/users/register', async (req, res) => {
            try {
                const { name, email, password } = req.body;
                
                if (await User.findOne({ email })) {
                    return res.status(400).json({ success: false, message: "Email folosit." });
                }

                const newUser = new User({ name, email, password });
                // AICI se declanșează automat criptarea înainte de .save()
                await newUser.save();

                res.status(201).json({ success: true, user: { name: newUser.name, email: newUser.email } });
            } catch (err) { 
                console.error(err);
                res.status(500).json({ error: "Eroare server." }); 
            }
        });

        // --- RUTE JUCĂTORI ---
        app.get('/api/sport/players', async (req, res) => {
            const players = await Player.find();
            res.json(players);
        });

        // --- RUTE LISTINGS (PRODUSE) ---
        
        // 1. GET: Ia toate produsele
        app.get('/api/listings', async (req, res) => {
            try {
                const listings = await Listing.find().sort({ posted: -1 });
                res.json(listings);
            } catch (err) {
                res.status(500).json({ error: "Eroare la încărcare produse" });
            }
        });

        // 2. POST: Adaugă produs nou
        app.post('/api/listings', async (req, res) => {
            try {
                const newListing = new Listing(req.body);
                await newListing.save();
                console.log("📦 Produs nou salvat:", newListing.title);
                res.status(201).json(newListing);
            } catch (err) {
                console.error("Eroare salvare produs:", err);
                res.status(500).json({ error: "Nu s-a putut salva produsul." });
            }
        });

        // 3. DELETE: Șterge produs
        app.delete('/api/listings/:id', async (req, res) => {
            try {
                await Listing.findByIdAndDelete(req.params.id);
                console.log("🗑️ Produs șters:", req.params.id);
                res.json({ success: true });
            } catch (err) {
                res.status(500).json({ error: "Eroare la ștergere." });
            }
        });

        // CRON & START
        cron.schedule('0 4 * * *', () => syncPlayers());
        app.listen(PORT, () => console.log(`🚀 Serverul merge pe http://localhost:${PORT}`));

    } catch (error) { console.error("❌ Eroare critică:", error.message); }
};

startServer();