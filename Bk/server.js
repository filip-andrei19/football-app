require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cron = require('node-cron');
const bcrypt = require('bcryptjs');

// --- IMPORTURI SERVICII ---
const { hardResetAndLoad } = require('./services/initialLoad'); 
const { runDailySmartSync } = require('./services/smartSync'); 

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());

// IMPORTANT: Mărim limita la 50MB pentru a permite încărcarea a 5 poze
app.use(express.json({ limit: '50mb' })); 
app.use(express.urlencoded({ limit: '50mb', extended: true }));

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

// B. PLAYER (Schema flexibilă)
const playerSchema = new mongoose.Schema({}, { strict: false });
const Player = mongoose.models.Player || mongoose.model('Player', playerSchema);

// C. LISTING (SCHEMA COMPLETĂ)
const listingSchema = new mongoose.Schema({
    title: { type: String, required: true },
    category: { type: String, required: true },
    price: { type: String, required: true },
    
    // ARRAY DE IMAGINI (Pentru mai multe poze)
    images: [{ type: String }], 
    
    description: { type: String, required: true },
    
    // Detalii Vânzător
    seller: { type: String, required: true },
    sellerEmail: { type: String, required: true }, // Esențial pentru permisiuni
    sellerPhone: { type: String }, // Opțional

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
            const players = await Player.find().limit(5000); 
            res.json(players);
        });

        // --- RUTE LISTINGS (PRODUSE) ---
        
        // 1. GET - Obține toate produsele
        app.get('/api/listings', async (req, res) => {
            try {
                const listings = await Listing.find().sort({ posted: -1 });
                res.json(listings);
            } catch (err) {
                res.status(500).json({ error: "Eroare la încărcare produse" });
            }
        });

        // 2. POST - Adaugă produs nou
        app.post('/api/listings', async (req, res) => {
            try {
                // req.body conține imaginile și telefonul automat
                const newListing = new Listing(req.body);
                await newListing.save();
                res.status(201).json(newListing);
            } catch (err) {
                console.error("Eroare la salvare:", err);
                res.status(500).json({ error: "Nu s-a putut salva produsul." });
            }
        });

        // 3. DELETE - Șterge produs (FIX PENTRU PRODUSELE STRICATE)
        app.delete('/api/listings/:id', async (req, res) => {
            try {
                const { email } = req.body; // Primim emailul userului care vrea să șteargă
                
                const listing = await Listing.findById(req.params.id);
                if (!listing) return res.status(404).json({ error: "Produsul nu există" });

                // MODIFICARE IMPORTANTĂ:
                // Dacă produsul are un email salvat, verificăm dacă ești tu proprietarul.
                // Dacă produsul NU are email (e buguit/stricat), permitem ștergerea!
                if (listing.sellerEmail && listing.sellerEmail !== email) {
                    return res.status(403).json({ error: "Nu ai permisiunea să ștergi acest produs." });
                }

                await Listing.findByIdAndDelete(req.params.id);
                res.json({ success: true, message: "Produs șters." });
            } catch (err) {
                res.status(500).json({ error: "Eroare la ștergere." });
            }
        });

        // ============================================================
        // 3. ZONA ADMINISTRATIVĂ & CRON JOBS
        // ============================================================

        app.get('/api/admin/hard-reset', async (req, res) => {
            console.log("⚠️  Comandă de HARD RESET primită!");
            res.send("🚀 Operațiunea a început în fundal! Verifică consola.");
            hardResetAndLoad(); 
        });

        // CRON JOB ZILNIC (Sincronizare Rotativă) - Ora 16:13 RO
        cron.schedule('10 16 * * *', async () => {
            console.log('⏰ [CRON 16:13 RO] Pornesc actualizarea zilnică rotativă...');
            await runDailySmartSync(); 
        }, {
            timezone: "Europe/Bucharest" 
        });

        app.listen(PORT, () => console.log(`🚀 Serverul merge pe http://localhost:${PORT}`));

    } catch (error) { console.error("❌ Eroare critică:", error.message); }
};

startServer();
// Restart server pentru actualizare schema