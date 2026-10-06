import { useState } from "react";

export default function PanelOperaciones({ svc, refrescar }) {
  const [idOperar, setIdOperar] = useState("");
  const [nuevoL, setNuevoL] = useState("");
  const [horas, setHoras] = useState("24");
  const [mensaje, setMensaje] = useState("");

  const aviso = (r) => setMensaje((r.exito ? "✅ " : "❌ ") + (r.mensaje || ""));

  return (
    <div style={{ border: "1px solid #ccc", padding: 10, background: "#fafafa" }}>
      <div style={{ fontWeight: "bold", marginBottom: 8 }}>Operaciones por ID</div>

      <label style={{ fontSize: 13 }}>
        ID:
        <input
          value={idOperar}
          onChange={(e) => setIdOperar(e.target.value)}
          style={{ width: 90, marginLeft: 6, fontFamily: "monospace" }}
        />
      </label>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
        <button onClick={() => aviso(svc.marcarRevisado(Number(idOperar)))}>Marcar revisado</button>
        <button onClick={() => aviso(svc.eliminarEvento(Number(idOperar)))}>Eliminar</button>
        <button onClick={() => aviso(svc.deshacer())}>Deshacer</button>
      </div>

      <hr style={{ margin: "12px 0" }} />
      <div style={{ fontWeight: "bold", marginBottom: 6 }}>Modo estrés</div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        <button onClick={() => aviso(svc.activarModoEstres())}>Activar estrés</button>
        <button onClick={() => aviso(svc.desactivarModoEstres())}>Modo normal</button>
        <button onClick={() => aviso(svc.recuperarEquilibrio())}>Recuperar equilibrio</button>
      </div>

      <hr style={{ margin: "12px 0" }} />
      <div style={{ fontWeight: "bold", marginBottom: 6 }}>Parámetros</div>

      <label style={{ fontSize: 13, display: "block", marginBottom: 4 }}>
        Límite L (actual {svc.escenario.parametros.L}):
        <input
          value={nuevoL}
          onChange={(e) => setNuevoL(e.target.value)}
          style={{ width: 60, marginLeft: 6, fontFamily: "monospace" }}
        />
        <button style={{ marginLeft: 6 }} onClick={() => aviso(svc.cambiarLimiteL(Number(nuevoL)))}>
          Aplicar L
        </button>
      </label>

      <label style={{ fontSize: 13, display: "block" }}>
        Avanzar reloj (h):
        <input
          value={horas}
          onChange={(e) => setHoras(e.target.value)}
          style={{ width: 60, marginLeft: 6, fontFamily: "monospace" }}
        />
        <button style={{ marginLeft: 6 }} onClick={() => aviso(svc.avanzarReloj(Number(horas)))}>
          Avanzar
        </button>
      </label>

      {mensaje && (
        <div style={{ marginTop: 8, fontSize: 12, fontFamily: "monospace" }}>
          {mensaje}
        </div>
      )}

      <div style={{ marginTop: 8, fontSize: 11, color: "#666" }}>
        Tope undo: {svc.verTopeUndo() || "(nada)"}
      </div>
    </div>
  );
}