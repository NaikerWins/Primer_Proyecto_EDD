export function crearReporte(datos) {
  return {
    id: datos.id,
    magnitud: datos.magnitud,
    profundidad: datos.profundidad,
    epicentro: { x: datos.epicentro.x, y: datos.epicentro.y },
    fechaHora: datos.fechaHora instanceof Date ? datos.fechaHora : new Date(datos.fechaHora),
    revision: datos.revision,
    estacion: datos.estacion,
  };
}