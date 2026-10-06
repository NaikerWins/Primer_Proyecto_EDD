import { useState } from "react";

export default function PanelAuditoria({ svc, refrescar }) {
  const [reporte, setReporte] = useState(null);
  const [mensaje, setMensaje] = useState("");

  const verificar = () => {
    const r = svc.verificarEstructura();
    setReporte(r);
    setMensaje("");
  };

  const recuperar = () => {
    const r = svc.recuperarEquilibrio();
    setMensaje((r.exito ? "✅ " : "❌ ") + r.mensaje);
    setReporte(null);
    refrescar();
  };

  return (
    <div style={{ border: "1px solid #ccc", padding: 10, background: "#fafafa", fontSize: 12 }}>
      <div style={{ fontWeight: "bold", marginBottom: 6 }}>Auditoría</div>

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        <button onClick={verificar}>Verificar estructura</button>
        {svc.escenario.modo === "estres" && (
          <button onClick={recuperar}>Recuperar equilibrio</button>
        )}
      </div>

      {mensaje && <div style={{ marginTop: 6, fontFamily: "monospace" }}>{mensaje}</div>}

      {reporte && (
        <div style={{ marginTop: 6, fontFamily: "monospace", fontSize: 11 }}>
          <div>Modo: <b>{reporte.modo}</b></div>
          <div>Consistente: <b>{String(reporte.consistente)}</b></div>
          <div>Problemas: orden={reporte.conteos.orden} refs={reporte.conteos.referencias} alturas={reporte.conteos.alturas} factores={reporte.conteos.factores}</div>

          {reporte.desbalancesEsperados.length > 0 && (
            <div style={{ marginTop: 4, color: "#b60" }}>
              Desbalances esperados (modo estrés): {reporte.desbalancesEsperados.length}
              {reporte.desbalancesEsperados.slice(0, 5).map((d, i) => (
                <div key={i}>  id={d.id} fb={d.factorBalance}</div>
              ))}
            </div>
          )}

          {reporte.problemas.length > 0 && (
            <div style={{ marginTop: 4, maxHeight: 100, overflowY: "auto", background: "#fee", padding: 6 }}>
              {reporte.problemas.map((p, i) => (
                <div key={i}>• [{p.tipo}] {p.id}: {p.mensaje}</div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}