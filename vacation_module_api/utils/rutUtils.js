
//Chilean RUT (Rol Único Tributario) utility functions.


/**
 * Normalizes a RUT string: removes dots, spaces, and ensures a dash
 * separator exists before the verifier digit.
 */
function normalizarRut(rut) {
  let limpio = rut.replace(/[\.\s]/g, '').trim().toUpperCase();
  if (!limpio.includes('-') && limpio.length > 1) {
    limpio = limpio.slice(0, -1) + '-' + limpio.slice(-1);
  }
  return limpio;
}

/**
 * Calculates the expected verifier digit for a given RUT number.
 * Uses the standard Chilean modulo-11 algorithm.
 * @param {string|number} rutNumero - The RUT body (digits only, no DV).
 * @returns {string} The verifier digit ('0'-'9' or 'K').
 */
function calcularDV(rutNumero) {
  const digits = String(rutNumero);
  let sum = 0;
  let mult = 2;

  for (let i = digits.length - 1; i >= 0; i--) {
    sum += parseInt(digits.charAt(i)) * mult;
    mult = mult === 7 ? 2 : mult + 1;
  }

  const remainder = 11 - (sum % 11);
  if (remainder === 11) return '0';
  if (remainder === 10) return 'K';
  return String(remainder);
}

/**
 * Validates a RUT string (with or without formatting).
 * @param {string} rut - RUT in any common format (e.g. "17305909-4", "17.305.909-4", "173059094").
 * @returns {boolean} True if the verifier digit is mathematically correct.
 */
function validarRut(rut) {
  try {
    const normalizado = normalizarRut(rut);
    const partes = normalizado.split('-');
    if (partes.length !== 2) return false;

    const numero = partes[0];
    const dvIngresado = partes[1].toUpperCase();

    if (!/^\d+$/.test(numero) || numero.length < 1) return false;
    if (!/^[\dK]$/.test(dvIngresado)) return false;

    return calcularDV(numero) === dvIngresado;
  } catch {
    return false;
  }
}

/**
 * Formats a RUT into the standard Chilean format with dots and dash.
 * Example: "17305909-4" → "17.305.909-4"
 * @param {string} rut - RUT in any common format.
 * @returns {string} Formatted RUT string.
 */
function formatearRut(rut) {
  const normalizado = normalizarRut(rut);
  const partes = normalizado.split('-');
  if (partes.length !== 2) return rut;

  const numero = partes[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${numero}-${partes[1]}`;
}

module.exports = { normalizarRut, calcularDV, validarRut, formatearRut };
