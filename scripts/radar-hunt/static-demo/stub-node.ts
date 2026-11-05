// Sustituto de los módulos node:* para la versión estática (rutas de servidor que no se ejecutan).
const fail = () => {
  throw new Error("Solo disponible en el servidor.");
};
export const timingSafeEqual = fail;
export const createHash = fail;
export const createHmac = fail;
export const randomUUID = () => globalThis.crypto.randomUUID();
export const randomBytes = fail;
export default {};
