const request = require('supertest');
const app = require('../app'); // Importăm aplicația din rădăcină

// --- 1. MOCK AUTH MIDDLEWARE ---
// Simulăm că utilizatorul este logat
jest.mock('../middleware/auth', () => (req, res, next) => next());

// --- 2. MOCK SERVICE ---
// Simulăm răspunsurile din sportService (createCoach, getAllCoaches)
jest.mock('../services/sportService', () => ({
  createCoach: jest.fn(() => Promise.resolve({
    _id: '609c1f77bcf86cd799439099',
    name: 'Pep Guardiola',
    nationality: 'Spain',
    birth_year: 1971,
    bio: 'Manager Manchester City',
    photo_url: 'http://example.com/pep.jpg'
  })),
  getAllCoaches: jest.fn(() => Promise.resolve([]))
}));

describe('Integration Tests: Coaches API', () => {
  
  // Date valide conform modelului din coach.js
  const validCoachPayload = {
    name: "Pep Guardiola",
    nationality: "Spain",
    birth_year: 1971,
    bio: "Manager Manchester City",
    photo_url: "http://example.com/pep.jpg"
  };

  // --- SUCCES ---
  
  it('POST /api/sport/coaches - ar trebui să creeze un antrenor', async () => {
    // Ruta este definită în sportRoutes.js
    const res = await request(app)
      .post('/api/sport/coaches') 
      .send(validCoachPayload);

    expect(res.statusCode).toEqual(200); 
    expect(res.body.name).toBe('Pep Guardiola');
  });

  it('GET /api/sport/coaches - ar trebui să returneze lista', async () => {
    const res = await request(app).get('/api/sport/coaches');
    expect(res.statusCode).toEqual(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  // --- VALIDARE (Acestea funcționează doar cu validatorul activat!) ---

  it('POST /api/sport/coaches - eroare (400) dacă lipsește numele', async () => {
    const invalidData = { ...validCoachPayload };
    delete invalidData.name; // Ștergem câmpul obligatoriu

    const res = await request(app)
      .post('/api/sport/coaches')
      .send(invalidData);

    expect(res.statusCode).toEqual(400);
    // Verificăm dacă mesajul de eroare vine de la Joi
    expect(JSON.stringify(res.body)).toMatch(/name/i);
  });
});