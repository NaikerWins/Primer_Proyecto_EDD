import { useRef, useState } from "react";

export default function PanelPersistencia({ svc, refrescar }) {
  const inputRef = useRef(null);
  const [mensaje, setMensaje] = useState("");
  const [problemas, setProblemas] = useState([]);

  const exportar = () => {
    const json = svc.exportarEstado();
    const blob = new Blob([JSON.stringify(json, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sismolab-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setMensaje("✅ Estado exportado");
    setProblemas([]);
  };

  const importar = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const json = JSON.parse(ev.target.result);
        const r = svc.cargarEstado(json);
        if (r.exito) {
          setMensaje("✅ " + r.mensaje + ` (${r.modoCarga})`);
          setProblemas([]);
        } else {
          setMensaje("❌ Carga rechazada");
          setProblemas(r.problemas || []);
        }
      } catch (err) {
        setMensaje("❌ JSON inválido: " + err.message);
        setProblemas([]);
      }
      refrescar();
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  return (
    <div style={{ border: "1px solid #ccc", padding: 10, background: "#fafafa", fontSize: 12 }}>
      <div style={{ fontWeight: "bold", marginBottom: 6 }}>Persistencia</div>
      <div style={{ display: "flex", gap: 6 }}>
        <button onClick={exportar}>Exportar JSON</button>
        <button onClick={() => inputRef.current?.click()}>Importar JSON</button>
        <input
          ref={inputRef}
          type="file"
          accept=".json"
          style={{ display: "none" }}
          onChange={importar}
        />
      </div>

      {mensaje && <div style={{ marginTop: 6, fontFamily: "monospace" }}>{mensaje}</div>}

      {problemas.length > 0 && (
        <div style={{ marginTop: 6, maxHeight: 100, overflowY: "auto", background: "#fee", padding: 6, fontFamily: "monospace", fontSize: 11 }}>
          {problemas.map((p, i) => <div key={i}>• {typeof p === "string" ? p : p.mensaje}</div>)}
        </div>
      )}
    </div>
  );
}