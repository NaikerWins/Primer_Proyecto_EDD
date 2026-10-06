
import { ArbolAVL } from "../structures/ArbolAVL.js";
import { Pila } from "../structures/Pila.js";
import { Cola } from "../structures/Cola.js";
import { crearClave, compararClaves } from "../domain/Clave.js";
import { crearEvento, calcularPrioridad, claveDeEvento } from "../domain/Evento.js";
import { enZonaPoblada } from "../domain/Zona.js";
import { crearAccion } from "./Accion.js";
import { buscarCandidatos, elegirReferencia, referenciadosPor } from "../domain/Asociaciones.js";
import { elegirRamaAArchivar, extraerEventosSubarbol } from "./Archivo.js";
import { auditarAVL } from "./Auditoria.js";

import {
  consultarPrimerosKPendientes,
  consultarEventosPorRangoMagnitud,
  consultarPorFechaYProfundidad,
  consultarAccesoCostoso,
} from "./Consultas.js";
import { serializarEscenario, cargarDesdeJSON } from "../persistence/Persistencia.js";
import {
  guardarVersion,
  leerVersion,
  listarVersiones,
  eliminarVersion,
} from "../persistence/Versiones.js";

export class EventoService {
  // --------------------------------------------------
  // CONSTRUCTOR
  // --------------------------------------------------
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
  // UTILIDADES INTERNAS
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
  // DESHACER
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

  // --------------------------------------------------
  // VALIDACIÓN DE DATOS
  // --------------------------------------------------

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

    return null;
  }

  // --------------------------------------------------
  // CREAR
  // --------------------------------------------------
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
        self.avl.eliminar(claveDeEvento(evento));
        self.porId.delete(evento.id);
      }
    );
    this._registrarAccion(accion);

    return { exito: true, mensaje: "Evento creado", evento };
  }

  // --------------------------------------------------
  // CONSULTAR
  // --------------------------------------------------
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

  // --------------------------------------------------
  // CORREGIR
  // --------------------------------------------------
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
    evento.prioridad = calcularPrioridad(
      evento.magnitud,
      evento.profundidad,
      evento.epicentro,
      this.escenario.zonas
    );

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

  // --------------------------------------------------
  // MARCAR REVISADO
  // --------------------------------------------------
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

  // --------------------------------------------------
  // ELIMINAR
  // --------------------------------------------------
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

  // --------------------------------------------------
  // COLA DE REPORTES
  // --------------------------------------------------
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
    evento.prioridad = calcularPrioridad(
      evento.magnitud,
      evento.profundidad,
      evento.epicentro,
      this.escenario.zonas
    );
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

  // --------------------------------------------------
  // ASOCIACIONES
  // --------------------------------------------------
  _poolEventos() {
    const activos = Array.from(this.porId.values());
    return activos.concat(this.escenario.historicos);
  }

  _estadoDeEvento(evento) {
    if (this.porId.has(evento.id)) return "activo";
    return "archivado";
  }

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

  // --------------------------------------------------
  // MODO ESTRÉS
  // --------------------------------------------------
  activarModoEstres() {
    this.avl.activarModoEstres();
    this.escenario.modo = "estres";
    return { exito: true, mensaje: "Modo estrés activado" };
  }

  desactivarModoEstres() {
    this.avl.desactivarModoEstres();
    this.escenario.modo = "normal";
    return { exito: true, mensaje: "Modo normal activado" };
  }

  recuperarEquilibrio() {
    if (this.escenario.modo !== "estres") {
      return { exito: false, mensaje: "La recuperación solo aplica en modo estrés" };
    }
    if (this.avl.estaBalanceado()) {
      return { exito: false, mensaje: "El árbol ya está balanceado" };
    }

    // Snapshot del árbol antes de reparar (para deshacer)
    const arbolAnterior = this.avl.clonar();

    const pasadas = this.avl.repararGlobal();
    const balanceado = this.avl.estaBalanceado();

    const self = this;
    this._registrarAccion(crearAccion(
      "RECUPERAR_EQUILIBRIO",
      `Recuperación global (${pasadas} pasada${pasadas === 1 ? "" : "s"})`,
      function () {
        self.avl = arbolAnterior;
      }
    ));

    // Al recuperar, pasamos a modo normal (el PDF lo dice)
    this.avl.desactivarModoEstres();
    this.escenario.modo = "normal";

    this.metricas.recuperacionesGlobales += 1;

    return {
      exito: true,
      mensaje: `Recuperación completada en ${pasadas} pasada(s). Balanceado: ${balanceado}`,
      pasadas,
      balanceado,
    };
  }

  // --------------------------------------------------
  // LÍMITE L
  // --------------------------------------------------
  cambiarLimiteL(nuevoL) {
    if (!Number.isInteger(nuevoL) || nuevoL < 0) {
      return { exito: false, mensaje: "L debe ser un entero no negativo" };
    }
    const anterior = this.escenario.parametros.L;
    this.escenario.parametros.L = nuevoL;

    const self = this;
    this._registrarAccion(crearAccion(
      "CAMBIAR_L",
      `Cambiar L de ${anterior} a ${nuevoL}`,
      function () { self.escenario.parametros.L = anterior; }
    ));

    return { exito: true, mensaje: `L actualizado a ${nuevoL}` };
  }

  // --------------------------------------------------
  // CONSULTAS
  // --------------------------------------------------
  primerosKPendientes(k) {
    if (!Number.isInteger(k) || k <= 0) {
      return { exito: false, mensaje: "k debe ser un entero positivo" };
    }
    const r = consultarPrimerosKPendientes(this.avl, k);
    return { exito: true, ...r };
  }

  eventosPorRangoMagnitud(mMin, mMax) {
    if (mMin > mMax) return { exito: false, mensaje: "Rango inválido" };
    const r = consultarEventosPorRangoMagnitud(this.avl, mMin, mMax);
    return { exito: true, ...r };
  }

  eventosPorFechaYProfundidad(fIni, fFin, hMax) {
    if (fIni.getTime() > fFin.getTime()) {
      return { exito: false, mensaje: "Rango de fechas inválido" };
    }
    const r = consultarPorFechaYProfundidad(this.avl, fIni, fFin, hMax);
    return { exito: true, ...r };
  }

  eventosConAccesoCostoso() {
    const L = this.escenario.parametros.L;
    const r = consultarAccesoCostoso(this.avl, L);
    return { exito: true, ...r };
  }

  // --------------------------------------------------
  // PERSISTENCIA
  // --------------------------------------------------
  exportarEstado() {
    return serializarEscenario(this);
  }

  cargarEstado(jsonNuevo) {
    // Snapshot del estado actual (por si hay que deshacer)
    const snapshotPrevio = this.exportarEstado();

    const resultado = cargarDesdeJSON(jsonNuevo, this);
    if (!resultado.exito) {
      // Nada cambió: cargarDesdeJSON es atómico
      return resultado;
    }

    this.metricas.cargasRealizadas += 1;

    const self = this;
    this._registrarAccion(crearAccion(
      "CARGAR_ESTADO",
      `Cargar estado (${resultado.modoCarga})`,
      function () {
        const r = cargarDesdeJSON(snapshotPrevio, self);
        if (!r.exito) {
          console.error("Fallo al deshacer carga:", r.problemas);
        }
      }
    ));

    return resultado;
  }

  // --------------------------------------------------
  // ARCHIVO MASIVO
  // --------------------------------------------------
  previsualizarArchivo() {
    const { T } = this.escenario.parametros;
    const rama = elegirRamaAArchivar(this.avl, this.escenario.reloj, T);
    if (!rama) {
      return {
        exito: false,
        mensaje: `No hay ramas elegibles (prioridad baja y antigüedad > ${T}h)`,
      };
    }
    const eventos = extraerEventosSubarbol(rama.nodo);
    return {
      exito: true,
      raizId: rama.raizId,
      cantidad: rama.cantidad,
      profundidad: rama.profundidad,
      ids: eventos.map(e => e.id),
      eventos,
    };
  }

  archivarRama() {
    const preview = this.previsualizarArchivo();
    if (!preview.exito) return preview;

    // Congelamos el conjunto de nodos: guardamos referencia a cada evento
    const eventosArchivar = preview.eventos;

    // Retirar del AVL y pasar a históricos
    for (const ev of eventosArchivar) {
      const clave = claveDeEvento(ev);
      this.avl.eliminar(clave);
      this.porId.delete(ev.id);
      ev.activo = false;
      ev.archivado = true;
      this.escenario.historicos.push(ev);
    }

    this.metricas.archivosMasivos += 1;
    this.metricas.eventosArchivados += eventosArchivar.length;

    // Undo
    const self = this;
    const eventos = eventosArchivar;
    this._registrarAccion(crearAccion(
      "ARCHIVAR_RAMA",
      `Archivar rama con raíz SIS-${String(preview.raizId).padStart(6, "0")} (${eventos.length} eventos)`,
      function () {
        for (let i = 0; i < eventos.length; i++) {
          const ev = eventos[i];
          ev.activo = true;
          ev.archivado = false;
          self.avl.insertar(claveDeEvento(ev), ev);
          self.porId.set(ev.id, ev);
        }
        self.escenario.historicos.splice(-eventos.length, eventos.length);
      }
    ));

    return {
      exito: true,
      mensaje: `Archivados ${eventos.length} eventos`,
      raizId: preview.raizId,
      ids: preview.ids,
    };
  }

  // --------------------------------------------------
  // VERSIONES CON NOMBRE
  // --------------------------------------------------
  guardarVersionConNombre(nombre) {
    if (!nombre || typeof nombre !== "string") {
      return { exito: false, mensaje: "El nombre es obligatorio" };
    }
    const json = this.exportarEstado();
    guardarVersion(nombre, json);
    return { exito: true, mensaje: `Versión '${nombre}' guardada` };
  }

  listarVersionesGuardadas() {
    return listarVersiones();
  }

  restaurarVersion(nombre) {
    const json = leerVersion(nombre);
    if (!json) return { exito: false, mensaje: `No existe la versión '${nombre}'` };

    // Snapshot previo para deshacer
    const snapshotPrevio = this.exportarEstado();

    const r = cargarDesdeJSON(json, this);
    if (!r.exito) {
      return {
        exito: false,
        mensaje: "La versión guardada no se pudo cargar",
        problemas: r.problemas,
      };
    }

    const self = this;
    this._registrarAccion(crearAccion(
      "RESTAURAR_VERSION",
      `Restaurar versión '${nombre}'`,
      function () {
        const r2 = cargarDesdeJSON(snapshotPrevio, self);
        if (!r2.exito) console.error("Fallo al deshacer restauración:", r2.problemas);
      }
    ));

    return { exito: true, mensaje: `Versión '${nombre}' restaurada` };
  }

  eliminarVersionGuardada(nombre) {
    eliminarVersion(nombre);
    return { exito: true, mensaje: `Versión '${nombre}' eliminada` };
  }

  // --------------------------------------------------
  // RELOJ
  // --------------------------------------------------
  avanzarReloj(horas) {
    if (typeof horas !== "number" || horas <= 0) {
      return { exito: false, mensaje: "Las horas deben ser un número positivo" };
    }
    const anterior = this.escenario.reloj;
    const nuevo = new Date(anterior.getTime() + horas * 3600 * 1000);
    this.escenario.reloj = nuevo;

    const self = this;
    this._registrarAccion(crearAccion(
      "AVANZAR_RELOJ",
      `Avanzar reloj ${horas}h → ${nuevo.toISOString()}`,
      function () { self.escenario.reloj = anterior; }
    ));

    return { exito: true, mensaje: `Reloj avanzado ${horas}h`, reloj: nuevo };
  }
  // --------------------------------------------------
// AUDITORÍA
// --------------------------------------------------
verificarEstructura() {
  const reporte = auditarAVL(this.avl, this.escenario.modo);
  return {
    exito: true,
    modo: this.escenario.modo,
    consistente: reporte.consistente,
    problemas: reporte.problemas,
    desbalancesEsperados: reporte.desbalancesEsperados,
    conteos: reporte.conteos,
  };
}

// --------------------------------------------------
// INDICADORES
// --------------------------------------------------
indicadores() {
  // 1) Recorridos
  const inorden = this.avl.inorden().map(n => ({
    id: n.getClave().id,
    clave: { ...n.getClave() },
  }));
  const preorden = this.avl.preorden().map(n => n.getClave().id);
  const posorden = this.avl.posorden().map(n => n.getClave().id);
  const porNiveles = this.avl.porNiveles().map(n => n.getClave().id);

  // 2) Conteo por prioridad entre activos
  const porPrioridad = { 1: 0, 2: 0, 3: 0 };
  let pendientes = 0;
  let revisados = 0;
  let prioridadAltaProfunda = 0;
  const L = this.escenario.parametros.L;

  // Recorrido por niveles para conocer profundidad de cada nodo
  const cola = this.avl.getRaiz() ? [{ nodo: this.avl.getRaiz(), p: 0 }] : [];
  while (cola.length > 0) {
    const { nodo, p } = cola.shift();
    const ev = nodo.getDato();
    porPrioridad[ev.prioridad] = (porPrioridad[ev.prioridad] || 0) + 1;
    if (ev.estadoAtencion === "pendiente") pendientes++;
    else revisados++;
    if (ev.prioridad === 3 && p > L) prioridadAltaProfunda++;
    if (nodo.getHijoIzquierdo()) cola.push({ nodo: nodo.getHijoIzquierdo(), p: p + 1 });
    if (nodo.getHijoDerecho()) cola.push({ nodo: nodo.getHijoDerecho(), p: p + 1 });
  }

  // 3) Árbol
  const arbol = {
    activos: this.avl.porNiveles().length,
    altura: this.avl.altura(),
    hojas: this.avl.contarHojas(),
    balanceado: this.avl.estaBalanceado(),
  };

  // 4) Contadores del AVL
  const contadores = { ...this.avl.contadores };

  // 5) Métricas del servicio
  const metricas = { ...this.metricas };

  return {
    arbol,
    historicos: this.escenario.historicos.length,
    idsRetirados: this.idsRetirados.size,
    cola: this.colaReportes.tamano(),
    pilaUndo: this.pilaUndo.tamano(),
    porPrioridad,
    pendientes,
    revisados,
    prioridadAltaProfunda,
    L,
    contadores,
    metricas,
    recorridos: { inorden, preorden, posorden, porNiveles },
  };
}

// Versión resumida para la barra superior de la GUI.
resumenRapido() {
  return {
    modo: this.escenario.modo,
    activos: this.avl.porNiveles().length,
    historicos: this.escenario.historicos.length,
    retirados: this.idsRetirados.size,
    cola: this.colaReportes.tamano(),
    balanceado: this.avl.estaBalanceado(),
    altura: this.avl.altura(),
    pendientes: this.contarPendientes(),
    prioridadAltaProfunda: this.contarAccesoCostoso(),
    proximaUndo: this.verTopeUndo(),
  };
}

contarPendientes() {
  let n = 0;
  for (const nodo of this.avl.porNiveles()) {
    if (nodo.getDato().estadoAtencion === "pendiente") n++;
  }
  return n;
}

contarAccesoCostoso() {
  const L = this.escenario.parametros.L;
  let n = 0;
  const cola = this.avl.getRaiz() ? [{ nodo: this.avl.getRaiz(), p: 0 }] : [];
  while (cola.length > 0) {
    const { nodo, p } = cola.shift();
    if (nodo.getDato().prioridad === 3 && p > L) n++;
    if (nodo.getHijoIzquierdo()) cola.push({ nodo: nodo.getHijoIzquierdo(), p: p + 1 });
    if (nodo.getHijoDerecho()) cola.push({ nodo: nodo.getHijoDerecho(), p: p + 1 });
  }
  return n;
}
}