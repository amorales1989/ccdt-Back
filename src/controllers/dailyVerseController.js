const { supabaseAdmin } = require('../config/supabase');

// Versículo del día.
//
// El calendario (qué versículo toca cada fecha) es el de verseoftheday.com, el devocional
// del Heartlight Network que sale desde 1998: la selección la hace una persona, no un
// algoritmo. Acá viajan solo las referencias —el texto lo pide el back a bolls.life en la
// traducción que la empresa eligió en Configuración.
//
// Se usa bolls y no BibleGateway porque este último devuelve 403 a las IPs de datacenter:
// desde una conexión hogareña anda, por eso pasaba los tests locales y fallaba en prod.
const API = (traduccion, libro, capitulo) =>
  `https://bolls.life/get-text/${traduccion}/${libro}/${capitulo}/`;

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

// Un versículo por fecha del año. El 29 de febrero repite el del 28.
const CALENDARIO = {
  '01': [
    'Proverbios 21:30', 'Efesios 4:22', 'Efesios 4:23',
    'Efesios 4:24', 'Isaías 26:9', 'Salmos 104:33-34',
    'Lamentaciones 3:22-23', 'Lamentaciones 3:25', 'Isaías 2:22',
    'Proverbios 16:9', 'Salmos 100:1', 'Salmos 100:2',
    'Salmos 100:3', 'Salmos 100:4', 'Salmos 100:5',
    'Proverbios 10:11', 'Romanos 5:1-2', 'Romanos 5:3-4',
    'Romanos 5:5', 'Romanos 5:6-7', 'Romanos 5:8',
    'Romanos 5:9-10', '2 Corintios 12:9', 'Salmos 29:2',
    'Salmos 1:1', 'Salmos 1:1-2', 'Salmos 1:3',
    'Salmos 1:4', 'Salmos 22:5', 'Proverbios 19:21',
    'Salmos 84:11',
  ],
  '02': [
    '1 Juan 4:7', '1 Juan 4:8', '1 Juan 4:9',
    '1 Juan 4:10', '1 Juan 4:11', '1 Juan 4:12',
    '1 Juan 4:13', '1 Juan 4:15', '1 Juan 4:16',
    '1 Juan 4:17', '1 Juan 4:18', '1 Juan 4:19',
    '1 Juan 4:20', 'Filipenses 1:3', '1 Juan 4:21',
    'Gálatas 5:6', 'Isaías 54:5', 'Gálatas 6:9',
    'Ezequiel 36:23', 'Proverbios 18:24', 'Isaías 30:18',
    'Hebreos 10:24-25', 'Éxodo 15:6', 'Salmos 138:8',
    'Números 6:24-26', 'Isaías 41:10-11', 'Isaías 41:13',
    '1 Juan 4:4',
  ],
  '03': [
    'Salmos 143:8', 'Salmos 37:1-2', 'Salmos 37:3',
    'Hechos 2:38', 'Romanos 8:1-2', 'Salmos 119:1',
    'Hechos 5:32', 'Juan 14:23', 'Romanos 8:3-4',
    'Gálatas 5:22-23', 'Salmos 37:4', '1 Crónicas 4:10',
    'Romanos 8:11', 'Proverbios 29:25', 'Isaías 41:10',
    'Gálatas 3:26-27', 'Romanos 8:14', 'Salmos 37:5-6',
    'Proverbios 10:21', 'Isaías 41:4', 'Romanos 8:15',
    'Salmos 37:6-7', 'Romanos 11:33-36', 'Proverbios 10:7',
    'Salmos 37:16-17', 'Romanos 8:16-17', 'Romanos 8:18',
    'Romanos 8:26-27', 'Efesios 3:16-17', 'Efesios 3:17-19',
    'Efesios 3:20-21',
  ],
  '04': [
    '1 Corintios 1:27', '1 Corintios 1:30', 'Filipenses 4:9',
    'Filipenses 4:4', 'Filipenses 4:5', 'Filipenses 4:6',
    'Filipenses 4:7', '1 Corintios 15:1', '1 Corintios 15:2',
    '1 Corintios 15:3-5', '1 Corintios 15:19', 'Filipenses 4:12-13',
    'Filipenses 4:19', 'Proverbios 10:2', '1 Corintios 15:20',
    '1 Corintios 15:24', '1 Corintios 15:25-26', '1 Corintios 15:51-53',
    '1 Corintios 15:54', '1 Corintios 15:55', '1 Corintios 15:57',
    '1 Corintios 15:58', 'Filipenses 4:23', '2 Crónicas 7:14',
    'Salmos 121:1-2', 'Salmos 121:3', 'Salmos 121:8',
    'Salmos 85:6', 'Filipenses 4:8', 'Filipenses 4:20',
  ],
  '05': [
    '1 Pedro 3:15', 'Proverbios 10:12', 'Hechos 1:14',
    'Santiago 1:5', 'Salmos 139:23-24', 'Proverbios 3:7',
    'Santiago 3:13', '1 Corintios 2:9', 'Proverbios 10:17',
    '2 Pedro 3:9', 'Lucas 6:27', 'Mateo 5:13',
    'Mateo 5:14', 'Hechos 13:2', 'Hechos 13:3',
    'Proverbios 3:1-2', 'Proverbios 10:29', 'Filipenses 1:19',
    '1 Pedro 5:6-7', 'Filipenses 1:21', '1 Pedro 5:7',
    'Efesios 2:10', 'Judas 1:24-25', 'Hechos 16:25',
    'Jeremías 29:13', 'Jeremías 33:3', 'Isaías 40:28-29',
    'Proverbios 31:8', 'Gálatas 5:25', 'Gálatas 2:20',
    'Isaías 40:30-31',
  ],
  '06': [
    'Romanos 6:1-2', 'Gálatas 6:2', 'Proverbios 16:3',
    'Romanos 6:3-4', 'Salmos 103:5', 'Proverbios 3:5-6',
    'Mateo 7:7', 'Miqueas 6:8', '1 Juan 1:9',
    'Isaías 61:10', 'Jeremías 29:11', 'Salmos 103:12',
    'Romanos 6:13', 'Romanos 8:35-37', 'Santiago 4:15',
    'Jeremías 6:16', 'Efesios 1:17', '1 Juan 3:18',
    'Salmos 31:19', 'Lucas 6:38', 'Proverbios 6:20',
    'Proverbios 18:22', 'Romanos 6:23', 'Salmos 73:23-26',
    'Mateo 6:25', 'Proverbios 3:25-26', 'Mateo 25:37-40',
    'Proverbios 10:6', 'Salmos 37:28', 'Mateo 6:33',
  ],
  '07': [
    'Salmos 127:1', 'Juan 17:1', 'Proverbios 10:21',
    'Gálatas 5:1', 'Juan 17:3', 'Santiago 4:7',
    'Ezequiel 38:23', 'Santiago 5:16', 'Proverbios 31:10',
    'Filipenses 4:11', 'Proverbios 16:20', 'Mateo 7:13-14',
    'Juan 17:4', 'Juan 17:15', 'Salmos 37:16-17',
    'Proverbios 20:22', 'Juan 17:18', 'Isaías 43:1',
    'Juan 17:20-21', 'Mateo 25:21', 'Santiago 1:22',
    'Juan 17:23', 'Juan 17:24', 'Hebreos 13:2',
    'Juan 17:26', 'Isaías 43:2-3', 'Mateo 7:3-5',
    'Isaías 57:15', 'Salmos 30:5', 'Mateo 7:1',
    'Salmos 31:1',
  ],
  '08': [
    'Romanos 8:1-2', 'Isaías 61:1-2', 'Romanos 8:31-32',
    '1 Juan 5:4', 'Zacarías 4:5-6', '1 Corintios 13:6',
    '1 Timoteo 6:7-8', 'Proverbios 10:8', 'Salmos 103:8',
    'Salmos 84:11-12', 'Romanos 8:11', 'Proverbios 3:11-12',
    'Juan 15:13', 'Romanos 8:14', 'Romanos 8:15-16',
    'Salmos 31:16', 'Juan 15:16', 'Romanos 8:18',
    '1 Juan 4:19', 'Efesios 2:19-20', 'Proverbios 3:21-22',
    'Efesios 6:22', 'Proverbios 16:19', 'Juan 8:31-32',
    'Proverbios 3:3-4', 'Romanos 8:26', '1 Juan 2:27',
    'Romanos 8:28', 'Proverbios 14:29', 'Marcos 12:30-31',
    'Proverbios 3:31-32',
  ],
  '09': [
    'Salmos 91:1', 'Salmos 9:2', 'Salmos 23:1',
    'Salmos 92:4', 'Salmos 119:105', 'Salmos 23:2-3',
    'Salmos 107:9', 'Hebreos 4:12', 'Josué 1:9',
    'Proverbios 10:9', 'Romanos 6:11-12', 'Tito 2:11-12',
    'Tito 2:13-14', 'Romanos 6:14', 'Romanos 6:15',
    'Proverbios 16:16', 'Salmos 23:4', 'Mateo 18:20',
    'Romanos 8:19', 'Romanos 8:23', 'Juan 14:21',
    'Romanos 12:1-2', 'Lucas 9:23', 'Proverbios 10:24',
    'Salmos 23:5', 'Salmos 23:6', 'Proverbios 10:32',
    'Salmos 119:133', 'Mateo 10:38-39', 'Salmos 119:30',
  ],
  '10': [
    'Salmos 34:1', 'Salmos 34:2', 'Salmos 34:3',
    'Salmos 34:4', 'Salmos 34:5', 'Salmos 34:6',
    'Salmos 34:7', 'Salmos 34:8', 'Salmos 34:9',
    'Salmos 34:10', 'Salmos 34:11', 'Salmos 34:12-13',
    'Salmos 34:14', 'Salmos 34:15', 'Salmos 34:16',
    'Salmos 34:17', 'Salmos 34:18', 'Salmos 34:19-20',
    'Salmos 34:21', 'Salmos 34:22', '2 Corintios 1:3-4',
    '1 Tesalonicenses 3:12', '2 Timoteo 1:7', 'Hechos 1:8',
    'Efesios 1:4-5', 'Efesios 5:15-16', 'Efesios 6:10',
    'Efesios 6:11', 'Efesios 6:12', 'Salmos 32:7',
    '2 Corintios 10:3-5',
  ],
  '11': [
    'Proverbios 27:1', 'Salmos 91:2', 'Romanos 8:3-4',
    '1 Tesalonicenses 4:14', 'Romanos 6:5-6', 'Hebreos 13:6',
    '2 Corintios 9:7', 'Romanos 14:8', 'Proverbios 3:9',
    'Mateo 11:28-30', 'Romanos 14:1', '1 Tesalonicenses 3:12',
    'Romanos 14:13', 'Romanos 14:4', 'Hechos 16:30-34',
    '1 Tesalonicenses 5:16-18', 'Sofonías 3:17', '2 Pedro 3:18',
    'Romanos 14:19', 'Salmos 94:19', 'Efesios 3:20-21',
    '2 Corintios 7:1', 'Salmos 31:23-24', 'Salmos 37:23-24',
    'Salmos 27:1', 'Isaías 54:17', 'Filipenses 1:27-28',
    'Proverbios 31:28-29', 'Filipenses 1:29', 'Proverbios 31:30',
  ],
  '12': [
    'Mateo 1:20', 'Mateo 1:20-21', 'Mateo 1:22-23',
    'Romanos 1:16', 'Filipenses 2:5-6', 'Filipenses 2:5',
    'Filipenses 2:9', 'Filipenses 2:9-11', 'Salmos 3:8',
    'Juan 3:16', 'Juan 3:17', 'Juan 4:13-14',
    'Romanos 8:38-39', 'Romanos 14:5', 'Juan 1:14',
    '1 Tesalonicenses 5:6', '2 Corintios 4:17-18', 'Proverbios 31:9',
    'Salmos 80:19', 'Hechos 13:38-39', 'Hechos 2:21',
    'Lucas 2:4-5', 'Lucas 2:6-7', 'Lucas 2:10',
    'Lucas 2:11', 'Lucas 2:14', 'Lucas 2:20',
    'Juan 1:18', 'Juan 1:11', 'Juan 1:12',
    'Juan 3:3',
  ],
};

// { [version]: { date, data } }
const cache = {};

// Hoy en zona horaria de Argentina (YYYY-MM-DD), igual que el resto de los services.
const today = () =>
  new Date().toLocaleDateString('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' });

// 'Salmos 104:33-34' -> { libro, capitulo, desde, hasta }
const parsearReferencia = (referencia) => {
  const m = referencia.match(/^(.+) (\d+):(\d+)(?:-(\d+))?$/);
  if (!m) return null;
  return {
    libro: m[1],
    capitulo: Number(m[2]),
    desde: Number(m[3]),
    hasta: Number(m[4] || m[3]),
  };
};

const referenciaDelDia = (fecha) => {
  const [, mes, dia] = fecha.split('-');
  const delMes = CALENDARIO[mes];
  // 29 de febrero: el calendario original tiene 365 días, repetimos el 28.
  return delMes[Number(dia) - 1] || delMes[delMes.length - 1];
};

// bolls trae dobles espacios, comillas sueltas y a veces etiquetas de nota al pie.
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

    const reference = referenciaDelDia(date);
    const ref = parsearReferencia(reference);

    try {
      if (!ref || !LIBROS[ref.libro]) throw new Error(`Referencia inválida: ${reference}`);

      const response = await fetch(API(VERSIONES[version], LIBROS[ref.libro], ref.capitulo), {
        signal: AbortSignal.timeout(8000),
      });
      if (!response.ok) throw new Error(`bolls respondio ${response.status}`);

      const capitulo = await response.json();
      const text = limpiar(
        (Array.isArray(capitulo) ? capitulo : [])
          .filter((v) => v.verse >= ref.desde && v.verse <= ref.hasta)
          .map((v) => v.text)
          .join(' ')
      );
      if (!text) throw new Error(`Sin texto para ${reference} en ${version}`);

      const data = { text, reference, version, date };

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
module.exports.CALENDARIO = CALENDARIO;
module.exports.LIBROS = LIBROS;
module.exports.API = API;
module.exports.MAPA_VERSIONES = VERSIONES;
module.exports.parsearReferencia = parsearReferencia;
