
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

export function listarVersiones() {
  return Object.keys(leerTodas());
}

export function guardarVersion(nombre, jsonEstado) {
  const todas = leerTodas();
  todas[nombre] = {
    guardadaEn: new Date().toISOString(),
    estado: jsonEstado,
  };
  escribirTodas(todas);
}

export function leerVersion(nombre) {
  const todas = leerTodas();
  return todas[nombre] ? todas[nombre].estado : null;
}

export function eliminarVersion(nombre) {
  const todas = leerTodas();
  delete todas[nombre];
  escribirTodas(todas);
}