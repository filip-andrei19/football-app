const request = require('supertest');
const app = require('../app');

// 1. MOCK AUTH - Corectat să seteze req.user
jest.mock('../middleware/auth', () => (req, res, next) => {
    req.user = { id: '507f1f77bcf86cd799439011' }; // ID-ul userului logat
    next();
});

// 2. MOCK SERVICE
jest.mock('../services/userService', () => ({
  createAd: jest.fn(() => Promise.resolve({
    _id: '609c1f77bcf86cd799439088',
    title: 'Vând Minge',
    active: true
  })),
  getAllAds: jest.fn(() => Promise.resolve([])),
  getUserAds: jest.fn(() => Promise.resolve([]))
}));

describe('Integration Tests: Ads API', () => {
  
  const validAd = {
    // user_id: "...",  <-- AM ȘTERS ACEST RÂND (Nu se trimite în body, se ia din token)
    title: "Vând Minge",
    content: "Folosită puțin, stare bună.", // Minim 10 caractere conform validatorului
    start_date: new Date().toISOString(),
    end_date: new Date(Date.now() + 86400000).toISOString(),
    price_paid: 10
  };

  it('POST /api/users/ads - success', async () => {
    const res = await request(app)
      .post('/api/users/ads') 
      .send(validAd);

    // Dacă primești tot 400, linia de mai jos te ajută să vezi eroarea în consolă:
    if (res.statusCode === 400) console.log("Eroare Joi:", res.body);

    expect(res.statusCode).toEqual(201); // Controller-ul tău returnează 201 la creare
  });
});