import { ArbolAVL } from "../structures/ArbolAVL.js";
import { ArbolBST } from "../structures/ArbolBST.js";
import { crearClave } from "../domain/Clave.js";
import { crearEvento, calcularPrioridad, claveDeEvento } from "../domain/Evento.js";
import { enZonaPoblada } from "../domain/Zona.js";

function profundidadMaxima(arbol) {
  return _pm(arbol.getRaiz(), 0);
}
function _pm(nodo, p) {
  if (!nodo) return -1;
  return Math.max(p, _pm(nodo.getHijoIzquierdo(), p + 1), _pm(nodo.getHijoDerecho(), p + 1));
}

function estaOrdenado(claves) {
  for (let i = 1; i < claves.length; i++) {
    const a = claves[i - 1], b = claves[i];
    if (a.prioridad > b.prioridad) return false;
    if (a.prioridad === b.prioridad && a.magnitud > b.magnitud) return false;
    if (a.prioridad === b.prioridad && a.magnitud === b.magnitud && a.id > b.id) return false;
  }
  return true;
}

export function cargarPorInserciones(eventosJSON, escenario, problemas) {
  if (!Array.isArray(eventosJSON)) {
    problemas.push("El JSON no contiene un array de eventos en 'eventos'");
    return null;
  }

  const idsVistos = new Set();
  for (const j of eventosJSON) {
    if (j.id === undefined) { problemas.push("Evento sin id"); continue; }
    if (idsVistos.has(j.id)) problemas.push(`Id duplicado en el archivo: ${j.id}`);
    idsVistos.add(j.id);
  }
  if (problemas.length > 0) return null;

  const eventos = [];
  for (const j of eventosJSON) {
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

  const avl = new ArbolAVL();
  const bst = new ArbolBST();
  for (const ev of eventos) {
    const clave = claveDeEvento(ev);
    avl.insertar(clave, ev);
    bst.insertar(clave, ev);
  }

  const inAVL = avl.inorden().map(n => n.getClave());
  const inBST = bst.inorden().map(n => n.getClave());
  if (!estaOrdenado(inAVL) || !estaOrdenado(inBST)) {
    problemas.push("El inorden de alguno de los árboles no está ordenado");
    return null;
  }

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
      balanceado: null,
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