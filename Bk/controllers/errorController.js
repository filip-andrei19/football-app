const logger = require('../utils/logger'); // <--- Import

module.exports = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  // Logăm eroarea folosind Winston
  // Asta va scrie automat în 'logs/error.log' cu data și ora exactă
  logger.error(`${err.statusCode} - ${err.message} - ${req.originalUrl} - ${req.method} - ${req.ip}`);

  res.status(err.statusCode).json({
    status: err.status,
    message: err.message,
    // stack: ... (doar în dev)
  });
};