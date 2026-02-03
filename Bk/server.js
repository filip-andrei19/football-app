require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cron = require('node-cron');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const http = require('http');           // [1] Necesare pentru Socket.io
const { Server } = require("socket.io");// [1] Socket.io
const cloudinary = require('cloudinary').v2; // [2] Cloudinary
const Joi = require('joi');             // [3] Joi Validation

// --- IMPORTURI SECURITATE & PERFORMANȚĂ ---
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

// --- IMPORTURI SERVICII ---
const { hardResetAndLoad } = require('./services/initialLoad'); 
const { runDailySmartSync } = require('./services/smartSync'); 

const app = express();
const server = http.createServer(app); // [1] Legăm Express de HTTP Server
const PORT = process.env.PORT || 3000;
const TOKEN_SECRET = process.env.JWT_SECRET || 'cheie_secreta_foarte_lunga_si_sigura';

// [2] CONFIGURARE CLOUDINARY
cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_NAME, 
  api_key: process.env.CLOUDINARY_KEY, 
  api_secret: process.env.CLOUDINARY_SECRET
});

// [1] CONFIGURARE SOCKET.IO
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

// MIDDLEWARE VERIFICARE TOKEN JWT
const verifyToken = (req, res, next) => {
    const token = req.header('auth-token');
    if (!token) return res.status(401).json({ error: 'Acces interzis. Lipsă Token.' });
    try {
        const verified = jwt.verify(token, TOKEN_SECRET);
        req.user = verified;
        next();
    } catch (err) { res.status(400).json({ error: 'Token Invalid' }); }
};

// CONFIGURARE EMAIL
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// [3] SCHEME DE VALIDARE JOI
const registerSchema = Joi.object({
    name: Joi.string().min(3).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required()
});

// SCHEMĂ REDENUMITĂ PENTRU A EVITA CONFLICTE
const listingValidationSchema = Joi.object({
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

// A. USER
const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, default: 'user', enum: ['user', 'admin'] }, 
    avatar: { type: String, default: '' }, 
    isBanned: { type: Boolean, default: false },
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

// B. MESSAGE (NOU - ADĂUGAT isDeleted)
const messageSchema = new mongoose.Schema({
    room: String,
    author: String,
    message: String,
    time: String,
    isDeleted: { type: Boolean, default: false }, // <--- PENTRU SOFT DELETE
    timestamp: { type: Date, default: Date.now }
});
const Message = mongoose.models.Message || mongoose.model('Message', messageSchema);

// C. PLAYER
const playerSchema = new mongoose.Schema({}, { strict: false });
const Player = mongoose.models.Player || mongoose.model('Player', playerSchema);

// D. LISTING
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
listingSchema.index({ title: 'text', description: 'text' }); 
const Listing = mongoose.models.Listing || mongoose.model('Listing', listingSchema);

// E. STORY
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

// Helper Cloudinary Upload
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

// LOGICA CHAT (SOCKET.IO)
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
            
            // [MODIFICAT] Trimitem obiectul SALVAT (care conține _id), nu datele brute
            io.in(data.room).emit("receive_message", newMessage);
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

        // SEEDING STORIES
        const storyCount = await Story.countDocuments();
        if (storyCount === 0) {
             console.log("📂 Seeding stories...");
             await Story.insertMany([
                {
                    title: 'Gheorghe "Gică" Popescu',
                    role: 'Șef Departament Scouting',
                    organization: 'Academia FC Viitorul / Farul',
                    excerpt: 'După 30 de ani de descoperit talente...',
                    content: `REPORTER: Domnule Popescu...`, 
                    date: 'Decembrie 2025'
                },
                {
                    title: 'Alexandru Andrași',
                    role: 'Fost Atacant',
                    organization: 'Steaua / Rapid București',
                    excerpt: 'Povestea plecării de la Steaua...',
                    content: `REPORTER: Domnule Andrași...`, 
                    date: 'Ianuarie 2026'
                }
            ]);
        }

        // RUTE AUTH
        app.post('/api/users/register', async (req, res) => {
            try {
                const { error } = registerSchema.validate(req.body);
                if (error) return res.status(400).json({ success: false, message: error.details[0].message });

                const { name, email, password } = req.body;
                if (await User.findOne({ email })) return res.status(400).json({ success: false, message: "Email folosit." });
                
                const role = email === 'admin.nou@scout.ro' ? 'admin' : 'user';
                const newUser = new User({ name, email, password, role });
                await newUser.save();
                
                const token = jwt.sign({ _id: newUser._id, role: newUser.role }, TOKEN_SECRET);
                res.status(201).json({ success: true, token, user: { name: newUser.name, email: newUser.email, role: newUser.role } });
            } catch (err) { res.status(500).json({ error: "Eroare server." }); }
        });

        app.post('/api/users/login', async (req, res) => {
            try {
                const { email, password } = req.body;
                const user = await User.findOne({ email });
                if (!user) return res.status(401).json({ success: false, message: "Utilizator inexistent." });
                if (user.isBanned) return res.status(403).json({ success: false, message: "Cont blocat." });
                
                const isMatch = await bcrypt.compare(password, user.password);
                if (!isMatch) return res.status(401).json({ success: false, message: "Parolă incorectă." });

                const token = jwt.sign({ _id: user._id, role: user.role }, TOKEN_SECRET);
                res.json({ success: true, token, user: { name: user.name, email: user.email, role: user.role, avatar: user.avatar } });
            } catch (err) { res.status(500).json({ error: "Eroare." }); }
        });

        app.post('/api/users/refresh', async (req, res) => {
            const user = await User.findOne({ email: req.body.email });
            if(user) res.json({ success: true, user: { name: user.name, email: user.email, role: user.role, avatar: user.avatar } });
        });

        app.post('/api/users/forgot-password', async (req, res) => {
             try {
                 const user = await User.findOne({ email: req.body.email });
                 if (!user) return res.status(404).json({ message: "Email necunoscut." });
                 const token = crypto.randomBytes(20).toString('hex');
                 user.resetPasswordToken = token;
                 user.resetPasswordExpires = Date.now() + 3600000;
                 await user.save();
                 console.log(`📧 [EMAIL SIMULAT]: http://localhost:5173/reset-password/${token}`);
                 res.json({ success: true, message: "Link trimis." });
             } catch(err) { res.status(500).json({error: "Eroare"}); }
        });

        app.post('/api/users/reset-password/:token', async (req, res) => {
             try {
                 const user = await User.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() } });
                 if (!user) return res.status(400).json({ message: "Token invalid." });
                 user.password = req.body.password;
                 user.resetPasswordToken = undefined;
                 user.resetPasswordExpires = undefined;
                 await user.save();
                 res.json({ success: true, message: "Parolă schimbată!" });
             } catch(err) { res.status(500).json({error: "Eroare"}); }
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

        // --- RUTA PENTRU LISTA DE CONVERSAȚII (INBOX) ---
        app.post('/api/messages/conversations', async (req, res) => {
            try {
                const { email, name } = req.body;

                const myListings = await Listing.find({ sellerEmail: email });
                const myListingIds = myListings.map(l => l._id.toString());
                
                const myMessages = await Message.find({ author: name }).distinct('room');

                const myListingRooms = myListingIds.map(id => `listing_${id}`);
                const allRelevantRooms = [...new Set([...myListingRooms, ...myMessages])];
                const listingRooms = allRelevantRooms.filter(r => r && r.startsWith('listing_'));

                const conversations = [];

                for (const room of listingRooms) {
                    const listingId = room.split('_')[1];
                    const listing = await Listing.findById(listingId);

                    if (listing) {
                        const lastMsg = await Message.findOne({ room }).sort({ timestamp: -1 });
                        
                        if (lastMsg || myListingIds.includes(listingId)) {
                            conversations.push({
                                roomId: room,
                                title: listing.title,
                                image: listing.images[0] || '', 
                                lastMessage: lastMsg ? lastMsg.message : "Începe conversația...",
                                timestamp: lastMsg ? lastMsg.timestamp : listing.posted,
                                isMyListing: listing.sellerEmail === email
                            });
                        }
                    }
                }
                
                conversations.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
                res.json(conversations);
            } catch (err) {
                console.error(err);
                res.status(500).json({ error: "Eroare la încărcarea conversațiilor." });
            }
        });

        // --- RUTA PENTRU TRIMITERE MESAJ (API HTTP -> SOCKET) ---
        app.post('/api/messages/send', async (req, res) => {
            try {
                const { room, author, message, time } = req.body;
                
                const newMessage = new Message({
                    room,
                    author,
                    message,
                    time,
                    timestamp: new Date()
                });
                await newMessage.save();

                io.in(room).emit("receive_message", newMessage);

                res.json({ success: true, message: "Mesaj trimis!" });
            } catch (err) {
                console.error(err);
                res.status(500).json({ error: "Eroare la trimiterea mesajului." });
            }
        });

        // --- [NOU] RUTA PENTRU ȘTERGERE MESAJ (SOFT DELETE) ---
        app.delete('/api/messages/:id', async (req, res) => {
            try {
                const messageId = req.params.id;
                const { user } = req.body; 

                const msg = await Message.findById(messageId);
                
                if (!msg) return res.status(404).json({ error: "Mesaj inexistent." });

                // Verificare de securitate
                if (msg.author !== user) {
                    return res.status(403).json({ error: "Nu poți șterge mesajele altora." });
                }

                // SOFT DELETE - Marcam ca șters și golim textul
                msg.isDeleted = true;
                msg.message = ""; // Golim mesajul pentru privacy
                await msg.save();

                // Anunțăm socket-ul că s-a actualizat mesajul (nu șters de tot)
                io.in(msg.room).emit("message_updated", msg);

                res.json({ success: true });
            } catch (err) {
                console.error(err);
                res.status(500).json({ error: "Eroare la ștergere." });
            }
        });

        // RUTE MARKETPLACE (CU CLOUDINARY & VALIDARE)
        app.post('/api/listings', async (req, res) => {
            try {
                const { error } = listingValidationSchema.validate(req.body);
                if (error) return res.status(400).json({ error: error.details[0].message });

                const imagePromises = req.body.images.map(img => uploadImage(img));
                const uploadedImages = await Promise.all(imagePromises);
                const validImages = uploadedImages.filter(img => img !== null);

                const newListing = new Listing({
                    ...req.body,
                    images: validImages 
                });

                await newListing.save();
                res.status(201).json(newListing);
            } catch (err) { 
                console.error(err);
                res.status(500).json({ error: "Eroare la postare." }); 
            }
        });

        app.get('/api/listings', async (req, res) => {
            const { page = 1, limit = 50, search, category } = req.query;
            let query = {};
            if (search) query.$or = [{ title: { $regex: search, $options: 'i' } }, { description: { $regex: search, $options: 'i' } }];
            if (category && category !== 'Toate') query.category = category;

            const listings = await Listing.find(query).sort({ posted: -1 }).limit(limit * 1).skip((page - 1) * limit);
            res.json(listings);
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

        app.get('/api/sport/players', async (req, res) => {
            const players = await Player.find().limit(5000); 
            res.json(players);
        });

        // RUTE ADMIN & STORIES
        app.get('/api/admin/users', async (req, res) => { const users = await User.find(); res.json(users); });
        app.put('/api/admin/users/:id/ban', async (req, res) => { 
            const user = await User.findById(req.params.id); 
            user.isBanned = !user.isBanned; 
            await user.save(); 
            res.json({success: true}); 
        });
        
        app.get('/api/stories', async (req, res) => { const stories = await Story.find().sort({postedAt: -1}); res.json(stories); });
        app.post('/api/admin/stories', async (req, res) => { const s = new Story(req.body); await s.save(); res.json(s); });
        app.put('/api/admin/stories/:id', async (req, res) => { const s = await Story.findByIdAndUpdate(req.params.id, req.body); res.json(s); });
        app.delete('/api/admin/stories/:id', async (req, res) => { await Story.findByIdAndDelete(req.params.id); res.json({success: true}); });

        // --- ADMIN TOOLS ---
        app.get('/api/admin/hard-reset', async (req, res) => { hardResetAndLoad(); res.send("Reset initiated."); });
        cron.schedule('10 16 * * *', async () => { await runDailySmartSync(); }, { timezone: "Europe/Bucharest" });

        // IMPORTANT: [1] Folosim server.listen, NU app.listen
        server.listen(PORT, () => console.log(`🚀 Server + Chat pornit pe http://localhost:${PORT}`));

    } catch (error) { console.error("❌ Eroare:", error.message); }
};

startServer();