// src/persistence/Versiones.js

const CLAVE_LS = "sismolab.versiones";

function leerTodas() {
  const raw = localStorage.getItem(CLAVE_LS);
  if (!raw) return {};
  try { return JSON.parse(raw); }
  catch { return {}; }
}

function escribirTodas(obj) {
  localStorage.setItem(CLAVE_LS, JSON.stringify(obj));
}

// Lista de nombres guardados
export function listarVersiones() {
  return Object.keys(leerTodas());
}

// Guarda (o sobrescribe) una versión con nombre.
export function guardarVersion(nombre, jsonEstado) {
  const todas = leerTodas();
  todas[nombre] = {
    guardadaEn: new Date().toISOString(),
    estado: jsonEstado,
  };
  escribirTodas(todas);
}

// Lee una versión por nombre (o null si no existe)
export function leerVersion(nombre) {
  const todas = leerTodas();
  return todas[nombre] ? todas[nombre].estado : null;
}

// Elimina una versión
export function eliminarVersion(nombre) {
  const todas = leerTodas();
  delete todas[nombre];
  escribirTodas(todas);
}