require('dotenv').config();
const mongoose = require('mongoose');

console.log('⏳ Încerc conectarea la MongoDB...');

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✅ SUCCES! Link-ul este bun și te-ai conectat.');
    console.log('Baza de date țintă:', mongoose.connection.name);
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ EROARE: Nu m-am putut conecta.');
    console.error('Mesaj eroare:', err.message);
    
    if (err.message.includes('bad auth')) {
      console.log('👉 Sfat: Parola sau Userul sunt greșite.');
    } else if (err.message.includes('timed out') || err.message.includes('querySrv')) {
      console.log('👉 Sfat: IP-ul tău nu este pe Whitelist în MongoDB Atlas.');
    }
    
    process.exit(1);
  });