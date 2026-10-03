// src/components/TreeLayout.js

/**
 * Calcula posiciones (x, y) para cada nodo de un árbol.
 * Estrategia: x = índice en inorden (de izquierda a derecha),
 *             y = profundidad en el árbol.
 *
 * Devuelve:
 *   - nodos: [{ id, clave, x, y, altura, fb, esRaiz, padreId }]
 *   - aristas: [{ desde: {x,y}, hacia: {x,y} }]
 *   - ancho, alto (para dimensionar el SVG)
 */
export function calcularLayout(arbol, opciones = {}) {
  const {
    radio = 22,
    gapX = 60,
    gapY = 90,
    margenX = 30,
    margenY = 30,
  } = opciones;

  const raiz = arbol.getRaiz();
  if (!raiz) return { nodos: [], aristas: [], ancho: 100, alto: 100 };

  // 1) Recorrido inorden para asignar x
  const inorden = arbol.inorden();
  const xPorId = new Map();
  inorden.forEach((nodo, i) => xPorId.set(nodo.getClave().id, i));

  // 2) Recorrido para asignar y = profundidad y recolectar datos
  const nodos = [];
  const aristas = [];
  let profundidadMax = 0;

  function recorrer(nodo, profundidad, padre) {
    if (nodo === null) return;
    const id = nodo.getClave().id;
    const x = margenX + xPorId.get(id) * gapX;
    const y = margenY + profundidad * gapY;
    if (profundidad > profundidadMax) profundidadMax = profundidad;

    nodos.push({
      id,
      clave: { ...nodo.getClave() },
      x, y,
      altura: nodo.getAltura(),
      fb: nodo.getFactorBalance(),
      esRaiz: padre === null,
      padreId: padre ? padre.getClave().id : null,
    });

    if (padre !== null) {
      const px = margenX + xPorId.get(padre.getClave().id) * gapX;
      const py = margenY + (profundidad - 1) * gapY;
      aristas.push({ desde: { x: px, y: py }, hacia: { x, y } });
    }

    recorrer(nodo.getHijoIzquierdo(), profundidad + 1, nodo);
    recorrer(nodo.getHijoDerecho(), profundidad + 1, nodo);
  }
  recorrer(raiz, 0, null);

  const ancho = margenX * 2 + Math.max(1, inorden.length) * gapX;
  const alto = margenY * 2 + (profundidadMax + 1) * gapY;

  return { nodos, aristas, ancho, alto, radio };
}

// Formatea la clave para mostrar dentro del nodo (compacta)
export function etiquetaClave(clave) {
  return `${clave.prioridad}·${clave.magnitud.toFixed(1)}·${clave.id}`;
}