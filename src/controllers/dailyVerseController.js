const { supabaseAdmin } = require('../config/supabase');

// Versículo del día.
//
// Fuente: bolls.life (nginx pelado, sin Cloudflare ni protección anti-bots). Antes esto
// pegaba al "verse of the day" de BibleGateway, que desde el servidor de producción
// devuelve 403: bloquean los rangos de IP de datacenter. Desde una conexión hogareña
// andaba, por eso pasaba los tests locales.
const API = (traduccion, libro, capitulo, versiculo) =>
  `https://bolls.life/get-verse/${traduccion}/${libro}/${capitulo}/${versiculo}/`;

// Clave guardada en companies.daily_verse_version -> id de la traducción en bolls.
// TLA quedó afuera: no existe en ninguna API gratuita.
const VERSIONES = {
  RVR1960: 'RV1960',
  NVI: 'NVI',
  PDT: 'PDT',
};
const VERSION_DEFAULT = 'RVR1960';

const LIBROS = {
  'Génesis': 1, 'Éxodo': 2, 'Levítico': 3, 'Números': 4, 'Deuteronomio': 5,
  'Josué': 6, 'Jueces': 7, 'Rut': 8, '1 Samuel': 9, '2 Samuel': 10,
  '1 Reyes': 11, '2 Reyes': 12, '1 Crónicas': 13, '2 Crónicas': 14, 'Esdras': 15,
  'Nehemías': 16, 'Ester': 17, 'Job': 18, 'Salmos': 19, 'Proverbios': 20,
  'Eclesiastés': 21, 'Cantares': 22, 'Isaías': 23, 'Jeremías': 24, 'Lamentaciones': 25,
  'Ezequiel': 26, 'Daniel': 27, 'Oseas': 28, 'Joel': 29, 'Amós': 30,
  'Abdías': 31, 'Jonás': 32, 'Miqueas': 33, 'Nahúm': 34, 'Habacuc': 35,
  'Sofonías': 36, 'Hageo': 37, 'Zacarías': 38, 'Malaquías': 39, 'Mateo': 40,
  'Marcos': 41, 'Lucas': 42, 'Juan': 43, 'Hechos': 44, 'Romanos': 45,
  '1 Corintios': 46, '2 Corintios': 47, 'Gálatas': 48, 'Efesios': 49, 'Filipenses': 50,
  'Colosenses': 51, '1 Tesalonicenses': 52, '2 Tesalonicenses': 53, '1 Timoteo': 54, '2 Timoteo': 55,
  'Tito': 56, 'Filemón': 57, 'Hebreos': 58, 'Santiago': 59, '1 Pedro': 60,
  '2 Pedro': 61, '1 Juan': 62, '2 Juan': 63, '3 Juan': 64, 'Judas': 65,
  'Apocalipsis': 66,
};

// Uno por día del año (366 para cubrir los bisiestos). Intercalados por libro para que
// dos días seguidos no caigan siempre en el mismo.
const VERSICULOS = [
  ['Salmos', 1, 1], ['Proverbios', 1, 7], ['Isaías', 1, 18], ['Mateo', 5, 3],
  ['Juan', 1, 1], ['Romanos', 1, 16], ['Jeremías', 1, 5], ['Lamentaciones', 3, 22],
  ['Josué', 1, 8], ['Deuteronomio', 6, 5], ['Éxodo', 14, 14], ['Génesis', 1, 1],
  ['Números', 6, 24], ['1 Samuel', 16, 7], ['2 Crónicas', 7, 14], ['Nehemías', 8, 10],
  ['Job', 19, 25], ['Eclesiastés', 3, 1], ['Miqueas', 6, 8], ['Sofonías', 3, 17],
  ['Habacuc', 3, 19], ['Malaquías', 3, 10], ['Daniel', 2, 20], ['Ezequiel', 36, 26],
  ['Oseas', 6, 3], ['Joel', 2, 25], ['Jonás', 2, 2], ['Zacarías', 4, 6],
  ['Nahúm', 1, 7], ['Amós', 5, 24], ['Marcos', 9, 23], ['Lucas', 1, 37],
  ['Hechos', 1, 8], ['1 Corintios', 1, 9], ['2 Corintios', 1, 3], ['Gálatas', 2, 20],
  ['Efesios', 1, 7], ['Filipenses', 1, 6], ['Colosenses', 1, 16], ['1 Tesalonicenses', 5, 11],
  ['2 Tesalonicenses', 3, 3], ['1 Timoteo', 4, 12], ['2 Timoteo', 1, 7], ['Tito', 3, 5],
  ['Hebreos', 4, 12], ['Santiago', 1, 2], ['1 Pedro', 1, 3], ['2 Pedro', 1, 3],
  ['1 Juan', 1, 9], ['3 Juan', 1, 4], ['Judas', 1, 24], ['Apocalipsis', 1, 8],
  ['Salmos', 1, 2], ['Proverbios', 2, 6], ['Isaías', 6, 8], ['Mateo', 5, 6],
  ['Juan', 1, 12], ['Romanos', 3, 23], ['Jeremías', 17, 7], ['Lamentaciones', 3, 23],
  ['Josué', 1, 9], ['Deuteronomio', 31, 6], ['Éxodo', 15, 2], ['Génesis', 1, 27],
  ['2 Crónicas', 16, 9], ['Eclesiastés', 3, 11], ['Miqueas', 7, 7], ['Marcos', 10, 27],
  ['Lucas', 6, 31], ['Hechos', 2, 38], ['1 Corintios', 2, 9], ['2 Corintios', 3, 17],
  ['Gálatas', 5, 1], ['Efesios', 2, 8], ['Filipenses', 2, 3], ['Colosenses', 2, 6],
  ['1 Tesalonicenses', 5, 16], ['1 Timoteo', 6, 6], ['2 Timoteo', 2, 15], ['Hebreos', 4, 16],
  ['Santiago', 1, 5], ['1 Pedro', 2, 9], ['2 Pedro', 3, 9], ['1 Juan', 3, 1],
  ['Apocalipsis', 3, 20], ['Salmos', 3, 3], ['Proverbios', 3, 1], ['Isaías', 9, 6],
  ['Mateo', 5, 9], ['Juan', 3, 16], ['Romanos', 5, 1], ['Jeremías', 29, 11],
  ['Lamentaciones', 3, 25], ['Josué', 24, 15], ['Deuteronomio', 31, 8], ['Éxodo', 33, 14],
  ['Génesis', 28, 15], ['Eclesiastés', 4, 9], ['Marcos', 10, 45], ['Lucas', 6, 38],
  ['Hechos', 4, 12], ['1 Corintios', 6, 19], ['2 Corintios', 4, 16], ['Gálatas', 5, 13],
  ['Efesios', 2, 10], ['Filipenses', 2, 4], ['Colosenses', 3, 2], ['1 Tesalonicenses', 5, 17],
  ['1 Timoteo', 6, 12], ['2 Timoteo', 3, 16], ['Hebreos', 6, 10], ['Santiago', 1, 12],
  ['1 Pedro', 3, 15], ['1 Juan', 3, 18], ['Apocalipsis', 21, 4], ['Salmos', 4, 8],
  ['Proverbios', 3, 5], ['Isaías', 12, 2], ['Mateo', 5, 14], ['Juan', 3, 17],
  ['Romanos', 5, 5], ['Jeremías', 29, 12], ['Génesis', 50, 20], ['Eclesiastés', 4, 12],
  ['Marcos', 11, 24], ['Lucas', 9, 23], ['Hechos', 16, 31], ['1 Corintios', 9, 24],
  ['2 Corintios', 4, 18], ['Gálatas', 5, 22], ['Efesios', 3, 20], ['Filipenses', 2, 13],
  ['Colosenses', 3, 12], ['1 Tesalonicenses', 5, 18], ['2 Timoteo', 4, 7], ['Hebreos', 10, 23],
  ['Santiago', 1, 17], ['1 Pedro', 4, 10], ['1 Juan', 4, 7], ['Apocalipsis', 22, 13],
  ['Salmos', 5, 3], ['Proverbios', 3, 6], ['Isaías', 25, 1], ['Mateo', 5, 16],
  ['Juan', 4, 24], ['Romanos', 5, 8], ['Jeremías', 31, 3], ['Marcos', 12, 30],
  ['Lucas', 10, 27], ['Hechos', 20, 35], ['1 Corintios', 10, 13], ['2 Corintios', 5, 7],
  ['Gálatas', 6, 2], ['Efesios', 4, 2], ['Filipenses', 3, 13], ['Colosenses', 3, 13],
  ['Hebreos', 10, 24], ['Santiago', 1, 19], ['1 Pedro', 5, 6], ['1 Juan', 4, 8],
  ['Salmos', 8, 1], ['Proverbios', 3, 9], ['Isaías', 26, 3], ['Mateo', 5, 44],
  ['Juan', 6, 35], ['Romanos', 6, 23], ['Jeremías', 32, 17], ['Marcos', 16, 15],
  ['Lucas', 11, 9], ['1 Corintios', 10, 31], ['2 Corintios', 5, 17], ['Gálatas', 6, 9],
  ['Efesios', 4, 29], ['Filipenses', 3, 14], ['Colosenses', 3, 15], ['Hebreos', 11, 1],
  ['Santiago', 1, 22], ['1 Pedro', 5, 7], ['1 Juan', 4, 16], ['Salmos', 9, 1],
  ['Proverbios', 4, 23], ['Isaías', 30, 21], ['Mateo', 6, 14], ['Juan', 8, 12],
  ['Romanos', 8, 1], ['Jeremías', 33, 3], ['Lucas', 12, 7], ['1 Corintios', 12, 27],
  ['2 Corintios', 9, 7], ['Efesios', 4, 32], ['Filipenses', 4, 4], ['Colosenses', 3, 16],
  ['Hebreos', 11, 6], ['Santiago', 2, 17], ['1 Pedro', 5, 8], ['1 Juan', 4, 18],
  ['Salmos', 9, 9], ['Proverbios', 6, 6], ['Isaías', 32, 17], ['Mateo', 6, 21],
  ['Juan', 8, 32], ['Romanos', 8, 6], ['Lucas', 15, 7], ['1 Corintios', 13, 2],
  ['2 Corintios', 9, 8], ['Efesios', 5, 2], ['Filipenses', 4, 6], ['Colosenses', 3, 23],
  ['Hebreos', 12, 1], ['Santiago', 4, 8], ['1 Juan', 4, 19], ['Salmos', 16, 8],
  ['Proverbios', 10, 12], ['Isaías', 40, 8], ['Mateo', 6, 26], ['Juan', 10, 10],
  ['Romanos', 8, 18], ['Lucas', 18, 27], ['1 Corintios', 13, 4], ['2 Corintios', 12, 9],
  ['Efesios', 6, 10], ['Filipenses', 4, 7], ['Hebreos', 12, 2], ['Santiago', 5, 16],
  ['1 Juan', 5, 14], ['Salmos', 16, 11], ['Proverbios', 11, 25], ['Isaías', 40, 29],
  ['Mateo', 6, 33], ['Juan', 10, 27], ['Romanos', 8, 26], ['Lucas', 21, 33],
  ['1 Corintios', 13, 7], ['2 Corintios', 13, 11], ['Efesios', 6, 11], ['Filipenses', 4, 8],
  ['Hebreos', 13, 5], ['Salmos', 18, 2], ['Proverbios', 12, 25], ['Isaías', 40, 31],
  ['Mateo', 7, 7], ['Juan', 11, 25], ['Romanos', 8, 28], ['1 Corintios', 13, 13],
  ['Filipenses', 4, 13], ['Hebreos', 13, 8], ['Salmos', 18, 32], ['Proverbios', 13, 20],
  ['Isaías', 41, 10], ['Mateo', 7, 12], ['Juan', 13, 34], ['Romanos', 8, 31],
  ['1 Corintios', 15, 58], ['Filipenses', 4, 19], ['Salmos', 19, 1], ['Proverbios', 14, 29],
  ['Isaías', 41, 13], ['Mateo', 9, 37], ['Juan', 14, 1], ['Romanos', 8, 37],
  ['1 Corintios', 16, 14], ['Salmos', 19, 14], ['Proverbios', 15, 1], ['Isaías', 43, 1],
  ['Mateo', 11, 28], ['Juan', 14, 6], ['Romanos', 8, 38], ['Salmos', 20, 4],
  ['Proverbios', 15, 13], ['Isaías', 43, 2], ['Mateo', 11, 29], ['Juan', 14, 15],
  ['Romanos', 10, 9], ['Salmos', 23, 1], ['Proverbios', 16, 3], ['Isaías', 43, 19],
  ['Mateo', 16, 24], ['Juan', 14, 27], ['Romanos', 10, 17], ['Salmos', 23, 2],
  ['Proverbios', 16, 9], ['Isaías', 46, 4], ['Mateo', 17, 20], ['Juan', 15, 5],
  ['Romanos', 12, 1], ['Salmos', 23, 3], ['Proverbios', 16, 24], ['Isaías', 49, 15],
  ['Mateo', 18, 20], ['Juan', 15, 12], ['Romanos', 12, 2], ['Salmos', 23, 4],
  ['Proverbios', 17, 17], ['Isaías', 53, 5], ['Mateo', 19, 26], ['Juan', 15, 13],
  ['Romanos', 12, 10], ['Salmos', 23, 6], ['Proverbios', 17, 22], ['Isaías', 54, 10],
  ['Mateo', 21, 22], ['Juan', 16, 33], ['Romanos', 12, 12], ['Salmos', 25, 4],
  ['Proverbios', 18, 10], ['Isaías', 55, 6], ['Mateo', 22, 37], ['Juan', 17, 3],
  ['Romanos', 12, 21], ['Salmos', 25, 5], ['Proverbios', 18, 24], ['Isaías', 55, 8],
  ['Mateo', 25, 40], ['Juan', 20, 29], ['Romanos', 14, 8], ['Salmos', 27, 1],
  ['Proverbios', 19, 21], ['Isaías', 55, 11], ['Mateo', 28, 19], ['Romanos', 15, 4],
  ['Salmos', 27, 4], ['Proverbios', 20, 7], ['Isaías', 58, 11], ['Mateo', 28, 20],
  ['Romanos', 15, 13], ['Salmos', 27, 14], ['Proverbios', 21, 21], ['Isaías', 61, 1],
  ['Salmos', 28, 7], ['Proverbios', 22, 6], ['Isaías', 64, 8], ['Salmos', 29, 11],
  ['Proverbios', 23, 12], ['Isaías', 66, 13], ['Salmos', 30, 5], ['Proverbios', 24, 16],
  ['Salmos', 31, 24], ['Proverbios', 27, 17], ['Salmos', 32, 8], ['Proverbios', 28, 13],
  ['Salmos', 33, 4], ['Proverbios', 29, 25], ['Salmos', 34, 1], ['Proverbios', 30, 5],
  ['Salmos', 34, 4], ['Proverbios', 31, 25], ['Salmos', 34, 8], ['Proverbios', 31, 30],
  ['Salmos', 34, 17], ['Salmos', 34, 18], ['Salmos', 36, 5], ['Salmos', 37, 3],
  ['Salmos', 37, 4], ['Salmos', 37, 5], ['Salmos', 37, 7], ['Salmos', 37, 23],
  ['Salmos', 40, 1], ['Salmos', 42, 1], ['Salmos', 42, 11], ['Salmos', 46, 1],
  ['Salmos', 46, 10], ['Salmos', 51, 10], ['Salmos', 55, 22], ['Salmos', 56, 3],
  ['Salmos', 62, 1], ['Salmos', 62, 8],
];

// { [version]: { date, data } }
const cache = {};

// Hoy en zona horaria de Argentina (YYYY-MM-DD), igual que el resto de los services.
const today = () =>
  new Date().toLocaleDateString('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' });

const diaDelAnio = (fecha) => {
  const [y, m, d] = fecha.split('-').map(Number);
  return Math.round((Date.UTC(y, m - 1, d) - Date.UTC(y, 0, 1)) / 86400000);
};

// bolls devuelve el texto con saltos de linea y a veces etiquetas de nota al pie.
const limpiar = (texto = '') =>
  String(texto)
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/^['"»«\s]+|['"\s]+$/g, '')
    .trim();

const dailyVerseController = {
  // GET /api/daily-verse -> { success, data: { text, reference, version, date } | null }
  // data === null cuando la empresa lo tiene deshabilitado.
  get: async (req, res, next) => {
    const date = today();

    let version = VERSION_DEFAULT;
    try {
      const { data: company } = await supabaseAdmin
        .from('companies')
        .select('daily_verse_enabled, daily_verse_version')
        .eq('id', req.companyId)
        .single();

      if (company?.daily_verse_enabled === false) {
        return res.json({ success: true, data: null });
      }
      if (VERSIONES[company?.daily_verse_version]) {
        version = company.daily_verse_version;
      }
    } catch {
      // Si la empresa no se pudo leer (o falta la migracion) seguimos con el default.
    }

    const cached = cache[version];
    if (cached?.date === date) {
      return res.json({ success: true, data: cached.data });
    }

    const [libro, capitulo, versiculo] = VERSICULOS[diaDelAnio(date) % VERSICULOS.length];

    try {
      const response = await fetch(API(VERSIONES[version], LIBROS[libro], capitulo, versiculo), {
        signal: AbortSignal.timeout(8000),
      });
      if (!response.ok) throw new Error(`bolls respondio ${response.status}`);

      const json = await response.json();
      const text = limpiar(json?.text);
      if (!text) throw new Error(`Sin texto para ${libro} ${capitulo}:${versiculo} en ${version}`);

      const data = { text, reference: `${libro} ${capitulo}:${versiculo}`, version, date };

      cache[version] = { date, data };
      res.json({ success: true, data });
    } catch (error) {
      // Si el upstream falla pero tenemos el versiculo de un dia anterior, lo servimos
      // igual: mejor mostrar algo viejo que romper el home.
      if (cached?.data) {
        return res.json({ success: true, data: cached.data, stale: true });
      }
      next(error);
    }
  },
};

module.exports = dailyVerseController;
module.exports.VERSIONES = Object.keys(VERSIONES);
module.exports.VERSICULOS = VERSICULOS;
module.exports.LIBROS = LIBROS;
module.exports.API = API;
module.exports.MAPA_VERSIONES = VERSIONES;
