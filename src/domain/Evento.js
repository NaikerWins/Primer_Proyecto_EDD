// src/domain/Evento.js
import { enZonaPoblada } from "./Zona.js";
import { crearClave } from "./Clave.js";

// Reglas fijas del PDF, en este orden exacto:
// 1) M >= 6.0 -> 3
// 2) M >= 4.5 y H <= 30.0 y en zona poblada -> 3
// 3) M >= 4.5 (sin cumplir lo anterior) -> 2
// 4) resto -> 1
export function calcularPrioridad(magnitud, profundidad, epicentro, zonas) {
  if (magnitud >= 6.0) return 3;
  if (magnitud >= 4.5 && profundidad <= 30.0 && enZonaPoblada(zonas, epicentro.x, epicentro.y)) {
    return 3;
  }
  if (magnitud >= 4.5) return 2;
  return 1;
}

export function crearEvento(datos, zonas) {
  const poblada = enZonaPoblada(zonas, datos.epicentro.x, datos.epicentro.y);
  const prioridad = calcularPrioridad(
    datos.magnitud,
    datos.profundidad,
    datos.epicentro,
    zonas
  );

  const evento = {
    id: datos.id,
    magnitud: datos.magnitud,
    profundidad: datos.profundidad,
    epicentro: { x: datos.epicentro.x, y: datos.epicentro.y },
    fechaHora: datos.fechaHora,        // objeto Date
    revision: datos.revision,
    estaciones: datos.estaciones || [], // ids de estación
    estadoAtencion: "pendiente",
    enZonaPoblada: poblada,
    prioridad: prioridad,
    activo: true,
    archivado: false,
    eliminado: false,
  };

  return evento;
}

// La clave del AVL se deriva del evento vigente.
export function claveDeEvento(evento) {
  return crearClave(evento.prioridad, evento.magnitud, evento.id);
}