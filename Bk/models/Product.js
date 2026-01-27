const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  title: { type: String, required: true },
  price: { type: String, required: true },
  category: { type: String, required: true },
  
  // Aici salvăm lista de imagini (ca text Base64 lung)
  images: [{ type: String }], 
  
  description: { type: String, required: true },
  
  // Detalii vânzător (luate automat din userul logat)
  seller: { type: String, required: true },
  sellerEmail: { type: String, required: true },
  sellerPhone: { type: String, required: true },
  
  // Data postării
  date: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Product', productSchema);