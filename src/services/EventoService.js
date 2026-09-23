import { ArbolAVL } from "../structures/ArbolAVL.js";
import { Pila } from "../structures/Pila.js";
import { Cola } from "../structures/Cola.js";
import { crearClave, compararClaves } from "../domain/Clave.js";
import { crearEvento, calcularPrioridad, claveDeEvento } from "../domain/Evento.js";
import { enZonaPoblada } from "../domain/Zona.js";
import { crearAccion } from "./Accion.js";
import { buscarCandidatos, elegirReferencia, referenciadosPor } from "../domain/Asociaciones.js";

export class EventoService {
  constructor(escenario) {
    this.escenario = escenario;

    // Catálogo activo: SOLO el AVL (sección 2 del PDF)
    this.avl = new ArbolAVL();

    // Índice auxiliar id → evento (O(1) promedio)
    this.porId = new Map();

    // Pila de deshacer y cola de reportes
    this.pilaUndo = new Pila();
    this.colaReportes = new Cola();

    // Ids retirados (eliminados individualmente). No se pueden reutilizar.
    // Set → verificación O(1) promedio.
    this.idsRetirados = new Set();

    // Contadores globales (sección 14 del PDF)
    this.metricas = {
      correccionesAceptadas: 0,
      reportesDescartados: 0,
      conflictos: 0,
      archivosMasivos: 0,
      eventosArchivados: 0,
      cargasRealizadas: 0,
      recuperacionesGlobales: 0,
    };
  }

  // --------------------------------------------------
  // Utilidades internas
  // --------------------------------------------------

  // Verifica si un id ya existe en activos, archivados o retirados.
  idExiste(id) {
    if (this.porId.has(id)) return true;
    if (this.idsRetirados.has(id)) return true;
    for (const ev of this.escenario.historicos) {
      if (ev.id === id) return true;
    }
    return false;
  }

  // Registra una acción en la pila de undo.
  _registrarAccion(accion) {
    this.pilaUndo.apilar(accion);
  }

  // --------------------------------------------------
  // Deshacer
  // --------------------------------------------------
  deshacer() {
    if (this.pilaUndo.estaVacia()) {
      return { exito: false, mensaje: "No hay acciones para deshacer" };
    }
    const accion = this.pilaUndo.desapilar();
    accion.deshacer();
    return { exito: true, mensaje: "Deshecho: " + accion.descripcion };
  }

  // Para la GUI: qué se puede deshacer sin hacerlo.
  verTopeUndo() {
    const a = this.pilaUndo.verTope();
    return a ? a.descripcion : null;
  }
  // Sigue en EventoService.js

  // Devuelve null si los datos son válidos, o un string con el error.
  validarDatosEvento(datos) {
    const { id, magnitud, profundidad, epicentro, fechaHora } = datos;

    // id: entero 1..999999
    if (!Number.isInteger(id) || id < 1 || id > 999999) {
      return "El identificador debe ser un entero entre 1 y 999999";
    }

    // magnitud: -2.0 .. 10.0, máximo 1 decimal
    if (typeof magnitud !== "number" || !isFinite(magnitud)) {
      return "La magnitud debe ser un número finito";
    }
    if (magnitud < -2.0 || magnitud > 10.0) {
      return "La magnitud debe estar entre -2.0 y 10.0";
    }
    if (Math.round(magnitud * 10) !== magnitud * 10) {
      return "La magnitud admite como máximo 1 decimal";
    }

    // profundidad: 0.0 .. 700.0, máximo 1 decimal
    if (typeof profundidad !== "number" || !isFinite(profundidad)) {
      return "La profundidad debe ser un número finito";
    }
    if (profundidad < 0.0 || profundidad > 700.0) {
      return "La profundidad debe estar entre 0.0 y 700.0";
    }
    if (Math.round(profundidad * 10) !== profundidad * 10) {
      return "La profundidad admite como máximo 1 decimal";
    }

    // epicentro: x, y en 0..1000, máximo 1 decimal
    if (!epicentro || typeof epicentro.x !== "number" || typeof epicentro.y !== "number") {
      return "El epicentro debe tener coordenadas x, y numéricas";
    }
    for (const c of [epicentro.x, epicentro.y]) {
      if (c < 0 || c > 1000) {
        return "Las coordenadas del epicentro deben estar entre 0 y 1000";
      }
      if (Math.round(c * 10) !== c * 10) {
        return "Las coordenadas admiten como máximo 1 decimal";
      }
    }

    // fechaHora: no posterior al reloj de simulación
    if (!(fechaHora instanceof Date)) {
      return "La fecha y hora deben ser un objeto Date";
    }
    if (fechaHora.getTime() > this.escenario.reloj.getTime()) {
      return "La fecha de ocurrencia no puede ser posterior al reloj de simulación";
    }

    return null; // sin errores
  }
  // Sigue en EventoService.js

  crearEvento(datos, estacionId = null) {
    // 1. Validaciones básicas
    const error = this.validarDatosEvento(datos);
    if (error) return { exito: false, mensaje: error };

    // 2. Identificador no puede existir
    if (this.idExiste(datos.id)) {
      return { exito: false, mensaje: `El identificador ${datos.id} ya existe o fue retirado` };
    }

    // 3. Construir el evento (revisión = 1, estado = pendiente)
    const evento = crearEvento({
      ...datos,
      revision: 1,
      estaciones: estacionId !== null ? [estacionId] : [],
    }, this.escenario.zonas);

    // 4. Insertar en el AVL
    const clave = claveDeEvento(evento);
    this.avl.insertar(clave, evento);

    // 5. Registrar en el índice auxiliar
    this.porId.set(evento.id, evento);

    // 6. Apilar la acción para deshacer
    const self = this;
    const accion = crearAccion(
      "CREAR_EVENTO",
      `Crear SIS-${String(evento.id).padStart(6, "0")}`,
      function () {
        // Revertir: eliminar del AVL y del Map
        self.avl.eliminar(claveDeEvento(evento));
        self.porId.delete(evento.id);
      }
    );
    this._registrarAccion(accion);

    return { exito: true, mensaje: "Evento creado", evento };
  }
  // Sigue en EventoService.js

  consultarEvento(id) {
    // Buscar en activos
    if (this.porId.has(id)) {
      const ev = this.porId.get(id);
      const nodo = this.avl.buscar(claveDeEvento(ev));
      return {
        exito: true,
        estado: "activo",
        evento: ev,
        clave: claveDeEvento(ev),
        profundidadNodo: nodo ? this._profundidadDeNodo(nodo) : -1,
      };
    }

    // Buscar en históricos
    for (const ev of this.escenario.historicos) {
      if (ev.id === id) {
        return { exito: true, estado: "archivado", evento: ev };
      }
    }

    // ¿Está retirado?
    if (this.idsRetirados.has(id)) {
      return { exito: true, estado: "eliminado" };
    }

    return { exito: false, mensaje: "No existe un evento con ese identificador" };
  }

  // Profundidad de un nodo = distancia (en aristas) a la raíz.
  // La raíz tiene profundidad 0 (sección 9 del PDF).
  _profundidadDeNodo(nodo) {
    let p = 0;
    let actual = nodo.getPadre();
    while (actual !== null) {
      p++;
      actual = actual.getPadre();
    }
    return p;
  }
  corregirEvento(id, nuevosDatos) {
  if (!this.porId.has(id)) {
    return { exito: false, mensaje: "No existe un evento activo con ese identificador" };
  }
  const evento = this.porId.get(id);

  // El id es inmutable
  if (nuevosDatos.id !== undefined && nuevosDatos.id !== id) {
    return { exito: false, mensaje: "El identificador es inmutable" };
  }

  // Datos resultantes: los que vienen del input, o los vigentes si no vienen
  const resultantes = {
    id: id,
    magnitud: nuevosDatos.magnitud !== undefined ? nuevosDatos.magnitud : evento.magnitud,
    profundidad: nuevosDatos.profundidad !== undefined ? nuevosDatos.profundidad : evento.profundidad,
    epicentro: nuevosDatos.epicentro !== undefined ? nuevosDatos.epicentro : evento.epicentro,
    fechaHora: nuevosDatos.fechaHora !== undefined ? nuevosDatos.fechaHora : evento.fechaHora,
  };
  const error = this.validarDatosEvento(resultantes);
  if (error) return { exito: false, mensaje: error };

  // Guardar estado anterior para deshacer
  const anterior = {
    magnitud: evento.magnitud,
    profundidad: evento.profundidad,
    epicentro: { ...evento.epicentro },
    fechaHora: evento.fechaHora,
    revision: evento.revision,
    estadoAtencion: evento.estadoAtencion,
    enZonaPoblada: evento.enZonaPoblada,
    prioridad: evento.prioridad,
    clave: claveDeEvento(evento),
    estaciones: [...evento.estaciones],
  };

  // Aplicar cambios
  evento.magnitud = resultantes.magnitud;
  evento.profundidad = resultantes.profundidad;
  evento.epicentro = { ...resultantes.epicentro };
  evento.fechaHora = resultantes.fechaHora;
  evento.revision += 1;
  evento.estadoAtencion = "pendiente";
  evento.enZonaPoblada = enZonaPoblada(this.escenario.zonas, evento.epicentro.x, evento.epicentro.y);
  evento.prioridad = calcularPrioridad(evento.magnitud, evento.profundidad, evento.epicentro, this.escenario.zonas);

  const claveNueva = claveDeEvento(evento);
  const claveCambio = compararClaves(claveNueva, anterior.clave) !== 0;

  if (claveCambio) {
    this.avl.eliminar(anterior.clave);
    this.avl.insertar(claveNueva, evento);
  }

  // Registrar acción
  const self = this;
  this._registrarAccion(crearAccion(
    "CORREGIR_EVENTO",
    `Corregir SIS-${String(id).padStart(6, "0")} a revisión ${evento.revision}`,
    function () {
      evento.magnitud = anterior.magnitud;
      evento.profundidad = anterior.profundidad;
      evento.epicentro = { ...anterior.epicentro };
      evento.fechaHora = anterior.fechaHora;
      evento.revision = anterior.revision;
      evento.estadoAtencion = anterior.estadoAtencion;
      evento.enZonaPoblada = anterior.enZonaPoblada;
      evento.prioridad = anterior.prioridad;
      evento.estaciones = [...anterior.estaciones];
      if (claveCambio) {
        self.avl.eliminar(claveDeEvento(evento));
        self.avl.insertar(anterior.clave, evento);
      }
    }
  ));
  this.metricas.correccionesAceptadas += 1;

  return { exito: true, mensaje: "Evento corregido", evento, claveCambio };
}
marcarRevisado(id) {
  if (!this.porId.has(id)) {
    return { exito: false, mensaje: "No existe un evento activo con ese identificador" };
  }
  const evento = this.porId.get(id);
  if (evento.estadoAtencion === "revisado") {
    return { exito: false, mensaje: "El evento ya estaba marcado como revisado" };
  }
  const anterior = evento.estadoAtencion;
  evento.estadoAtencion = "revisado";

  this._registrarAccion(crearAccion(
    "MARCAR_REVISADO",
    `Marcar SIS-${String(id).padStart(6, "0")} como revisado`,
    function () { evento.estadoAtencion = anterior; }
  ));

  return { exito: true, mensaje: "Marcado como revisado", evento };
}
eliminarEvento(id) {
  if (!this.porId.has(id)) {
    return { exito: false, mensaje: "No existe un evento activo con ese identificador" };
  }
  const evento = this.porId.get(id);
  const clave = claveDeEvento(evento);

  this.avl.eliminar(clave);
  this.porId.delete(id);
  this.idsRetirados.add(id);

  const self = this;
  this._registrarAccion(crearAccion(
    "ELIMINAR_EVENTO",
    `Eliminar SIS-${String(id).padStart(6, "0")}`,
    function () {
      self.avl.insertar(clave, evento);
      self.porId.set(id, evento);
      self.idsRetirados.delete(id);
    }
  ));

  return { exito: true, mensaje: "Evento eliminado" };
}
_mismosDatos(evento, reporte) {
  return evento.magnitud === reporte.magnitud &&
         evento.profundidad === reporte.profundidad &&
         evento.epicentro.x === reporte.epicentro.x &&
         evento.epicentro.y === reporte.epicentro.y &&
         evento.fechaHora.getTime() === reporte.fechaHora.getTime();
}
_analizarYAplicarReporte(reporte) {
  const self = this;

  // 1) Id retirado → rechazar sin efectos
  if (this.idsRetirados.has(reporte.id)) {
    this.metricas.reportesDescartados += 1;
    return { tipo: "RETIRADO", mensaje: "Identificador retirado, reporte rechazado", deshacer: null };
  }

  // 2) Id desconocido → crear
  if (!this.porId.has(reporte.id)) {
    const datosValidar = {
      id: reporte.id,
      magnitud: reporte.magnitud,
      profundidad: reporte.profundidad,
      epicentro: reporte.epicentro,
      fechaHora: reporte.fechaHora,
    };
    const error = this.validarDatosEvento(datosValidar);
    if (error) {
      this.metricas.reportesDescartados += 1;
      return { tipo: "INVALIDO", mensaje: error, deshacer: null };
    }

    const evento = crearEvento({
      ...datosValidar,
      revision: reporte.revision,
      estaciones: [reporte.estacion],
    }, this.escenario.zonas);

    const clave = claveDeEvento(evento);
    this.avl.insertar(clave, evento);
    this.porId.set(evento.id, evento);

    return {
      tipo: "CREADO",
      mensaje: `Evento nuevo creado (revisión ${reporte.revision})`,
      deshacer: function () {
        self.avl.eliminar(claveDeEvento(evento));
        self.porId.delete(evento.id);
      }
    };
  }

  // 3) Existe → comparar
  const evento = this.porId.get(reporte.id);

  // 3a) Revisión menor → reporte antiguo
  if (reporte.revision < evento.revision) {
    this.metricas.reportesDescartados += 1;
    return { tipo: "ANTIGUO", mensaje: `Reporte antiguo (rev ${reporte.revision} < ${evento.revision})`, deshacer: null };
  }

  // 3b) Misma revisión
  if (reporte.revision === evento.revision) {
    if (this._mismosDatos(evento, reporte)) {
      // Confirmación: añadir estación si no estaba
      if (!evento.estaciones.includes(reporte.estacion)) {
        evento.estaciones.push(reporte.estacion);
        return {
          tipo: "CONFIRMADO",
          mensaje: `Confirmación, estación ${reporte.estacion} añadida`,
          deshacer: function () {
            evento.estaciones = evento.estaciones.filter(e => e !== reporte.estacion);
          }
        };
      }
      return { tipo: "CONFIRMADO", mensaje: "Confirmación repetida, sin cambios", deshacer: null };
    }
    // Misma revisión + datos distintos → conflicto
    this.metricas.conflictos += 1;
    return { tipo: "CONFLICTO", mensaje: `Conflicto en revisión ${reporte.revision}`, deshacer: null };
  }

  // 3c) Revisión mayor → sustituir datos
  const nuevos = {
    id: reporte.id,
    magnitud: reporte.magnitud,
    profundidad: reporte.profundidad,
    epicentro: reporte.epicentro,
    fechaHora: reporte.fechaHora,
  };
  const error = this.validarDatosEvento(nuevos);
  if (error) {
    this.metricas.reportesDescartados += 1;
    return { tipo: "INVALIDO", mensaje: error, deshacer: null };
  }

  const anterior = {
    magnitud: evento.magnitud,
    profundidad: evento.profundidad,
    epicentro: { ...evento.epicentro },
    fechaHora: evento.fechaHora,
    revision: evento.revision,
    estadoAtencion: evento.estadoAtencion,
    enZonaPoblada: evento.enZonaPoblada,
    prioridad: evento.prioridad,
    clave: claveDeEvento(evento),
    estaciones: [...evento.estaciones],
  };

  evento.magnitud = reporte.magnitud;
  evento.profundidad = reporte.profundidad;
  evento.epicentro = { ...reporte.epicentro };
  evento.fechaHora = reporte.fechaHora;
  evento.revision = reporte.revision;
  evento.estadoAtencion = "pendiente";
  evento.enZonaPoblada = enZonaPoblada(this.escenario.zonas, evento.epicentro.x, evento.epicentro.y);
  evento.prioridad = calcularPrioridad(evento.magnitud, evento.profundidad, evento.epicentro, this.escenario.zonas);
  if (!evento.estaciones.includes(reporte.estacion)) {
    evento.estaciones.push(reporte.estacion);
  }

  const claveNueva = claveDeEvento(evento);
  const claveCambio = compararClaves(claveNueva, anterior.clave) !== 0;
  if (claveCambio) {
    this.avl.eliminar(anterior.clave);
    this.avl.insertar(claveNueva, evento);
  }

  return {
    tipo: "ACTUALIZADO",
    mensaje: `Actualizado a revisión ${reporte.revision}${claveCambio ? " (cambió la clave)" : ""}`,
    deshacer: function () {
      evento.magnitud = anterior.magnitud;
      evento.profundidad = anterior.profundidad;
      evento.epicentro = { ...anterior.epicentro };
      evento.fechaHora = anterior.fechaHora;
      evento.revision = anterior.revision;
      evento.estadoAtencion = anterior.estadoAtencion;
      evento.enZonaPoblada = anterior.enZonaPoblada;
      evento.prioridad = anterior.prioridad;
      evento.estaciones = [...anterior.estaciones];
      if (claveCambio) {
        self.avl.eliminar(claveDeEvento(evento));
        self.avl.insertar(anterior.clave, evento);
      }
    }
  };
}
encolarReporte(reporte) {
  this.colaReportes.encolar(reporte);
  return { exito: true, mensaje: "Reporte encolado" };
}

procesarSiguienteReporte() {
  if (this.colaReportes.estaVacia()) {
    return { exito: false, mensaje: "La cola está vacía" };
  }
  const reporte = this.colaReportes.desencolar();
  const resultado = this._analizarYAplicarReporte(reporte);

  // La acción "PROCESAR_REPORTE" deshace el efecto + devuelve el reporte al frente
  const self = this;
  this._registrarAccion(crearAccion(
    "PROCESAR_REPORTE",
    `Reporte id ${reporte.id} de ${reporte.estacion} → ${resultado.tipo}`,
    function () {
      if (resultado.deshacer) resultado.deshacer();
      self.colaReportes.insertarAlFrente(reporte);
    }
  ));

  return { exito: true, tipo: resultado.tipo, mensaje: resultado.mensaje };
}
// Pool completo: activos + históricos. Lo pide la sección 11.
_poolEventos() {
  const activos = Array.from(this.porId.values());
  return activos.concat(this.escenario.historicos);
}

// Estados para etiquetar cada resultado: activo o archivado.
_estadoDeEvento(evento) {
  if (this.porId.has(evento.id)) return "activo";
  return "archivado";
}

// Consulta: candidatos + referencia elegida para un evento.
candidatosDe(id) {
  const pool = this._poolEventos();
  let evento = null;
  for (const ev of pool) if (ev.id === id) { evento = ev; break; }
  if (!evento) return { exito: false, mensaje: "Evento no encontrado" };

  const { W, R } = this.escenario.parametros;
  const candidatos = buscarCandidatos(evento, pool, W, R);
  const elegida = elegirReferencia(evento, candidatos);

  return {
    exito: true,
    evento: { id: evento.id, estado: this._estadoDeEvento(evento) },
    candidatos: candidatos.map(c => ({
      id: c.id,
      magnitud: c.magnitud,
      estado: this._estadoDeEvento(c),
    })),
    referencia: elegida
      ? { id: elegida.id, magnitud: elegida.magnitud, estado: this._estadoDeEvento(elegida) }
      : null,
  };
}

// Consulta: eventos que usan a "id" como referencia elegida.
referenciadosDe(id) {
  const pool = this._poolEventos();
  let evento = null;
  for (const ev of pool) if (ev.id === id) { evento = ev; break; }
  if (!evento) return { exito: false, mensaje: "Evento no encontrado" };

  const { W, R } = this.escenario.parametros;
  const usan = referenciadosPor(evento, pool, W, R);

  return {
    exito: true,
    evento: { id: evento.id, estado: this._estadoDeEvento(evento) },
    referenciados: usan.map(c => ({
      id: c.id,
      magnitud: c.magnitud,
      estado: this._estadoDeEvento(c),
    })),
  };
}
}

