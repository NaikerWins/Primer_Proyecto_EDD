// src/domain/Clave.js
// Una clave K = (prioridad, magnitud, id).
// La comparación es lexicográfica: se usa el primer componente que difiera.

export function crearClave(prioridad, magnitud, id) {
  return { prioridad, magnitud, id };
}

// Devuelve -1 si a < b, 0 si a == b, 1 si a > b
export function compararClaves(a, b) {
  if (a.prioridad !== b.prioridad) {
    return a.prioridad < b.prioridad ? -1 : 1;
  }
  if (a.magnitud !== b.magnitud) {
    return a.magnitud < b.magnitud ? -1 : 1;
  }
  if (a.id !== b.id) {
    return a.id < b.id ? -1 : 1;
  }
  return 0;
}

// Útil para depurar y para mostrar en pantalla
export function formatearClave(k) {
  return `(${k.prioridad}, ${k.magnitud.toFixed(1)}, ${k.id})`;
}