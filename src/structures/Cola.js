// src/structures/Cola.js

// Nodo interno para la lista enlazada. No lo exponemos.
class NodoCola {
  constructor(valor) {
    this.valor = valor;
    this.siguiente = null;
  }
}

/**
 * Cola FIFO sobre lista enlazada simple.
 * Se usa para los reportes pendientes (sección 8 del PDF).
 *
 * ¿Por qué lista enlazada y no array?
 *  - Array: push O(1), pero shift O(n) por reindexado.
 *  - Lista enlazada: encolar O(1), desencolar O(1).
 * Como procesamos ráfagas largas, la lista es la opción correcta.
 */
export class Cola {
  constructor() {
    this.frente = null;
    this.final = null;
    this._tamano = 0;
  }

  // Agrega al final. O(1).
  encolar(valor) {
    const nodo = new NodoCola(valor);
    if (this.final === null) {
      this.frente = nodo;
      this.final = nodo;
    } else {
      this.final.siguiente = nodo;
      this.final = nodo;
    }
    this._tamano++;
  }

  // Saca y devuelve el frente. O(1). Devuelve null si está vacía.
  desencolar() {
    if (this.frente === null) return null;
    const valor = this.frente.valor;
    this.frente = this.frente.siguiente;
    if (this.frente === null) this.final = null;
    this._tamano--;
    return valor;
  }

  // Inserta al frente. O(1). LO USAREMOS AL DESHACER UN PASO DE COLA:
  // si un paso desencoló un reporte, al deshacerlo lo devolvemos a su lugar.
  insertarAlFrente(valor) {
    const nodo = new NodoCola(valor);
    nodo.siguiente = this.frente;
    this.frente = nodo;
    if (this.final === null) this.final = nodo;
    this._tamano++;
  }

  // Mira el frente sin sacarlo. O(1).
  verFrente() {
    return this.frente ? this.frente.valor : null;
  }

  estaVacia() {
    return this._tamano === 0;
  }

  tamano() {
    return this._tamano;
  }

  limpiar() {
    this.frente = null;
    this.final = null;
    this._tamano = 0;
  }

  // Convierte a array para mostrar la cola en la GUI. O(n).
  aArray() {
    const res = [];
    let actual = this.frente;
    while (actual !== null) {
      res.push(actual.valor);
      actual = actual.siguiente;
    }
    return res;
  }
}