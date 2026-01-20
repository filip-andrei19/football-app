const request = require('supertest');
const app = require('../app');

// 1. MOCK AUTH
jest.mock('../middleware/auth', () => (req, res, next) => {
    req.user = { id: '507f1f77bcf86cd799439011' }; // user_id (din diagramă)
    next();
});

// 2. MOCK SERVICE
jest.mock('../services/userService', () => ({
  addFavorite: jest.fn((userId, type, playerId) => Promise.resolve({ 
      _id: '907f1f77bcf86cd799439099',
      user_id: userId,
      player_id: playerId,
      type: type,
      created_at: new Date().toISOString() // E mai sigur să returnăm string pentru teste
  }))
}));

describe('Integration Tests: Favorites', () => {
  it('POST /api/users/favorites - respectă structura din diagramă', async () => {
    const res = await request(app)
        .post('/api/users/favorites')
        .send({
            type: "player",
            player_id: "507f1f77bcf86cd799439022"
        });

    expect(res.statusCode).toEqual(201);
    
    // --- CORECTURA ESTE AICI ---
    // Toate proprietățile returnate de controller sunt în interiorul lui "data"
    expect(res.body.data).toHaveProperty('created_at');
    expect(res.body.data).toHaveProperty('player_id'); // Am adăugat .data și aici
    expect(res.body.data).toHaveProperty('type', 'player');
  });
});