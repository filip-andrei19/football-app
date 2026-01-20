const request = require('supertest');
const app = require('../app');

// --- 1. MOCK AUTH ---
// Simulăm că utilizatorul este autentificat pentru a trece de middleware-ul 'auth'
jest.mock('../middleware/auth', () => (req, res, next) => next());

// --- 2. MOCK SERVICE ---
// Simulăm răspunsul din baza de date pentru a nu depinde de MongoDB real
jest.mock('../services/sportService', () => ({
  createTeam: jest.fn(() => Promise.resolve({
    _id: '507f1f77bcf86cd799439022',
    name: 'FC Barcelona',
    league: 'La Liga',
    coach: 'Hansi Flick'
  })),
  getAllTeams: jest.fn(() => Promise.resolve([]))
}));

describe('Integration Tests: Teams API', () => {
  
  // Payload-ul (datele) pe care îl trimitem. 
  // Acesta trebuie să se potrivească cu ce ai definit în 'teamValidator.js'.
  const validTeamPayload = {
    name: "FC Barcelona",
    league: "La Liga",
    coach: "Hansi Flick"
  };

  // --- TESTE DE SUCCES ---
  
  it('POST /api/sport/teams - ar trebui să creeze o echipă cu succes', async () => {
    const res = await request(app)
      .post('/api/sport/teams') 
      .send(validTeamPayload);

    // --- DEBUGGING ---
    // Dacă testul pică cu 400, linia asta îți va arăta în terminal exact de ce a respins Joi datele.
    if (res.statusCode === 400) {
        console.log("EROARE JOI (Teams):", JSON.stringify(res.body, null, 2));
    }

    expect(res.statusCode).toEqual(200); 
    expect(res.body.name).toBe('FC Barcelona');
  });

  it('GET /api/sport/teams - ar trebui să returneze lista de echipe', async () => {
    const res = await request(app).get('/api/sport/teams');
    
    expect(res.statusCode).toEqual(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  // --- TESTE DE VALIDARE ---

  it('POST /api/sport/teams - ar trebui să dea eroare (400) dacă lipsește numele', async () => {
    const invalidData = { 
        league: "La Liga",
        coach: "Hansi Flick"
        // name lipsește intenționat
    };

    const res = await request(app)
      .post('/api/sport/teams')
      .send(invalidData);

    expect(res.statusCode).toEqual(400);
    // Verificăm dacă mesajul de eroare conține cuvântul "name"
    expect(JSON.stringify(res.body)).toMatch(/name/i);
  });
});