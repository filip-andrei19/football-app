const request = require('supertest');
const app = require('../app');

jest.mock('../middleware/auth', () => (req, res, next) => next());

jest.mock('../services/sportService', () => ({
  createMatch: jest.fn(() => Promise.resolve({
    _id: '507f1f77bcf86cd799439044',
    match_date: new Date(),
    home_team: { name: 'Real Madrid', score: 2 },
    away_team: { name: 'Barcelona', score: 1 }
  })),
  getAllMatches: jest.fn(() => Promise.resolve([]))
}));

describe('Integration Tests: Matches', () => {
  const validMatch = {
    competition_id: "507f1f77bcf86cd799439033",
    match_date: new Date().toISOString(),
    home_team: {
      team_id: "507f1f77bcf86cd799439022",
      name: "Real Madrid",
      score: 2
    },
    away_team: {
      team_id: "507f1f77bcf86cd799439023",
      name: "Barcelona",
      score: 1
    }
  };

  it('POST /api/sport/matches - success', async () => {
    const res = await request(app).post('/api/sport/matches').send(validMatch);
    expect(res.statusCode).toEqual(200);
    expect(res.body.home_team.name).toBe('Real Madrid');
  });

  it('POST /api/sport/matches - fail if scores are negative', async () => {
    const invalid = { ...validMatch, home_team: { ...validMatch.home_team, score: -1 } };
    const res = await request(app).post('/api/sport/matches').send(invalid);
    expect(res.statusCode).toEqual(400); // Necesită Joi: score.min(0)
  });
});