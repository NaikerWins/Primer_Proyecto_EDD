import { useState } from "react";
import { leerVersion } from "../persistence/Versiones.js";

export default function PanelVersiones({ svc, refrescar }) {
  const [nombre, setNombre] = useState("");
  const [mensaje, setMensaje] = useState("");
  const versiones = svc.listarVersionesGuardadas();

  const aviso = (r) => {
    setMensaje((r.exito ? "✅ " : "❌ ") + (r.mensaje || ""));
    refrescar();
  };

  return (
    <div style={{ border: "1px solid #ccc", padding: 10, background: "#fafafa", fontSize: 12 }}>
      <div style={{ fontWeight: "bold", marginBottom: 6 }}>Versiones con nombre</div>

      <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
        <input
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="nombre de la versión"
          style={{ flex: 1, fontFamily: "monospace" }}
        />
        <button onClick={() => aviso(svc.guardarVersionConNombre(nombre))}>Guardar</button>
      </div>

      {versiones.length === 0 && (
        <div style={{ color: "#999", fontSize: 11 }}>No hay versiones guardadas.</div>
      )}

      <div style={{ maxHeight: 140, overflowY: "auto", background: "#fff", padding: 6 }}>
        {versiones.map(v => {
          const json = leerVersion(v);
          const info = json
            ? `(activos: ${(json.eventos || []).length}, hist: ${(json.historicos || []).length})`
            : "";
          return (
            <div key={v} style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 4 }}>
              <span style={{ flex: 1, fontFamily: "monospace" }}>{v} {info}</span>
              <button onClick={() => aviso(svc.restaurarVersion(v))}>Restaurar</button>
              <button onClick={() => aviso(svc.eliminarVersionGuardada(v))}>✕</button>
            </div>
          );
        })}
      </div>

      {mensaje && <div style={{ marginTop: 6, fontFamily: "monospace" }}>{mensaje}</div>}
    </div>
  );
}