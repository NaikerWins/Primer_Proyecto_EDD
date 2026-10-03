// src/components/TreeView.jsx
import { calcularLayout, etiquetaClave } from "./TreeLayout.js";

/**
 * TreeView: dibuja un árbol (AVL o BST) en un SVG.
 *
 * Props:
 *   - arbol: instancia de ArbolAVL o ArbolBST
 *   - titulo: string, mostrado arriba
 *   - modo: "normal" | "estres" | null (solo afecta colores)
 *   - resaltarIds: Set de ids a resaltar (por ejemplo, resultado de una consulta)
 *   - etiquetasExtra: Map<id, string> con info adicional bajo el nodo
 */
export default function TreeView({
  arbol,
  titulo = "Árbol",
  modo = "normal",
  resaltarIds = new Set(),
  etiquetasExtra = new Map(),
}) {
  const layout = calcularLayout(arbol);

  return (
    <div style={{ border: "1px solid #ccc", padding: 10, background: "#fff" }}>
      <div style={{ fontWeight: "bold", marginBottom: 6 }}>{titulo}</div>
      <div style={{ overflowX: "auto", overflowY: "auto", maxHeight: 520 }}>
        <svg
          width={Math.max(layout.ancho, 300)}
          height={Math.max(layout.alto, 200)}
          style={{ display: "block" }}
        >
          {/* Aristas */}
          {layout.aristas.map((a, i) => (
            <line
              key={i}
              x1={a.desde.x}
              y1={a.desde.y}
              x2={a.hacia.x}
              y2={a.hacia.y}
              stroke="#888"
              strokeWidth="1.5"
            />
          ))}

          {/* Nodos */}
          {layout.nodos.map(n => {
            const destacado = resaltarIds.has(n.id);
            const desbalanceado = modo === "estres" && Math.abs(n.fb) > 1;
            const colorRelleno = colorPorPrioridad(n.clave.prioridad);

            return (
              <g key={n.id}>
                <circle
                  cx={n.x}
                  cy={n.y}
                  r={layout.radio}
                  fill={colorRelleno}
                  stroke={
                    desbalanceado ? "#d00"
                    : destacado ? "#06f"
                    : n.esRaiz ? "#333"
                    : "#666"
                  }
                  strokeWidth={desbalanceado || destacado ? 3 : 1.5}
                />
                {/* Etiqueta de la clave */}
                <text
                  x={n.x}
                  y={n.y + 4}
                  textAnchor="middle"
                  fontSize="9"
                  fill="#000"
                  fontFamily="monospace"
                >
                  {etiquetaClave(n.clave)}
                </text>
                {/* Altura y factor de balance */}
                <text
                  x={n.x}
                  y={n.y + layout.radio + 12}
                  textAnchor="middle"
                  fontSize="9"
                  fill="#555"
                  fontFamily="monospace"
                >
                  h={n.altura} fb={n.fb}
                </text>
                {/* Etiqueta extra (opcional) */}
                {etiquetasExtra.has(n.id) && (
                  <text
                    x={n.x}
                    y={n.y - layout.radio - 6}
                    textAnchor="middle"
                    fontSize="9"
                    fill="#06f"
                    fontFamily="monospace"
                  >
                    {etiquetasExtra.get(n.id)}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

function colorPorPrioridad(p) {
  if (p === 3) return "#ffd1d1"; // rojo suave
  if (p === 2) return "#ffe8b0"; // amarillo suave
  return "#cfe8cf";              // verde suave
}