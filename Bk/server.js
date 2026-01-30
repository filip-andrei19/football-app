require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cron = require('node-cron');
const bcrypt = require('bcryptjs');

// --- IMPORTURI SECURITATE & PERFORMANȚĂ ---
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

// --- IMPORTURI SERVICII ---
const { hardResetAndLoad } = require('./services/initialLoad'); 
const { runDailySmartSync } = require('./services/smartSync'); 

const app = express();
const PORT = process.env.PORT || 3000;

// ==========================================
// CONFIGURĂRI MIDDLEWARE
// ==========================================
app.use(helmet());      // Securitate Headere
app.use(compression()); // Compresie Gzip
app.use(cors());

// Limită Anti-Spam (100 req / 15 min)
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, 
    max: 200, // Am mărit puțin limita pentru admin
    message: "Prea multe cereri. Încearcă mai târziu."
});
app.use(limiter);

// Limită date (pentru poze base64 mari)
app.use(express.json({ limit: '50mb' })); 
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// ==========================================
// 1. MODELE BAZA DE DATE
// ==========================================

// A. USER (Actualizat cu Role & Ban & Avatar)
const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    
    // Câmpuri Noi:
    role: { type: String, default: 'user', enum: ['user', 'admin'] }, 
    avatar: { type: String, default: '' }, // URL sau Base64
    isBanned: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
});

userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (err) { next(err); }
});

const User = mongoose.models.User || mongoose.model('User', userSchema);

// B. PLAYER
const playerSchema = new mongoose.Schema({}, { strict: false });
const Player = mongoose.models.Player || mongoose.model('Player', playerSchema);

// C. LISTING (Marketplace)
const listingSchema = new mongoose.Schema({
    title: { type: String, required: true },
    category: { type: String, required: true },
    price: { type: String, required: true },
    images: [{ type: String }], 
    description: { type: String, required: true },
    seller: { type: String, required: true },
    sellerEmail: { type: String, required: true },
    sellerPhone: { type: String },
    posted: { type: Date, default: Date.now }
});
const Listing = mongoose.models.Listing || mongoose.model('Listing', listingSchema);

// D. STORY (Nou - Pentru "Unsung Heroes")
const storySchema = new mongoose.Schema({
    title: String,       // Numele persoanei
    role: String,        // Rol (ex: Magazioner)
    organization: String,// Club
    excerpt: String,     // Text scurt
    content: String,     // Interviul full
    date: String,
    postedAt: { type: Date, default: Date.now }
});
const Story = mongoose.models.Story || mongoose.model('Story', storySchema);

// ==========================================
// 2. LOGICA SERVER & RUTE
// ==========================================

const startServer = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Conectat la MongoDB.');

        // --- RUTE AUTHENTICARE ---

        // LOGIN
        app.post('/api/users/login', async (req, res) => {
            try {
                const { email, password } = req.body;
                const user = await User.findOne({ email });
                
                if (!user) return res.status(401).json({ success: false, message: "Utilizator inexistent." });
                
                // VERIFICARE BAN
                if (user.isBanned) return res.status(403).json({ success: false, message: "Acest cont a fost blocat de administrator." });

                const isMatch = await bcrypt.compare(password, user.password);
                if (!isMatch) return res.status(401).json({ success: false, message: "Parolă incorectă." });

                // Trimitem toate datele necesare profilului
                res.status(200).json({ 
                    success: true, 
                    user: { 
                        name: user.name, 
                        email: user.email, 
                        role: user.role, 
                        avatar: user.avatar 
                    } 
                });
            } catch (err) { 
                res.status(500).json({ error: "Eroare server." }); 
            }
        });

        // REGISTER
        app.post('/api/users/register', async (req, res) => {
            try {
                const { name, email, password } = req.body;
                if (await User.findOne({ email })) return res.status(400).json({ success: false, message: "Email folosit." });

                // HACK: Primul user "admin@scout.ro" devine automat ADMIN
                const role = email === 'admin123@scout.ro' ? 'admin' : 'user';

                const newUser = new User({ name, email, password, role });
                await newUser.save();
                
                res.status(201).json({ success: true, user: { name: newUser.name, email: newUser.email, role: newUser.role } });
            } catch (err) { 
                res.status(500).json({ error: "Eroare server." }); 
            }
        });

        // --- RUTE PROFIL & SECURITATE (NOI) ---

        // UPDATE PROFIL (Nume, Avatar)
        app.put('/api/users/profile', async (req, res) => {
            try {
                const { email, name, avatar } = req.body;
                const user = await User.findOne({ email });
                if (!user) return res.status(404).json({ error: "User not found" });

                user.name = name || user.name;
                user.avatar = avatar || user.avatar;
                await user.save();

                res.json({ success: true, user: { name: user.name, email: user.email, role: user.role, avatar: user.avatar } });
            } catch (err) {
                res.status(500).json({ error: "Eroare la actualizare." });
            }
        });

        // SCHIMBARE PAROLĂ
        app.put('/api/users/change-password', async (req, res) => {
            try {
                const { email, currentPassword, newPassword } = req.body;
                const user = await User.findOne({ email });
                if (!user) return res.status(404).json({ error: "User not found" });

                const isMatch = await bcrypt.compare(currentPassword, user.password);
                if (!isMatch) return res.status(400).json({ success: false, message: "Parola curentă incorectă." });

                // Bcrypt hash se face automat in schema 'pre save', deci doar setăm parola nouă
                user.password = newPassword;
                await user.save();

                res.json({ success: true, message: "Parolă schimbată." });
            } catch (err) {
                res.status(500).json({ error: "Eroare server." });
            }
        });

        // --- RUTE ADMIN DASHBOARD (NOI) ---

        // GET ALL USERS
        app.get('/api/admin/users', async (req, res) => {
            // În producție ar trebui verificat token-ul de admin aici
            const users = await User.find().select('-password').limit(100);
            res.json(users);
        });

        // BAN / UNBAN USER
        app.put('/api/admin/users/:id/ban', async (req, res) => {
            try {
                const user = await User.findById(req.params.id);
                if (!user) return res.status(404).json({ error: "User inexistent" });
                
                user.isBanned = !user.isBanned; // Toggle
                await user.save();
                res.json({ success: true, status: user.isBanned ? 'banned' : 'active' });
            } catch (err) {
                res.status(500).json({ error: "Eroare server" });
            }
        });

        // ADD STORY (Unsung Heroes)
        app.post('/api/admin/stories', async (req, res) => {
            try {
                const newStory = new Story(req.body);
                await newStory.save();
                res.status(201).json(newStory);
            } catch (err) { res.status(500).json({ error: "Eroare" }); }
        });

        // GET STORIES (Public)
        app.get('/api/stories', async (req, res) => {
            const stories = await Story.find().sort({ postedAt: -1 });
            res.json(stories);
        });


        // --- RUTE STANDARD (Jucători & Listings) ---

        app.get('/api/sport/players', async (req, res) => {
            const players = await Player.find().limit(5000); 
            res.json(players);
        });

        app.get('/api/listings', async (req, res) => {
            const listings = await Listing.find().sort({ posted: -1 });
            res.json(listings);
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

        // DELETE LISTING (Modificat pentru ADMIN)
        app.delete('/api/listings/:id', async (req, res) => {
            try {
                const { email } = req.body; 
                
                const user = await User.findOne({ email });
                const listing = await Listing.findById(req.params.id);
                
                if (!listing) return res.status(404).json({ error: "Produsul nu există" });

                // PERMISIUNI: Proprietar SAU Admin
                const isOwner = listing.sellerEmail === email;
                const isAdmin = user && user.role === 'admin';

                if (!isOwner && !isAdmin) {
                    return res.status(403).json({ error: "Nu ai permisiunea să ștergi acest produs." });
                }

                await Listing.findByIdAndDelete(req.params.id);
                res.json({ success: true, message: "Produs șters." });
            } catch (err) {
                res.status(500).json({ error: "Eroare la ștergere." });
            }
        });

        // ============================================================
        // 3. ADMIN TOOLS & CRON
        // ============================================================

        app.get('/api/admin/hard-reset', async (req, res) => {
            console.log("⚠️  HARD RESET!");
            hardResetAndLoad(); 
            res.send("Reset initiated.");
        });

        cron.schedule('10 16 * * *', async () => {
            console.log('⏰ CRON Sync...');
            await runDailySmartSync(); 
        }, { timezone: "Europe/Bucharest" });

        app.listen(PORT, () => console.log(`🚀 Serverul merge pe http://localhost:${PORT}`));

    } catch (error) { console.error("❌ Eroare critică:", error.message); }
};

startServer();