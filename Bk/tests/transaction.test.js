const request = require('supertest');
const app = require('../app'); 

// 1. MOCK AUTH
jest.mock('../middleware/auth', () => (req, res, next) => {
    req.user = { id: '507f1f77bcf86cd799439011' }; 
    next();
});

// 2. MOCK SERVICE (AICI ESTE SCHIMBAREA)
jest.mock('../services/commerceService', () => ({
  // Modificăm să accepte 3 argumente: userId, amount, plan_id
  createTransaction: jest.fn((userId, amount, plan_id) => Promise.resolve({
    _id: '809c1f77bcf86cd799439088',
    user_id: userId,
    plan_id: plan_id, // Folosim direct argumentul
    amount: amount,   // Folosim direct argumentul
    created_at: new Date()
  })),
  getUserHistory: jest.fn(() => Promise.resolve([]))
}));

describe('Integration Tests: Transactions API', () => {
  
  const validTransaction = {
    plan_id: "709c1f77bcf86cd799439077", 
    amount: 50.00
  };

  it('POST /api/commerce/transactions - success', async () => {
    const res = await request(app)
      .post('/api/commerce/transactions') 
      .send(validTransaction);

    expect(res.statusCode).toEqual(201); 
    
    // Acum amount va fi corect (50)
    expect(res.body.amount).toBe(50);
    expect(res.body).toHaveProperty('user_id'); 
  });

  it('POST /api/commerce/transactions - fail if amount is negative', async () => {
    const invalidData = { ...validTransaction, amount: -100 };
    const res = await request(app).post('/api/commerce/transactions').send(invalidData);
    expect(res.statusCode).toEqual(400);
    expect(JSON.stringify(res.body)).toMatch(/amount/i); 
  });

  it('POST /api/commerce/transactions - fail if plan_id is missing', async () => {
    const invalidData = { amount: 50 }; 
    const res = await request(app).post('/api/commerce/transactions').send(invalidData);
    expect(res.statusCode).toEqual(400);
    expect(JSON.stringify(res.body)).toMatch(/plan_id/i);
  });
});