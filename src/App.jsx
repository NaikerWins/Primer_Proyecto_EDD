// src/App.jsx
import { crearClave, compararClaves, formatearClave } from "./domain/Clave.js";
import { calcularPrioridad, crearEvento, claveDeEvento } from "./domain/Evento.js";
import { crearZona, contiene, enZonaPoblada } from "./domain/Zona.js";
import { crearEstacion } from "./domain/Estacion.js";
import { crearEscenario } from "./domain/Escenario.js";
import { ArbolBST } from "./structures/ArbolBST.js";
import { ArbolAVL } from "./structures/ArbolAVL.js";
import { Pila } from "./structures/Pila.js";
import { Cola } from "./structures/Cola.js";
import { EventoService } from "./services/EventoService.js";
import { crearReporte } from "./domain/Reporte.js";
import * as Asociaciones from "./domain/Asociaciones.js";
import { serializarEscenario, cargarDesdeJSON } from "./persistence/Persistencia.js";
import * as Consultas from "./services/Consultas.js";




window.SismoLab = {
  crearClave, compararClaves, formatearClave, crearReporte,
  calcularPrioridad, crearEvento, claveDeEvento, Asociaciones,
  crearZona, contiene, enZonaPoblada, Consultas,
  crearEstacion, crearEscenario, 
  Persistencia: { serializarEscenario, cargarDesdeJSON },

  ArbolBST, ArbolAVL,
  Pila, Cola,
  EventoService,
};

export default function App() {
  return (
    <div style={{ padding: 20, fontFamily: "monospace" }}>
      <h1>SismoLab AVL</h1>
      <p>Abre la consola y usa <code>window.SismoLab</code>.</p>
    </div>
  );
}