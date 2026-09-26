// src/services/Consultas.js

// Recorrido inverso con corte al llegar a k.
function _primerosKPendientes(nodo, k, resultado, contador) {
  if (nodo === null || resultado.length >= k) return;
  // Primero derecha (mayor K)
  _primerosKPendientes(nodo.getHijoDerecho(), k, resultado, contador);
  contador.n++;
  if (resultado.length >= k) return;
  const ev = nodo.getDato();
  if (ev.estadoAtencion === "pendiente") {
    resultado.push(ev);
  }
  if (resultado.length >= k) return;
  _primerosKPendientes(nodo.getHijoIzquierdo(), k, resultado, contador);
}

export function consultarPrimerosKPendientes(avl, k) {
  const contador = { n: 0 };
  const resultado = [];
  _primerosKPendientes(avl.getRaiz(), k, resultado, contador);
  return { resultados: resultado, nodosExaminados: contador.n };
}

function _enRangoMagnitud(nodo, mMin, mMax, resultado, contador) {
  if (nodo === null) return;
  _enRangoMagnitud(nodo.getHijoIzquierdo(), mMin, mMax, resultado, contador);
  contador.n++;
  const ev = nodo.getDato();
  if (ev.magnitud >= mMin && ev.magnitud <= mMax) {
    resultado.push(ev);
  }
  _enRangoMagnitud(nodo.getHijoDerecho(), mMin, mMax, resultado, contador);
}

export function consultarEventosPorRangoMagnitud(avl, mMin, mMax) {
  const contador = { n: 0 };
  const resultado = [];
  _enRangoMagnitud(avl.getRaiz(), mMin, mMax, resultado, contador);
  return { resultados: resultado, nodosExaminados: contador.n };
}

function _enRangoFechaYProf(nodo, fIni, fFin, hMax, resultado, contador) {
  if (nodo === null) return;
  _enRangoFechaYProf(nodo.getHijoIzquierdo(), fIni, fFin, hMax, resultado, contador);
  contador.n++;
  const ev = nodo.getDato();
  const t = ev.fechaHora.getTime();
  if (ev.profundidad <= hMax && t >= fIni.getTime() && t <= fFin.getTime()) {
    resultado.push(ev);
  }
  _enRangoFechaYProf(nodo.getHijoDerecho(), fIni, fFin, hMax, resultado, contador);
}

export function consultarPorFechaYProfundidad(avl, fIni, fFin, hMax) {
  const contador = { n: 0 };
  const resultado = [];
  _enRangoFechaYProf(avl.getRaiz(), fIni, fFin, hMax, resultado, contador);
  return { resultados: resultado, nodosExaminados: contador.n };
}

function _accesoCostoso(nodo, profundidadActual, L, resultado, contador) {
  if (nodo === null) return;
  _accesoCostoso(nodo.getHijoIzquierdo(), profundidadActual + 1, L, resultado, contador);
  contador.n++;
  const ev = nodo.getDato();
  if (ev.prioridad === 3 && profundidadActual > L) {
    resultado.push({
      id: ev.id,
      clave: nodo.getClave(),
      profundidadNodo: profundidadActual,
      nodosVisitadosEnBusqueda: profundidadActual + 1,
      limiteL: L,
      prioridad: ev.prioridad,
    });
  }
  _accesoCostoso(nodo.getHijoDerecho(), profundidadActual + 1, L, resultado, contador);
}

export function consultarAccesoCostoso(avl, L) {
  const contador = { n: 0 };
  const resultado = [];
  _accesoCostoso(avl.getRaiz(), 0, L, resultado, contador);
  return { resultados: resultado, nodosExaminados: contador.n, L };
}