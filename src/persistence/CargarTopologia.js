import { ArbolAVL } from "../structures/ArbolAVL.js";
import { NodoAVL } from "../structures/NodoAVL.js";
import { crearClave, compararClaves } from "../domain/Clave.js";
import { crearEvento, calcularPrioridad, claveDeEvento } from "../domain/Evento.js";
import { enZonaPoblada } from "../domain/Zona.js";

export function cargarPorTopologia(avlJSON, eventosJSON, escenario, problemas, modoDeclarado) {
  if (!avlJSON || !Array.isArray(avlJSON.nodos)) {
    problemas.push("Estructura 'avl' inválida o sin 'nodos'");
    return null;
  }
  const nodos = avlJSON.nodos;

  const ids = new Set();
  for (const n of nodos) {
    if (ids.has(n.id)) problemas.push(`Nodo con id duplicado en la topología: ${n.id}`);
    ids.add(n.id);
  }

  for (const n of nodos) {
    if (n.izq !== null && !ids.has(n.izq)) {
      problemas.push(`Nodo ${n.id} referencia hijo izquierdo inexistente: ${n.izq}`);
    }
    if (n.der !== null && !ids.has(n.der)) {
      problemas.push(`Nodo ${n.id} referencia hijo derecho inexistente: ${n.der}`);
    }
  }
  if (avlJSON.raiz !== null && !ids.has(avlJSON.raiz)) {
    problemas.push(`Raíz ${avlJSON.raiz} no está en 'nodos'`);
  }

  const padres = new Map();
  for (const n of nodos) {
    if (n.izq !== null) {
      if (padres.has(n.izq)) problemas.push(`Nodo ${n.izq} tiene más de un padre`);
      padres.set(n.izq, n.id);
    }
    if (n.der !== null) {
      if (padres.has(n.der)) problemas.push(`Nodo ${n.der} tiene más de un padre`);
      padres.set(n.der, n.id);
    }
  }
  if (problemas.length > 0) return null;

  const alcanzados = new Set();
  const enRecursion = new Set();
  function visita(id) {
    if (id === null) return true;
    if (enRecursion.has(id)) { problemas.push(`Ciclo detectado en ${id}`); return false; }
    if (alcanzados.has(id)) return true;
    enRecursion.add(id);
    const n = nodos.find(x => x.id === id);
    if (!n) return false;
    const okIzq = visita(n.izq);
    const okDer = visita(n.der);
    enRecursion.delete(id);
    if (!okIzq || !okDer) return false;
    alcanzados.add(id);
    return true;
  }
  if (avlJSON.raiz !== null) {
    if (!visita(avlJSON.raiz)) return null;
  }
  for (const n of nodos) {
    if (!alcanzados.has(n.id)) {
      problemas.push(`Nodo ${n.id} no es alcanzable desde la raíz`);
    }
  }
  if (problemas.length > 0) return null;

  const eventosPorId = new Map();
  for (const j of eventosJSON) {
    if (j.id === undefined) continue;
    if (eventosPorId.has(j.id)) problemas.push(`Evento con id duplicado en eventos: ${j.id}`);
    eventosPorId.set(j.id, j);
  }
  if (problemas.length > 0) return null;

  const nodoPorId = new Map();
  for (const n of nodos) {
    nodoPorId.set(n.id, new NodoAVL(null, null));
  }

  for (const n of nodos) {
    const jev = eventosPorId.get(n.id);
    if (!jev) { problemas.push(`Nodo ${n.id} no tiene evento asociado`); continue; }
    const err = validarEvento(jev, escenario);
    if (err) { problemas.push(`Evento ${n.id}: ${err}`); continue; }

    const ev = crearEvento({
      id: jev.id,
      magnitud: jev.magnitud,
      profundidad: jev.profundidad,
      epicentro: jev.epicentro,
      fechaHora: new Date(jev.fechaHora),
      revision: jev.revision,
      estaciones: jev.estaciones || [],
    }, escenario.zonas);

    const claveCalc = claveDeEvento(ev);
    const nodo = nodoPorId.get(n.id);
    nodo.setClave(claveCalc);
    nodo.setDato(ev);
    nodo.setAltura(n.altura);

    if (n.izq !== null) {
      const hi = nodoPorId.get(n.izq);
      nodo.setHijoIzquierdo(hi);
      hi.setPadre(nodo);
    }
    if (n.der !== null) {
      const hd = nodoPorId.get(n.der);
      nodo.setHijoDerecho(hd);
      hd.setPadre(nodo);
    }
  }
  if (problemas.length > 0) return null;

  const avl = new ArbolAVL();
  avl.raiz = avlJSON.raiz !== null ? nodoPorId.get(avlJSON.raiz) : null;
  if (avl.raiz) avl.raiz.setPadre(null);

  const inorden = avl.inorden().map(nd => nd.getClave());
  for (let i = 1; i < inorden.length; i++) {
    if (compararClaves(inorden[i - 1], inorden[i]) >= 0) {
      problemas.push(`Orden BST violado entre nodos ${inorden[i - 1].id} y ${inorden[i].id}`);
      break;
    }
  }

  avl.posorden().forEach(nd => {
    const hIzq = nd.getHijoIzquierdo() ? nd.getHijoIzquierdo().getAltura() : -1;
    const hDer = nd.getHijoDerecho() ? nd.getHijoDerecho().getAltura() : -1;
    const hEsperada = 1 + Math.max(hIzq, hDer);
    if (nd.getAltura() !== hEsperada) {
      problemas.push(`Altura inconsistente en nodo ${nd.getClave().id}: almacenada ${nd.getAltura()}, esperada ${hEsperada}`);
    }
  });

  const balanceado = avl.estaBalanceado();
  if (!balanceado && modoDeclarado !== "estres") {
    problemas.push("Topología desbalanceada pero el modo declarado es 'normal'");
  }

  if (problemas.length > 0) return null;

  const eventos = avl.inorden().map(nd => nd.getDato());
  return { avl, eventos };
}

function validarEvento(j, escenario) {
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