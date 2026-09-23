// src/domain/Escenario.js

export function crearEscenario() {
  return {
    estaciones: [],
    zonas: [],
    eventos: [],        // los eventos activos viven además en el AVL
    historicos: [],
    reloj: new Date("2026-01-01T00:00:00Z"),
    parametros: {
      W: 24,   // ventana temporal en horas para asociaciones
      R: 100,  // distancia máxima en km para asociaciones
      L: 3,    // límite de profundidad para "acceso costoso"
      T: 72,   // antigüedad en horas para archivar ramas
    },
    modo: "normal",     // "normal" | "estres"
  };
}