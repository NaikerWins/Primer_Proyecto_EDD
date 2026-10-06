import { useState } from "react";
import {
  caso1_LimitesYEmpates,
  caso2_CorreccionYReporteAntiguo,
  caso3_ReporteTardio,
  caso4_RotacionesYRecuperacion,
  caso5_ArchivoMasivo,
  caso6_PersistenciaYConsistencia,
  correrTodos,
} from "../tests/CasosPrueba.js";

export default function PanelCasos() {
  const [reportes, setReportes] = useState([]);

  const correr = (fn) => setReportes([fn()]);
  const correrTodo = () => setReportes(correrTodos());

  const casos = [
    ["Caso 1 — Límites y empates", caso1_LimitesYEmpates],
    ["Caso 2 — Corrección y reporte antiguo", caso2_CorreccionYReporteAntiguo],
    ["Caso 3 — Reporte tardío", caso3_ReporteTardio],
    ["Caso 4 — Rotaciones y recuperación", caso4_RotacionesYRecuperacion],
    ["Caso 5 — Archivo masivo", caso5_ArchivoMasivo],
    ["Caso 6 — Persistencia y consistencia", caso6_PersistenciaYConsistencia],
  ];

  return (
    <div style={{ border: "1px solid #ccc", padding: 10, background: "#fafafa", fontSize: 12 }}>
      <div style={{ fontWeight: "bold", marginBottom: 6 }}>Casos de prueba (sección 16)</div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
        {casos.map(([etiq, fn], i) => (
          <button key={i} onClick={() => correr(fn)}>{etiq}</button>
        ))}
        <button style={{ background: "#d0f0d0" }} onClick={correrTodo}>Correr todos</button>
      </div>

      <div style={{ maxHeight: 340, overflowY: "auto" }}>
        {reportes.map((r, i) => (
          <div key={i} style={{ marginBottom: 10, padding: 6, background: "#fff", border: "1px solid #ddd" }}>
            <div style={{ fontWeight: "bold", color: r.exito ? "#080" : "#a00" }}>
              {r.exito ? "✅" : "❌"} {r.titulo}
            </div>
            {r.pasos.map((p, j) => (
              <div key={j} style={{ fontFamily: "monospace", fontSize: 11, marginLeft: 8, color: p.ok ? "#060" : "#a00" }}>
                {p.ok ? "✓" : "✗"} {p.descripcion} {p.detalle && <span style={{ color: "#666" }}>— {p.detalle}</span>}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}