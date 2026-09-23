// src/domain/Asociaciones.js

// Distancia euclídea entre epicentros, en km.
export function distanciaEuclidea(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

// Diferencia temporal en horas (b.fecha - a.fecha).
// Positivo si b ocurrió después de a.
export function diferenciaHoras(a, b) {
  return (b.getTime() - a.getTime()) / (1000 * 60 * 60);
}

// ¿"candidato" es candidato a referencia de "referencia"?
export function esCandidato(candidato, referencia, W, R) {
  // 1) Mayor magnitud
  if (!(candidato.magnitud > referencia.magnitud)) return false;
  // 2) Estrictamente antes
  if (!(candidato.fechaHora.getTime() < referencia.fechaHora.getTime())) return false;
  // 3) Ventana temporal <= W horas
  if (diferenciaHoras(candidato.fechaHora, referencia.fechaHora) > W) return false;
  // 4) Distancia <= R km
  if (distanciaEuclidea(candidato.epicentro, referencia.epicentro) > R) return false;
  return true;
}

// Devuelve todos los candidatos a referencia de "evento"
// entre "pool" (activos + históricos).
export function buscarCandidatos(evento, pool, W, R) {
  const resultado = [];
  for (const otro of pool) {
    if (otro.id === evento.id) continue; // no es candidato de sí mismo
    if (esCandidato(otro, evento, W, R)) resultado.push(otro);
  }
  return resultado;
}

// Elige la referencia según la política determinista.
// Devuelve null si la lista está vacía.
export function elegirReferencia(evento, candidatos) {
  if (candidatos.length === 0) return null;
  const copia = [...candidatos];
  copia.sort((a, b) => {
    // 1) mayor magnitud primero
    if (a.magnitud !== b.magnitud) return b.magnitud - a.magnitud;
    // 2) menor diferencia temporal
    const dtA = diferenciaHoras(a.fechaHora, evento.fechaHora);
    const dtB = diferenciaHoras(b.fechaHora, evento.fechaHora);
    if (dtA !== dtB) return dtA - dtB;
    // 3) menor distancia euclídea
    const distA = distanciaEuclidea(a.epicentro, evento.epicentro);
    const distB = distanciaEuclidea(b.epicentro, evento.epicentro);
    if (distA !== distB) return distA - distB;
    // 4) menor id
    return a.id - b.id;
  });
  return copia[0];
}

// Eventos que usan a "referencia" como su referencia elegida.
export function referenciadosPor(referencia, pool, W, R) {
  const resultado = [];
  for (const otro of pool) {
    if (otro.id === referencia.id) continue;
    const candidatos = buscarCandidatos(otro, pool, W, R);
    const elegida = elegirReferencia(otro, candidatos);
    if (elegida && elegida.id === referencia.id) resultado.push(otro);
  }
  return resultado;
}