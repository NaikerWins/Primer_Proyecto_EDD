// src/components/PanelHistorico.jsx
export default function PanelHistorico({ svc }) {
  const historicos = svc.escenario.historicos;
  const retirados = Array.from(svc.idsRetirados);

  return (
    <div style={{ border: "1px solid #ccc", padding: 10, background: "#fafafa", fontSize: 12 }}>
      <div style={{ fontWeight: "bold", marginBottom: 6 }}>
        Histórico ({historicos.length})
      </div>

      <div style={{ maxHeight: 120, overflowY: "auto", background: "#fff", padding: 6 }}>
        {historicos.length === 0 && <div style={{ color: "#999" }}>Sin eventos archivados.</div>}
        {historicos.map(ev => (
          <div key={ev.id} style={{ fontFamily: "monospace", fontSize: 11 }}>
            SIS-{String(ev.id).padStart(6, "0")} · M={ev.magnitud.toFixed(1)} · P={ev.prioridad} · rev={ev.revision}
          </div>
        ))}
      </div>

      <div style={{ marginTop: 8, fontWeight: "bold" }}>
        Retirados ({retirados.length})
      </div>
      <div style={{ maxHeight: 60, overflowY: "auto", background: "#fff", padding: 6, fontFamily: "monospace", fontSize: 11 }}>
        {retirados.length === 0 && <span style={{ color: "#999" }}>Sin ids retirados.</span>}
        {retirados.join(", ")}
      </div>
    </div>
  );
}