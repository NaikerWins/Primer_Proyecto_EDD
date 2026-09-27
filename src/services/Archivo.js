// src/services/Archivo.js

// Devuelve la antigüedad en horas entre el reloj y la fecha del evento.
function antiguedadHoras(evento, reloj) {
  return (reloj.getTime() - evento.fechaHora.getTime()) / (1000 * 60 * 60);
}

// Verifica si un nodo es elegible individualmente.
// También devuelve la cantidad de nodos, la profundidad y si TODOS cumplen.
function analizarSubarbol(nodo, reloj, T, profundidad) {
  if (nodo === null) {
    return { todosElegibles: true, cantidad: 0 };
  }
  const ev = nodo.getDato();
  const esteElegible = ev.prioridad === 1 && antiguedadHoras(ev, reloj) > T;

  const izq = analizarSubarbol(nodo.getHijoIzquierdo(), reloj, T, profundidad + 1);
  const der = analizarSubarbol(nodo.getHijoDerecho(), reloj, T, profundidad + 1);

  return {
    todosElegibles: esteElegible && izq.todosElegibles && der.todosElegibles,
    cantidad: 1 + izq.cantidad + der.cantidad,
  };
}

// Recorre el árbol recolectando subárboles elegibles.
function recolectarElegibles(nodo, reloj, T, profundidadActual, elegibles) {
  if (nodo === null) return;
  // Post-orden: los hijos primero
  recolectarElegibles(nodo.getHijoIzquierdo(), reloj, T, profundidadActual + 1, elegibles);
  recolectarElegibles(nodo.getHijoDerecho(), reloj, T, profundidadActual + 1, elegibles);

  const info = analizarSubarbol(nodo, reloj, T, profundidadActual);
  if (info.todosElegibles && info.cantidad > 0) {
    elegibles.push({
      nodo,
      raizId: nodo.getClave().id,
      cantidad: info.cantidad,
      profundidad: profundidadActual,
    });
  }
}

export function elegirRamaAArchivar(avl, reloj, T) {
  const elegibles = [];
  recolectarElegibles(avl.getRaiz(), reloj, T, 0, elegibles);
  if (elegibles.length === 0) return null;

  elegibles.sort((a, b) => {
    // 1) mayor cantidad
    if (a.cantidad !== b.cantidad) return b.cantidad - a.cantidad;
    // 2) mayor profundidad de raíz
    if (a.profundidad !== b.profundidad) return b.profundidad - a.profundidad;
    // 3) mayor id
    return b.raizId - a.raizId;
  });

  return elegibles[0];
}

// Extrae todos los nodos (eventos) del subárbol con raíz dada.
export function extraerEventosSubarbol(raizSubarbol) {
  const eventos = [];
  function recorrer(n) {
    if (n === null) return;
    eventos.push(n.getDato());
    recorrer(n.getHijoIzquierdo());
    recorrer(n.getHijoDerecho());
  }
  recorrer(raizSubarbol);
  return eventos;
}