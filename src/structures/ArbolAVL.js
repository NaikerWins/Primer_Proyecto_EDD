// src/structures/ArbolAVL.js
import { NodoAVL } from "./NodoAVL.js";
import { compararClaves, formatearClave } from "../domain/Clave.js";

export class ArbolAVL {
  constructor() {
    this.raiz = null;

    // Contadores exigidos por la sección 14 del PDF
    this.contadores = {
      LL: 0,
      RR: 0,
      LR: 0,
      RL: 0,
      girosSimples: 0,
      girosDobles: 0,
    };
  }

  getRaiz() { return this.raiz; }
  estaVacio() { return this.raiz === null; }

  // --------------------------------------------------
  // INSERTAR
  // --------------------------------------------------
  insertar(clave, dato = null) {
    const nodo = new NodoAVL(clave, dato);
    this.raiz = this._insertar(this.raiz, nodo);
    if (this.raiz) this.raiz.setPadre(null);
    return { exito: true, mensaje: "Insertado " + formatearClave(clave) };
  }

  _insertar(actual, nodo) {
    // Caso base: llegamos a un hueco, aquí va el nuevo nodo
    if (actual === null) return nodo;

    const cmp = compararClaves(nodo.getClave(), actual.getClave());
    if (cmp === 0) {
      // Clave duplicada: no se inserta. Devolvemos el subárbol tal cual.
      return actual;
    }

    if (cmp < 0) {
      actual.setHijoIzquierdo(this._insertar(actual.getHijoIzquierdo(), nodo));
      if (actual.getHijoIzquierdo()) actual.getHijoIzquierdo().setPadre(actual);
    } else {
      actual.setHijoDerecho(this._insertar(actual.getHijoDerecho(), nodo));
      if (actual.getHijoDerecho()) actual.getHijoDerecho().setPadre(actual);
    }

    // Al volver, actualizamos altura y rebalanceamos ESTE subárbol.
    actual.actualizarAltura();
    return this._balancear(actual);
  }

  // --------------------------------------------------
  // BALANCEAR (aplica los 4 casos)
  // --------------------------------------------------
  _balancear(nodo) {
    const fb = nodo.getFactorBalance();

    // Caso LL: bf > 1 y el hijo izquierdo está cargado a la izquierda
    if (fb > 1 && nodo.getHijoIzquierdo().getFactorBalance() >= 0) {
      this.contadores.LL++;
      this.contadores.girosSimples++;
      return this._giroDerecha(nodo);
    }

    // Caso RR: bf < -1 y el hijo derecho está cargado a la derecha
    if (fb < -1 && nodo.getHijoDerecho().getFactorBalance() <= 0) {
      this.contadores.RR++;
      this.contadores.girosSimples++;
      return this._giroIzquierda(nodo);
    }

    // Caso LR: bf > 1 y el hijo izquierdo está cargado a la derecha
    if (fb > 1 && nodo.getHijoIzquierdo().getFactorBalance() < 0) {
      this.contadores.LR++;
      this.contadores.girosDobles++;
      // Primero giro izquierda al hijo, luego derecha al nodo
      nodo.setHijoIzquierdo(this._giroIzquierda(nodo.getHijoIzquierdo()));
      if (nodo.getHijoIzquierdo()) nodo.getHijoIzquierdo().setPadre(nodo);
      return this._giroDerecha(nodo);
    }

    // Caso RL: bf < -1 y el hijo derecho está cargado a la izquierda
    if (fb < -1 && nodo.getHijoDerecho().getFactorBalance() > 0) {
      this.contadores.RL++;
      this.contadores.girosDobles++;
      nodo.setHijoDerecho(this._giroDerecha(nodo.getHijoDerecho()));
      if (nodo.getHijoDerecho()) nodo.getHijoDerecho().setPadre(nodo);
      return this._giroIzquierda(nodo);
    }

    // Ya está balanceado
    return nodo;
  }

  // --------------------------------------------------
  // GIRO SIMPLE A LA DERECHA (caso LL)
  //
  //       p                q
  //      / \              / \
  //     q   C    ->      A   p
  //    / \                  / \
  //   A   B                B   C
  //
  // --------------------------------------------------
  _giroDerecha(p) {
    const q = p.getHijoIzquierdo();
    const B = q.getHijoDerecho();

    // q sube, p baja a la derecha
    q.setHijoDerecho(p);
    p.setHijoIzquierdo(B);

    // Reasignamos padres
    q.setPadre(p.getPadre());
    p.setPadre(q);
    if (B) B.setPadre(p);

    // Actualizamos alturas: p primero (es hijo), luego q (es padre)
    p.actualizarAltura();
    q.actualizarAltura();

    return q; // q es la nueva raíz del subárbol
  }

  // --------------------------------------------------
  // GIRO SIMPLE A LA IZQUIERDA (caso RR)
  //
  //     p                    q
  //    / \                  / \
  //   A   q        ->      p   C
  //      / \              / \
  //     B   C            A   B
  //
  // --------------------------------------------------
  _giroIzquierda(p) {
    const q = p.getHijoDerecho();
    const B = q.getHijoIzquierdo();

    q.setHijoIzquierdo(p);
    p.setHijoDerecho(B);

    q.setPadre(p.getPadre());
    p.setPadre(q);
    if (B) B.setPadre(p);

    p.actualizarAltura();
    q.actualizarAltura();

    return q;
  }

  // --------------------------------------------------
  // BUSCAR (idéntico al BST)
  // --------------------------------------------------
  buscar(clave) {
    return this._buscar(this.raiz, clave);
  }

  _buscar(actual, clave) {
    if (actual === null) return null;
    const cmp = compararClaves(clave, actual.getClave());
    if (cmp === 0) return actual;
    if (cmp < 0) return this._buscar(actual.getHijoIzquierdo(), clave);
    return this._buscar(actual.getHijoDerecho(), clave);
  }

  // --------------------------------------------------
  // RECORRIDOS
  // --------------------------------------------------
  inorden() {
    const res = [];
    this._inorden(this.raiz, res);
    return res;
  }
  _inorden(n, res) {
    if (!n) return;
    this._inorden(n.getHijoIzquierdo(), res);
    res.push(n);
    this._inorden(n.getHijoDerecho(), res);
  }

  preorden() {
    const res = [];
    this._preorden(this.raiz, res);
    return res;
  }
  _preorden(n, res) {
    if (!n) return;
    res.push(n);
    this._preorden(n.getHijoIzquierdo(), res);
    this._preorden(n.getHijoDerecho(), res);
  }

  posorden() {
    const res = [];
    this._posorden(this.raiz, res);
    return res;
  }
  _posorden(n, res) {
    if (!n) return;
    this._posorden(n.getHijoIzquierdo(), res);
    this._posorden(n.getHijoDerecho(), res);
    res.push(n);
  }

  // Por niveles (BFS), lo pide la sección 14
  porNiveles() {
    const res = [];
    if (!this.raiz) return res;
    const cola = [this.raiz];
    while (cola.length > 0) {
      const n = cola.shift();
      res.push(n);
      if (n.getHijoIzquierdo()) cola.push(n.getHijoIzquierdo());
      if (n.getHijoDerecho()) cola.push(n.getHijoDerecho());
    }
    return res;
  }

  // --------------------------------------------------
  // UTILIDADES
  // --------------------------------------------------
  altura() {
    return this.raiz ? this.raiz.getAltura() : -1;
  }

  contarHojas() {
    return this._contarHojas(this.raiz);
  }
  _contarHojas(n) {
    if (!n) return 0;
    if (!n.getHijoIzquierdo() && !n.getHijoDerecho()) return 1;
    return this._contarHojas(n.getHijoIzquierdo()) +
           this._contarHojas(n.getHijoDerecho());
  }

  // Verifica que todos los nodos tengan bf en {-1,0,1}.
  // La usaremos en el Paso 11 (auditoría) para modo normal.
  estaBalanceado() {
    return this._estaBalanceado(this.raiz);
  }
  _estaBalanceado(n) {
    if (!n) return true;
    const fb = n.getFactorBalance();
    if (fb < -1 || fb > 1) return false;
    return this._estaBalanceado(n.getHijoIzquierdo()) &&
           this._estaBalanceado(n.getHijoDerecho());
  }

  dibujar() {
    const lineas = [];
    if (!this.raiz) {
      lineas.push("(árbol vacío)");
      return lineas;
    }
    this._dibujar(this.raiz, "", "R", lineas);
    return lineas;
  }
  _dibujar(n, espacio, pos, lineas) {
    if (!n) return;
    this._dibujar(n.getHijoDerecho(), espacio + "        ", "D", lineas);
    const fb = n.getFactorBalance();
    lineas.push(
      espacio + pos + "── " + formatearClave(n.getClave()) +
      `  [h=${n.getAltura()} fb=${fb}]`
    );
    this._dibujar(n.getHijoIzquierdo(), espacio + "        ", "I", lineas);
  }
}