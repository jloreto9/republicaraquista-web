import assert from "node:assert/strict";

// 1. Simulación de la lógica canónica implementada en getVenezuelanToday
function getVenezuelanToday(simulatedDate = new Date()) {
  try {
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Caracas",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    const dateString = formatter.format(simulatedDate);
    const [yearStr, monthStr, dayStr] = dateString.split("-");
    return {
      year: parseInt(yearStr, 10),
      month: parseInt(monthStr, 10),
      day: parseInt(dayStr, 10),
      dateString,
    };
  } catch {
    const vet = new Date(simulatedDate.getTime() - 4 * 3600 * 1000);
    const dateString = vet.toISOString().slice(0, 10);
    const [yearStr, monthStr, dayStr] = dateString.split("-");
    return {
      year: parseInt(yearStr, 10),
      month: parseInt(monthStr, 10),
      day: parseInt(dayStr, 10),
      dateString,
    };
  }
}

// 2. Simulación de la selección de mes inicial en CalendarView
function resolveInitialMonth(availableMonths, todayObj) {
  if (availableMonths.includes(todayObj.month)) {
    return todayObj.month;
  }
  return availableMonths[0] ?? 10;
}

// 3. Simulación de detección de celda de hoy en CalendarGrid
function isCellToday(year, month, dayNumber, todayObj) {
  return (
    todayObj.year === year &&
    todayObj.month === month &&
    todayObj.day === dayNumber
  );
}

function runTests() {
  console.log("🧪 Validando selección automática de mes y marcado de día actual...");

  // Prueba A: Fecha actual real en Venezuela (UTC-4)
  const currentToday = getVenezuelanToday();
  assert.ok(currentToday.year >= 2026, "El año debe ser 2026 o posterior");
  assert.ok(currentToday.month >= 1 && currentToday.month <= 12, "El mes debe estar entre 1 y 12");
  assert.ok(currentToday.day >= 1 && currentToday.day <= 31, "El día debe estar entre 1 y 31");
  assert.match(currentToday.dateString, /^\d{4}-\d{2}-\d{2}$/, "El formato debe ser YYYY-MM-DD");
  console.log(`✅ Fecha detectada en Venezuela: ${currentToday.dateString} (Mes: ${currentToday.month}, Día: ${currentToday.day})`);

  // Prueba B: Si estamos en Noviembre (mes 11), debe seleccionar automáticamente Noviembre
  const availableMonths = [10, 11, 12];
  const simNov = { year: 2026, month: 11, day: 2, dateString: "2026-11-02" };
  const selectedMonthNov = resolveInitialMonth(availableMonths, simNov);
  assert.strictEqual(selectedMonthNov, 11, "En noviembre debe cargar automáticamente el mes 11");
  console.log("✅ Mes activo inicial en Noviembre resuelto a: 11");

  // Prueba C: Si estamos en Diciembre (mes 12), debe seleccionar Diciembre
  const simDec = { year: 2026, month: 12, day: 15, dateString: "2026-12-15" };
  const selectedMonthDec = resolveInitialMonth(availableMonths, simDec);
  assert.strictEqual(selectedMonthDec, 12, "En diciembre debe cargar automáticamente el mes 12");
  console.log("✅ Mes activo inicial en Diciembre resuelto a: 12");

  // Prueba D: Si la fecha es previa al inicio de temporada (ej. Septiembre, mes 9), fallback al primer mes disponible (10)
  const simSep = { year: 2026, month: 9, day: 20, dateString: "2026-09-20" };
  const selectedMonthSep = resolveInitialMonth(availableMonths, simSep);
  assert.strictEqual(selectedMonthSep, 10, "Antes de la temporada regular debe fallback al mes 10");
  console.log("✅ Fallback de pretemporada verificado: 10 (Octubre)");

  // Prueba E: Marcado de celda isToday en la cuadrícula
  assert.strictEqual(isCellToday(2026, 11, 2, simNov), true, "El 2 de Noviembre debe marcar isToday=true");
  assert.strictEqual(isCellToday(2026, 11, 3, simNov), false, "El 3 de Noviembre debe marcar isToday=false");
  assert.strictEqual(isCellToday(2026, 10, 2, simNov), false, "El 2 de Octubre en mes 10 no debe ser hoy si estamos en Noviembre");
  console.log("✅ Verificación de isToday en celdas de cuadrícula exitosa");

  console.log("🎉 Todas las pruebas de selección de mes y día actual pasaron exitosamente.");
}

runTests();
