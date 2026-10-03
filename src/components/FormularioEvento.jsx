// src/components/FormularioEvento.jsx
import { useState } from "react";

const VACIO = {
  id: "",
  magnitud: "6.0",
  profundidad: "10.0",
  x: "100.0",
  y: "100.0",
  fecha: "2026-01-01T10:00",
  estacion: "E1",
};

export default function FormularioEvento({ onCrear, onCorregir }) {
  const [form, setForm] = useState(VACIO);
  const [mensaje, setMensaje] = useState("");

  const set = (campo) => (e) => setForm({ ...form, [campo]: e.target.value });

  const construirDatos = () => ({
    id: Number(form.id),
    magnitud: Number(form.magnitud),
    profundidad: Number(form.profundidad),
    epicentro: { x: Number(form.x), y: Number(form.y) },
    fechaHora: new Date(form.fecha + ":00Z"),
  });

  const crear = () => {
    const r = onCrear(construirDatos(), form.estacion);
    setMensaje((r.exito ? "✅ " : "❌ ") + (r.mensaje || ""));
  };

  const corregir = () => {
    const datos = construirDatos();
    // En corrección solo pasamos los datos físicos; el id es inmutable
    const r = onCorregir(datos.id, {
      magnitud: datos.magnitud,
      profundidad: datos.profundidad,
      epicentro: datos.epicentro,
      fechaHora: datos.fechaHora,
    });
    setMensaje((r.exito ? "✅ " : "❌ ") + (r.mensaje || ""));
  };

  const campo = (etiqueta, key, tipo = "text") => (
    <label style={{ display: "block", marginBottom: 6, fontSize: 13 }}>
      {etiqueta}
      <input
        type={tipo}
        value={form[key]}
        onChange={set(key)}
        style={{ width: "100%", padding: 4, fontFamily: "monospace" }}
      />
    </label>
  );

  return (
    <div style={{ border: "1px solid #ccc", padding: 10, background: "#fafafa" }}>
      <div style={{ fontWeight: "bold", marginBottom: 8 }}>Evento</div>
      {campo("ID (1..999999)", "id")}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
        {campo("Magnitud", "magnitud")}
        {campo("Profundidad (km)", "profundidad")}
        {campo("Epicentro x", "x")}
        {campo("Epicentro y", "y")}
      </div>
      {campo("Fecha y hora (UTC)", "fecha", "datetime-local")}
      {campo("Estación", "estacion")}

      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <button onClick={crear}>Crear</button>
        <button onClick={corregir}>Corregir</button>
      </div>

      {mensaje && (
        <div style={{ marginTop: 8, fontSize: 12, fontFamily: "monospace" }}>
          {mensaje}
        </div>
      )}
    </div>
  );
}