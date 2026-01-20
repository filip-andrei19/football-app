const mongoose = require('mongoose');
const logger = require('../utils/logger'); // Folosim logger-ul creat anterior

const connectDB = async () => {
  try {
    // Aici se face magia. Mongoose ia link-ul din .env
    const conn = await mongoose.connect(process.env.MONGO_URI);

    logger.info(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    logger.error(`Error: ${error.message}`);
    process.exit(1); // Oprește serverul dacă nu ne putem conecta la bază
  }
};

module.exports = connectDB;