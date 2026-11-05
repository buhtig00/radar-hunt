// Sustituto de @tanstack/react-start para la versión estática: en modo demo no se llama
// a ninguna función de servidor; si alguna pantalla lo intenta, falla con un aviso claro.
type AnyFn = (...args: unknown[]) => unknown;
const unavailable = async () => {
  throw new Error(
    "Esta función necesita el servidor (modo producción). En la demo estática no está disponible.",
  );
};
function chain(): Record<string, AnyFn> {
  const self: Record<string, AnyFn> = {};
  for (const k of ["middleware", "inputValidator", "validator", "server", "client", "type"])
    self[k] = () => self;
  self.handler = () => unavailable;
  return self;
}
export const createServerFn = () => chain();
export const createMiddleware = () => chain();
export const createStart = () => ({});
export const useServerFn = <T>(fn: T) => fn;
export const getRequest = () => undefined;
export const getRequestHeader = () => undefined;
