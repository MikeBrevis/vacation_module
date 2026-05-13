const request = require('supertest');
const app = require('../server');
const db = require('../config/db');
const bcrypt = require('bcrypt');

jest.mock('../config/db', () => ({
  query: jest.fn()
}));

jest.mock('bcrypt', () => ({
  compare: jest.fn()
}));

describe('POST /auth/login', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('debe retornar 400 si faltan credenciales', async () => {
    const res = await request(app).post('/auth/login').send({ usuario: 'admin' });
    expect(res.statusCode).toBe(400);
    expect(res.body.errors).toBeDefined();
  });

  it('debe retornar 401 para usuario inexistente', async () => {
    db.query.mockResolvedValue([[]]); // No rows
    
    const res = await request(app).post('/auth/login').send({
      usuario: 'admin',
      contraseña: 'password123'
    });
    
    expect(res.statusCode).toBe(401);
    expect(res.body.message).toBe('Usuario o contraseña inválidos');
  });

  it('debe retornar 401 si la contraseña es incorrecta', async () => {
    db.query.mockResolvedValue([[{ id: 1, usuario: 'admin', password_hash: 'hash' }]]);
    bcrypt.compare.mockResolvedValue(false);
    
    const res = await request(app).post('/auth/login').send({
      usuario: 'admin',
      contraseña: 'wrongpassword'
    });
    
    expect(res.statusCode).toBe(401);
    expect(res.body.message).toBe('Usuario o contraseña inválidos');
  });

  it('debe retornar 200 y un token si el login es exitoso', async () => {
    // Para el update final
    db.query.mockResolvedValue([[{ id: 1, usuario: 'admin', password_hash: 'hash' }]]);
    bcrypt.compare.mockResolvedValue(true);
    
    const res = await request(app).post('/auth/login').send({
      usuario: 'admin',
      contraseña: 'password123'
    });
    
    expect(res.statusCode).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.message).toBe('Login exitoso');
  });
});
