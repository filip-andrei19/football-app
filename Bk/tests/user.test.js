const request = require('supertest');
const app = require('../app');
const User = require('../models/user'); // Importăm modelul pentru a-l mock-ui
const jwt = require('jsonwebtoken');

// --- MOCK MODEL & JWT ---
// Mock-uim metodele Mongoose pe care le foloseste controller-ul
jest.mock('../models/user');
jest.mock('jsonwebtoken');

describe('Integration Tests: Users', () => {
  
  // Datele actualizate conform noii structuri
  const validUser = {
    name: "Test User",           // Aici era username
    email: "test@example.com",
    password: "password123",
    passwordConfirm: "password123" // Aici lipsea
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('POST /api/users/register - success', async () => {
    // 1. Simulăm crearea userului în DB
    User.create.mockResolvedValue({
      _id: 'user_id_123',
      name: validUser.name,
      email: validUser.email,
      role: 'user'
      // password nu se returnează
    });

    // 2. Simulăm generarea token-ului
    jwt.sign.mockReturnValue('fake_token_123');

    const res = await request(app)
      .post('/api/users/register')
      .send(validUser);

    if (res.statusCode === 400) console.log("Eroare Register:", res.body);

    expect(res.statusCode).toEqual(201);
    expect(res.body.token).toBeDefined();
    expect(res.body.data.user.email).toBe('test@example.com');
  });

  it('POST /api/users/register - fail invalid email', async () => {
    const invalid = { ...validUser, email: "not-an-email" };
    
    // Aici va crăpa din Validator (Joi), nici nu ajunge la Controller/Model
    const res = await request(app)
      .post('/api/users/register')
      .send(invalid);
      
    expect(res.statusCode).toEqual(400);
  });
});