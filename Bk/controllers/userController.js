const User = require('../models/user');
const userService = require('../services/userService'); 
const jwt = require('jsonwebtoken');
const AppError = require('../utils/appError');

// --- HELPER: Filtrează câmpurile permise pentru update ---
const filterObj = (obj, ...allowedFields) => {
  const newObj = {};
  Object.keys(obj).forEach(el => {
    if (allowedFields.includes(el)) newObj[el] = obj[el];
  });
  return newObj;
};

// --- HELPERE PENTRU AUTH (Token) ---
const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN
  });
};

const createSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);
  user.password = undefined; // Ascundem parola din răspuns

  res.status(statusCode).json({
    status: 'success',
    token,
    data: { user }
  });
};

// ==========================================
// 1. ZONA DE AUTH (Securizată)
// ==========================================

exports.register = async (req, res, next) => {
  try {
    const newUser = await User.create({
      name: req.body.name,
      email: req.body.email,
      password: req.body.password,
      passwordConfirm: req.body.passwordConfirm,
      role: req.body.role // Asigură-te că în Modelul User ai validare pentru roluri
    });

    createSendToken(newUser, 201, res);
  } catch (err) {
    next(err);
  }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // 1. Verificăm dacă există datele
    if (!email || !password) {
      return next(new AppError('Te rog să introduci email și parolă!', 400));
    }

    // 2. Căutăm userul și cerem parola (explicit, deoarece de obicei e select: false)
    const user = await User.findOne({ email }).select('+password');

    // 3. Verificăm parola folosind metoda din Model (userSchema.methods.correctPassword)
    if (!user || !(await user.correctPassword(password, user.password))) {
      return next(new AppError('Email sau parolă incorectă', 401));
    }

    // 4. Trimitem token-ul
    createSendToken(user, 200, res);
  } catch (err) {
    next(err);
  }
};

// ==========================================
// 2. ZONA FAVORITES (Prin Service)
// ==========================================

exports.addFavorite = async (req, res, next) => {
  try {
    const { type, player_id } = req.body; 
    
    // Apelăm serviciul existent
    const result = await userService.addFavorite(req.user.id, type, player_id);
    
    res.status(201).json({
      status: 'success',
      data: result
    });
  } catch (err) {
    next(err);
  }
};

exports.getUserFavorites = async (req, res, next) => {
  try {
    const result = await userService.getUserFavorites(req.user.id);
    res.status(200).json({
      status: 'success',
      data: result
    });
  } catch (err) {
    next(err);
  }
};

// ==========================================
// 3. ZONA ADS (Prin Service)
// ==========================================

exports.createAd = async (req, res, next) => {
  try {
    const result = await userService.createAd(req.user.id, req.body);
    res.status(201).json({
      status: 'success',
      data: result
    });
  } catch (err) {
    next(err);
  }
};

exports.getAllAds = async (req, res, next) => {
  try {
    const result = await userService.getAllAds();
    res.status(200).json({
      status: 'success',
      results: result.length,
      data: result
    });
  } catch (err) {
    next(err);
  }
};

// ==========================================
// 4. ZONA PROFIL
// ==========================================

exports.getMe = (req, res, next) => {
  // Middleware-ul de auth pune userul curent în req.user, deci doar îl trimitem înapoi
  res.status(200).json({
    status: 'success',
    data: {
      user: req.user
    }
  });
};

exports.updateProfile = async (req, res, next) => {
  try {
    // 1. Creăm o eroare dacă userul încearcă să schimbe parola aici
    if (req.body.password || req.body.passwordConfirm) {
      return next(new AppError('Această rută nu este pentru actualizarea parolei.', 400));
    }

    // 2. Filtrăm corpul cererii pentru a permite doar schimbarea numelui și emailului
    // (Astfel prevenim schimbarea rolului în "admin" prin hack-uri)
    const filteredBody = filterObj(req.body, 'name', 'email');

    // 3. Actualizăm documentul userului
    const updatedUser = await User.findByIdAndUpdate(req.user.id, filteredBody, {
      new: true, // Returnează obiectul nou
      runValidators: true // Verifică dacă emailul e valid
    });

    res.status(200).json({
      status: 'success',
      data: {
        user: updatedUser
      }
    });
  } catch (err) {
    next(err);
  }
};