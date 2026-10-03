// src/components/MapaGeografico.jsx
import { useState } from "react";

const TAMANO = 600;
const MARGEN = 20;
const ESCALA = (TAMANO - 2 * MARGEN) / 1000; // px por km

// Convierte coordenadas del escenario (km) a pixeles
function aPx(km) {
  return MARGEN + km * ESCALA;
}

export default function MapaGeografico({
  svc,
  resaltarIds = new Set(),
}) {
  const [hover, setHover] = useState(null);

  const zonas = svc.escenario.zonas;
  const activos = Array.from(svc.porId.values());
  const historicos = svc.escenario.historicos;

  return (
    <div style={{ border: "1px solid #ccc", padding: 10, background: "#fafafa" }}>
      <div style={{ fontWeight: "bold", marginBottom: 6 }}>
        Plano geográfico (0..1000 km)
      </div>

      <div style={{ position: "relative", display: "inline-block" }}>
        <svg
          width={TAMANO}
          height={TAMANO}
          style={{ background: "#f8faff", display: "block" }}
          onMouseLeave={() => setHover(null)}
        >
          {/* Grilla cada 100 km */}
          {Array.from({ length: 11 }).map((_, i) => {
            const p = aPx(i * 100);
            return (
              <g key={i}>
                <line x1={p} y1={MARGEN} x2={p} y2={TAMANO - MARGEN} stroke="#e0e0e0" strokeWidth="1" />
                <line x1={MARGEN} y1={p} x2={TAMANO - MARGEN} y2={p} stroke="#e0e0e0" strokeWidth="1" />
              </g>
            );
          })}

          {/* Zonas */}
          {zonas.map(z => {
            const x = aPx(z.x1);
            const y = aPx(z.y1);
            const w = aPx(z.x2) - aPx(z.x1);
            const h = aPx(z.y2) - aPx(z.y1);
            return (
              <g key={z.id}>
                <rect
                  x={x} y={y} width={w} height={h}
                  fill={z.poblada ? "rgba(70,130,200,0.15)" : "rgba(90,180,90,0.15)"}
                  stroke={z.poblada ? "rgba(70,130,200,0.5)" : "rgba(90,180,90,0.5)"}
                  strokeWidth="1.5"
                />
                <text x={x + 4} y={y + 14} fontSize="11" fill="#335">
                  {z.id} {z.poblada ? "(poblada)" : ""}
                </text>
              </g>
            );
          })}

          {/* Históricos primero (translúcidos) */}
          {historicos.map(ev => (
            <Epicentro
              key={"h" + ev.id}
              ev={ev}
              historico
              hover={hover?.id === ev.id}
              onHover={() => setHover(ev)}
            />
          ))}

          {/* Activos */}
          {activos.map(ev => (
            <Epicentro
              key={ev.id}
              ev={ev}
              resaltado={resaltarIds.has(ev.id)}
              hover={hover?.id === ev.id}
              onHover={() => setHover(ev)}
            />
          ))}
        </svg>

        {hover && (
          <div
            style={{
              position: "absolute",
              left: aPx(hover.epicentro.x) + 12,
              top: aPx(hover.epicentro.y) + 12,
              background: "rgba(0,0,0,0.85)",
              color: "#fff",
              fontSize: 11,
              fontFamily: "monospace",
              padding: "6px 8px",
              borderRadius: 4,
              pointerEvents: "none",
              zIndex: 10,
            }}
          >
            <div>SIS-{String(hover.id).padStart(6, "0")}</div>
            <div>M={hover.magnitud.toFixed(1)} H={hover.profundidad.toFixed(1)} km</div>
            <div>P={hover.prioridad} · rev={hover.revision}</div>
            <div>({hover.epicentro.x.toFixed(1)}, {hover.epicentro.y.toFixed(1)})</div>
          </div>
        )}
      </div>

      {/* Leyenda */}
      <div style={{ marginTop: 8, fontSize: 12, display: "flex", flexWrap: "wrap", gap: 14 }}>
        <span><span style={{ display:"inline-block", width:12, height:12, background:"rgba(70,130,200,0.5)", verticalAlign:"middle" }}></span> Zona poblada</span>
        <span><span style={{ display:"inline-block", width:12, height:12, background:"rgba(90,180,90,0.5)", verticalAlign:"middle" }}></span> Zona no poblada</span>
        <span><span style={{ display:"inline-block", width:12, height:12, background:"#ff8080", borderRadius:"50%", verticalAlign:"middle" }}></span> Prioridad 3</span>
        <span><span style={{ display:"inline-block", width:12, height:12, background:"#ffd166", borderRadius:"50%", verticalAlign:"middle" }}></span> Prioridad 2</span>
        <span><span style={{ display:"inline-block", width:12, height:12, background:"#8ecf8e", borderRadius:"50%", verticalAlign:"middle" }}></span> Prioridad 1</span>
        <span style={{ color: "#888" }}>◯ históricos translúcidos</span>
      </div>
    </div>
  );
}

function Epicentro({ ev, historico = false, resaltado = false, hover = false, onHover }) {
  const cx = aPx(ev.epicentro.x);
  const cy = aPx(ev.epicentro.y);
  const r = ev.prioridad === 3 ? 7 : ev.prioridad === 2 ? 6 : 5;
  const fill = colorPorPrioridad(ev.prioridad);

  return (
    <circle
      cx={cx} cy={cy} r={hover ? r + 2 : r}
      fill={fill}
      fillOpacity={historico ? 0.4 : 0.9}
      stroke={resaltado ? "#06f" : hover ? "#000" : "#333"}
      strokeWidth={resaltado ? 3 : 1}
      style={{ cursor: "pointer" }}
      onMouseEnter={onHover}
    />
  );
}

function colorPorPrioridad(p) {
  if (p === 3) return "#ff8080";
  if (p === 2) return "#ffd166";
  return "#8ecf8e";
}