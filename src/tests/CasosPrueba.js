// src/tests/CasosPrueba.js
import { crearEscenario } from "../domain/Escenario.js";
import { crearZona } from "../domain/Zona.js";
import { crearEstacion } from "../domain/Estacion.js";
import { crearReporte } from "../domain/Reporte.js";
import { EventoService } from "../services/EventoService.js";
import { crearClave } from "../domain/Clave.js";
import { claveDeEvento } from "../domain/Evento.js";

// ---------- Utilidades ----------
function nuevoServicio() {
  const esc = crearEscenario();
  esc.zonas.push(crearZona("Z1", 0, 0, 500, 500, true));
  esc.zonas.push(crearZona("Z2", 500, 0, 1000, 500, false));
  esc.estaciones.push(crearEstacion("E1", "Norte"));
  esc.estaciones.push(crearEstacion("E2", "Sur"));
  esc.reloj = new Date("2026-12-31T23:59:59Z");
  return new EventoService(esc);
}

function paso(pasos, descripcion, ok, detalle = "") {
  pasos.push({ descripcion, ok: !!ok, detalle });
}

function okEq(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

// ---------- CASO 1: Límites y empates ----------
export function caso1_LimitesYEmpates() {
  const svc = nuevoServicio();
  const pasos = [];

  // M=4.5, H=30, zona poblada → prioridad 3
  const r1 = svc.crearEvento({
    id: 1, magnitud: 4.5, profundidad: 30.0,
    epicentro: { x: 250, y: 250 }, // dentro de Z1 (poblada)
    fechaHora: new Date("2026-01-01T10:00:00Z"),
  }, "E1");
  paso(pasos, "M=4.5, H=30, zona poblada → prioridad 3",
    r1.exito && r1.evento.prioridad === 3,
    "prioridad=" + (r1.evento?.prioridad));

  // M=4.5, H=30, fuera de zona poblada → prioridad 2
  const r2 = svc.crearEvento({
    id: 2, magnitud: 4.5, profundidad: 30.0,
    epicentro: { x: 750, y: 250 }, // en Z2, no poblada
    fechaHora: new Date("2026-01-01T10:00:00Z"),
  }, "E1");
  paso(pasos, "M=4.5, H=30, zona NO poblada → prioridad 2",
    r2.exito && r2.evento.prioridad === 2,
    "prioridad=" + (r2.evento?.prioridad));

  // M=6.0, cualquier H → prioridad 3
  const r3 = svc.crearEvento({
    id: 3, magnitud: 6.0, profundidad: 600.0,
    epicentro: { x: 750, y: 750 },
    fechaHora: new Date("2026-01-01T10:00:00Z"),
  }, "E1");
  paso(pasos, "M=6.0 → prioridad 3 sin importar H",
    r3.exito && r3.evento.prioridad === 3,
    "prioridad=" + (r3.evento?.prioridad));

  // Epicentro EXACTAMENTE en el borde entre Z1(pob) y Z2(no pob) → poblado
  const r4 = svc.crearEvento({
    id: 4, magnitud: 4.5, profundidad: 20.0,
    epicentro: { x: 500, y: 250 },
    fechaHora: new Date("2026-01-01T10:00:00Z"),
  }, "E1");
  paso(pasos, "Epicentro en borde compartido → prioridad 3 (basta una poblada)",
    r4.exito && r4.evento.prioridad === 3,
    "prioridad=" + (r4.evento?.prioridad) + " zonaPoblada=" + r4.evento?.enZonaPoblada);

  // Empates por magnitud: desempate por id
  const svc2 = nuevoServicio();
  svc2.crearEvento({ id: 10, magnitud: 6.0, profundidad: 10, epicentro: { x: 100, y: 100 }, fechaHora: new Date("2026-01-01T10:00:00Z") }, "E1");
  svc2.crearEvento({ id: 5,  magnitud: 6.0, profundidad: 10, epicentro: { x: 100, y: 100 }, fechaHora: new Date("2026-01-01T10:00:00Z") }, "E1");
  svc2.crearEvento({ id: 25, magnitud: 6.0, profundidad: 10, epicentro: { x: 100, y: 100 }, fechaHora: new Date("2026-01-01T10:00:00Z") }, "E1");
  const inorden = svc2.avl.inorden().map(n => n.getClave().id);
  paso(pasos, "Empate en P y M: desempata por id numérico",
    okEq(inorden, [5, 10, 25]),
    "inorden ids=" + inorden.join(","));

  return { titulo: "Caso 1 — Límites y empates", pasos, exito: pasos.every(p => p.ok) };
}

// ---------- CASO 2: Corrección y reporte antiguo ----------
export function caso2_CorreccionYReporteAntiguo() {
  const svc = nuevoServicio();
  const pasos = [];

  // Crear evento con M=4.8 H=70 (fuera de zona poblada) → prioridad 2
  svc.crearEvento({
    id: 100, magnitud: 4.8, profundidad: 70.0,
    epicentro: { x: 750, y: 750 }, // no poblada
    fechaHora: new Date("2026-01-01T10:00:00Z"),
  }, "E1");

  const antes = svc.consultarEvento(100);
  paso(pasos, "Evento inicial tiene prioridad 2",
    antes.evento.prioridad === 2,
    "P=" + antes.evento.prioridad);

  // Corregir a M=6.2, H=15 → prioridad 3
  const r = svc.corregirEvento(100, { magnitud: 6.2, profundidad: 15.0 });
  const desp = svc.consultarEvento(100);
  paso(pasos, "Tras corrección, prioridad pasa a 3",
    desp.evento.prioridad === 3,
    "P=" + desp.evento.prioridad);
  paso(pasos, "Revisión pasa de 1 a 2",
    desp.evento.revision === 2,
    "rev=" + desp.evento.revision);
  paso(pasos, "Estado vuelve a pendiente",
    desp.evento.estadoAtencion === "pendiente",
    "estado=" + desp.evento.estadoAtencion);

  // Verificar que hay un solo nodo (no se duplicó)
  const cantidad = svc.avl.porNiveles().length;
  paso(pasos, "No se creó un segundo nodo para el mismo id",
    cantidad === 1,
    "nodos=" + cantidad);

  // Reporte con revisión menor → descartado, sin efectos
  const reporteAntiguo = crearReporte({
    id: 100, magnitud: 3.0, profundidad: 10.0,
    epicentro: { x: 0, y: 0 },
    fechaHora: new Date("2025-12-31T00:00:00Z"),
    revision: 1, estacion: "E2",
  });
  svc.encolarReporte(reporteAntiguo);
  const rp = svc.procesarSiguienteReporte();
  const post = svc.consultarEvento(100);
  paso(pasos, "Reporte antiguo es descartado",
    rp.tipo === "ANTIGUO",
    "tipo=" + rp.tipo);
  paso(pasos, "El reporte antiguo NO revirtió la corrección",
    post.evento.magnitud === 6.2 && post.evento.revision === 2,
    "M=" + post.evento.magnitud + " rev=" + post.evento.revision);

  return { titulo: "Caso 2 — Corrección y reporte antiguo", pasos, exito: pasos.every(p => p.ok) };
}

// ---------- CASO 3: Reporte tardío ----------
export function caso3_ReporteTardio() {
  const svc = nuevoServicio();
  const pasos = [];

  // X: M=5.6 a las 10:00
  svc.crearEvento({
    id: 1, magnitud: 5.6, profundidad: 10,
    epicentro: { x: 100, y: 100 },
    fechaHora: new Date("2026-01-01T10:00:00Z"),
  }, "E1");

  // Y: M=4.2 a las 10:20
  svc.crearEvento({
    id: 2, magnitud: 4.2, profundidad: 10,
    epicentro: { x: 120, y: 100 },
    fechaHora: new Date("2026-01-01T10:20:00Z"),
  }, "E1");

  // Z (llega tarde): M=6.1 a las 09:55
  svc.crearEvento({
    id: 3, magnitud: 6.1, profundidad: 10,
    epicentro: { x: 110, y: 100 },
    fechaHora: new Date("2026-01-01T09:55:00Z"),
  }, "E1");

  // Candidatos para X: solo Z (M mayor y anterior)
  const cx = svc.candidatosDe(1);
  const idsX = cx.candidatos.map(c => c.id).sort();
  paso(pasos, "Candidatos para X(id=1) son solo [Z(id=3)]",
    okEq(idsX, [3]),
    "ids=" + idsX.join(","));
  paso(pasos, "Referencia elegida para X es Z",
    cx.referencia && cx.referencia.id === 3,
    "ref=" + cx.referencia?.id);

  // Candidatos para Y: X y Z
  const cy = svc.candidatosDe(2);
  const idsY = cy.candidatos.map(c => c.id).sort();
  paso(pasos, "Candidatos para Y(id=2) son [X(id=1), Z(id=3)]",
    okEq(idsY, [1, 3]),
    "ids=" + idsY.join(","));
  paso(pasos, "Referencia elegida para Y es Z (mayor magnitud)",
    cy.referencia && cy.referencia.id === 3,
    "ref=" + cy.referencia?.id);

  // Referenciados de Z
  const rz = svc.referenciadosDe(3);
  const idsRz = rz.referenciados.map(c => c.id).sort();
  paso(pasos, "Z es referencia de X e Y",
    okEq(idsRz, [1, 2]),
    "referenciados=" + idsRz.join(","));

  return { titulo: "Caso 3 — Reporte tardío", pasos, exito: pasos.every(p => p.ok) };
}

// ---------- CASO 4: Rotaciones y recuperación ----------
export function caso4_RotacionesYRecuperacion() {
  const pasos = [];

  // LL, RR, LR, RL en servicios independientes
  const casos = [
    { nombre: "LL", ids: [30, 20, 10], contador: "LL" },
    { nombre: "RR", ids: [10, 20, 30], contador: "RR" },
    { nombre: "LR", ids: [30, 10, 20], contador: "LR" },
    { nombre: "RL", ids: [10, 30, 20], contador: "RL" },
  ];
  for (const c of casos) {
    const s = nuevoServicio();
    for (const id of c.ids) {
      s.crearEvento({
        id, magnitud: 1.0, profundidad: 10,
        epicentro: { x: 0, y: 0 },
        fechaHora: new Date("2026-01-01T10:00:00Z"),
      }, "E1");
    }
    const raiz = s.avl.getRaiz()?.getClave().id;
    paso(pasos, `Caso ${c.nombre}: raíz queda en el nodo medio (id=20)`,
      raiz === 20,
      "raíz=" + raiz);
    paso(pasos, `Caso ${c.nombre}: contador ${c.contador} incrementado`,
      s.avl.contadores[c.contador] === 1,
      c.contador + "=" + s.avl.contadores[c.contador]);
  }

  // Modo estrés + recuperación
  const s = nuevoServicio();
  s.activarModoEstres();
  for (let i = 1; i <= 10; i++) {
    s.crearEvento({
      id: i, magnitud: 1.0, profundidad: 10,
      epicentro: { x: 0, y: 0 },
      fechaHora: new Date("2026-01-01T10:00:00Z"),
    }, "E1");
  }
  paso(pasos, "Modo estrés: árbol desbalanceado",
    !s.avl.estaBalanceado(),
    "altura=" + s.avl.altura() + " balanceado=" + s.avl.estaBalanceado());

  const alturaAntes = s.avl.altura();
  const idsAntes = s.avl.inorden().map(n => n.getClave().id);
  const rec = s.recuperarEquilibrio();
  const idsDespues = s.avl.inorden().map(n => n.getClave().id);

  paso(pasos, "Recuperación deja el árbol balanceado",
    s.avl.estaBalanceado(),
    "balanceado=" + s.avl.estaBalanceado());
  paso(pasos, "Altura disminuye tras recuperar",
    s.avl.altura() < alturaAntes,
    `antes=${alturaAntes} despues=${s.avl.altura()}`);
  paso(pasos, "Inorden preservado (orden BST intacto)",
    okEq(idsAntes, idsDespues),
    "ids=" + idsDespues.join(","));
  paso(pasos, "Recuperación termina en pocas pasadas",
    rec.pasadas <= 10,
    "pasadas=" + rec.pasadas);

  return { titulo: "Caso 4 — Rotaciones y recuperación", pasos, exito: pasos.every(p => p.ok) };
}

// ---------- CASO 5: Archivo masivo ----------
export function caso5_ArchivoMasivo() {
  const svc = nuevoServicio();
  const pasos = [];

  // 4 eventos prioridad 1, antiguos (más de 72h respecto al reloj)
  const base = new Date("2026-12-31T23:59:59Z").getTime();
  const horas = (h) => new Date(base - h * 3600 * 1000);

  svc.crearEvento({ id: 1, magnitud: 2.0, profundidad: 10, epicentro: { x: 100, y: 100 }, fechaHora: horas(200) }, "E1");
  svc.crearEvento({ id: 2, magnitud: 2.5, profundidad: 10, epicentro: { x: 120, y: 100 }, fechaHora: horas(180) }, "E1");
  svc.crearEvento({ id: 3, magnitud: 3.0, profundidad: 10, epicentro: { x: 140, y: 100 }, fechaHora: horas(160) }, "E1");
  svc.crearEvento({ id: 4, magnitud: 1.5, profundidad: 10, epicentro: { x: 160, y: 100 }, fechaHora: horas(140) }, "E1");

  // Un evento con prioridad 3 (bloquea elegibilidad de ramas que lo contengan)
  svc.crearEvento({ id: 5, magnitud: 6.5, profundidad: 10, epicentro: { x: 300, y: 300 }, fechaHora: horas(100) }, "E1");

  const preview = svc.previsualizarArchivo();
  paso(pasos, "Hay una rama elegible con los 4 eventos de prioridad baja",
    preview.exito && preview.cantidad === 4,
    "cantidad=" + preview.cantidad + " ids=" + (preview.ids || []).join(","));

  // Caso: T enorme → no hay rama elegible
  const svc2 = nuevoServicio();
  svc2.escenario.parametros.T = 100000;
  svc2.crearEvento({ id: 10, magnitud: 2.0, profundidad: 10, epicentro: { x: 0, y: 0 }, fechaHora: horas(100) }, "E1");
  const p2 = svc2.previsualizarArchivo();
  paso(pasos, "Con T enorme no hay ramas elegibles",
    !p2.exito,
    p2.mensaje);

  // Verificar que una rama con descendiente de prioridad alta NO es elegible.
  // En el ejemplo anterior, el evento 5 (prioridad 3) NO está en la rama de los bajos.
  // Agregamos otro escenario donde la rama de un prioridad 1 contiene un prioridad 3.
  const svc3 = nuevoServicio();
  svc3.crearEvento({ id: 100, magnitud: 2.0, profundidad: 10, epicentro: { x: 100, y: 100 }, fechaHora: horas(200) }, "E1");
  svc3.crearEvento({ id: 200, magnitud: 6.5, profundidad: 10, epicentro: { x: 200, y: 200 }, fechaHora: horas(150) }, "E1"); // prioridad 3
  svc3.crearEvento({ id: 50,  magnitud: 2.5, profundidad: 10, epicentro: { x: 150, y: 150 }, fechaHora: horas(190) }, "E1");
  const p3 = svc3.previsualizarArchivo();
  // La raíz no puede ser la de prioridad 3; el resultado debe ser un subárbol de puros bajos
  paso(pasos, "Rama con descendiente de prioridad alta no se archiva completa",
    p3.exito && !p3.ids.includes(200),
    "ids=" + (p3.ids || []).join(","));

  // Ejecutar archivo + undo
  const antes = svc.porId.size;
  const rArch = svc.archivarRama();
  const despues = svc.porId.size;
  const hist = svc.escenario.historicos.length;
  paso(pasos, "Archivar mueve eventos al histórico",
    rArch.exito && despues === antes - rArch.ids.length && hist === rArch.ids.length,
    `activos ${antes}→${despues}, hist=${hist}`);

  svc.deshacer();
  paso(pasos, "Deshacer archivo restaura exactamente el estado",
    svc.porId.size === antes && svc.escenario.historicos.length === 0,
    `activos=${svc.porId.size}, hist=${svc.escenario.historicos.length}`);

  return { titulo: "Caso 5 — Archivo masivo", pasos, exito: pasos.every(p => p.ok) };
}

// ---------- CASO 6: Persistencia y consistencia ----------
export function caso6_PersistenciaYConsistencia() {
  const pasos = [];

  // 1) Exportar e importar topología normal
  const svc = nuevoServicio();
  [10, 20, 30, 40, 50].forEach(id => {
    svc.crearEvento({
      id, magnitud: 6.0, profundidad: 10,
      epicentro: { x: 100, y: 100 },
      fechaHora: new Date("2026-01-01T10:00:00Z"),
    }, "E1");
  });
  const json = svc.exportarEstado();
  const svc2 = nuevoServicio();
  const r1 = svc2.cargarEstado(json);
  paso(pasos, "Carga por topología (normal) exitosa",
    r1.exito && r1.modoCarga === "topologia",
    "modo=" + r1.modoCarga);
  paso(pasos, "Estado importado tiene los mismos 5 eventos",
    svc2.avl.porNiveles().length === 5,
    "n=" + svc2.avl.porNiveles().length);
  paso(pasos, "Inorden idéntico tras importar",
    okEq(svc.avl.inorden().map(n => n.getClave().id), svc2.avl.inorden().map(n => n.getClave().id)),
    "");

  // 2) Exportar e importar topología en estrés
  const svcE = nuevoServicio();
  svcE.activarModoEstres();
  for (let i = 1; i <= 7; i++) {
    svcE.crearEvento({
      id: i, magnitud: 1.0, profundidad: 10,
      epicentro: { x: 0, y: 0 }, fechaHora: new Date("2026-01-01T10:00:00Z"),
    }, "E1");
  }
  const jsonE = svcE.exportarEstado();
  const svcE2 = nuevoServicio();
  const rE = svcE2.cargarEstado(jsonE);
  paso(pasos, "Carga topología en estrés exitosa",
    rE.exito && svcE2.escenario.modo === "estres",
    "modo=" + svcE2.escenario.modo);

  // 3) Rechazar archivo inconsistente
  const malo = JSON.parse(JSON.stringify(json));
  malo.avl.nodos[0].izq = malo.avl.nodos[0].der; // duplicar referencia → ciclo/padre múltiple
  const svc3 = nuevoServicio();
  const r3 = svc3.cargarEstado(malo);
  paso(pasos, "Archivo con referencia inválida es rechazado",
    !r3.exito && (r3.problemas?.length > 0),
    "problemas=" + (r3.problemas?.length || 0));
  paso(pasos, "Estado anterior intacto tras rechazo",
    svc3.avl.porNiveles().length === 0,
    "activos=" + svc3.avl.porNiveles().length);

  // 4) Versión persistente + deshacer restauración
  const svc4 = nuevoServicio();
  svc4.crearEvento({ id: 99, magnitud: 6.0, profundidad: 10, epicentro: { x: 0, y: 0 }, fechaHora: new Date("2026-01-01T10:00:00Z") }, "E1");
  svc4.guardarVersionConNombre("test-caso6");
  svc4.crearEvento({ id: 100, magnitud: 6.0, profundidad: 10, epicentro: { x: 0, y: 0 }, fechaHora: new Date("2026-01-01T10:00:00Z") }, "E1");
  paso(pasos, "Antes de restaurar hay 2 eventos",
    svc4.porId.size === 2, "n=" + svc4.porId.size);
  svc4.restaurarVersion("test-caso6");
  paso(pasos, "Restaurar deja 1 evento (el del snapshot)",
    svc4.porId.size === 1, "n=" + svc4.porId.size);
  svc4.deshacer();
  paso(pasos, "Deshacer restauración vuelve a 2 eventos",
    svc4.porId.size === 2, "n=" + svc4.porId.size);
  svc4.eliminarVersionGuardada("test-caso6");

  // 5) Deshacer corrección y paso de cola
  const svc5 = nuevoServicio();
  svc5.crearEvento({ id: 1, magnitud: 4.8, profundidad: 70, epicentro: { x: 750, y: 750 }, fechaHora: new Date("2026-01-01T10:00:00Z") }, "E1");
  svc5.corregirEvento(1, { magnitud: 6.2, profundidad: 15 });
  svc5.deshacer();
  paso(pasos, "Deshacer corrección restaura M=4.8, P=2, rev=1",
    svc5.porId.get(1).magnitud === 4.8 && svc5.porId.get(1).prioridad === 2 && svc5.porId.get(1).revision === 1,
    `M=${svc5.porId.get(1).magnitud} P=${svc5.porId.get(1).prioridad} rev=${svc5.porId.get(1).revision}`);

  const svc6 = nuevoServicio();
  svc6.encolarReporte(crearReporte({
    id: 77, magnitud: 5.0, profundidad: 10, epicentro: { x: 100, y: 100 },
    fechaHora: new Date("2026-01-01T10:00:00Z"), revision: 1, estacion: "E1",
  }));
  svc6.procesarSiguienteReporte();
  const colaDespues = svc6.colaReportes.tamano();
  svc6.deshacer();
  paso(pasos, "Deshacer paso de cola devuelve el reporte al frente",
    svc6.colaReportes.tamano() === colaDespues + 1 && !svc6.porId.has(77),
    "cola=" + svc6.colaReportes.tamano() + " existe77=" + svc6.porId.has(77));

  return { titulo: "Caso 6 — Persistencia y consistencia", pasos, exito: pasos.every(p => p.ok) };
}

// ---------- Correr todos ----------
export function correrTodos() {
  return [
    caso1_LimitesYEmpates(),
    caso2_CorreccionYReporteAntiguo(),
    caso3_ReporteTardio(),
    caso4_RotacionesYRecuperacion(),
    caso5_ArchivoMasivo(),
    caso6_PersistenciaYConsistencia(),
  ];
}