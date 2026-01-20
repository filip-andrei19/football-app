const express = require('express');
const cors = require('cors');
const AppError = require('./utils/appError'); 
const globalErrorHandler = require('./controllers/errorController'); 

// Import Rute
const sportRoutes = require('./routes/sportRoutes');
const userRoutes = require('./routes/userRoutes');
const commerceRoutes = require('./routes/commerceRoutes');

const app = express();

// Middleware
app.use(express.json());
app.use(cors()); // CRITIC: Trebuie să fie înainte de rute

// Definire Rute API
app.use('/api/sport', sportRoutes);  // -> Duce la /api/sport/players
app.use('/api/users', userRoutes);
app.use('/api/commerce', commerceRoutes);

// 404 Handler
app.use((req, res, next) => {
  next(new AppError(`Nu am găsit ruta ${req.originalUrl} pe acest server!`, 404));
});

app.use(globalErrorHandler);

module.exports = app;