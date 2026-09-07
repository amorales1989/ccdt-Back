const { supabaseAdmin } = require('../config/supabase');

// Versiculo del dia proxeado desde BibleGateway.
// Va por el back porque ese endpoint no manda headers CORS, asi que el browser no
// puede llamarlo. Se cachea en memoria por fecha y version: 1 request upstream por
// dia y traduccion para toda la app, sin importar cuantos usuarios abran el home.
const VOTD_URL = (version) =>
  `https://www.biblegateway.com/votd/get/?format=json&version=${version}`;

// Traducciones habilitadas en Configuracion. Todas probadas contra el VOTD.
const VERSIONES = ['RVR1960', 'NVI', 'PDT', 'TLA'];
const VERSION_DEFAULT = 'PDT';

// { [version]: { date, data } }
const cache = {};

// Hoy en zona horaria de Argentina (YYYY-MM-DD), igual que el resto de los services.
const today = () =>
  new Date().toLocaleDateString('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' });

// BibleGateway devuelve el texto con entidades HTML (&#241;, &ldquo;, ...).
const NAMED = {
  '&ldquo;': '“', '&rdquo;': '”', '&lsquo;': '‘', '&rsquo;': '’',
  '&hellip;': '…', '&mdash;': '—', '&ndash;': '–', '&nbsp;': ' ',
  '&quot;': '"', '&lt;': '<', '&gt;': '>', '&amp;': '&',
};

const decodeEntities = (str = '') =>
  String(str)
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&[a-z]+;/gi, (m) => NAMED[m.toLowerCase()] ?? m)
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
      if (VERSIONES.includes(company?.daily_verse_version)) {
        version = company.daily_verse_version;
      }
    } catch {
      // Si la empresa no se pudo leer (o falta la migracion) seguimos con el default.
    }

    const cached = cache[version];
    if (cached?.date === date) {
      return res.json({ success: true, data: cached.data });
    }

    try {
      const response = await fetch(VOTD_URL(version), { signal: AbortSignal.timeout(8000) });
      if (!response.ok) throw new Error(`BibleGateway respondio ${response.status}`);

      const json = await response.json();
      const votd = json?.votd;
      if (!votd?.content) throw new Error('Respuesta de BibleGateway sin versiculo');

      const data = {
        text: decodeEntities(votd.content),
        reference: decodeEntities(votd.display_ref || votd.reference || ''),
        version,
        date,
      };

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
module.exports.VERSIONES = VERSIONES;
