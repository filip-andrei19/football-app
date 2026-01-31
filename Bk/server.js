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
app.use(helmet());      
app.use(compression()); 
app.use(cors());

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, 
    max: 200, 
    message: "Prea multe cereri. Încearcă mai târziu."
});
app.use(limiter);

app.use(express.json({ limit: '50mb' })); 
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// ==========================================
// 1. MODELE BAZA DE DATE
// ==========================================

// A. USER
const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, default: 'user', enum: ['user', 'admin'] }, 
    avatar: { type: String, default: '' }, 
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

// C. LISTING
const listingSchema = new mongoose.Schema({
    title: { type: String, required: true },
    category: { type: String, required: true },
    price: { type: String, required: true },
    images: [{ type: String }], 
    description: { type: String, required: true },
    seller: { type: String, required: true },
    sellerEmail: { type: String, required: true },
    sellerPhone: { type: String },
    sellerAvatar: { type: String, default: '' },
    posted: { type: Date, default: Date.now }
});
const Listing = mongoose.models.Listing || mongoose.model('Listing', listingSchema);

// D. STORY (MODEL PENTRU EROI)
const storySchema = new mongoose.Schema({
    title: String,
    role: String,
    organization: String,
    excerpt: String,
    content: String,
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

        // --- POPULARE AUTOMATĂ (SEEDING) ---
        // Adăugăm poveștile inițiale dacă baza de date este goală
        const storyCount = await Story.countDocuments();
        if (storyCount === 0) {
            console.log("📂 Baza de date Eroi goală. Se adaugă interviurile inițiale...");
            await Story.insertMany([
                {
                    title: 'Gheorghe "Gică" Popescu',
                    role: 'Șef Departament Scouting',
                    organization: 'Academia FC Viitorul / Farul',
                    excerpt: 'După 30 de ani de descoperit talente, ne împărtășește secretele prin care identifică viitoarele stele ale României.',
                    content: 'Într-un interviu exclusiv, "Baciul" vorbește despre criteriile invizibile pe care le caută la un junior: mentalitatea de învingător, disciplina tactică și inteligența în joc. Popescu detaliază structura Academiei de la Ovidiu și cum tehnologia modernă ajută scouterii să monitorizeze mii de copii anual.',
                    date: 'Decembrie 2025'
                },
                {
                    title: 'Alexandru Andrași',
                    role: 'Fost Atacant',
                    organization: 'Steaua / Rapid București',
                    excerpt: 'Povestea plecării de la Steaua și golul memorabil marcat pe San Siro împotriva lui Inter Milano.',
                    content: 'O călătorie emoționantă în timp, rememorând perioada romantică a fotbalului românesc. Andrași povestește despre presiunea de a juca în Ghencea, rivalitatea intensă cu Dinamo și Rapid, și sentimentul unic de a înscrie pe unul dintre cele mai mari stadioane ale Europei într-un meci de cupă europeană.',
                    date: 'Ianuarie 2026'
                }
            ]);
            console.log("✅ Interviuri inițiale adăugate!");
        }

        // --- RUTE API ---

        app.post('/api/users/login', async (req, res) => {
            try {
                const { email, password } = req.body;
                const user = await User.findOne({ email });
                if (!user) return res.status(401).json({ success: false, message: "Utilizator inexistent." });
                if (user.isBanned) return res.status(403).json({ success: false, message: "Cont blocat." });
                const isMatch = await bcrypt.compare(password, user.password);
                if (!isMatch) return res.status(401).json({ success: false, message: "Parolă incorectă." });
                res.status(200).json({ success: true, user: { name: user.name, email: user.email, role: user.role, avatar: user.avatar } });
            } catch (err) { res.status(500).json({ error: "Eroare server." }); }
        });

        // RUTA SINCRONIZARE
        app.post('/api/users/refresh', async (req, res) => {
            try {
                const { email } = req.body;
                const user = await User.findOne({ email });
                if (!user) return res.status(404).json({ error: "User not found" });
                res.json({ success: true, user: { name: user.name, email: user.email, role: user.role, avatar: user.avatar } });
            } catch (err) { res.status(500).json({ error: "Eroare server." }); }
        });

        app.post('/api/users/register', async (req, res) => {
            try {
                const { name, email, password } = req.body;
                if (await User.findOne({ email })) return res.status(400).json({ success: false, message: "Email folosit." });
                const role = email === 'admin.nou@scout.ro' ? 'admin' : 'user';
                const newUser = new User({ name, email, password, role });
                await newUser.save();
                res.status(201).json({ success: true, user: { name: newUser.name, email: newUser.email, role: newUser.role } });
            } catch (err) { res.status(500).json({ error: "Eroare server." }); }
        });

        app.put('/api/users/profile', async (req, res) => {
            try {
                const { email, name, avatar } = req.body;
                const user = await User.findOne({ email });
                if (!user) return res.status(404).json({ error: "User not found" });
                let updates = {};
                if (name && name !== user.name) updates.seller = name;
                if (avatar && avatar !== user.avatar) updates.sellerAvatar = avatar;
                if (Object.keys(updates).length > 0) await Listing.updateMany({ sellerEmail: email }, { $set: updates });
                user.name = name || user.name;
                user.avatar = avatar || user.avatar;
                await user.save();
                res.json({ success: true, user: { name: user.name, email: user.email, role: user.role, avatar: user.avatar } });
            } catch (err) { res.status(500).json({ error: "Eroare." }); }
        });

        app.put('/api/users/change-password', async (req, res) => {
            try {
                const { email, currentPassword, newPassword } = req.body;
                const user = await User.findOne({ email });
                if (!user) return res.status(404).json({ error: "User not found" });
                const isMatch = await bcrypt.compare(currentPassword, user.password);
                if (!isMatch) return res.status(400).json({ success: false, message: "Parola curentă incorectă." });
                user.password = newPassword;
                await user.save();
                res.json({ success: true, message: "Parolă schimbată." });
            } catch (err) { res.status(500).json({ error: "Eroare server." }); }
        });

        // --- RUTE ADMIN ---
        app.get('/api/admin/users', async (req, res) => {
            const users = await User.find().select('-password').limit(100);
            res.json(users);
        });

        app.put('/api/admin/users/:id/ban', async (req, res) => {
            try {
                const user = await User.findById(req.params.id);
                if (!user) return res.status(404).json({ error: "User inexistent" });
                user.isBanned = !user.isBanned; 
                await user.save();
                res.json({ success: true, status: user.isBanned ? 'banned' : 'active' });
            } catch (err) { res.status(500).json({ error: "Eroare" }); }
        });

        app.post('/api/admin/stories', async (req, res) => {
            try {
                const newStory = new Story(req.body);
                await newStory.save();
                res.status(201).json(newStory);
            } catch (err) { res.status(500).json({ error: "Eroare" }); }
        });

        app.delete('/api/admin/stories/:id', async (req, res) => {
            try {
                await Story.findByIdAndDelete(req.params.id);
                res.json({ success: true });
            } catch (err) { res.status(500).json({ error: "Eroare" }); }
        });

        // --- RUTE PUBLICE ---
        app.get('/api/stories', async (req, res) => {
            const stories = await Story.find().sort({ postedAt: -1 });
            res.json(stories);
        });

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
            } catch (err) { res.status(500).json({ error: "Eroare." }); }
        });

        app.delete('/api/listings/:id', async (req, res) => {
            try {
                const { email } = req.body; 
                const user = await User.findOne({ email });
                const listing = await Listing.findById(req.params.id);
                if (!listing) return res.status(404).json({ error: "Produsul nu există" });
                
                const isOwner = listing.sellerEmail === email;
                const isAdmin = (user && user.role === 'admin') || email === 'admin.nou@scout.ro';

                if (!isOwner && !isAdmin) {
                    return res.status(403).json({ error: "Nu ai permisiunea să ștergi acest produs." });
                }
                await Listing.findByIdAndDelete(req.params.id);
                res.json({ success: true, message: "Produs șters." });
            } catch (err) {
                res.status(500).json({ error: "Eroare la ștergere." });
            }
        });

        app.get('/api/admin/hard-reset', async (req, res) => {
            hardResetAndLoad(); 
            res.send("Reset initiated.");
        });

        cron.schedule('10 16 * * *', async () => {
            await runDailySmartSync(); 
        }, { timezone: "Europe/Bucharest" });

        app.listen(PORT, () => console.log(`🚀 Serverul merge pe http://localhost:${PORT}`));

    } catch (error) { console.error("❌ Eroare critică:", error.message); }
};

startServer();