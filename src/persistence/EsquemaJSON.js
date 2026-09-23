// src/persistence/EsquemaJSON.js

// Convierte un objeto Date a ISO 8601 con Z
export function fechaAISO(fecha) {
  return fecha.toISOString();
}

// Convierte un string ISO a Date
export function isoAFecha(iso) {
  return new Date(iso);
}

// ---------- Evento ↔ JSON ----------
export function eventoAJSON(ev) {
  return {
    id: ev.id,
    magnitud: ev.magnitud,
    profundidad: ev.profundidad,
    epicentro: { x: ev.epicentro.x, y: ev.epicentro.y },
    fechaHora: fechaAISO(ev.fechaHora),
    revision: ev.revision,
    estaciones: [...ev.estaciones],
    estadoAtencion: ev.estadoAtencion,
    enZonaPoblada: ev.enZonaPoblada,
    prioridad: ev.prioridad,
    activo: ev.activo,
    archivado: ev.archivado,
    eliminado: ev.eliminado,
  };
}

export function eventoDesdeJSON(j) {
  return {
    id: j.id,
    magnitud: j.magnitud,
    profundidad: j.profundidad,
    epicentro: { x: j.epicentro.x, y: j.epicentro.y },
    fechaHora: isoAFecha(j.fechaHora),
    revision: j.revision,
    estaciones: [...(j.estaciones || [])],
    estadoAtencion: j.estadoAtencion,
    enZonaPoblada: j.enZonaPoblada,
    prioridad: j.prioridad,
    activo: j.activo !== false,
    archivado: j.archivado === true,
    eliminado: j.eliminado === true,
  };
}

// ---------- Zona, Estación ----------
export function zonaAJSON(z) {
  return { id: z.id, x1: z.x1, y1: z.y1, x2: z.x2, y2: z.y2, poblada: z.poblada };
}
export function zonaDesdeJSON(j) {
  return { id: j.id, x1: j.x1, y1: j.y1, x2: j.x2, y2: j.y2, poblada: j.poblada };
}

export function estacionAJSON(e) { return { id: e.id, nombre: e.nombre }; }
export function estacionDesdeJSON(j) { return { id: j.id, nombre: j.nombre }; }

// ---------- Reporte ↔ JSON ----------
export function reporteAJSON(r) {
  return {
    id: r.id,
    magnitud: r.magnitud,
    profundidad: r.profundidad,
    epicentro: { x: r.epicentro.x, y: r.epicentro.y },
    fechaHora: fechaAISO(r.fechaHora),
    revision: r.revision,
    estacion: r.estacion,
  };
}
export function reporteDesdeJSON(j) {
  return {
    id: j.id,
    magnitud: j.magnitud,
    profundidad: j.profundidad,
    epicentro: { x: j.epicentro.x, y: j.epicentro.y },
    fechaHora: isoAFecha(j.fechaHora),
    revision: j.revision,
    estacion: j.estacion,
  };
}

// ---------- Árbol AVL → JSON (topología) ----------
// Recorremos el árbol y emitimos:
//   - raiz: id de la raíz o null
//   - nodos: array con { id, altura, izq, der }
export function arbolAJSON(arbol) {
  const nodos = [];
  function recorrer(n) {
    if (n === null) return;
    nodos.push({
      id: n.getClave().id,
      altura: n.getAltura(),
      izq: n.getHijoIzquierdo() ? n.getHijoIzquierdo().getClave().id : null,
      der: n.getHijoDerecho() ? n.getHijoDerecho().getClave().id : null,
    });
    recorrer(n.getHijoIzquierdo());
    recorrer(n.getHijoDerecho());
  }
  recorrer(arbol.getRaiz());
  return {
    raiz: arbol.getRaiz() ? arbol.getRaiz().getClave().id : null,
    nodos,
  };
}

// src/persistence/CargarInserciones.js
import { ArbolAVL } from "../structures/ArbolAVL.js";
import { ArbolBST } from "../structures/ArbolBST.js";
import { crearClave } from "../domain/Clave.js";
import { crearEvento, calcularPrioridad, claveDeEvento } from "../domain/Evento.js";
import { enZonaPoblada } from "../domain/Zona.js";

// Calcula la profundidad máxima de un árbol (recorriendo desde la raíz).
function profundidadMaxima(arbol) {
  return _pm(arbol.getRaiz(), 0);
}
function _pm(nodo, p) {
  if (!nodo) return -1;
  return Math.max(p, _pm(nodo.getHijoIzquierdo(), p + 1), _pm(nodo.getHijoDerecho(), p + 1));
}

// Compara dos listas de claves para saber si están ordenadas.
function estaOrdenado(claves) {
  for (let i = 1; i < claves.length; i++) {
    const a = claves[i - 1], b = claves[i];
    if (a.prioridad > b.prioridad) return false;
    if (a.prioridad === b.prioridad && a.magnitud > b.magnitud) return false;
    if (a.prioridad === b.prioridad && a.magnitud === b.magnitud && a.id > b.id) return false;
  }
  return true;
}

/**
 * Carga por inserciones.
 * @param {Array} eventosJSON - lista de eventos en formato JSON.
 * @param {Object} escenario - escenario (para zonas, validaciones).
 * @param {Array} problemas - array donde se acumulan errores.
 * @returns {Object|null} { avl, bst, eventos } o null si hay errores.
 */
export function cargarPorInserciones(eventosJSON, escenario, problemas) {
  // 1) Estructura básica
  if (!Array.isArray(eventosJSON)) {
    problemas.push("El JSON no contiene un array de eventos en 'eventos'");
    return null;
  }

  // 2) Verificar ids únicos
  const idsVistos = new Set();
  for (const j of eventosJSON) {
    if (j.id === undefined) { problemas.push("Evento sin id"); continue; }
    if (idsVistos.has(j.id)) {
      problemas.push(`Id duplicado en el archivo: ${j.id}`);
    }
    idsVistos.add(j.id);
  }
  if (problemas.length > 0) return null;

  // 3) Validar y construir cada evento
  const eventos = [];
  for (const j of eventosJSON) {
    // Validación rápida de los datos (reusamos las reglas de rango)
    const err = validarDatosBasicos(j, escenario);
    if (err) { problemas.push(`Evento ${j.id}: ${err}`); continue; }

    const ev = crearEvento({
      id: j.id,
      magnitud: j.magnitud,
      profundidad: j.profundidad,
      epicentro: j.epicentro,
      fechaHora: new Date(j.fechaHora),
      revision: j.revision !== undefined ? j.revision : 1,
      estaciones: j.estaciones || [],
    }, escenario.zonas);
    eventos.push(ev);
  }
  if (problemas.length > 0) return null;

  // 4) Insertar en AVL y BST en paralelo
  const avl = new ArbolAVL();
  const bst = new ArbolBST();
  for (const ev of eventos) {
    const clave = claveDeEvento(ev);
    avl.insertar(clave, ev);
    bst.insertar(clave, ev);
  }

  // 5) Verificar orden BST
  const inAVL = avl.inorden().map(n => n.getClave());
  const inBST = bst.inorden().map(n => n.getClave());
  if (!estaOrdenado(inAVL) || !estaOrdenado(inBST)) {
    problemas.push("El inorden de alguno de los árboles no está ordenado");
    return null;
  }

  // 6) Métricas comparativas
  const resumen = {
    avl: {
      raizId: avl.getRaiz() ? avl.getRaiz().getClave().id : null,
      altura: avl.altura(),
      profundidadMaxima: profundidadMaxima(avl),
      hojas: avl.contarHojas(),
      balanceado: avl.estaBalanceado(),
    },
    bst: {
      raizId: bst.getRaiz() ? bst.getRaiz().getClave().id : null,
      altura: _alturaBST(bst.getRaiz()),
      profundidadMaxima: profundidadMaxima(bst),
      hojas: _contarHojasBST(bst.getRaiz()),
      balanceado: null, // BST no está balanceado por construcción
    },
  };

  return { avl, bst, eventos, resumen };
}

function _alturaBST(n) {
  if (!n) return -1;
  return 1 + Math.max(_alturaBST(n.getHijoIzquierdo()), _alturaBST(n.getHijoDerecho()));
}
function _contarHojasBST(n) {
  if (!n) return 0;
  if (!n.getHijoIzquierdo() && !n.getHijoDerecho()) return 1;
  return _contarHojasBST(n.getHijoIzquierdo()) + _contarHojasBST(n.getHijoDerecho());
}

// Validaciones de rango (versión libre de contexto, sin `this`)
function validarDatosBasicos(j, escenario) {
  if (!Number.isInteger(j.id) || j.id < 1 || j.id > 999999) return "id inválido";
  if (typeof j.magnitud !== "number" || j.magnitud < -2 || j.magnitud > 10) return "magnitud fuera de rango";
  if (Math.round(j.magnitud * 10) !== j.magnitud * 10) return "magnitud con más de 1 decimal";
  if (typeof j.profundidad !== "number" || j.profundidad < 0 || j.profundidad > 700) return "profundidad fuera de rango";
  if (Math.round(j.profundidad * 10) !== j.profundidad * 10) return "profundidad con más de 1 decimal";
  if (!j.epicentro || j.epicentro.x < 0 || j.epicentro.x > 1000 || j.epicentro.y < 0 || j.epicentro.y > 1000) return "epicentro fuera de rango";
  const f = new Date(j.fechaHora);
  if (isNaN(f.getTime())) return "fechaHora inválida";
  if (f.getTime() > escenario.reloj.getTime()) return "fechaHora posterior al reloj";
  return null;
}