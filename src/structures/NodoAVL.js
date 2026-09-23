// src/structures/NodoAVL.js
import { Nodo } from "./Nodo.js";

export class NodoAVL extends Nodo {
  constructor(clave, dato = null) {
    super(clave, dato);
    this.altura = 0; // una hoja tiene altura 0
  }

  getAltura() { return this.altura; }
  setAltura(h) { this.altura = h; }

  // Factor de balance: alturaIzq - alturaDer.
  // Usamos -1 para "sin hijo" para que las cuentas cuadren
  // con la convención del PDF (altura de vacío = -1).
  getFactorBalance() {
    const hIzq = this.hijoIzquierdo ? this.hijoIzquierdo.altura : -1;
    const hDer = this.hijoDerecho ? this.hijoDerecho.altura : -1;
    return hIzq - hDer;
  }

  // Recalcula la propia altura a partir de los hijos.
  // Se llama después de cada rotación o inserción en este subárbol.
  actualizarAltura() {
    const hIzq = this.hijoIzquierdo ? this.hijoIzquierdo.altura : -1;
    const hDer = this.hijoDerecho ? this.hijoDerecho.altura : -1;
    this.altura = 1 + Math.max(hIzq, hDer);
  }
}