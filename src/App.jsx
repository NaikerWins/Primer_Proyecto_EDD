// src/App.jsx
import { useMemo, useState } from "react";

// Dominio
import { crearEscenario } from "./domain/Escenario.js";
import { crearZona } from "./domain/Zona.js";
import { crearEstacion } from "./domain/Estacion.js";
import { EventoService } from "./services/EventoService.js";
import { ArbolBST } from "./structures/ArbolBST.js";

// Componentes
import TreeView from "./components/TreeView.jsx";
import MapaGeografico from "./components/MapaGeografico.jsx";
import FormularioEvento from "./components/FormularioEvento.jsx";
import PanelOperaciones from "./components/PanelOperaciones.jsx";
import PanelIndicadores from "./components/PanelIndicadores.jsx";
import PanelCola from "./components/PanelCola.jsx";
import PanelHistorico from "./components/PanelHistorico.jsx";
import PanelVersiones from "./components/PanelVersiones.jsx";
import PanelPersistencia from "./components/PanelPersistencia.jsx";
import PanelAuditoria from "./components/PanelAuditoria.jsx";
import PanelCasos from "./components/PanelCasos.jsx";

// Exponer para consola (útil para sustentación)
import * as Clave from "./domain/Clave.js";
import * as Evento from "./domain/Evento.js";
import * as Zona from "./domain/Zona.js";
import * as Asociaciones from "./domain/Asociaciones.js";
import * as Persistencia from "./persistence/Persistencia.js";
import * as Versiones from "./persistence/Versiones.js";
import * as Consultas from "./services/Consultas.js";
import * as Auditoria from "./services/Auditoria.js";
import * as Casos from "./tests/CasosPrueba.js";

window.SismoLab = {
  Clave, Evento, Zona, Asociaciones, Persistencia, Versiones, Consultas, Auditoria, Casos,
  EventoService, ArbolBST,
  crearEscenario, crearZona, crearEstacion,
};

// --------------------------------------------------
// Escenario demo con zonas y estaciones
// --------------------------------------------------
function crearEscenarioDemo() {
  const esc = crearEscenario();
  esc.zonas.push(crearZona("Z1", 0, 0, 500, 500, true));
  esc.zonas.push(crearZona("Z2", 500, 0, 1000, 500, false));
  esc.zonas.push(crearZona("Z3", 0, 500, 500, 1000, true));
  esc.estaciones.push(crearEstacion("E1", "Estación Norte"));
  esc.estaciones.push(crearEstacion("E2", "Estación Sur"));
  esc.reloj = new Date("2026-12-31T23:59:59Z");
  return esc;
}

export default function App() {
  // El servicio se crea UNA sola vez y se guarda en un ref (useMemo).
  // No usamos useState porque es un objeto mutable que manejamos imperativamente.
  const svc = useMemo(() => {
    const s = new EventoService(crearEscenarioDemo());

    // Eventos demo para que la vista no arranque vacía
    const demo = [
      { id: 10, magnitud: 6.5, profundidad: 10, epicentro: { x: 100, y: 100 }, fechaHora: "2026-01-01T10:00:00Z" },
      { id: 20, magnitud: 5.0, profundidad: 20, epicentro: { x: 150, y: 120 }, fechaHora: "2026-01-01T11:00:00Z" },
      { id: 30, magnitud: 4.5, profundidad: 25, epicentro: { x: 200, y: 100 }, fechaHora: "2026-01-01T12:00:00Z" },
      { id: 40, magnitud: 3.0, profundidad: 50, epicentro: { x: 300, y: 300 }, fechaHora: "2026-01-01T13:00:00Z" },
      { id: 50, magnitud: 7.2, profundidad: 15, epicentro: { x: 250, y: 250 }, fechaHora: "2026-01-01T14:00:00Z" },
    ];
    for (const d of demo) {
      s.crearEvento({
        id: d.id,
        magnitud: d.magnitud,
        profundidad: d.profundidad,
        epicentro: d.epicentro,
        fechaHora: new Date(d.fechaHora),
      }, "E1");
    }
    return s;
  }, []);

  // Tick para forzar re-render cuando el servicio (mutable) cambia
  const [tick, setTick] = useState(0);
  const refrescar = () => setTick(t => t + 1);
  // eslint-disable-next-line no-unused-vars
  const _t = tick;

  // BST comparativo: se reconstruye en cada render desde el AVL
  const bst = useMemo(() => {
    const arbol = new ArbolBST();
    for (const nodo of svc.avl.inorden()) {
      arbol.insertar(nodo.getClave(), nodo.getDato());
    }
    return arbol;
  }, [svc, tick]);

  // Indicadores para la barra superior
  const ind = svc.indicadores();

  // Handlers que llaman al servicio y refrescan la UI
  const manejarCrear = (datos, estacion) => {
    const r = svc.crearEvento(datos, estacion);
    refrescar();
    return r;
  };

  const manejarCorregir = (id, datos) => {
    const r = svc.corregirEvento(id, datos);
    refrescar();
    return r;
  };

  return (
    <div style={{
      padding: 16,
      fontFamily: "system-ui, sans-serif",
      maxWidth: 1800,
      margin: "0 auto",
    }}>
      <h1 style={{ marginTop: 0, marginBottom: 6 }}>SismoLab AVL</h1>

      {/* Barra de resumen */}
      <div style={{
        marginBottom: 12,
        fontSize: 13,
        color: "#333",
        padding: 8,
        background: "#eef",
        borderRadius: 4,
        fontFamily: "monospace",
      }}>
        Modo: <b>{svc.escenario.modo}</b>
        {" · "}Activos: <b>{ind.arbol.activos}</b>
        {" · "}Altura: <b>{ind.arbol.altura}</b>
        {" · "}Hojas: <b>{ind.arbol.hojas}</b>
        {" · "}Balanceado: <b>{String(ind.arbol.balanceado)}</b>
        {" · "}Pendientes: <b>{ind.pendientes}</b>
        {" · "}Históricos: <b>{ind.historicos}</b>
        {" · "}Retirados: <b>{ind.idsRetirados}</b>
        {" · "}Cola: <b>{svc.colaReportes.tamano()}</b>
        {" · "}L: <b>{ind.L}</b>
        {" · "}Reloj: <b>{svc.escenario.reloj.toISOString()}</b>
      </div>

      {/* Layout principal: 3 columnas */}
      <div style={{ display: "grid", gridTemplateColumns: "340px 360px 1fr", gap: 12 }}>

        {/* COLUMNA 1: formulario + operaciones + persistencia + auditoría + casos */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <FormularioEvento onCrear={manejarCrear} onCorregir={manejarCorregir} />
          <PanelOperaciones svc={svc} refrescar={refrescar} />
          <PanelPersistencia svc={svc} refrescar={refrescar} />
          <PanelAuditoria svc={svc} refrescar={refrescar} />
          <PanelCasos />
        </div>

        {/* COLUMNA 2: cola + versiones + histórico + indicadores */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <PanelCola svc={svc} refrescar={refrescar} />
          <PanelVersiones svc={svc} refrescar={refrescar} />
          <PanelHistorico svc={svc} />
          <PanelIndicadores svc={svc} />
        </div>

        {/* COLUMNA 3: árboles + mapa */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <TreeView arbol={svc.avl} titulo="AVL (activos)" modo={svc.escenario.modo} />
          <TreeView arbol={bst} titulo="BST (comparación)" modo="normal" />
          <MapaGeografico svc={svc} />
        </div>
      </div>

      <div style={{ marginTop: 16, fontSize: 11, color: "#888", fontFamily: "monospace" }}>
        Tip: inspecciona el servicio desde la consola con <code>window.SismoLab</code>.
        Prueba rápida: <code>SismoLab.Casos.correrTodos()</code>
      </div>
    </div>
  );
}