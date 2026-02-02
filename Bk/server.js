require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cron = require('node-cron');
const bcrypt = require('bcryptjs');

// --- [NOU] IMPORTURI PENTRU CHAT, CLOUDINARY, VALIDARE ---
const http = require('http');            // Necesar pentru a lega Socket.io
const { Server } = require("socket.io"); // Chat
const cloudinary = require('cloudinary').v2; // Poze
const Joi = require('joi');              // Validare

// --- IMPORTURI SECURITATE & PERFORMANȚĂ ---
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

// --- IMPORTURI SERVICII ---
const { hardResetAndLoad } = require('./services/initialLoad'); 
const { runDailySmartSync } = require('./services/smartSync'); 

const app = express();
// --- [MODIFICARE] CREĂM SERVERUL HTTP PENTRU A SUPORTA SI CHAT-UL ---
const server = http.createServer(app); 
const PORT = process.env.PORT || 3000;
const TOKEN_SECRET = process.env.JWT_SECRET || 'cheie_secreta_foarte_lunga_si_sigura';

// --- [NOU] CONFIGURARE CLOUDINARY ---
cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_NAME, 
  api_key: process.env.CLOUDINARY_KEY, 
  api_secret: process.env.CLOUDINARY_SECRET
});

// --- [NOU] CONFIGURARE SOCKET.IO (CHAT) ---
const io = new Server(server, {
    cors: {
        origin: "*", 
        methods: ["GET", "POST"]
    }
});

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

// --- [NOU] SCHEME DE VALIDARE (JOI) ---
const registerSchema = Joi.object({
    name: Joi.string().min(3).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required()
});

const listingSchema = Joi.object({
    title: Joi.string().min(5).required(),
    category: Joi.string().required(),
    price: Joi.string().required(),
    description: Joi.string().min(10).required(),
    seller: Joi.string().required(),
    sellerEmail: Joi.string().email().required(),
    sellerPhone: Joi.string().required(),
    images: Joi.array().items(Joi.string()).max(5),
    sellerAvatar: Joi.string().allow('').optional()
});

// ==========================================
// 1. MODELE BAZA DE DATE
// ==========================================

// A. USER (Păstrat intact)
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

// --- [NOU] B. MESSAGE (PENTRU CHAT) ---
const messageSchema = new mongoose.Schema({
    room: String,
    author: String,
    message: String,
    time: String,
    timestamp: { type: Date, default: Date.now }
});
const Message = mongoose.models.Message || mongoose.model('Message', messageSchema);

// C. PLAYER (Păstrat intact - critic pentru baza de date)
const playerSchema = new mongoose.Schema({}, { strict: false });
const Player = mongoose.models.Player || mongoose.model('Player', playerSchema);

// D. LISTING (Păstrat intact structura, adăugat index text)
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
listingSchema.index({ title: 'text', description: 'text' }); // [NOU] Pentru căutare rapidă
const Listing = mongoose.models.Listing || mongoose.model('Listing', listingSchema);

// E. STORY (Păstrat intact)
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

// --- [NOU] HELPER UPLOAD IMAGINE (CLOUDINARY) ---
const uploadImage = async (base64Str) => {
    try {
        if (!base64Str || !base64Str.startsWith('data:image')) return base64Str;
        const uploadResponse = await cloudinary.uploader.upload(base64Str, {
            upload_preset: 'scout_app',
            folder: 'football_market'
        });
        return uploadResponse.secure_url;
    } catch (err) {
        console.error("Cloudinary Error:", err);
        return null;
    }
};

// ==========================================
// 2. LOGICA SERVER & RUTE
// ==========================================

// --- [NOU] LOGICA DE SOCKET.IO (CHAT) ---
io.on("connection", (socket) => {
    console.log(`User Connected: ${socket.id}`);

    socket.on("join_room", async (data) => {
        socket.join(data);
        try {
            const history = await Message.find({ room: data }).sort({ timestamp: 1 }).limit(50);
            socket.emit("load_history", history);
        } catch(e) { console.error(e); }
    });

    socket.on("send_message", async (data) => {
        try {
            const newMessage = new Message(data);
            await newMessage.save();
            io.in(data.room).emit("receive_message", data);
        } catch(e) { console.error(e); }
    });

    socket.on("disconnect", () => {
        console.log("User Disconnected", socket.id);
    });
});

const startServer = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Conectat la MongoDB.');

        // --- RUTE AUTHENTICARE ---

        app.post('/api/users/login', async (req, res) => {
            try {
                const { email, password } = req.body;
                const user = await User.findOne({ email });
                
                if (!user) return res.status(401).json({ success: false, message: "Utilizator inexistent." });
                if (user.isBanned) return res.status(403).json({ success: false, message: "Cont blocat." });

                const isMatch = await bcrypt.compare(password, user.password);
                if (!isMatch) return res.status(401).json({ success: false, message: "Parolă incorectă." });

                res.status(200).json({ 
                    success: true, 
                    user: { name: user.name, email: user.email, role: user.role, avatar: user.avatar } 
                });
            } catch (err) { res.status(500).json({ error: "Eroare server." }); }
        });

        app.post('/api/users/register', async (req, res) => {
            try {
                // [NOU] Validăm datele înainte de înregistrare
                const { error } = registerSchema.validate(req.body);
                if (error) return res.status(400).json({ success: false, message: error.details[0].message });

                const { name, email, password } = req.body;
                if (await User.findOne({ email })) return res.status(400).json({ success: false, message: "Email folosit." });

                const role = email === 'admin.nou@scout.ro' ? 'admin' : 'user';

                const newUser = new User({ name, email, password, role });
                await newUser.save();
                
                res.status(201).json({ success: true, user: { name: newUser.name, email: newUser.email, role: newUser.role } });
            } catch (err) { res.status(500).json({ error: "Eroare server." }); }
        });

        // Ruta Refresh User (pentru sync)
        app.post('/api/users/refresh', async (req, res) => {
            const user = await User.findOne({ email: req.body.email });
            if(user) res.json({ success: true, user: { name: user.name, email: user.email, role: user.role, avatar: user.avatar } });
        });

        // --- RUTE PROFIL ---

        app.put('/api/users/profile', async (req, res) => {
            try {
                const { email, name, avatar } = req.body;
                const user = await User.findOne({ email });
                if (!user) return res.status(404).json({ error: "User not found" });

                let updates = {};
                if (name && name !== user.name) updates.seller = name;
                if (avatar && avatar !== user.avatar) updates.sellerAvatar = avatar;

                if (Object.keys(updates).length > 0) {
                    await Listing.updateMany({ sellerEmail: email }, { $set: updates });
                }

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
        
        // --- [NOU] Rute Admin extra (delete/update stories) ---
        app.delete('/api/admin/stories/:id', async (req, res) => {
             await Story.findByIdAndDelete(req.params.id); 
             res.json({success: true}); 
        });

        // --- RUTE PUBLICE ---

        app.get('/api/stories', async (req, res) => {
            const stories = await Story.find().sort({ postedAt: -1 });
            res.json(stories);
        });

        // --- [CRITIC] RUTA JUCĂTORI (PĂSTRATĂ) ---
        app.get('/api/sport/players', async (req, res) => {
            const players = await Player.find().limit(5000); 
            res.json(players);
        });

        // [MODIFICAT] Ruta Listings (suportă filtrare și paginare)
        app.get('/api/listings', async (req, res) => {
            const { page = 1, limit = 50, search, category } = req.query;
            let query = {};
            if (search) query.$or = [{ title: { $regex: search, $options: 'i' } }, { description: { $regex: search, $options: 'i' } }];
            if (category && category !== 'Toate') query.category = category;

            const listings = await Listing.find(query).sort({ posted: -1 }).limit(limit * 1).skip((page - 1) * limit);
            res.json(listings);
        });

        // [MODIFICAT] Ruta POST Listings (Upload Cloudinary + Validare)
        app.post('/api/listings', async (req, res) => {
            try {
                // Validare
                const { error } = listingSchema.validate(req.body);
                if (error) return res.status(400).json({ error: error.details[0].message });

                // Upload Poze
                const imagePromises = req.body.images.map(img => uploadImage(img));
                const uploadedImages = await Promise.all(imagePromises);
                const validImages = uploadedImages.filter(img => img !== null);

                const newListing = new Listing({
                    ...req.body,
                    images: validImages // Folosim URL-urile din Cloud
                });
                await newListing.save();
                res.status(201).json(newListing);
            } catch (err) { res.status(500).json({ error: "Eroare." }); }
        });

        // --- [CRITIC] DELETE LISTING (LOGICA VECHE PĂSTRATĂ PENTRU ADMIN) ---
        app.delete('/api/listings/:id', async (req, res) => {
            try {
                const { email } = req.body; 
                const user = await User.findOne({ email });
                const listing = await Listing.findById(req.params.id);
                
                if (!listing) return res.status(404).json({ error: "Produsul nu există" });

                const isOwner = listing.sellerEmail === email;
                
                // MODIFICARE AICI: Permitem ștergerea dacă email-ul este cel de admin
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

        // --- ADMIN TOOLS ---
        app.get('/api/admin/hard-reset', async (req, res) => {
            hardResetAndLoad(); 
            res.send("Reset initiated.");
        });

        cron.schedule('10 16 * * *', async () => {
            await runDailySmartSync(); 
        }, { timezone: "Europe/Bucharest" });

        // --- [MODIFICAT] FOLOSIM server.listen ÎN LOC DE app.listen ---
        server.listen(PORT, () => console.log(`🚀 Server + Chat pornit pe http://localhost:${PORT}`));

    } catch (error) { console.error("❌ Eroare critică:", error.message); }
};

startServer();