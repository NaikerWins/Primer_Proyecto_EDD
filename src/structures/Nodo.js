// src/structures/Nodo.js

export class Nodo {
  constructor(clave, dato = null) {
    this.clave = clave;
    this.dato = dato;
    this.hijoIzquierdo = null;
    this.hijoDerecho = null;
    this.padre = null;
  }

  getClave() { return this.clave; }
  setClave(clave) { this.clave = clave; }

  getDato() { return this.dato; }
  setDato(dato) { this.dato = dato; }

  getHijoIzquierdo() { return this.hijoIzquierdo; }
  setHijoIzquierdo(nodo) { this.hijoIzquierdo = nodo; }

  getHijoDerecho() { return this.hijoDerecho; }
  setHijoDerecho(nodo) { this.hijoDerecho = nodo; }

  getPadre() { return this.padre; }
  setPadre(nodo) { this.padre = nodo; }
}