import mammoth from 'mammoth';

export type ScriptExt = '.docx' | '.doc' | '.pdf';

export function getScriptExt(filename: string): ScriptExt | null {
	const lower = filename.toLowerCase();
	if (lower.endsWith('.docx')) return '.docx';
	if (lower.endsWith('.pdf')) return '.pdf';
	if (lower.endsWith('.doc')) return '.doc';
	return null;
}

/**
 * Extrae texto plano de un script para mandárselo al agente.
 * .docx → mammoth (reading order semántico, sin indentación)
 * .pdf  → pdfjs-dist con reconstrucción de indentación a partir de la posición X
 *
 * Devuelve string vacío si el archivo no tiene texto extraíble (caso
 * típico: PDF escaneado/imagen). El llamador debe checar y devolver
 * un error claro al usuario.
 */
export async function extractScriptText(buffer: Buffer, ext: ScriptExt): Promise<string> {
	if (ext === '.docx' || ext === '.doc') {
		const { value } = await mammoth.extractRawText({ buffer });
		return value.trim();
	}

	if (ext === '.pdf') {
		return extractPdfText(buffer);
	}

	throw new Error(`Extensión no soportada: ${ext}`);
}

// Ancho aproximado de un caracter monoespaciado a 12pt — convención de guion
// (Courier 12pt en Final Draft). PDFs usan puntos PostScript (72/pulgada);
// Courier 12pt ≈ 7.2pt por caracter. Si el PDF usa otra fuente la indentación
// queda aproximada pero conserva la estructura relativa.
const CHAR_WIDTH_PT = 7.2;
// Cap de líneas en blanco insertadas entre párrafos para evitar gaps absurdos
// (saltos de sección, page-breaks marcados con espacio gigante, etc.).
const MAX_BLANK_LINES = 3;

async function extractPdfText(buffer: Buffer): Promise<string> {
	const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
	const data = new Uint8Array(buffer);
	const pdf = await pdfjs.getDocument({
		data,
		useSystemFonts: false
	}).promise;

	const allLines: string[] = [];

	for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
		const page = await pdf.getPage(pageNum);
		const content = await page.getTextContent();

		// 1. Agrupa items por línea, capturando posición X e Y de cada uno.
		type LineItem = { str: string; x: number; y: number };
		const lineGroups: LineItem[][] = [];
		let currentLine: LineItem[] = [];
		let pageMinX = Infinity;

		for (const item of content.items) {
			if (!('str' in item)) continue;
			// transform = [a, b, c, d, e, f] — matriz 2D; e=x, f=y (Y crece hacia ARRIBA en PDF).
			const transform = (item as { transform?: number[] }).transform;
			const x = Array.isArray(transform) ? (transform[4] ?? 0) : 0;
			const y = Array.isArray(transform) ? (transform[5] ?? 0) : 0;
			if (item.str.length > 0 && x < pageMinX) pageMinX = x;

			currentLine.push({ str: item.str, x, y });

			const hasEOL =
				'hasEOL' in item && (item as { hasEOL?: boolean }).hasEOL === true;
			if (hasEOL) {
				lineGroups.push(currentLine);
				currentLine = [];
			}
		}
		if (currentLine.length > 0) lineGroups.push(currentLine);

		// Si no encontramos nada con coordenada, el offset es 0.
		if (!Number.isFinite(pageMinX)) pageMinX = 0;

		// 2. Calcula el line-height "natural" de la página tomando la mediana
		//    de los gaps Y entre líneas consecutivas. Eso nos sirve como
		//    referencia para detectar líneas en blanco (gap > ~2× line-height).
		const lineYs = lineGroups.map((line) => (line.length > 0 ? line[0].y : null));
		const positiveGaps: number[] = [];
		for (let i = 1; i < lineYs.length; i++) {
			const a = lineYs[i - 1];
			const b = lineYs[i];
			if (a !== null && b !== null) {
				const gap = a - b; // positivo porque Y decrece hacia abajo
				if (gap > 0.1) positiveGaps.push(gap);
			}
		}
		positiveGaps.sort((a, b) => a - b);
		const baseLineHeight =
			positiveGaps.length > 0 ? positiveGaps[Math.floor(positiveGaps.length / 2)] : 14;

		// 3. Reconstruye cada línea: leading spaces proporcionales a la
		//    distancia desde el margen izquierdo + blank lines entre párrafos
		//    según el gap Y vs line-height base.
		for (let li = 0; li < lineGroups.length; li++) {
			const line = lineGroups[li];

			// Inserta líneas en blanco si el gap vertical desde la línea previa es mayor
			// que un line-height (cota: MAX_BLANK_LINES).
			if (li > 0) {
				const prevY = lineYs[li - 1];
				const currY = lineYs[li];
				if (prevY !== null && currY !== null) {
					const gap = prevY - currY;
					const extraLines = Math.max(
						0,
						Math.min(MAX_BLANK_LINES, Math.round(gap / baseLineHeight) - 1)
					);
					for (let b = 0; b < extraLines; b++) allLines.push('');
				}
			}

			if (line.length === 0) {
				allLines.push('');
				continue;
			}
			const first = line[0];
			const leadingSpaces = Math.max(
				0,
				Math.round((first.x - pageMinX) / CHAR_WIDTH_PT)
			);

			let lineText = ' '.repeat(leadingSpaces) + first.str;
			for (let i = 1; i < line.length; i++) {
				const prev = line[i - 1];
				const curr = line[i];
				// Estimamos el final del item previo asumiendo monospace.
				// Los items de pdfjs ya separan texto cuando hay cambio de fuente
				// o gap, así que esto solo afina el espacio intermedio.
				const prevEndX = prev.x + prev.str.length * CHAR_WIDTH_PT;
				const gap = Math.round((curr.x - prevEndX) / CHAR_WIDTH_PT);
				// Mínimo 1 espacio entre items consecutivos, más si el gap es grande.
				lineText += ' '.repeat(Math.max(1, gap)) + curr.str;
			}
			// Limpia trailing whitespace pero conserva el leading (indentación).
			allLines.push(lineText.replace(/\s+$/, ''));
		}

		// Page break: línea vacía para que el agente no confunda continuidad entre páginas.
		allLines.push('');
	}

	await pdf.destroy();

	return allLines.join('\n').trim();
}
