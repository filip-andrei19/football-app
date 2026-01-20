const request = require('supertest');
const app = require('../app');

// --- MOCK AUTH ---
jest.mock('../middleware/auth', () => (req, res, next) => next());

// --- MOCK SERVICE ---
jest.mock('../services/commerceService', () => ({
  createService: jest.fn(() => Promise.resolve({ 
      name: 'Premium Pack', 
      premium_badge: true,
      hidden_ads: true
  }))
}));

describe('Integration Tests: Services', () => {
  it('POST /api/commerce/services - success', async () => {
    const res = await request(app)
        .post('/api/commerce/services')
        .send({
            name: "Premium Pack",
            premium_badge: true,
            hidden_ads: true
        });
    
    // MODIFICARE: Așteptăm 201, nu 200
    expect(res.statusCode).toEqual(201); 
    
    // Opțional: poți verifica și corpul răspunsului
    expect(res.body.name).toBe('Premium Pack');
  });
});