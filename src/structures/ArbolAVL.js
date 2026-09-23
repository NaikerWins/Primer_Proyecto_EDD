// src/structures/ArbolAVL.js
import { NodoAVL } from "./NodoAVL.js";
import { compararClaves, formatearClave } from "../domain/Clave.js";

export class ArbolAVL {
  constructor() {
    this.raiz = null;
    this.modoEstres = false;
    this.contadores = { LL: 0, RR: 0, LR: 0, RL: 0, girosSimples: 0, girosDobles: 0 };
  }

  getRaiz() { return this.raiz; }
  estaVacio() { return this.raiz === null; }

  activarModoEstres() { this.modoEstres = true; }
  desactivarModoEstres() { this.modoEstres = false; }

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
    if (actual === null) return nodo;
    const cmp = compararClaves(nodo.getClave(), actual.getClave());
    if (cmp === 0) return actual;
    if (cmp < 0) {
      actual.setHijoIzquierdo(this._insertar(actual.getHijoIzquierdo(), nodo));
      if (actual.getHijoIzquierdo()) actual.getHijoIzquierdo().setPadre(actual);
    } else {
      actual.setHijoDerecho(this._insertar(actual.getHijoDerecho(), nodo));
      if (actual.getHijoDerecho()) actual.getHijoDerecho().setPadre(actual);
    }
    actual.actualizarAltura();
    if (this.modoEstres) return actual; // NO balancear
    return this._balancear(actual);
  }

  // --------------------------------------------------
  // ELIMINAR (con balanceo en modo normal)
  // --------------------------------------------------
  eliminar(clave) {
    if (this.raiz === null) return { exito: false, mensaje: "Árbol vacío" };
    const nodo = this.buscar(clave);
    if (!nodo) return { exito: false, mensaje: "No existe" };
    this.raiz = this._eliminarRec(this.raiz, clave);
    if (this.raiz) this.raiz.setPadre(null);
    return { exito: true, mensaje: "Eliminado" };
  }

  _eliminarRec(actual, clave) {
    if (actual === null) return null;
    const cmp = compararClaves(clave, actual.getClave());
    if (cmp < 0) {
      actual.setHijoIzquierdo(this._eliminarRec(actual.getHijoIzquierdo(), clave));
      if (actual.getHijoIzquierdo()) actual.getHijoIzquierdo().setPadre(actual);
    } else if (cmp > 0) {
      actual.setHijoDerecho(this._eliminarRec(actual.getHijoDerecho(), clave));
      if (actual.getHijoDerecho()) actual.getHijoDerecho().setPadre(actual);
    } else {
      if (!actual.hijoIzquierdo) return actual.hijoDerecho;
      if (!actual.hijoDerecho) return actual.hijoIzquierdo;
      // Dos hijos: predecesor (mayor del subárbol izquierdo)
      let pred = actual.hijoIzquierdo;
      while (pred.hijoDerecho) pred = pred.hijoDerecho;
      actual.setClave(pred.getClave());
      actual.setDato(pred.getDato());
      actual.setHijoIzquierdo(this._eliminarRec(actual.hijoIzquierdo, pred.getClave()));
      if (actual.hijoIzquierdo) actual.hijoIzquierdo.setPadre(actual);
    }
    actual.actualizarAltura();
    if (this.modoEstres) return actual;
    return this._balancear(actual);
  }

  // --------------------------------------------------
  // BALANCEAR (una sola rotación)
  // --------------------------------------------------
  _balancear(nodo) {
    const fb = nodo.getFactorBalance();

    if (fb > 1 && nodo.getHijoIzquierdo().getFactorBalance() >= 0) {
      this.contadores.LL++;
      this.contadores.girosSimples++;
      return this._giroDerecha(nodo);
    }
    if (fb < -1 && nodo.getHijoDerecho().getFactorBalance() <= 0) {
      this.contadores.RR++;
      this.contadores.girosSimples++;
      return this._giroIzquierda(nodo);
    }
    if (fb > 1 && nodo.getHijoIzquierdo().getFactorBalance() < 0) {
      this.contadores.LR++;
      this.contadores.girosDobles++;
      nodo.setHijoIzquierdo(this._giroIzquierda(nodo.getHijoIzquierdo()));
      if (nodo.getHijoIzquierdo()) nodo.getHijoIzquierdo().setPadre(nodo);
      return this._giroDerecha(nodo);
    }
    if (fb < -1 && nodo.getHijoDerecho().getFactorBalance() > 0) {
      this.contadores.RL++;
      this.contadores.girosDobles++;
      nodo.setHijoDerecho(this._giroDerecha(nodo.getHijoDerecho()));
      if (nodo.getHijoDerecho()) nodo.getHijoDerecho().setPadre(nodo);
      return this._giroIzquierda(nodo);
    }
    return nodo;
  }

  // --------------------------------------------------
  // GIROS
  // --------------------------------------------------
  _giroDerecha(p) {
    const q = p.getHijoIzquierdo();
    const B = q.getHijoDerecho();
    q.setHijoDerecho(p);
    p.setHijoIzquierdo(B);
    q.setPadre(p.getPadre());
    p.setPadre(q);
    if (B) B.setPadre(p);
    p.actualizarAltura();
    q.actualizarAltura();
    return q;
  }

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
  // RECUPERACIÓN GLOBAL
  // --------------------------------------------------
  repararGlobal() {
    let pasadas = 0;
    const maxPasadas = 500; // salvaguarda
    while (!this.estaBalanceado() && pasadas < maxPasadas) {
      this.raiz = this._repararSubarbol(this.raiz);
      if (this.raiz) this.raiz.setPadre(null);
      pasadas++;
    }
    return pasadas;
  }

  _repararSubarbol(nodo) {
    if (nodo === null) return null;

    // Post-orden: reparar hijos primero
    nodo.setHijoIzquierdo(this._repararSubarbol(nodo.getHijoIzquierdo()));
    if (nodo.getHijoIzquierdo()) nodo.getHijoIzquierdo().setPadre(nodo);
    nodo.setHijoDerecho(this._repararSubarbol(nodo.getHijoDerecho()));
    if (nodo.getHijoDerecho()) nodo.getHijoDerecho().setPadre(nodo);

    nodo.actualizarAltura();

    // Una rotación en este nodo si es necesario
    const fb = nodo.getFactorBalance();
    if (fb > 1) {
      if (nodo.getHijoIzquierdo().getFactorBalance() < 0) {
        nodo.setHijoIzquierdo(this._giroIzquierda(nodo.getHijoIzquierdo()));
        if (nodo.getHijoIzquierdo()) nodo.getHijoIzquierdo().setPadre(nodo);
      }
      return this._giroDerecha(nodo);
    } else if (fb < -1) {
      if (nodo.getHijoDerecho().getFactorBalance() > 0) {
        nodo.setHijoDerecho(this._giroDerecha(nodo.getHijoDerecho()));
        if (nodo.getHijoDerecho()) nodo.getHijoDerecho().setPadre(nodo);
      }
      return this._giroIzquierda(nodo);
    }
    return nodo;
  }

  // --------------------------------------------------
  // CLONAR (para el undo de la recuperación)
  // --------------------------------------------------
  clonar() {
    const copia = new ArbolAVL();
    copia.modoEstres = this.modoEstres;
    copia.contadores = { ...this.contadores };
    copia.raiz = this._clonarNodo(this.raiz, null);
    return copia;
  }

  _clonarNodo(nodo, padre) {
    if (nodo === null) return null;
    const copia = new NodoAVL(nodo.getClave(), nodo.getDato());
    copia.setAltura(nodo.getAltura());
    copia.setPadre(padre);
    copia.setHijoIzquierdo(this._clonarNodo(nodo.getHijoIzquierdo(), copia));
    copia.setHijoDerecho(this._clonarNodo(nodo.getHijoDerecho(), copia));
    return copia;
  }

  // --------------------------------------------------
  // CONSULTAS Y UTILIDADES (iguales al paso 3)
  // --------------------------------------------------
  buscar(clave) { return this._buscar(this.raiz, clave); }
  _buscar(actual, clave) {
    if (actual === null) return null;
    const cmp = compararClaves(clave, actual.getClave());
    if (cmp === 0) return actual;
    if (cmp < 0) return this._buscar(actual.getHijoIzquierdo(), clave);
    return this._buscar(actual.getHijoDerecho(), clave);
  }

  inorden() { const r = []; this._inorden(this.raiz, r); return r; }
  _inorden(n, r) { if (!n) return; this._inorden(n.getHijoIzquierdo(), r); r.push(n); this._inorden(n.getHijoDerecho(), r); }

  preorden() { const r = []; this._preorden(this.raiz, r); return r; }
  _preorden(n, r) { if (!n) return; r.push(n); this._preorden(n.getHijoIzquierdo(), r); this._preorden(n.getHijoDerecho(), r); }

  posorden() { const r = []; this._posorden(this.raiz, r); return r; }
  _posorden(n, r) { if (!n) return; this._posorden(n.getHijoIzquierdo(), r); this._posorden(n.getHijoDerecho(), r); r.push(n); }

  porNiveles() {
    const r = [];
    if (!this.raiz) return r;
    const cola = [this.raiz];
    while (cola.length > 0) {
      const n = cola.shift();
      r.push(n);
      if (n.getHijoIzquierdo()) cola.push(n.getHijoIzquierdo());
      if (n.getHijoDerecho()) cola.push(n.getHijoDerecho());
    }
    return r;
  }

  altura() { return this.raiz ? this.raiz.getAltura() : -1; }

  contarHojas() { return this._contarHojas(this.raiz); }
  _contarHojas(n) {
    if (!n) return 0;
    if (!n.getHijoIzquierdo() && !n.getHijoDerecho()) return 1;
    return this._contarHojas(n.getHijoIzquierdo()) + this._contarHojas(n.getHijoDerecho());
  }

  estaBalanceado() { return this._estaBalanceado(this.raiz); }
  _estaBalanceado(n) {
    if (!n) return true;
    const fb = n.getFactorBalance();
    if (fb < -1 || fb > 1) return false;
    return this._estaBalanceado(n.getHijoIzquierdo()) && this._estaBalanceado(n.getHijoDerecho());
  }

  dibujar() {
    const lineas = [];
    if (!this.raiz) { lineas.push("(árbol vacío)"); return lineas; }
    this._dibujar(this.raiz, "", "R", lineas);
    return lineas;
  }
  _dibujar(n, esp, pos, lineas) {
    if (!n) return;
    this._dibujar(n.getHijoDerecho(), esp + "        ", "D", lineas);
    lineas.push(esp + pos + "── " + formatearClave(n.getClave()) + `  [h=${n.getAltura()} fb=${n.getFactorBalance()}]`);
    this._dibujar(n.getHijoIzquierdo(), esp + "        ", "I", lineas);
  }
}