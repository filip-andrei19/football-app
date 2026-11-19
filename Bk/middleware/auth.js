const jwt = require('jsonwebtoken');

const TOKEN_SECRET = process.env.JWT_SECRET || 'cheie_secreta_foarte_lunga_si_sigura';

function extractToken(req) {
  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }

  const legacyToken = req.headers['auth-token'];
  if (typeof legacyToken === 'string' && legacyToken.trim()) {
    return legacyToken.trim();
  }

  return null;
}

module.exports = (req, res, next) => {
  try {
    const token = extractToken(req);

    if (!token) {
      return res.status(401).json({ error: 'Authentication missing or malformed' });
    }

    const decoded = jwt.verify(token, TOKEN_SECRET);

    req.user = {
      ...decoded,
      id: decoded.id || decoded._id,
      _id: decoded._id || decoded.id,
    };

    return next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired. Please login again.' });
    }

    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token signature.' });
    }

    console.error('Auth Middleware Error:', err);
    return res.status(500).json({ error: 'Internal Server Error during authentication' });
  }
};