const request = require('supertest');
const app = require('../app'); 

// --- 1. MOCK AUTH MIDDLEWARE ---
// Calea trebuie ajustată dacă nu ai folderul src
jest.mock('../middleware/auth', () => (req, res, next) => next());

// --- 2. MOCK SERVICE ---
// Presupunem că ai creat folderul 'services' în rădăcină, lângă 'controllers'
jest.mock('../services/sportService', () => ({
  createPlayer: jest.fn(() => Promise.resolve({
    _id: '507f1f77bcf86cd799439011',
    name: 'Gică Hagi',
    nationality: 'Romania',
    position: 'Midfielder',
    current_team_id: '507f1f77bcf86cd799439011'
  })),
  getAllPlayers: jest.fn(() => Promise.resolve([]))
}));

describe('Integration Tests: Players API', () => {
  
  const validPlayerPayload = {
    name: "Gică Hagi",
    nationality: "Romania",
    position: "Midfielder",
    age: 28,
    height_cm: 172,
    weight_kg: 70,
    current_team_id: "507f1f77bcf86cd799439011",
    bio: "Regele fotbalului",
    profile_image: "https://example.com/hagi.jpg"
  };

  // --- TESTE ---
  
  it('POST /api/sport/players - success creation', async () => {
    const res = await request(app)
      .post('/api/sport/players') 
      .send(validPlayerPayload);

    expect(res.statusCode).toEqual(200); 
    expect(res.body).toHaveProperty('_id');
  });

  it('POST /api/sport/players - validation error (missing name)', async () => {
    const invalidData = { ...validPlayerPayload };
    delete invalidData.name;

    const res = await request(app)
      .post('/api/sport/players')
      .send(invalidData);

    expect(res.statusCode).toEqual(400); 
    expect(JSON.stringify(res.body)).toMatch(/name/i);
  });

  // ... restul testelor rămân la fel ...
});