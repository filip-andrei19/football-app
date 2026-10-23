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

// --- IMPORTURI SENTRY (NOU) ---
const Sentry = require("@sentry/node");
const { nodeProfilingIntegration } = require("@sentry/profiling-node");

// --- IMPORTURI SERVICII ---
const { hardResetAndLoad } = require('./services/initialLoad');
const { runDailySmartSync, runNationalTeamSync } = require('./services/smartSync');
const { sync7DaysWindow, syncLiveMatches, getFixtureDetailsOnDemand, getLeagueStandingsOnDemand } = require('./services/matchSync');

const app = express();
app.set('trust proxy', 1);

// ==========================================
// INIȚIALIZARE SENTRY (TRUIE SĂ FIE AICI, ÎNAINTE DE RUTE/MIDDLEWARE)
// ==========================================
Sentry.init({
  dsn: "https://1cd760c47aa5288d63b8307df25fb8f4@o4512306562596864.ingest.de.sentry.io/4512306687705168", // <-- ÎNLOCUIEȘTE CU DSN-UL REAL PENTRU BACKEND
  integrations: [
    nodeProfilingIntegration(),
  ],
  tracesSampleRate: 1.0,
  profilesSampleRate: 1.0,
});

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

// Handlere Sentry pentru cereri și tracing (TRUIE SĂ FIE PRIMELE MIDDLEWARE-URI)
app.use(Sentry.Handlers.requestHandler());
app.use(Sentry.Handlers.tracingHandler());

app.use(helmet());
app.use(compression());
app.use(cors());

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 1000, 
    message: "Prea multe cereri. Încearcă mai târziu."
});
app.use(limiter);

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

const verifyToken = (req, res, next) => {
    const token = req.header('auth-token');
    if (!token) return res.status(401).json({ error: 'Acces interzis. Lipsă Token.' });
    try {
        const verified = jwt.verify(token, TOKEN_SECRET);
        req.user = verified;
        next();
    } catch (err) { res.status(400).json({ error: 'Token Invalid' }); }
};

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
});

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

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, default: 'user', enum: ['user', 'admin'] },
    avatar: { type: String, default: '' },
    favorites: { type: [String], default: [] },
    scoutWatchlist: { type: [String], default: [] },
    favoriteMatches: { type: [Number], default: [] },
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

const messageSchema = new mongoose.Schema({
    room: String,
    author: String,
    message: String,
    imageUrl: { type: String, default: "" },
    time: String,
    isDeleted: { type: Boolean, default: false },
    replyTo: { id: String, author: String, text: String },
    reactions: { type: Object, default: {} },
    isPinned: { type: Boolean, default: false },
    timestamp: { type: Date, default: Date.now }
});
const Message = mongoose.models.Message || mongoose.model('Message', messageSchema);

const playerSchema = new mongoose.Schema({}, { strict: false });
playerSchema.index({ name: 'text', firstname: 'text', lastname: 'text' });
const Player = mongoose.models.Player || mongoose.model('Player', playerSchema);

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

const storySchema = new mongoose.Schema({
    title: String, role: String, organization: String, excerpt: String, content: String, date: String, postedAt: { type: Date, default: Date.now }
});
const Story = mongoose.models.Story || mongoose.model('Story', storySchema);

const fixtureSchema = new mongoose.Schema({
    fixture_id: { type: Number, unique: true },
    date: Date,
    timestamp: Number,
    league_id: Number,
    league_name: String,
    league_logo: String,
    league_round: String,
    venue_name: String,
    venue_city: String,
    referee: String,
    home_team_id: Number,
    home_team_name: String,
    home_team_logo: String,
    away_team_id: Number,
    away_team_name: String,
    away_team_logo: String,
    home_goals: { type: Number, default: null },
    away_goals: { type: Number, default: null },
    status_short: String,
    elapsed: { type: Number, default: null },
    events: { type: Array, default: [] },
    lineups: { type: Array, default: [] },
    statistics: { type: Array, default: [] },
    details_updated_at: { type: Date, default: null }
});
const Fixture = mongoose.models.Fixture || mongoose.model('Fixture', fixtureSchema);

const standingSchema = new mongoose.Schema({
    league_id: Number,
    season: Number,
    league_name: String,
    league_logo: String,
    table: { type: Array, default: [] },
    updated_at: { type: Date, default: Date.now }
});
const Standing = mongoose.models.Standing || mongoose.model('Standing', standingSchema);

const uploadImage = async (base64Str) => {
    try {
        if (!base64Str || !base64Str.startsWith('data:image')) return base64Str;
        const uploadResponse = await cloudinary.uploader.upload(base64Str, { upload_preset: 'scout_app', folder: 'football_market' });
        return uploadResponse.secure_url;
    } catch (err) { return null; }
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
    } catch (err) { console.error(err); }
};

io.on("connection", (socket) => {
    socket.on("join_room", async (data) => {
        socket.join(data);
        try {
            const history = await Message.find({ room: data }).sort({ timestamp: 1 }).limit(100);
            socket.emit("load_history", history);
        } catch(e) {}
    });
    socket.on("send_message", async (data) => {
        try {
            const newMessage = new Message(data);
            await newMessage.save();
            io.in(data.room).emit("receive_message", newMessage);
        } catch(e) {}
    });
    socket.on("disconnect", () => {});
    socket.on("typing", (room) => { socket.to(room).emit("display_typing", { isTyping: true }); });
    socket.on("stop_typing", (room) => { socket.to(room).emit("display_typing", { isTyping: false }); });
});

// Cooldown pentru sincronizarea automată a meciurilor rămase în urmă
let lastAutoMatchSyncTime = 0;

const startServer = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Conectat la MongoDB.');

        const storyCount = await Story.countDocuments();
        if (storyCount === 0) {
             await Story.insertMany([
                { title: 'Gheorghe "Gică" Popescu', role: 'Șef', organization: 'Academia', excerpt: '...', content: `REP...`, date: 'Dec 2025' }
             ]);
        }

        // RUTA DE TEST SENTRY (OPȚIONALĂ, PENTRU VERIFICARE)
        app.get("/debug-sentry", function mainHandler(req, res) {
            throw new Error("My first Sentry error!");
        });

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
                res.status(201).json({
                    success: true,
                    token,
                    user: {
                        name: newUser.name,
                        email: newUser.email,
                        role: newUser.role,
                        favorites: newUser.favorites,
                        scoutWatchlist: newUser.scoutWatchlist,
                        favoriteMatches: newUser.favoriteMatches
                    }
                });
            } catch (err) { res.status(500).json({ error: "Eroare." }); }
        });

        app.post('/api/users/login', async (req, res) => {
            try {
                const { email, password } = req.body;
                const user = await User.findOne({ email });
                if (!user) return res.status(401).json({ success: false, message: "User inexistent." });
                if (user.isBanned) return res.status(403).json({ success: false, message: "Cont blocat." });
                const isMatch = await bcrypt.compare(password, user.password);
                if (!isMatch) return res.status(401).json({ success: false, message: "Parolă incorectă." });
                const token = jwt.sign({ _id: user._id, role: user.role }, TOKEN_SECRET);
                res.json({
                    success: true,
                    token,
                    user: {
                        name: user.name,
                        email: user.email,
                        role: user.role,
                        avatar: user.avatar,
                        favorites: user.favorites,
                        scoutWatchlist: user.scoutWatchlist || [],
                        favoriteMatches: user.favoriteMatches || []
                    }
                });
            } catch (err) { res.status(500).json({ error: "Eroare." }); }
        });

        app.post('/api/users/refresh', async (req, res) => {
            const user = await User.findOne({ email: req.body.email });
            if(user) res.json({
                success: true,
                user: {
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    avatar: user.avatar,
                    favorites: user.favorites,
                    scoutWatchlist: user.scoutWatchlist || [],
                    favoriteMatches: user.favoriteMatches || []
                }
            });
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

        app.put('/api/users/profile', async (req, res) => {
            try {
                const { email, name, avatar } = req.body;
                const user = await User.findOne({ email });
                if (!user) return res.status(404).json({ error: "User not found" });
                let newAvatarUrl = user.avatar;
                if (avatar && avatar.startsWith('data:image')) {
                    if (user.avatar && user.avatar.includes('cloudinary.com')) { await deleteFromCloudinary(user.avatar); }
                    newAvatarUrl = await uploadImage(avatar);
                }
                let updates = {};
                if (name && name !== user.name) updates.seller = name;
                if (newAvatarUrl && newAvatarUrl !== user.avatar) updates.sellerAvatar = newAvatarUrl;
                if (Object.keys(updates).length > 0) { await Listing.updateMany({ sellerEmail: email }, { $set: updates }); }
                user.name = name || user.name;
                user.avatar = newAvatarUrl || user.avatar;
                await user.save();
                res.json({
                    success: true,
                    user: {
                        name: user.name,
                        email: user.email,
                        role: user.role,
                        avatar: user.avatar,
                        favorites: user.favorites,
                        scoutWatchlist: user.scoutWatchlist || [],
                        favoriteMatches: user.favoriteMatches || []
                    }
                });
            } catch (err) { res.status(500).json({ error: "Eroare." }); }
        });

        app.put('/api/users/change-password', async (req, res) => {
            try {
                const { email, currentPassword, newPassword } = req.body;
                const user = await User.findOne({ email });
                if (!user) return res.status(404).json({ error: "User not found" });
                const isMatch = await bcrypt.compare(currentPassword, user.password);
                if (!isMatch) return res.status(400).json({ success: false, message: "Parolă incorectă." });
                user.password = newPassword;
                await user.save();
                res.json({ success: true, message: "Parolă schimbată." });
            } catch (err) { res.status(500).json({ error: "Eroare." }); }
        });

        app.post('/api/users/favorites/toggle', async (req, res) => {
            try {
                const { email, listingId } = req.body;
                const user = await User.findOne({ email });
                if (!user) return res.status(404).json({ error: "User not found" });
                const index = user.favorites.indexOf(listingId);
                if (index === -1) { user.favorites.push(listingId); } else { user.favorites.splice(index, 1); }
                await user.save();
                res.json({ success: true, favorites: user.favorites });
            } catch (err) { res.status(500).json({ error: "Eroare." }); }
        });

        app.get('/api/users/favorites/:email', async (req, res) => {
            try {
                const user = await User.findOne({ email: req.params.email });
                if (!user) return res.status(404).json({ error: "User not found" });
                const favoriteListings = await Listing.find({ _id: { $in: user.favorites } }).sort({ posted: -1 });
                res.json({ success: true, favorites: user.favorites, favoriteListings });
            } catch (err) { res.status(500).json({ error: "Eroare." }); }
        });

        // --- RUTE NOI: WATCHLIST JUCĂTORI (SCOUTING) & MECIURI FAVORITE ---
        app.post('/api/users/watchlist/toggle', async (req, res) => {
            try {
                const { email, playerId } = req.body;
                const user = await User.findOne({ email });
                if (!user) return res.status(404).json({ error: "User not found" });
                if (!user.scoutWatchlist) user.scoutWatchlist = [];
                const index = user.scoutWatchlist.indexOf(String(playerId));
                if (index === -1) {
                    user.scoutWatchlist.push(String(playerId));
                } else {
                    user.scoutWatchlist.splice(index, 1);
                }
                await user.save();
                res.json({ success: true, scoutWatchlist: user.scoutWatchlist });
            } catch (err) { res.status(500).json({ error: "Eroare la actualizarea watchlist-ului." }); }
        });

        app.get('/api/users/watchlist/:email', async (req, res) => {
            try {
                const user = await User.findOne({ email: req.params.email });
                if (!user) return res.status(404).json({ error: "User not found" });
                const watchlistIds = user.scoutWatchlist || [];
                const watchedPlayers = await Player.find({ _id: { $in: watchlistIds } });
                res.json({ success: true, scoutWatchlist: watchlistIds, watchedPlayers });
            } catch (err) { res.status(500).json({ error: "Eroare la preluarea watchlist-ului." }); }
        });

        app.post('/api/users/favorite-matches/toggle', async (req, res) => {
            try {
                const { email, fixtureId } = req.body;
                const user = await User.findOne({ email });
                if (!user) return res.status(404).json({ error: "User not found" });
                if (!user.favoriteMatches) user.favoriteMatches = [];
                const numericId = Number(fixtureId);
                const index = user.favoriteMatches.indexOf(numericId);
                if (index === -1) {
                    user.favoriteMatches.push(numericId);
                } else {
                    user.favoriteMatches.splice(index, 1);
                }
                await user.save();
                res.json({ success: true, favoriteMatches: user.favoriteMatches });
            } catch (err) { res.status(500).json({ error: "Eroare la actualizarea meciurilor favorite." }); }
        });

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
                            conversations.push({ roomId: room, title: listing.title, image: listing.images[0] || '', lastMessage: lastMsg.imageUrl ? 'Imagine' : lastMsg.message, timestamp: lastMsg.timestamp, isMyListing: listing.sellerEmail === email });
                        }
                    }
                }
                conversations.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
                res.json(conversations);
            } catch (err) { res.status(500).json({ error: "Eroare." }); }
        });

        app.post('/api/messages/send', async (req, res) => {
            try {
                const { room, author, message, time, imageUrl, imageBase64, replyTo } = req.body;
                let finalImageUrl = "";
                const rawImage = imageBase64 || imageUrl;
                if (rawImage && rawImage.startsWith('data:image')) { finalImageUrl = await uploadImage(rawImage); }
                const newMessage = new Message({ room, author, message: message || "", time, imageUrl: finalImageUrl, replyTo: replyTo || null, timestamp: new Date() });
                await newMessage.save();
                io.in(room).emit("receive_message", newMessage);
                res.json({ success: true, message: "Mesaj trimis!" });
            } catch (err) { res.status(500).json({ error: "Eroare." }); }
        });

        app.delete('/api/messages/:id', async (req, res) => {
            try {
                const msg = await Message.findById(req.params.id);
                if (!msg) return res.status(404).json({ error: "Mesaj inexistent." });
                if (msg.author !== req.body.user) return res.status(403).json({ error: "Interzis." });
                if (msg.imageUrl && msg.imageUrl.includes('cloudinary.com')) { await deleteFromCloudinary(msg.imageUrl); }
                msg.isDeleted = true; msg.message = ""; msg.imageUrl = ""; msg.replyTo = null;
                await msg.save();
                io.in(msg.room).emit("message_updated", msg);
                res.json({ success: true });
            } catch (err) { res.status(500).json({ error: "Eroare." }); }
        });

        app.post('/api/messages/:id/react', async (req, res) => {
            try {
                const { emoji, user } = req.body;
                const msg = await Message.findById(req.params.id);
                if (!msg) return res.status(404).json({ error: "Mesaj inexistent." });
                const currentReactions = msg.reactions || {};
                let usersWhoReacted = currentReactions[emoji] || [];
                if (usersWhoReacted.includes(user)) { usersWhoReacted = usersWhoReacted.filter(u => u !== user); } else { usersWhoReacted.push(user); }
                if (usersWhoReacted.length === 0) { delete currentReactions[emoji]; } else { currentReactions[emoji] = usersWhoReacted; }
                msg.reactions = currentReactions;
                msg.markModified('reactions');
                await msg.save();
                io.in(msg.room).emit("message_updated", msg);
                res.json({ success: true });
            } catch (err) { res.status(500).json({ error: "Eroare." }); }
        });

        app.post('/api/messages/:id/pin', async (req, res) => {
            try {
                const msg = await Message.findById(req.params.id);
                if (!msg) return res.status(404).json({ error: "Mesaj inexistent." });
                msg.isPinned = !msg.isPinned;
                await msg.save();
                io.in(msg.room).emit("message_updated", msg);
                res.json({ success: true, isPinned: msg.isPinned });
            } catch (err) { res.status(500).json({ error: "Eroare." }); }
        });

        app.post('/api/listings', async (req, res) => {
            try {
                const { error } = listingValidationSchema.validate(req.body);
                if (error) return res.status(400).json({ error: error.details[0].message });
                const imagePromises = req.body.images.map(img => uploadImage(img));
                const uploadedImages = await Promise.all(imagePromises);
                const validImages = uploadedImages.filter(img => img !== null);
                const newListing = new Listing({ ...req.body, images: validImages });
                await newListing.save();
                res.status(201).json(newListing);
            } catch (err) { res.status(500).json({ error: "Eroare." }); }
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
                if (!isOwner && !isAdmin) return res.status(403).json({ error: "Interzis." });
                if (listing.images && listing.images.length > 0) {
                    for (const imgUrl of listing.images) { await deleteFromCloudinary(imgUrl); }
                }
                await Listing.findByIdAndDelete(req.params.id);
                await User.updateMany({ favorites: req.params.id }, { $pull: { favorites: req.params.id } });
                res.json({ success: true, message: "Șters." });
            } catch (err) { res.status(500).json({ error: "Eroare." }); }
        });

        app.get('/api/sport/players', async (req, res) => {
            try {
                const {
                    search,
                    diaspora,
                    u21,
                    position,
                    minAge,
                    maxAge,
                    minMinutes,
                    minGoals,
                    minRating,
                    leagueId,
                    nationality,
                    team,
                    limit
                } = req.query;

                let conditions = [];

                if (diaspora === 'true') {
                    // Filtrul corect pentru Diaspora: Jucători români care NU joacă în SuperLiga României (283, 284)
                    // SAU fac parte din lotul Echipei Naționale a României
                    conditions.push({
                        $or: [
                            { nationality: { $regex: /^romania$/i }, league_id: { $nin: [283, 284] } }, { team_name: {$regex: /romania/i } }
                        ]
                    });
                } else if (u21 === 'true') {
                    // Filtrul pentru Future Stars: Căutăm în TOATĂ baza de date toți jucătorii U21
                    conditions.push({
                        $or: [
                            { age: { $gt: 0, $lte: 21 } }, { birth_date: {$regex: /^(2005|2006|2007|2008|2009|2010)/ } }
                        ]
                    });
                }

                if (search) {
                    conditions.push({
                        $or: [
                            { name: { $regex: search,$options: 'i' } },
                            { firstname: { $regex: search,$options: 'i' } },
                            { lastname: { $regex: search,$options: 'i' } },
                            { team_name: { $regex: search,$options: 'i' } },
                            { team: { $regex: search,$options: 'i' } }
                        ]
                    });
                }

                // Filtre avansate pentru modulul de Scouting Pro
                if (position && position !== 'Toate') {
                    const posLower = position.toLowerCase();
                    if (posLower.includes('portar') || posLower.includes('goalkeeper')) {
                        conditions.push({ position: { $regex: /goalkeeper|portar/i } });
                    } else if (posLower.includes('funda') || posLower.includes('defender')) {
                        conditions.push({ position: { $regex: /defender|back|funda/i } });
                    } else if (posLower.includes('mijloca') || posLower.includes('midfield')) {
                        conditions.push({ position: { $regex: /midfield|mijloca/i } });
                    } else if (posLower.includes('ataca') || posLower.includes('attack') || posLower.includes('forward')) {
                        conditions.push({ position: { $regex: /attacker|forward|striker|wing|ataca/i } });
                    } else {
                        conditions.push({ position: { $regex: position,$options: 'i' } });
                    }
                }

                if (minAge || maxAge) {
                    const ageFilter = {};
                    if (minAge) ageFilter.$gte = Number(minAge);
                    if (maxAge) ageFilter.$lte = Number(maxAge);
                    conditions.push({ age: ageFilter });
                }

                if (minMinutes) {
                    conditions.push({ 'statistics_summary.minutes_played': { $gte: Number(minMinutes) } });
                }

                if (minGoals) {
                    conditions.push({ 'statistics_summary.total_goals': { $gte: Number(minGoals) } });
                }

                if (leagueId) {
                    conditions.push({ league_id: Number(leagueId) });
                }

                if (nationality) {
                    conditions.push({ nationality: { $regex: nationality,$options: 'i' } });
                }

                if (team) {
                    conditions.push({
                        $or: [
                            { team_name: { $regex: team,$options: 'i' } },
                            { team: { $regex: team,$options: 'i' } }
                        ]
                    });
                }

                const finalQuery = conditions.length > 0 ? { $and: conditions } : {};
                const hasCustomFilters = Boolean(
                    search || diaspora === 'true' || u21 === 'true' || position ||
                    minAge || maxAge || minMinutes || minGoals || minRating || leagueId || nationality || team
                );

                let playersQuery = Player.find(finalQuery);
                if (!hasCustomFilters) {
                    playersQuery = playersQuery.limit(limit ? Number(limit) : 300);
                } else if (limit) {
                    playersQuery = playersQuery.limit(Number(limit));
                }

                let players = await playersQuery;

                if (minRating) {
                    const minR = parseFloat(minRating);
                    if (!isNaN(minR)) {
                        players = players.filter(p => parseFloat(p.statistics_summary?.rating || "0") >= minR);
                    }
                }

                res.json(players);
            } catch (err) { res.status(500).json({ error: "Eroare la preluarea jucătorilor." }); }
        });

        // RUTA NOUĂ: COMPARATOR HEAD-TO-HEAD JUCĂTORI
        app.get('/api/sport/players/compare', async (req, res) => {
            try {
                const { ids } = req.query;
                if (!ids) return res.status(400).json({ error: "Parametrul ids este obligatoriu." });
                const idList = String(ids).split(',').map(id => id.trim()).filter(Boolean);
                const players = await Player.find({ _id: { $in: idList } });
                res.json(players);
            } catch (err) {
                res.status(500).json({ error: "Eroare la compararea jucătorilor." });
            }
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
                    { $group: { _id: {$ifNull: ["$team_name", "$team"] }, team_logo: { $first: "$team_logo" } } },
                    { $match: { _id: {$ne: null } } },
                    { $project: { _id: 0, team_name: "$_id", team_logo: 1 } },
                    { $sort: { team_name: 1 } }, {$limit: 200 }
                ]);
                res.json(teams);
            } catch (err) { res.status(500).json({ error: "Eroare." }); }
        });

        app.get('/api/sport/teams/:teamName/roster', async (req, res) => {
            try {
                const teamNameRegex = new RegExp(req.params.teamName.trim(), 'i');
                const players = await Player.find({
                    $or: [
                        { team_name: teamNameRegex },
                        { team: teamNameRegex }
                    ]
                }).sort({ name: 1 });
                
                if (!players || players.length === 0) return res.status(404).json({ message: "Nu sunt jucători." });
                
                const roster = {
                    teamInfo: { name: req.params.teamName, logo: players[0].team_logo || "", totalPlayers: players.length },
                    squad: {
                        Goalkeepers: players.filter(p => {
                            const pos = (p.position || "").toLowerCase();
                            return pos.includes('goalkeeper') || pos.includes('portar');
                        }),
                        Defenders: players.filter(p => {
                            const pos = (p.position || "").toLowerCase();
                            return pos.includes('defender') || pos.includes('back');
                        }),
                        Midfielders: players.filter(p => {
                            const pos = (p.position || "").toLowerCase();
                            return pos.includes('midfield') || pos.includes('mijloca');
                        }),
                        Attackers: players.filter(p => {
                            const pos = (p.position || "").toLowerCase();
                            return pos.includes('forward') || pos.includes('striker') || pos.includes('wing') || pos.includes('attack');
                        }),
                        Unknown: players.filter(p => {
                            const pos = (p.position || "").toLowerCase();
                            return !pos || (!pos.includes('goalkeeper') && !pos.includes('portar') && !pos.includes('defender') && !pos.includes('back') && !pos.includes('midfield') && !pos.includes('mijloca') && !pos.includes('forward') && !pos.includes('striker') && !pos.includes('wing') && !pos.includes('attack'));
                        })
                    }
                };
                res.json(roster);
            } catch (err) { res.status(500).json({ error: "Eroare." }); }
        });

        app.get('/api/sport/matches', async (req, res) => {
            try {
                const { date } = req.query; 
                if (!date) return res.status(400).json({ error: "Parametrul date este obligatoriu" });

                // Setăm intervalul corect pentru ziua respectivă (00:00:00 până la 23:59:59)
                const startDate = new Date(`${date}T00:00:00.000Z`);
                const endDate = new Date(`${date}T23:59:59.999Z`);

                const matches = await Fixture.find({
                    date: { $gte: startDate,$lte: endDate }
                }).sort({ league_id: 1, timestamp: 1 });

                // Verificăm dacă există meciuri al căror timp de start a trecut dar au rămas cu "NS" sau agățate în LIVE
                const nowSec = Math.floor(Date.now() / 1000);
                const hasOutdatedMatches = matches.some(m =>
                    (m.status_short === "NS" && m.timestamp && m.timestamp < nowSec - 300) ||
                    (["1H", "HT", "2H", "ET", "P", "BT", "LIVE"].includes(m.status_short) && m.timestamp && m.timestamp < nowSec - (130 * 60))
                );

                // Declanșăm sincronizarea automată în fundal (cu cooldown de 10 minute) dacă există meciuri neactualizate
                if (hasOutdatedMatches && (Date.now() - lastAutoMatchSyncTime > 10 * 60 * 1000)) {
                    lastAutoMatchSyncTime = Date.now();
                    sync7DaysWindow().catch(err => console.error("Eroare auto-sync meciuri:", err.message));
                }

                res.json(matches);
            } catch (err) {
                res.status(500).json({ error: "Eroare la preluarea meciurilor." });
            }
        });
        
        app.get('/api/sport/matches/:fixtureId/details', async (req, res) => {
            try {
                const matchDetails = await getFixtureDetailsOnDemand(req.params.fixtureId);
                if (!matchDetails) return res.status(404).json({ error: "Meciul nu a fost găsit." });
                // Trimitem actualizarea și prin Socket.io ca lista de meciuri să actualizeze scorul instantaneu
                io.emit("live_match_update", matchDetails);
                res.json(matchDetails);
            } catch (err) {
                res.status(500).json({ error: "Eroare la preluarea detaliilor meciului." });
            }
        });

        app.get('/api/sport/standings/:leagueId', async (req, res) => {
            try {
                const standings = await getLeagueStandingsOnDemand(req.params.leagueId);
                if (!standings) return res.status(404).json({ error: "Clasamentul nu este disponibil." });
                res.json(standings);
            } catch (err) {
                res.status(500).json({ error: "Eroare la preluarea clasamentului." });
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

        app.get('/api/admin/hard-reset', async (req, res) => { hardResetAndLoad(); res.send("Reset."); });
        app.get('/api/admin/force-sync', async (req, res) => { runDailySmartSync(); res.send("Sync."); });
        app.get('/api/admin/force-sync-national', async (req, res) => { runNationalTeamSync(); res.send("Sync national."); });
        
        app.get('/api/admin/force-matches', async (req, res) => { 
            sync7DaysWindow(); 
            res.send("Sincronizarea celor 7 zile de meciuri a pornit în fundal!"); 
        });

        // RUTA DE CURĂȚARE ROBUSTĂ PENTRU JUCĂTORII STRĂINI DIN DIASPORA
        app.get('/api/admin/clean-foreign-players', async (req, res) => {
            try {
                // Trecem la "Necunoscut" pe toți cei care au naționalitatea setată pe România 
                // dar NU joacă în SuperLiga românească și NICI la Naționala României
                const result = await Player.updateMany(
                    { 
                        nationality: { $regex: /^romania$/i },
                        team_name: { $nin: ["Romania (Nationala)", "Romania"] },
                        league_id: { $nin: [283, 284] } }, {$set: { nationality: "Necunoscut" } }
                );
                res.send(`Curățare reușită! Au fost actualizați ${result.modifiedCount} jucători străini care aveau naționalitatea eronată.`);
            } catch (err) {
                res.status(500).send(err.message);
            }
        });

        // ==========================================
        // SENTRY ERROR HANDLER (TRUIE SĂ FIE ULTIMUL MIDDLEWARE ÎNAINTE DE app.listen)
        // ==========================================
        app.use(Sentry.Handlers.errorHandler());

        cron.schedule('14 12 * * *', async () => { await runDailySmartSync(); }, { timezone: "Europe/Bucharest" });

        // Sincronizare programată atât la 01:00 noaptea, cât și la fiecare 3 ore pentru a menține toate scorurile la zi
        cron.schedule('0 1,9,13,17,21,23 * * *', async () => { await sync7DaysWindow(); }, { timezone: "Europe/Bucharest" });

        // Verificăm la pornire atât meciurile agățate în LIVE, cât și meciurile trecute de ora de start rămase în "NS"
        const nowTimestamp = Math.floor(Date.now() / 1000);
        const stuckMatches = await Fixture.countDocuments({
            $or: [
                {
                    status_short: { $in: ["1H", "HT", "2H", "ET", "P", "BT", "LIVE"] },
                    timestamp: { $lt: nowTimestamp - (130 * 60) }
                },
                {
                    status_short: "NS",
                    timestamp: { $lt: nowTimestamp - (15 * 60),$gt: nowTimestamp - (3 * 86400) }
                }
            ]
        });
        if (stuckMatches > 0) {
            console.log(`Am găsit ${stuckMatches} meciuri rămase neactualizate (NS/LIVE). Pornesc actualizarea ferestrei de 7 zile...`);
            sync7DaysWindow();
        }

        setInterval(async () => {
            try {
                const currentTimestamp = Math.floor(Date.now() / 1000);
                const startWindow = currentTimestamp + (5 * 60); 
                const endWindow = currentTimestamp - (180 * 60); 
                
                const liveMatchesCount = await Fixture.countDocuments({
                    $or: [
                        {
                            timestamp: { $lte: startWindow,$gte: endWindow },
                            status_short: { $nin: ["FT", "AET", "PEN", "PST", "CANC", "ABD"] }
                        },
                        {
                            status_short: { $in: ["1H", "HT", "2H", "ET", "P", "BT", "LIVE"] },
                            timestamp: { $gte: currentTimestamp - (6 * 3600) }
                        }
                    ]
                });
                
                if (liveMatchesCount > 0) {
                    syncLiveMatches(io);
                } 
            } catch (err) {
                console.log("Eroare verificare live local:", err.message);
            }
        }, 30 * 1000);

        server.listen(PORT, () => console.log(`Server pornit pe port ${PORT}`));

    } catch (error) { console.error("Eroare:", error.message); }
};

startServer();