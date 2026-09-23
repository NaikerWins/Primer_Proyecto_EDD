// src/structures/Pila.js

/**
 * Pila LIFO sobre array nativo.
 * Se usa para deshacer acciones (sección 13 del PDF).
 */
export class Pila {
  constructor() {
    this.elementos = [];
  }

  // Agrega al tope. O(1) amortizado.
  apilar(elemento) {
    this.elementos.push(elemento);
  }

  // Saca y devuelve el tope. O(1). Devuelve null si está vacía.
  desapilar() {
    if (this.estaVacia()) return null;
    return this.elementos.pop();
  }

  // Mira el tope sin sacarlo. O(1).
  verTope() {
    if (this.estaVacia()) return null;
    return this.elementos[this.elementos.length - 1];
  }

  estaVacia() {
    return this.elementos.length === 0;
  }

  tamano() {
    return this.elementos.length;
  }

  limpiar() {
    this.elementos = [];
  }
}