require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cron = require('node-cron');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const http = require('http');           
const { Server } = require("socket.io");
const cloudinary = require('cloudinary').v2; 
const Joi = require('joi');             

// --- IMPORTURI SECURITATE & PERFORMANȚĂ ---
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

// --- IMPORTURI SERVICII ---
const { hardResetAndLoad } = require('./services/initialLoad'); 
const { runDailySmartSync } = require('./services/smartSync'); 

const app = express();
const server = http.createServer(app); 
const PORT = process.env.PORT || 3000;
const TOKEN_SECRET = process.env.JWT_SECRET || 'cheie_secreta_foarte_lunga_si_sigura';

// CONFIGURARE CLOUDINARY
cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_NAME, 
  api_key: process.env.CLOUDINARY_KEY, 
  api_secret: process.env.CLOUDINARY_SECRET
});

// CONFIGURARE SOCKET.IO
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

// SCHEME DE VALIDARE JOI
const registerSchema = Joi.object({
    name: Joi.string().min(3).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required()
});

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
    favorites: { type: [String], default: [] }, 
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

// B. MESSAGE (Actualizat pentru Răspunsuri, Reacții și Fixare)
const messageSchema = new mongoose.Schema({
    room: String,
    author: String,
    message: String,
    imageUrl: { type: String, default: "" }, 
    time: String,
    isDeleted: { type: Boolean, default: false }, 
    // --- NOU: PENTRU INTERACȚIUNE ---
    replyTo: { 
        id: String,
        author: String,
        text: String
    },
    reactions: { type: Map, of: [String], default: {} },
    isPinned: { type: Boolean, default: false },
    timestamp: { type: Date, default: Date.now }
});
const Message = mongoose.models.Message || mongoose.model('Message', messageSchema);

// C. PLAYER
const playerSchema = new mongoose.Schema({}, { strict: false });
playerSchema.index({ name: 'text', firstname: 'text', lastname: 'text' });
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

// --- HELPERE CLOUDINARY PENTRU UPLOAD ȘI ȘTERGERE ---
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

const deleteFromCloudinary = async (imageUrl) => {
    try {
        if (!imageUrl || !imageUrl.includes('cloudinary.com')) return;
        
        const urlParts = imageUrl.split('/');
        const uploadIndex = urlParts.findIndex(part => part === 'upload');
        const partsToKeep = urlParts.slice(uploadIndex + 1);
        
        if (partsToKeep[0].startsWith('v')) partsToKeep.shift(); 
        
        const publicIdWithExt = partsToKeep.join('/');
        const publicId = publicIdWithExt.split('.')[0]; 
        
        await cloudinary.uploader.destroy(publicId);
        console.log(`🗑 Imagine ștearsă din Cloudinary: ${publicId}`);
    } catch (err) {
        console.error("Eroare la ștergerea din Cloudinary:", err);
    }
};

// ==========================================
// 2. LOGICA SERVER & RUTE
// ==========================================

io.on("connection", (socket) => {
    console.log(`User Connected: ${socket.id}`);

    socket.on("join_room", async (data) => {
        socket.join(data); 
        try {
            const history = await Message.find({ room: data }).sort({ timestamp: 1 }).limit(100);
            socket.emit("load_history", history);
        } catch(e) { console.error(e); }
    });

    socket.on("send_message", async (data) => {
        try {
            const newMessage = new Message(data);
            await newMessage.save();
            io.in(data.room).emit("receive_message", newMessage);
        } catch(e) { console.error(e); }
    });

    socket.on("disconnect", () => {
        console.log("User Disconnected", socket.id);
    });
    socket.on("typing", (room) => {
        socket.to(room).emit("display_typing", { isTyping: true });
    });
    socket.on("stop_typing", (room) => {
        socket.to(room).emit("display_typing", { isTyping: false });
    });
});

const startServer = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Conectat la MongoDB.');

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

        // --- RUTE AUTH & PROFIL ---
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
                res.status(201).json({ success: true, token, user: { name: newUser.name, email: newUser.email, role: newUser.role, favorites: newUser.favorites } });
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
                res.json({ success: true, token, user: { name: user.name, email: user.email, role: user.role, avatar: user.avatar, favorites: user.favorites } });
            } catch (err) { res.status(500).json({ error: "Eroare." }); }
        });

        app.post('/api/users/refresh', async (req, res) => {
            const user = await User.findOne({ email: req.body.email });
            if(user) res.json({ success: true, user: { name: user.name, email: user.email, role: user.role, avatar: user.avatar, favorites: user.favorites } });
        });

        app.post('/api/users/forgot-password', async (req, res) => {
             try {
                 const user = await User.findOne({ email: req.body.email });
                 if (!user) return res.status(404).json({ message: "Email necunoscut." });
                 const token = crypto.randomBytes(20).toString('hex');
                 user.resetPasswordToken = token;
                 user.resetPasswordExpires = Date.now() + 3600000;
                 await user.save();
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

        // --- ACTUALIZARE PROFIL ---
        app.put('/api/users/profile', async (req, res) => {
            try {
                const { email, name, avatar } = req.body;
                const user = await User.findOne({ email });
                if (!user) return res.status(404).json({ error: "User not found" });

                let newAvatarUrl = user.avatar;

                if (avatar && avatar.startsWith('data:image')) {
                    if (user.avatar && user.avatar.includes('cloudinary.com')) {
                        await deleteFromCloudinary(user.avatar);
                    }
                    newAvatarUrl = await uploadImage(avatar);
                }

                let updates = {};
                if (name && name !== user.name) updates.seller = name;
                if (newAvatarUrl && newAvatarUrl !== user.avatar) updates.sellerAvatar = newAvatarUrl;
                
                if (Object.keys(updates).length > 0) {
                    await Listing.updateMany({ sellerEmail: email }, { $set: updates });
                }

                user.name = name || user.name;
                user.avatar = newAvatarUrl || user.avatar;
                await user.save();
                
                res.json({ success: true, user: { name: user.name, email: user.email, role: user.role, avatar: user.avatar, favorites: user.favorites } });
            } catch (err) { res.status(500).json({ error: "Eroare la actualizarea profilului." }); }
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

        // --- RUTE FAVORITE ---
        app.post('/api/users/favorites/toggle', async (req, res) => {
            try {
                const { email, listingId } = req.body;
                const user = await User.findOne({ email });
                if (!user) return res.status(404).json({ error: "User not found" });

                const index = user.favorites.indexOf(listingId);
                if (index === -1) {
                    user.favorites.push(listingId);
                } else {
                    user.favorites.splice(index, 1);
                }
                
                await user.save();
                res.json({ success: true, favorites: user.favorites });
            } catch (err) { 
                res.status(500).json({ error: "Eroare la modificarea favoritelor." }); 
            }
        });

        app.get('/api/users/favorites/:email', async (req, res) => {
            try {
                const user = await User.findOne({ email: req.params.email });
                if (!user) return res.status(404).json({ error: "User not found" });
                
                const favoriteListings = await Listing.find({ _id: { $in: user.favorites } }).sort({ posted: -1 });
                res.json({ success: true, favorites: user.favorites, favoriteListings });
            } catch (err) { 
                res.status(500).json({ error: "Eroare la preluarea favoritelor." }); 
            }
        });

        // --- RUTE MESAJE ---
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
                        
                        if (lastMsg) {
                            conversations.push({
                                roomId: room,
                                title: listing.title,
                                image: listing.images[0] || '', 
                                lastMessage: lastMsg.imageUrl ? '📷 Imagine' : lastMsg.message,
                                timestamp: lastMsg.timestamp,
                                isMyListing: listing.sellerEmail === email
                            });
                        }
                    }
                }
                
                conversations.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
                res.json(conversations);
            } catch (err) { res.status(500).json({ error: "Eroare la încărcarea conversațiilor." }); }
        });

        app.post('/api/messages/send', async (req, res) => {
            try {
                const { room, author, message, time, imageUrl, imageBase64, replyTo } = req.body;
                
                const rawImage = imageBase64 || imageUrl;
                let finalImageUrl = "";
                
                if (rawImage && rawImage.startsWith('data:image')) {
                    finalImageUrl = await uploadImage(rawImage);
                }

                const newMessage = new Message({ 
                    room, 
                    author, 
                    message: message || "", 
                    time, 
                    imageUrl: finalImageUrl,
                    replyTo: replyTo || null,
                    timestamp: new Date() 
                });

                await newMessage.save();
                io.in(room).emit("receive_message", newMessage);
                res.json({ success: true, message: "Mesaj trimis!" });
            } catch (err) { 
                console.error("Eroare trimitere mesaj:", err);
                res.status(500).json({ error: "Eroare." }); 
            }
        });

        app.delete('/api/messages/:id', async (req, res) => {
            try {
                const messageId = req.params.id;
                const { user } = req.body; 
                const msg = await Message.findById(messageId);
                
                if (!msg) return res.status(404).json({ error: "Mesaj inexistent." });
                if (msg.author !== user) return res.status(403).json({ error: "Nu poți șterge mesajele altora." });
                
                if (msg.imageUrl && msg.imageUrl.includes('cloudinary.com')) {
                    await deleteFromCloudinary(msg.imageUrl);
                }

                msg.isDeleted = true;
                msg.message = ""; 
                msg.imageUrl = ""; 
                msg.replyTo = null; // Eliminăm și reply dacă se șterge
                await msg.save();
                
                io.in(msg.room).emit("message_updated", msg);
                res.json({ success: true });
            } catch (err) { res.status(500).json({ error: "Eroare la ștergere." }); }
        });

        // --- NOU: RUTA PENTRU REACȚII EMOJI ---
        app.post('/api/messages/:id/react', async (req, res) => {
            try {
                const { emoji, user } = req.body;
                const msg = await Message.findById(req.params.id);
                if (!msg) return res.status(404).json({ error: "Mesaj inexistent." });

                // Asigurăm existența obiectului reactions
                if (!msg.reactions) msg.reactions = new Map();
                
                let usersWhoReacted = msg.reactions.get(emoji) ? [...msg.reactions.get(emoji)] : [];

                if (usersWhoReacted.includes(user)) {
                    usersWhoReacted = usersWhoReacted.filter(u => u !== user); // Toggle
                } else {
                    usersWhoReacted.push(user);
                }

                if (usersWhoReacted.length === 0) {
                    msg.reactions.delete(emoji);
                } else {
                    msg.reactions.set(emoji, usersWhoReacted);
                }

                // 🔥 CRUCIAL: Mongoose are nevoie de asta pentru a salva un Map modificat
                msg.markModified('reactions');
                await msg.save();
                
                io.in(msg.room).emit("message_updated", msg);
                res.json({ success: true });
            } catch (err) { 
                console.error("Eroare reacție:", err);
                res.status(500).json({ error: "Eroare la adăugarea reacției." }); 
            }
        });

        // --- NOU: RUTA PENTRU FIXARE MESAJ (PIN) ---
        app.post('/api/messages/:id/pin', async (req, res) => {
            try {
                const msg = await Message.findById(req.params.id);
                if (!msg) return res.status(404).json({ error: "Mesaj inexistent." });

                msg.isPinned = !msg.isPinned; // Toggle starea de fixat
                await msg.save();
                
                io.in(msg.room).emit("message_updated", msg);
                res.json({ success: true, isPinned: msg.isPinned });
            } catch (err) { res.status(500).json({ error: "Eroare la fixarea mesajului." }); }
        });

        // --- RUTE MARKETPLACE ---
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
                res.status(500).json({ error: "Eroare la postare." }); 
            }
        });

        app.get('/api/listings', async (req, res) => {
            const { page = 1, limit = 50, search, category } = req.query;
            let query = {};
            if (search) query.$or = [{ title: { $regex: search,$options: 'i' } }, { description: { $regex: search,$options: 'i' } }];
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

                if (listing.images && listing.images.length > 0) {
                    for (const imgUrl of listing.images) {
                        await deleteFromCloudinary(imgUrl);
                    }
                }

                await Listing.findByIdAndDelete(req.params.id);
                
                await User.updateMany(
                    { favorites: req.params.id }, 
                    { $pull: { favorites: req.params.id } }
                );

                res.json({ success: true, message: "Produs și imagini șterse definitiv." });
            } catch (err) {
                res.status(500).json({ error: "Eroare la ștergere." });
            }
        });

        // RUTE API SPORT & ADMIN
        app.get('/api/sport/players', async (req, res) => {
            try {
                const { search } = req.query;
                let query = {};
                if (search) {
                    query.$or = [
                        { name: { $regex: search,$options: 'i' } },
                        { firstname: { $regex: search,$options: 'i' } },
                        { lastname: { $regex: search,$options: 'i' } }
                    ];
                }
                const players = await Player.find(query).limit(500); 
                res.json(players);
            } catch (err) { res.status(500).json({ error: "Eroare la preluarea jucătorilor." }); }
        });

        app.get('/api/sport/teams/search', async (req, res) => {
            try {
                const { q } = req.query;
                let matchQuery = {};
                
                if (q) {
                    matchQuery = { 
                        $or: [
                            { team_name: { $regex: q,$options: 'i' } },
                            { team: { $regex: q,$options: 'i' } }
                        ]
                    };
                }
                
                const teams = await Player.aggregate([
                    { $match: matchQuery },
                    { $group: { 
                        _id: { $ifNull: ["$team_name", "$team"] },
                        team_logo: { $first: "$team_logo" }
                    }},
                    { $match: { _id: {$ne: null } } }, 
                    { $project: { _id: 0, team_name: "$_id", team_logo: 1 } },
                    { $sort: { team_name: 1 } },                                          {$limit: 200 } // Limită mărită
                ]);
                
                res.json(teams);
            } catch (err) { 
                console.error("Eroare Teams:", err);
                res.status(500).json({ error: "Eroare la căutarea echipelor." }); 
            }
        });

        app.get('/api/sport/teams/:teamName/roster', async (req, res) => {
            try {
                const teamName = req.params.teamName;
                const players = await Player.find({ 
                    $or: [
                        { team_name: teamName },
                        { team: teamName }
                    ]
                }).sort({ name: 1 });
                
                if (!players || players.length === 0) {
                    return res.status(404).json({ message: "Echipa nu a fost găsită sau nu are jucători." });
                }

                const roster = {
                    teamInfo: {
                        name: teamName,
                        logo: players[0].team_logo,
                        totalPlayers: players.length
                    },
                    squad: {
                        Goalkeepers: players.filter(p => p.position === 'Goalkeeper'),
                        Defenders: players.filter(p => p.position === 'Defender'),
                        Midfielders: players.filter(p => p.position === 'Midfielder'),
                        Attackers: players.filter(p => p.position === 'Attacker'),
                        Unknown: players.filter(p => !p.position || !['Goalkeeper', 'Defender', 'Midfielder', 'Attacker'].includes(p.position))
                    }
                };
                
                res.json(roster);
            } catch (err) {
                res.status(500).json({ error: "Eroare la preluarea lotului." });
            }
        });

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
        app.get('/api/admin/force-sync', async (req, res) => { runDailySmartSync(); res.send("Smart Sync forțat. Verifică logs."); });
        cron.schedule('14 12 * * *', async () => { await runDailySmartSync(); }, { timezone: "Europe/Bucharest" });

        server.listen(PORT, () => console.log(`🚀 Server + Chat pornit pe http://localhost:${PORT}`));

    } catch (error) { console.error("❌ Eroare:", error.message); }
};

startServer();