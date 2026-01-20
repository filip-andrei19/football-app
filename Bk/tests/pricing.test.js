const request = require('supertest');
const app = require('../app'); 

// 1. MOCK AUTH
jest.mock('../middleware/auth', () => (req, res, next) => next());

// 2. MOCK SERVICE
jest.mock('../services/commerceService', () => ({
  createPricing: jest.fn(() => Promise.resolve({
    _id: '709c1f77bcf86cd799439077',
    duration_months: 12,
    monthly_payment_usd: 10,
    payment_total_usd: 120,
    unlocked_service_id: '507f1f77bcf86cd799439099'
  })),
  getAllPricing: jest.fn(() => Promise.resolve([]))
}));

describe('Integration Tests: Pricing API', () => {
  
  const validPricing = {
    duration_months: 12,
    monthly_payment_usd: 10.00,
    payment_total_usd: 120.00,
    unlocked_service_id: "507f1f77bcf86cd799439099"
  };

  it('POST /api/commerce/pricing - ar trebui să creeze un preț valid', async () => {
    const res = await request(app)
      .post('/api/commerce/pricing') 
      .send(validPricing);

    // --- MODIFICAREA ESTE AICI ---
    // Controller-ul returnează 201 la creare, deci actualizăm testul:
    expect(res.statusCode).toEqual(201); 
    
    expect(res.body.duration_months).toBe(12);
  });

  it('POST /api/commerce/pricing - eroare dacă prețul total este negativ', async () => {
    const invalidData = { 
      ...validPricing, 
      payment_total_usd: -50 // INVALID
    };

    const res = await request(app)
      .post('/api/commerce/pricing')
      .send(invalidData);

    expect(res.statusCode).toEqual(400);
    expect(JSON.stringify(res.body)).toMatch(/payment_total_usd/i); 
  });

  it('POST /api/commerce/pricing - eroare dacă lipsește ID-ul serviciului', async () => {
    const invalidData = { ...validPricing };
    delete invalidData.unlocked_service_id;
  
      const res = await request(app)
        .post('/api/commerce/pricing')
        .send(invalidData);
  
      expect(res.statusCode).toEqual(400);
      expect(JSON.stringify(res.body)).toMatch(/unlocked_service_id/i);
  });
});