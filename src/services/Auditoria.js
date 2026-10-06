import { compararClaves, formatearClave } from "../domain/Clave.js";

// Recorre el AVL en inorden y reporta:
//   - nodos duplicados
//   - orden roto (inorden no ascendente)
//   - cada nodo con su profundidad para el reporte final
export function auditarOrdenYUnicidad(avl) {
  const problemas = [];
  const inorden = avl.inorden();
  const vistas = new Set();

  for (let i = 0; i < inorden.length; i++) {
    const nodo = inorden[i];
    const id = nodo.getClave().id;

    // Unicidad de id
    if (vistas.has(id)) {
      problemas.push({
        tipo: "UNICIDAD",
        id,
        mensaje: `Id ${id} aparece más de una vez en el árbol`,
      });
    }
    vistas.add(id);

    // Orden ascendente estricto entre vecinos
    if (i > 0) {
      const prev = inorden[i - 1].getClave();
      const curr = nodo.getClave();
      if (compararClaves(prev, curr) >= 0) {
        problemas.push({
          tipo: "ORDEN",
          id,
          mensaje: `Orden roto: ${formatearClave(prev)} no es menor que ${formatearClave(curr)}`,
        });
      }
    }
  }
  return problemas;
}

// Verifica que cada nodo conozca a sus hijos y que los hijos conozcan a su padre.
export function auditarReferencias(avl) {
  const problemas = [];
  const raiz = avl.getRaiz();

  if (raiz && raiz.getPadre() !== null) {
    problemas.push({
      tipo: "REFERENCIA",
      id: raiz.getClave().id,
      mensaje: "La raíz no debería tener padre",
    });
  }

  function revisar(nodo) {
    if (nodo === null) return;
    const izq = nodo.getHijoIzquierdo();
    const der = nodo.getHijoDerecho();

    if (izq && izq.getPadre() !== nodo) {
      problemas.push({
        tipo: "REFERENCIA",
        id: nodo.getClave().id,
        mensaje: `Hijo izquierdo ${izq.getClave().id} no apunta a este nodo como padre`,
      });
    }
    if (der && der.getPadre() !== nodo) {
      problemas.push({
        tipo: "REFERENCIA",
        id: nodo.getClave().id,
        mensaje: `Hijo derecho ${der.getClave().id} no apunta a este nodo como padre`,
      });
    }
    revisar(izq);
    revisar(der);
  }
  revisar(raiz);
  return problemas;
}

// Recalcula alturas bottom-up y compara con las almacenadas.
export function auditarAlturas(avl) {
  const problemas = [];

  function alturaDe(n) {
    if (!n) return -1;
    return n.getAltura();
  }

  function revisar(nodo) {
    if (nodo === null) return;
    revisar(nodo.getHijoIzquierdo());
    revisar(nodo.getHijoDerecho());

    const hIzq = alturaDe(nodo.getHijoIzquierdo());
    const hDer = alturaDe(nodo.getHijoDerecho());
    const esperada = 1 + Math.max(hIzq, hDer);

    if (nodo.getAltura() !== esperada) {
      problemas.push({
        tipo: "ALTURA",
        id: nodo.getClave().id,
        mensaje: `Altura almacenada ${nodo.getAltura()} ≠ esperada ${esperada}`,
      });
    }
  }
  revisar(avl.getRaiz());
  return problemas;
}

// Verifica factores de balance.
//   - En modo normal: |fb| <= 1
//   - En modo estrés: solo reporta el fb fuera de rango como "desbalance esperado"
export function auditarFactores(avl, modo) {
  const problemas = [];
  const desbalancesEsperados = [];

  function revisar(nodo) {
    if (nodo === null) return;
    const fb = nodo.getFactorBalance();
    const fuera = fb < -1 || fb > 1;

    if (fuera) {
      if (modo === "estres") {
        desbalancesEsperados.push({
          id: nodo.getClave().id,
          factorBalance: fb,
        });
      } else {
        problemas.push({
          tipo: "FACTOR",
          id: nodo.getClave().id,
          mensaje: `Factor de balance ${fb} fuera de {-1, 0, 1}`,
        });
      }
    }
    revisar(nodo.getHijoIzquierdo());
    revisar(nodo.getHijoDerecho());
  }
  revisar(avl.getRaiz());
  return { problemas, desbalancesEsperados };
}

// Reporte completo (lo llama verificarEstructura).
export function auditarAVL(avl, modo) {
  const orden = auditarOrdenYUnicidad(avl);
  const refs = auditarReferencias(avl);
  const alturas = auditarAlturas(avl);
  const { problemas: factores, desbalancesEsperados } = auditarFactores(avl, modo);

  const todosLosProblemas = [...orden, ...refs, ...alturas, ...factores];

  return {
    consistente: todosLosProblemas.length === 0,
    problemas: todosLosProblemas,
    desbalancesEsperados,
    conteos: {
      orden: orden.length,
      referencias: refs.length,
      alturas: alturas.length,
      factores: factores.length,
    },
  };
}