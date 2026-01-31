require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cron = require('node-cron');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken'); // [1] JWT Import
const crypto = require('crypto');    // [5] Pentru token resetare parola
const nodemailer = require('nodemailer'); // [5] Pentru trimitere email

// --- IMPORTURI SECURITATE & PERFORMANȚĂ ---
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

// --- IMPORTURI SERVICII ---
const { hardResetAndLoad } = require('./services/initialLoad'); 
const { runDailySmartSync } = require('./services/smartSync'); 

const app = express();
const PORT = process.env.PORT || 3000;
const TOKEN_SECRET = process.env.TOKEN_SECRET || 'cheie_secreta_foarte_lunga_si_sigura'; // Pune asta in .env!

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

// [1] MIDDLEWARE VERIFICARE TOKEN JWT
const verifyToken = (req, res, next) => {
    const token = req.header('auth-token');
    if (!token) return res.status(401).json({ error: 'Acces interzis. Lipsă Token.' });

    try {
        const verified = jwt.verify(token, TOKEN_SECRET);
        req.user = verified; // Adăugăm datele userului în request
        next();
    } catch (err) {
        res.status(400).json({ error: 'Token Invalid' });
    }
};

// [5] CONFIGURARE EMAIL (NODEMAILER)
// ATENȚIE: În producție, folosește variabile de mediu (.env)!
const transporter = nodemailer.createTransport({
    service: 'gmail', // Sau alt serviciu
    auth: {
        user: process.env.EMAIL_USER || 'adresa.ta@gmail.com', // MODIFICĂ AICI
        pass: process.env.EMAIL_PASS || 'parola_ta_de_aplicatie' // MODIFICĂ AICI
    }
});

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
    // [5] Câmpuri pentru resetare parolă
    resetPasswordToken: String,
    resetPasswordExpires: Date,
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
// Index pentru căutare rapidă [6]
listingSchema.index({ title: 'text', description: 'text' }); 

const Listing = mongoose.models.Listing || mongoose.model('Listing', listingSchema);

// D. STORY
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
        const storyCount = await Story.countDocuments();
        if (storyCount === 0) {
            console.log("📂 Seeding stories...");
            await Story.insertMany([
                {
                    title: 'Gheorghe "Gică" Popescu',
                    role: 'Șef Departament Scouting',
                    organization: 'Academia FC Viitorul / Farul',
                    excerpt: 'După 30 de ani de descoperit talente, ne împărtășește secretele prin care identifică viitoarele stele ale României.',
                    content: `REPORTER: Domnule Popescu, după o carieră impresionantă la Barcelona și Galatasaray, cum vedeți tranziția către munca de birou și scouting?\n\nGICĂ POPESCU: Tranziția a fost naturală. La Academie, nu căutăm doar jucători care știu să lovească mingea. Asta e partea ușoară. Căutăm caracter. Când merg la un meci de juniori, mă uit la cum reacționează un copil când pierde mingea. Se oprește? Dă din mâini? Sau face sprint imediat să o recupereze?\n\nREPORTER: Care este cel mai important criteriu invizibil?\n\nGICĂ POPESCU: Inteligența în joc. Viteza de gândire. Fotbalul modern se joacă în fracțiuni de secundă. Dacă un jucător are nevoie de 3 secunde să decidă cui pasează, e deja prea târziu pentru nivelul înalt, indiferent cât de talentat e tehnic.`,
                    date: 'Decembrie 2025'
                },
                {
                    title: 'Alexandru Andrași',
                    role: 'Fost Atacant',
                    organization: 'Steaua / Rapid București',
                    excerpt: 'Povestea plecării de la Steaua și golul memorabil marcat pe San Siro împotriva lui Inter Milano.',
                    content: `REPORTER: Domnule Andrași, lumea vă asociază mereu cu acel gol fabulos de pe San Siro. Ce vă mai amintiți de atunci?\n\nALEXANDRU ANDRAȘI: Îmi amintesc vuietul stadionului. Era un meci de Cupă UEFA cu Inter Milano. Când am primit mingea la marginea careului, nu m-am gândit nicio secundă. Am șutat din instinct. Când am văzut plasa tremurând, pentru o secundă s-a făcut liniște pe San Siro. A fost momentul carierei mele.\n\nREPORTER: Cum a fost rivalitatea Steaua - Rapid în acea perioadă?\n\nALEXANDRU ANDRAȘI: Era altceva. Nu era ură, era pasiune. Stadionul Giulești vibra la propriu. Jucam pentru suporteri, nu pentru contracte de milioane.`,
                    date: 'Ianuarie 2026'
                }
            ]);
            console.log("✅ Știri detaliate adăugate!");
        }

        // --- RUTE AUTHENTICARE & SECURITY ---

        app.post('/api/users/login', async (req, res) => {
            try {
                const { email, password } = req.body;
                const user = await User.findOne({ email });
                if (!user) return res.status(401).json({ success: false, message: "Utilizator inexistent." });
                if (user.isBanned) return res.status(403).json({ success: false, message: "Cont blocat." });
                
                const isMatch = await bcrypt.compare(password, user.password);
                if (!isMatch) return res.status(401).json({ success: false, message: "Parolă incorectă." });

                // [1] Generare Token JWT
                const token = jwt.sign({ _id: user._id, role: user.role }, TOKEN_SECRET);

                res.status(200).json({ 
                    success: true, 
                    token: token, // Trimitem token-ul la frontend
                    user: { name: user.name, email: user.email, role: user.role, avatar: user.avatar } 
                });
            } catch (err) { res.status(500).json({ error: "Eroare server." }); }
        });

        // [5] RECUPERARE PAROLĂ - Pasul 1: Cere link
        app.post('/api/users/forgot-password', async (req, res) => {
            try {
                const { email } = req.body;
                const user = await User.findOne({ email });
                if (!user) return res.status(404).json({ message: "Email necunoscut." });

                // Generăm token unic
                const token = crypto.randomBytes(20).toString('hex');
                user.resetPasswordToken = token;
                user.resetPasswordExpires = Date.now() + 3600000; // 1 oră valabilitate
                await user.save();

                // Trimitem email (Simulare în consolă dacă nu e configurat SMTP)
                const resetUrl = `http://localhost:5173/reset-password/${token}`;
                console.log(`📧 [EMAIL SIMULAT] Link resetare pentru ${email}: ${resetUrl}`);

                // Decomentează liniile de mai jos dacă ai configurat 'transporter' corect
                /*
                await transporter.sendMail({
                    to: user.email,
                    subject: 'Resetare Parolă - Scouting App',
                    text: `Ai cerut resetarea parolei. Click aici: ${resetUrl}`
                });
                */

                res.json({ success: true, message: "Link-ul de resetare a fost trimis pe email." });
            } catch (err) { res.status(500).json({ error: "Eroare server." }); }
        });

        // [5] RECUPERARE PAROLĂ - Pasul 2: Resetează efectiv
        app.post('/api/users/reset-password/:token', async (req, res) => {
            try {
                const user = await User.findOne({ 
                    resetPasswordToken: req.params.token, 
                    resetPasswordExpires: { $gt: Date.now() } 
                });

                if (!user) return res.status(400).json({ message: "Token invalid sau expirat." });

                user.password = req.body.password; // Middleware-ul 'pre save' o va cripta
                user.resetPasswordToken = undefined;
                user.resetPasswordExpires = undefined;
                await user.save();

                res.json({ success: true, message: "Parola a fost schimbată!" });
            } catch (err) { res.status(500).json({ error: "Eroare server." }); }
        });

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
                
                // [1] Token și la register
                const token = jwt.sign({ _id: newUser._id, role: newUser.role }, TOKEN_SECRET);

                res.status(201).json({ success: true, token, user: { name: newUser.name, email: newUser.email, role: newUser.role } });
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
        // [2] Paginare Useri Admin
        app.get('/api/admin/users', async (req, res) => {
            const { page = 1, limit = 50 } = req.query; // Default 50 useri
            const users = await User.find()
                .select('-password')
                .limit(limit * 1)
                .skip((page - 1) * limit);
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

        app.put('/api/admin/stories/:id', async (req, res) => {
            try {
                const updatedStory = await Story.findByIdAndUpdate(req.params.id, req.body, { new: true });
                res.json(updatedStory);
            } catch (err) { res.status(500).json({ error: "Eroare update" }); }
        });

        app.delete('/api/admin/stories/:id', async (req, res) => {
            try {
                await Story.findByIdAndDelete(req.params.id);
                res.json({ success: true });
            } catch (err) { res.status(500).json({ error: "Eroare" }); }
        });

        // --- RUTE PUBLICE & MARKETPLACE ---

        app.get('/api/stories', async (req, res) => {
            const stories = await Story.find().sort({ postedAt: -1 });
            res.json(stories);
        });

        app.get('/api/sport/players', async (req, res) => {
            const players = await Player.find().limit(5000); 
            res.json(players);
        });

        // [2, 6] LISTINGS CU PAGINARE ȘI FILTRARE AVANSATĂ
        app.get('/api/listings', async (req, res) => {
            const { page = 1, limit = 50, search, category } = req.query;
            
            // Construim Query-ul dinamic
            let query = {};
            if (search) {
                // Caută în titlu SAU descriere
                query.$or = [
                    { title: { $regex: search, $options: 'i' } },
                    { description: { $regex: search, $options: 'i' } }
                ];
            }
            if (category && category !== 'Toate') {
                query.category = category;
            }

            try {
                const listings = await Listing.find(query)
                    .sort({ posted: -1 })
                    .limit(limit * 1)
                    .skip((page - 1) * limit);
                
                // Returnăm array-ul direct pentru compatibilitate cu frontend-ul tău actual
                res.json(listings);
            } catch (err) {
                res.status(500).json({ error: "Eroare server" });
            }
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