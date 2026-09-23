// src/structures/ArbolBST.js
import { Nodo } from "./Nodo.js";
import { compararClaves, formatearClave } from "../domain/Clave.js";

export class ArbolBST {
  constructor() {
    this.raiz = null;
  }

  getRaiz() { return this.raiz; }

  // --------------------------------------------------
  // INSERTAR
  // --------------------------------------------------
  insertar(clave, dato = null) {
    const nodo = new Nodo(clave, dato);

    if (this.raiz === null) {
      this.raiz = nodo;
      nodo.setPadre(null);
      return { exito: true, mensaje: "Insertado como raíz" };
    }

    return this._insertar(nodo, this.raiz);
  }

  _insertar(nodo, raizActual) {
    const cmp = compararClaves(nodo.getClave(), raizActual.getClave());

    if (cmp === 0) {
      return { exito: false, mensaje: "Ya existe un nodo con esa clave" };
    }

    if (cmp < 0) {
      const izq = raizActual.getHijoIzquierdo();
      if (izq === null) {
        raizActual.setHijoIzquierdo(nodo);
        nodo.setPadre(raizActual);
        return { exito: true, mensaje: "Insertado como hijo izquierdo" };
      }
      return this._insertar(nodo, izq);
    } else {
      const der = raizActual.getHijoDerecho();
      if (der === null) {
        raizActual.setHijoDerecho(nodo);
        nodo.setPadre(raizActual);
        return { exito: true, mensaje: "Insertado como hijo derecho" };
      }
      return this._insertar(nodo, der);
    }
  }

  // --------------------------------------------------
  // BUSCAR (por clave exacta)
  // --------------------------------------------------
  buscar(clave) {
    if (this.raiz === null) return null;
    return this._buscar(clave, this.raiz);
  }

  _buscar(clave, raizActual) {
    const cmp = compararClaves(clave, raizActual.getClave());
    if (cmp === 0) return raizActual;

    if (cmp < 0) {
      const izq = raizActual.getHijoIzquierdo();
      return izq === null ? null : this._buscar(clave, izq);
    } else {
      const der = raizActual.getHijoDerecho();
      return der === null ? null : this._buscar(clave, der);
    }
  }

  // --------------------------------------------------
  // ELIMINAR (por clave exacta)
  // --------------------------------------------------
  eliminar(clave) {
    if (this.raiz === null) {
      return { exito: false, mensaje: "El árbol está vacío" };
    }
    const nodo = this.buscar(clave);
    if (nodo === null) {
      return { exito: false, mensaje: "No existe un nodo con esa clave" };
    }
    this._eliminar(nodo);
    return { exito: true, mensaje: "Eliminado " + formatearClave(clave) };
  }

  _eliminar(nodo) {
    // CASO 1: es hoja
    if (nodo.getHijoIzquierdo() === null && nodo.getHijoDerecho() === null) {
      const padre = nodo.getPadre();
      if (padre === null) {
        this.raiz = null;
      } else if (padre.getHijoIzquierdo() === nodo) {
        padre.setHijoIzquierdo(null);
      } else {
        padre.setHijoDerecho(null);
      }
      nodo.setPadre(null);
      return;
    }

    // CASO 2a: solo hijo derecho
    if (nodo.getHijoIzquierdo() === null) {
      const hijo = nodo.getHijoDerecho();
      const padre = nodo.getPadre();
      if (padre === null) {
        this.raiz = hijo;
        hijo.setPadre(null);
      } else {
        if (padre.getHijoIzquierdo() === nodo) padre.setHijoIzquierdo(hijo);
        else padre.setHijoDerecho(hijo);
        hijo.setPadre(padre);
      }
      nodo.setPadre(null);
      nodo.setHijoDerecho(null);
      return;
    }

    // CASO 2b: solo hijo izquierdo
    if (nodo.getHijoDerecho() === null) {
      const hijo = nodo.getHijoIzquierdo();
      const padre = nodo.getPadre();
      if (padre === null) {
        this.raiz = hijo;
        hijo.setPadre(null);
      } else {
        if (padre.getHijoIzquierdo() === nodo) padre.setHijoIzquierdo(hijo);
        else padre.setHijoDerecho(hijo);
        hijo.setPadre(padre);
      }
      nodo.setPadre(null);
      nodo.setHijoIzquierdo(null);
      return;
    }

    // CASO 3: dos hijos → copiamos el predecesor al nodo y lo borramos
    const pred = this._getPredecesor(nodo);
    nodo.setClave(pred.getClave());
    nodo.setDato(pred.getDato());
    this._eliminar(pred);
  }

  _getPredecesor(nodo) {
    let actual = nodo.getHijoIzquierdo();
    while (actual.getHijoDerecho() !== null) {
      actual = actual.getHijoDerecho();
    }
    return actual;
  }

  // --------------------------------------------------
  // RECORRIDOS — devuelven arrays de nodos
  // --------------------------------------------------
  inorden() {
    const res = [];
    this._inorden(this.raiz, res);
    return res;
  }
  _inorden(n, res) {
    if (n === null) return;
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
    if (n === null) return;
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
    if (n === null) return;
    this._posorden(n.getHijoIzquierdo(), res);
    this._posorden(n.getHijoDerecho(), res);
    res.push(n);
  }

  // --------------------------------------------------
  // UTILIDADES
  // --------------------------------------------------
  estaVacio() { return this.raiz === null; }

  // Texto con forma de árbol, útil para depurar en la GUI
  dibujar() {
    const lineas = [];
    if (this.raiz === null) {
      lineas.push("(árbol vacío)");
      return lineas;
    }
    this._dibujar(this.raiz, "", "R", lineas);
    return lineas;
  }

  _dibujar(nodo, espacio, posicion, lineas) {
    if (nodo === null) return;
    this._dibujar(nodo.getHijoDerecho(), espacio + "     ", "D", lineas);
    lineas.push(espacio + posicion + "── " + formatearClave(nodo.getClave()));
    this._dibujar(nodo.getHijoIzquierdo(), espacio + "     ", "I", lineas);
  }
}