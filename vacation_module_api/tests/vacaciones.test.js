const { calcularDiasHabiles } = require('../services/vacacionesService');
const pool = require('../config/db');

jest.mock('../config/db', () => ({
  query: jest.fn()
}));

describe('Servicio Vacaciones', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('calcularDiasHabiles', () => {
    it('debe calcular correctamente los días hábiles sin feriados', async () => {
      // Mock db feriados
      pool.query.mockResolvedValue([[]]);
      
      const dias = await calcularDiasHabiles('2026-05-18', '2026-05-22'); // Lunes a viernes
      expect(dias).toBe(5);
    });

    it('debe descontar los fines de semana', async () => {
      pool.query.mockResolvedValue([[]]);
      
      const dias = await calcularDiasHabiles('2026-05-15', '2026-05-18'); // Viernes a Lunes (V, S, D, L)
      expect(dias).toBe(2);
    });

    it('debe descontar los feriados', async () => {
      // Mock feriado 2026-05-21
      pool.query.mockResolvedValue([[{ fecha: '2026-05-21T00:00:00.000Z' }]]);
      
      const dias = await calcularDiasHabiles('2026-05-18', '2026-05-22'); // L a V con 1 feriado
      expect(dias).toBe(4);
    });
  });
});
