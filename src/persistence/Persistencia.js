import * as EJ from "./EsquemaJSON.js";
import { cargarPorInserciones } from "./CargarInserciones.js";
import { cargarPorTopologia } from "./CargarTopologia.js";
import { crearEscenario } from "../domain/Escenario.js";

// ---------- GUARDAR ----------
export function serializarEscenario(svc) {
  const esc = svc.escenario;
  const avlJSON = EJ.arbolAJSON(svc.avl);

  return {
    version: 1,
    reloj: EJ.fechaAISO(esc.reloj),
    parametros: { ...esc.parametros },
    modo: esc.modo,
    zonas: esc.zonas.map(EJ.zonaAJSON),
    estaciones: esc.estaciones.map(EJ.estacionAJSON),
    avl: avlJSON,
    eventos: svc.avl.inorden().map(nd => EJ.eventoAJSON(nd.getDato())),
    historicos: esc.historicos.map(EJ.eventoAJSON),
    idsRetirados: Array.from(svc.idsRetirados),
    cola: svc.colaReportes.aArray().map(EJ.reporteAJSON),
    metricas: { ...svc.metricas },
  };
}

// ---------- CARGAR ----------
export function cargarDesdeJSON(json, svc) {
  const problemas = [];

  if (json.version !== 1) {
    return { exito: false, problemas: ["Versión de JSON no soportada: " + json.version] };
  }

  const escNuevo = crearEscenario();
  escNuevo.reloj = EJ.isoAFecha(json.reloj);
  escNuevo.parametros = { ...json.parametros };
  escNuevo.modo = json.modo || "normal";
  escNuevo.zonas = (json.zonas || []).map(EJ.zonaDesdeJSON);
  escNuevo.estaciones = (json.estaciones || []).map(EJ.estacionDesdeJSON);

  const esPorTopologia = json.avl && Array.isArray(json.avl.nodos);
  const esPorInserciones = Array.isArray(json.eventos) && !esPorTopologia;

  let resultado = null;

  if (esPorTopologia) {
    resultado = cargarPorTopologia(json.avl, json.eventos || [], escNuevo, problemas, escNuevo.modo);
    if (!resultado) return { exito: false, problemas };
  } else if (esPorInserciones) {
    resultado = cargarPorInserciones(json.eventos, escNuevo, problemas);
    if (!resultado) return { exito: false, problemas };
  } else {
    problemas.push("El JSON no tiene 'avl' ni 'eventos'");
    return { exito: false, problemas };
  }

  escNuevo.historicos = (json.historicos || []).map(EJ.eventoDesdeJSON);
  const idsRetirados = new Set(json.idsRetirados || []);

  const activosIds = new Set(resultado.eventos.map(e => e.id));
  for (const h of escNuevo.historicos) {
    if (activosIds.has(h.id)) problemas.push(`Id ${h.id} está activo y en históricos`);
    if (idsRetirados.has(h.id)) problemas.push(`Id ${h.id} está en históricos y retirados`);
  }
  if (problemas.length > 0) return { exito: false, problemas };

  svc.escenario = escNuevo;
  svc.avl = resultado.avl;
  svc.porId = new Map();
  for (const ev of resultado.eventos) svc.porId.set(ev.id, ev);
  svc.idsRetirados = idsRetirados;
  svc.colaReportes.limpiar();
  for (const r of (json.cola || [])) svc.colaReportes.encolar(EJ.reporteDesdeJSON(r));
  svc.metricas = { ...json.metricas };
  svc.pilaUndo.limpiar();

  return {
    exito: true,
    mensaje: "Carga exitosa",
    modoCarga: esPorTopologia ? "topologia" : "inserciones",
    resumen: resultado.resumen || null,
    cantidadEventos: resultado.eventos.length,
  };
}