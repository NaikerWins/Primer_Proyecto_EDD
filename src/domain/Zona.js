// src/domain/Zona.js

export function crearZona(id, x1, y1, x2, y2, poblada) {
  return { id, x1, y1, x2, y2, poblada };
}

// Un punto está dentro (o sobre el borde) si sus coordenadas
// están entre los límites en ambos ejes. Los límites son inclusivos.
export function contiene(zona, x, y) {
  const dentroX = x >= zona.x1 && x <= zona.x2;
  const dentroY = y >= zona.y1 && y <= zona.y2;
  return dentroX && dentroY;
}

// ¿El epicentro cae en alguna zona poblada?
// Si cae en el borde de dos, cualquiera poblada basta.
export function enZonaPoblada(zonas, x, y) {
  for (const z of zonas) {
    if (contiene(z, x, y) && z.poblada) return true;
  }
  return false;
}