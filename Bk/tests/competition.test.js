const request = require('supertest');
const app = require('../app');

jest.mock('../middleware/auth', () => (req, res, next) => next());

jest.mock('../services/sportService', () => ({
  createCompetition: jest.fn(() => Promise.resolve({
    _id: '507f1f77bcf86cd799439033',
    name: 'Premier League',
    country: 'England',
    current_season: 2024
  })),
  getAllCompetitions: jest.fn(() => Promise.resolve([]))
}));

describe('Integration Tests: Competitions', () => {
  const validCompetition = {
    name: "Premier League",
    country: "England",
    current_season: 2024,
    level: "1"
  };

  it('POST /api/sport/competitions - success', async () => {
    const res = await request(app).post('/api/sport/competitions').send(validCompetition);
    expect(res.statusCode).toEqual(200);
    expect(res.body.name).toBe('Premier League');
  });

  // Test de validare (necesită validator în rută)
  it('POST /api/sport/competitions - fail without name', async () => {
    const invalid = { ...validCompetition };
    delete invalid.name;
    const res = await request(app).post('/api/sport/competitions').send(invalid);
    expect(res.statusCode).toEqual(400); // Bad Request
  });
});