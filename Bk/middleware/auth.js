const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  try {
    // 1. Verificăm existența header-ului
    const authHeader = req.headers.authorization;
    
    // Verificăm dacă header-ul există și dacă începe cu "Bearer "
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication missing or malformed' });
    }

    // 2. Extragem token-ul (sigur, după verificare)
    const token = authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Token missing' });
    }

    // 3. Verificăm validitatea token-ului
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 4. Atașăm user-ul la request
    req.user = decoded; 
    
    // Opțional: Poți verifica aici și dacă decoded.exp (expirarea) este validă manual, 
    // dar jwt.verify face asta automat.

    next();
  } catch (err) {
    // 5. Gestionăm erorile specifice JWT
    
    // Cazul 1: Token expirat
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired. Please login again.' });
    }
    
    // Cazul 2: Token modificat sau invalid
    if (err.name === 'JsonWebTokenError') {
      return res.status(403).json({ error: 'Invalid token signature.' });
    }

    // Cazul 3: Orice altă eroare neașteptată
    console.error('Auth Middleware Error:', err);
    return res.status(500).json({ error: 'Internal Server Error during authentication' });
  }
};