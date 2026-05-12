/**
 * Parsea una duración escrita por el usuario y devuelve segundos.
 *
 * Acepta:
 *   ""        → null   (limpiar)
 *   "30"      → 1800   (asume minutos)
 *   "30m"     → 1800
 *   "30 min"  → 1800
 *   "1h"      → 3600
 *   "1h 30m"  → 5400
 *   "30m 45s" → 1845
 *   "45s"     → 45
 *   "30:45"   → 1845   (mm:ss)
 *   "1:30:00" → 5400   (hh:mm:ss)
 *
 * Devuelve 'invalid' si el formato no encaja.
 */
export function parseDuracion(raw: string): number | null | 'invalid' {
	const trimmed = raw.trim().toLowerCase();
	if (!trimmed) return null;

	// hh:mm:ss o mm:ss
	const colonMatch = trimmed.match(/^(\d+):(\d{1,2})(?::(\d{1,2}))?$/);
	if (colonMatch) {
		const a = Number(colonMatch[1]);
		const b = Number(colonMatch[2]);
		const c = colonMatch[3] !== undefined ? Number(colonMatch[3]) : null;
		if (c === null) return a * 60 + b; // mm:ss
		return a * 3600 + b * 60 + c; // hh:mm:ss
	}

	// solo dígitos → asume minutos
	if (/^\d+$/.test(trimmed)) {
		return Number(trimmed) * 60;
	}

	// h/m/s con números
	const tokenRe = /(\d+)\s*(h|m|s|min|hr|hrs|hora|horas|seg|segs)\b/g;
	let total = 0;
	let matched = false;
	let m: RegExpExecArray | null;
	while ((m = tokenRe.exec(trimmed)) !== null) {
		matched = true;
		const n = Number(m[1]);
		const unit = m[2];
		if (unit.startsWith('h')) total += n * 3600;
		else if (unit === 's' || unit.startsWith('seg')) total += n;
		else total += n * 60; // m, min
	}
	if (matched) return total;

	return 'invalid';
}
