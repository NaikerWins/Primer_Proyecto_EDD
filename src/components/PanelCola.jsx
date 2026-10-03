// src/components/PanelCola.jsx
import { useState } from "react";
import { crearReporte } from "../domain/Reporte.js";

const VACIO = {
  id: "100",
  magnitud: "5.5",
  profundidad: "10.0",
  x: "100.0",
  y: "100.0",
  fecha: "2026-01-01T10:00",
  revision: "1",
  estacion: "E1",
};

export default function PanelCola({ svc, refrescar }) {
  const [form, setForm] = useState(VACIO);
  const [mensaje, setMensaje] = useState("");
  const [logs, setLogs] = useState([]);

  const set = (c) => (e) => setForm({ ...form, [c]: e.target.value });

  const encolar = () => {
    const r = svc.encolarReporte(crearReporte({
      id: Number(form.id),
      magnitud: Number(form.magnitud),
      profundidad: Number(form.profundidad),
      epicentro: { x: Number(form.x), y: Number(form.y) },
      fechaHora: new Date(form.fecha + ":00Z"),
      revision: Number(form.revision),
      estacion: form.estacion,
    }));
    setMensaje((r.exito ? "✅ " : "❌ ") + r.mensaje);
    refrescar();
  };

  const procesar = () => {
    const r = svc.procesarSiguienteReporte();
    setLogs(prev => [{ t: new Date().toLocaleTimeString(), ...r }, ...prev].slice(0, 20));
    refrescar();
  };

  const procesarTodo = () => {
    let seguir = true;
    const nuevos = [];
    while (seguir) {
      const r = svc.procesarSiguienteReporte();
      if (!r.exito) seguir = false;
      else nuevos.push({ t: new Date().toLocaleTimeString(), ...r });
    }
    setLogs(prev => [...nuevos.reverse(), ...prev].slice(0, 20));
    refrescar();
  };

  const campo = (etiq, key, tipo = "text") => (
    <label style={{ display: "block", marginBottom: 4, fontSize: 12 }}>
      {etiq}
      <input
        type={tipo}
        value={form[key]}
        onChange={set(key)}
        style={{ width: "100%", padding: 3, fontFamily: "monospace" }}
      />
    </label>
  );

  const pendientes = svc.colaReportes.tamano();

  return (
    <div style={{ border: "1px solid #ccc", padding: 10, background: "#fafafa", fontSize: 12 }}>
      <div style={{ fontWeight: "bold", marginBottom: 6 }}>
        Cola de reportes ({pendientes} pendientes)
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
        {campo("ID", "id")}
        {campo("Revisión", "revision")}
        {campo("Magnitud", "magnitud")}
        {campo("Profundidad", "profundidad")}
        {campo("X", "x")}
        {campo("Y", "y")}
        {campo("Fecha", "fecha", "datetime-local")}
        {campo("Estación", "estacion")}
      </div>

      <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
        <button onClick={encolar}>Encolar</button>
        <button onClick={procesar}>Procesar 1</button>
        <button onClick={procesarTodo}>Procesar todo</button>
      </div>

      {mensaje && <div style={{ marginTop: 6, fontFamily: "monospace" }}>{mensaje}</div>}

      <div style={{ marginTop: 8, maxHeight: 160, overflowY: "auto", background: "#fff", padding: 6 }}>
        {logs.length === 0 && <div style={{ color: "#999" }}>Sin procesamiento aún.</div>}
        {logs.map((l, i) => (
          <div key={i} style={{ fontFamily: "monospace", fontSize: 11 }}>
            [{l.t}] {l.tipo || "?"} — {l.mensaje || ""}
          </div>
        ))}
      </div>
    </div>
  );
}