const winston = require('winston');

// Definim culorile pentru consolă (opțional, dar ajută vizual)
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

winston.addColors(colors);

// Formatul logurilor
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  // Dacă e eroare, vrem să vedem și Stack Trace-ul
  winston.format.errors({ stack: true }),
  // Formatul standard pentru fișiere (JSON)
  winston.format.json()
);

const logger = winston.createLogger({
  level: 'info', // Nivelul minim de logare (info și mai grave)
  levels,
  format,
  transports: [
    // 1. Fișier doar pentru Erori (nivel 0)
    new winston.transports.File({ 
      filename: 'logs/error.log', 
      level: 'error',
    }),
    
    // 2. Fișier pentru TOT (info, warn, error)
    new winston.transports.File({ filename: 'logs/combined.log' }),
  ],
});

// Dacă NU suntem în producție, vrem să vedem logurile în consolă simplu și colorat
if (process.env.NODE_ENV !== 'production') {
  logger.add(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize({ all: true }),
        winston.format.printf(
          (info) => `${info.timestamp} ${info.level}: ${info.message}`
        )
      ),
    })
  );
}

module.exports = logger;