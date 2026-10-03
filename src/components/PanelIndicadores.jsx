// src/components/PanelIndicadores.jsx
export default function PanelIndicadores({ svc }) {
  const ind = svc.indicadores();
  const { arbol, contadores, metricas, porPrioridad, recorridos } = ind;

  return (
    <div style={{ border: "1px solid #ccc", padding: 10, background: "#fafafa", fontSize: 12 }}>
      <div style={{ fontWeight: "bold", marginBottom: 6 }}>Indicadores</div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
        <div>
          <b>Árbol</b>
          <div>Activos: {arbol.activos}</div>
          <div>Altura: {arbol.altura}</div>
          <div>Hojas: {arbol.hojas}</div>
          <div>Balanceado: {String(arbol.balanceado)}</div>
          <div>Históricos: {ind.historicos}</div>
          <div>Retirados: {ind.idsRetirados}</div>
        </div>
        <div>
          <b>Prioridades</b>
          <div>Alta (3): {porPrioridad[3] || 0}</div>
          <div>Media (2): {porPrioridad[2] || 0}</div>
          <div>Baja (1): {porPrioridad[1] || 0}</div>
          <div>Pendientes: {ind.pendientes}</div>
          <div>Revisados: {ind.revisados}</div>
          <div>Acceso costoso (L={ind.L}): {ind.prioridadAltaProfunda}</div>
        </div>
      </div>

      <div style={{ marginTop: 8 }}>
        <b>Rotaciones</b>
        <div>LL: {contadores.LL} · RR: {contadores.RR} · LR: {contadores.LR} · RL: {contadores.RL}</div>
        <div>Giros simples: {contadores.girosSimples} · Giros dobles: {contadores.girosDobles}</div>
      </div>

      <div style={{ marginTop: 8 }}>
        <b>Métricas</b>
        <div>Correcciones: {metricas.correccionesAceptadas}</div>
        <div>Conflictos: {metricas.conflictos}</div>
        <div>Descartados: {metricas.reportesDescartados}</div>
        <div>Archivos masivos: {metricas.archivosMasivos}</div>
        <div>Eventos archivados: {metricas.eventosArchivados}</div>
        <div>Recuperaciones: {metricas.recuperacionesGlobales}</div>
        <div>Cargas: {metricas.cargasRealizadas}</div>
      </div>

      <div style={{ marginTop: 8 }}>
        <b>Inorden</b>
        <div style={{ fontFamily: "monospace", wordBreak: "break-all" }}>
          {recorridos.inorden.map(x => x.id).join(", ")}
        </div>
        <b>Preorden</b>
        <div style={{ fontFamily: "monospace", wordBreak: "break-all" }}>
          {recorridos.preorden.join(", ")}
        </div>
        <b>Posorden</b>
        <div style={{ fontFamily: "monospace", wordBreak: "break-all" }}>
          {recorridos.posorden.join(", ")}
        </div>
        <b>Por niveles</b>
        <div style={{ fontFamily: "monospace", wordBreak: "break-all" }}>
          {recorridos.porNiveles.join(", ")}
        </div>
      </div>
    </div>
  );
}