// src/components/TreeView.jsx
import { calcularLayout, etiquetaClave } from "./TreeLayout.js";

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
            // Solo marcamos como desbalanceado si el nodo tiene factor de balance
            // (es decir, si es AVL). En BST no aplica.
            const desbalanceado = modo === "estres" && n.fb !== null && Math.abs(n.fb) > 1;
            const colorRelleno = colorPorPrioridad(n.clave.prioridad);

            // Texto de altura/fb: si es BST mostramos solo "BST"
            const textoAltura = n.altura !== null
              ? `h=${n.altura} fb=${n.fb}`
              : "(BST)";

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
                <text
                  x={n.x}
                  y={n.y + layout.radio + 12}
                  textAnchor="middle"
                  fontSize="9"
                  fill="#555"
                  fontFamily="monospace"
                >
                  {textoAltura}
                </text>
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
  if (p === 3) return "#ffd1d1";
  if (p === 2) return "#ffe8b0";
  return "#cfe8cf";
}