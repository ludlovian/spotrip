import http from 'http';
import { execFile, spawn } from 'child_process';
import { promisify } from 'util';
import { stat, unlink, readFile } from 'fs/promises';
import { createWriteStream, promises } from 'fs';
import EventEmitter from 'events';
import { pipeline } from 'stream/promises';
import stream from 'stream';

const URI_PATTERN = /^[a-zA-Z0-9]{22}$/;
const exec = promisify(execFile);
function processEnded (proc) {
  return new Promise((resolve, reject) => {
    proc.once('error', reject);
    proc.on('exit', (code, signal) => {
      if (signal) return reject(new Error(`Signal: ${signal}`))
      if (code) return reject(new Error(`Bad code: ${code}`))
      resolve();
    });
  })
}
function streamFinished (stream) {
  return new Promise((resolve, reject) => {
    stream.once('error', reject);
    stream.on('finish', resolve);
  })
}
function normalizeUri (uri, prefix) {
  const coreUri = uri.replace(/.*[:/]/, '');
  if (!URI_PATTERN.test(coreUri)) {
    throw new Error(`Bad URI: ${uri}`)
  }
  return `spotify:${prefix}:${coreUri}`
}
async function exists (path) {
  try {
    await stat(path);
    return true
  } catch (err) {
    if (err.code === 'ENOENT') return false
    throw err
  }
}

const DAEMON_PORT = 39705;
const DAEMON_COMMAND = '/home/alan/dev/spotweb/start';
const WORK_DIRECTORY = '/home/alan/music';

async function daemonPid ({ port = DAEMON_PORT } = {}) {
  return exec('fuser', [`${port}/tcp`]).then(
    ({ stdout }) => stdout.trim().split('/')[0],
    err => {
      if (err.code) return ''
      throw err
    }
  )
}
async function daemonStart ({ cmd = DAEMON_COMMAND } = {}) {
  const [file, ...args] = cmd.split(' ');
  spawn(file, args, { detached: true, stdio: 'ignore' }).unref();
}
async function daemonStop ({ port = DAEMON_PORT } = {}) {
  const pid = await daemonPid({ port });
  if (pid) await exec('kill', [pid]);
}
async function getAlbumMetadata (uri) {
  return getData({ path: `/album/${uri}` })
}
async function getTrackMetadata (uri) {
  return getData({ path: `/track/${uri}` })
}
function getPlayStream (uri) {
  return getResponse({ path: `/play/${uri}` })
}
function getStatus () {
  return getData({ path: '/status' })
}
async function getData (opts) {
  const response = await getResponse(opts);
  response.setEncoding('utf8');
  let data = '';
  for await (const chunk of response) {
    data += chunk;
  }
  return JSON.parse(data)
}
function getResponse ({ path, port = DAEMON_PORT } = {}) {
  return new Promise((resolve, reject) => {
    http
      .get(`http://localhost:${port}${path}`, resolve)
      .once('error', reject)
      .end();
  }).then(
    res => {
      if (res.statusCode !== 200) {
        throw new Error(`${res.statusCode} - ${res.statusMessage}`)
      }
      return res
    },
    err => {
      if (err.code === 'ECONNREFUSED') throw new Error('Spotweb not running')
      throw err
    }
  )
}

var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

function createCommonjsModule(fn, module) {
	return module = { exports: {} }, fn(module, module.exports), module.exports;
}

var slugify = createCommonjsModule(function (module, exports) {
(function (name, root, factory) {
  {
    module.exports = factory();
    module.exports['default'] = factory();
  }
}('slugify', commonjsGlobal, function () {
  var charMap = JSON.parse('{"$":"dollar","%":"percent","&":"and","<":"less",">":"greater","|":"or","¢":"cent","£":"pound","¤":"currency","¥":"yen","©":"(c)","ª":"a","®":"(r)","º":"o","À":"A","Á":"A","Â":"A","Ã":"A","Ä":"A","Å":"A","Æ":"AE","Ç":"C","È":"E","É":"E","Ê":"E","Ë":"E","Ì":"I","Í":"I","Î":"I","Ï":"I","Ð":"D","Ñ":"N","Ò":"O","Ó":"O","Ô":"O","Õ":"O","Ö":"O","Ø":"O","Ù":"U","Ú":"U","Û":"U","Ü":"U","Ý":"Y","Þ":"TH","ß":"ss","à":"a","á":"a","â":"a","ã":"a","ä":"a","å":"a","æ":"ae","ç":"c","è":"e","é":"e","ê":"e","ë":"e","ì":"i","í":"i","î":"i","ï":"i","ð":"d","ñ":"n","ò":"o","ó":"o","ô":"o","õ":"o","ö":"o","ø":"o","ù":"u","ú":"u","û":"u","ü":"u","ý":"y","þ":"th","ÿ":"y","Ā":"A","ā":"a","Ă":"A","ă":"a","Ą":"A","ą":"a","Ć":"C","ć":"c","Č":"C","č":"c","Ď":"D","ď":"d","Đ":"DJ","đ":"dj","Ē":"E","ē":"e","Ė":"E","ė":"e","Ę":"e","ę":"e","Ě":"E","ě":"e","Ğ":"G","ğ":"g","Ģ":"G","ģ":"g","Ĩ":"I","ĩ":"i","Ī":"i","ī":"i","Į":"I","į":"i","İ":"I","ı":"i","Ķ":"k","ķ":"k","Ļ":"L","ļ":"l","Ľ":"L","ľ":"l","Ł":"L","ł":"l","Ń":"N","ń":"n","Ņ":"N","ņ":"n","Ň":"N","ň":"n","Ō":"O","ō":"o","Ő":"O","ő":"o","Œ":"OE","œ":"oe","Ŕ":"R","ŕ":"r","Ř":"R","ř":"r","Ś":"S","ś":"s","Ş":"S","ş":"s","Š":"S","š":"s","Ţ":"T","ţ":"t","Ť":"T","ť":"t","Ũ":"U","ũ":"u","Ū":"u","ū":"u","Ů":"U","ů":"u","Ű":"U","ű":"u","Ų":"U","ų":"u","Ŵ":"W","ŵ":"w","Ŷ":"Y","ŷ":"y","Ÿ":"Y","Ź":"Z","ź":"z","Ż":"Z","ż":"z","Ž":"Z","ž":"z","Ə":"E","ƒ":"f","Ơ":"O","ơ":"o","Ư":"U","ư":"u","ǈ":"LJ","ǉ":"lj","ǋ":"NJ","ǌ":"nj","Ș":"S","ș":"s","Ț":"T","ț":"t","ə":"e","˚":"o","Ά":"A","Έ":"E","Ή":"H","Ί":"I","Ό":"O","Ύ":"Y","Ώ":"W","ΐ":"i","Α":"A","Β":"B","Γ":"G","Δ":"D","Ε":"E","Ζ":"Z","Η":"H","Θ":"8","Ι":"I","Κ":"K","Λ":"L","Μ":"M","Ν":"N","Ξ":"3","Ο":"O","Π":"P","Ρ":"R","Σ":"S","Τ":"T","Υ":"Y","Φ":"F","Χ":"X","Ψ":"PS","Ω":"W","Ϊ":"I","Ϋ":"Y","ά":"a","έ":"e","ή":"h","ί":"i","ΰ":"y","α":"a","β":"b","γ":"g","δ":"d","ε":"e","ζ":"z","η":"h","θ":"8","ι":"i","κ":"k","λ":"l","μ":"m","ν":"n","ξ":"3","ο":"o","π":"p","ρ":"r","ς":"s","σ":"s","τ":"t","υ":"y","φ":"f","χ":"x","ψ":"ps","ω":"w","ϊ":"i","ϋ":"y","ό":"o","ύ":"y","ώ":"w","Ё":"Yo","Ђ":"DJ","Є":"Ye","І":"I","Ї":"Yi","Ј":"J","Љ":"LJ","Њ":"NJ","Ћ":"C","Џ":"DZ","А":"A","Б":"B","В":"V","Г":"G","Д":"D","Е":"E","Ж":"Zh","З":"Z","И":"I","Й":"J","К":"K","Л":"L","М":"M","Н":"N","О":"O","П":"P","Р":"R","С":"S","Т":"T","У":"U","Ф":"F","Х":"H","Ц":"C","Ч":"Ch","Ш":"Sh","Щ":"Sh","Ъ":"U","Ы":"Y","Ь":"","Э":"E","Ю":"Yu","Я":"Ya","а":"a","б":"b","в":"v","г":"g","д":"d","е":"e","ж":"zh","з":"z","и":"i","й":"j","к":"k","л":"l","м":"m","н":"n","о":"o","п":"p","р":"r","с":"s","т":"t","у":"u","ф":"f","х":"h","ц":"c","ч":"ch","ш":"sh","щ":"sh","ъ":"u","ы":"y","ь":"","э":"e","ю":"yu","я":"ya","ё":"yo","ђ":"dj","є":"ye","і":"i","ї":"yi","ј":"j","љ":"lj","њ":"nj","ћ":"c","ѝ":"u","џ":"dz","Ґ":"G","ґ":"g","Ғ":"GH","ғ":"gh","Қ":"KH","қ":"kh","Ң":"NG","ң":"ng","Ү":"UE","ү":"ue","Ұ":"U","ұ":"u","Һ":"H","һ":"h","Ә":"AE","ә":"ae","Ө":"OE","ө":"oe","฿":"baht","ა":"a","ბ":"b","გ":"g","დ":"d","ე":"e","ვ":"v","ზ":"z","თ":"t","ი":"i","კ":"k","ლ":"l","მ":"m","ნ":"n","ო":"o","პ":"p","ჟ":"zh","რ":"r","ს":"s","ტ":"t","უ":"u","ფ":"f","ქ":"k","ღ":"gh","ყ":"q","შ":"sh","ჩ":"ch","ც":"ts","ძ":"dz","წ":"ts","ჭ":"ch","ხ":"kh","ჯ":"j","ჰ":"h","Ẁ":"W","ẁ":"w","Ẃ":"W","ẃ":"w","Ẅ":"W","ẅ":"w","ẞ":"SS","Ạ":"A","ạ":"a","Ả":"A","ả":"a","Ấ":"A","ấ":"a","Ầ":"A","ầ":"a","Ẩ":"A","ẩ":"a","Ẫ":"A","ẫ":"a","Ậ":"A","ậ":"a","Ắ":"A","ắ":"a","Ằ":"A","ằ":"a","Ẳ":"A","ẳ":"a","Ẵ":"A","ẵ":"a","Ặ":"A","ặ":"a","Ẹ":"E","ẹ":"e","Ẻ":"E","ẻ":"e","Ẽ":"E","ẽ":"e","Ế":"E","ế":"e","Ề":"E","ề":"e","Ể":"E","ể":"e","Ễ":"E","ễ":"e","Ệ":"E","ệ":"e","Ỉ":"I","ỉ":"i","Ị":"I","ị":"i","Ọ":"O","ọ":"o","Ỏ":"O","ỏ":"o","Ố":"O","ố":"o","Ồ":"O","ồ":"o","Ổ":"O","ổ":"o","Ỗ":"O","ỗ":"o","Ộ":"O","ộ":"o","Ớ":"O","ớ":"o","Ờ":"O","ờ":"o","Ở":"O","ở":"o","Ỡ":"O","ỡ":"o","Ợ":"O","ợ":"o","Ụ":"U","ụ":"u","Ủ":"U","ủ":"u","Ứ":"U","ứ":"u","Ừ":"U","ừ":"u","Ử":"U","ử":"u","Ữ":"U","ữ":"u","Ự":"U","ự":"u","Ỳ":"Y","ỳ":"y","Ỵ":"Y","ỵ":"y","Ỷ":"Y","ỷ":"y","Ỹ":"Y","ỹ":"y","‘":"\'","’":"\'","“":"\\\"","”":"\\\"","†":"+","•":"*","…":"...","₠":"ecu","₢":"cruzeiro","₣":"french franc","₤":"lira","₥":"mill","₦":"naira","₧":"peseta","₨":"rupee","₩":"won","₪":"new shequel","₫":"dong","€":"euro","₭":"kip","₮":"tugrik","₯":"drachma","₰":"penny","₱":"peso","₲":"guarani","₳":"austral","₴":"hryvnia","₵":"cedi","₸":"kazakhstani tenge","₹":"indian rupee","₺":"turkish lira","₽":"russian ruble","₿":"bitcoin","℠":"sm","™":"tm","∂":"d","∆":"delta","∑":"sum","∞":"infinity","♥":"love","元":"yuan","円":"yen","﷼":"rial"}');
  var locales = JSON.parse('{"de":{"Ä":"AE","ä":"ae","Ö":"OE","ö":"oe","Ü":"UE","ü":"ue","%":"prozent","&":"und","|":"oder","∑":"summe","∞":"unendlich","♥":"liebe"},"vi":{"Đ":"D","đ":"d"},"fr":{"%":"pourcent","&":"et","<":"plus petit",">":"plus grand","|":"ou","¢":"centime","£":"livre","¤":"devise","₣":"franc","∑":"somme","∞":"infini","♥":"amour"}}');
  function replace (string, options) {
    if (typeof string !== 'string') {
      throw new Error('slugify: string argument expected')
    }
    options = (typeof options === 'string')
      ? {replacement: options}
      : options || {};
    var locale = locales[options.locale] || {};
    var replacement = options.replacement === undefined ? '-' : options.replacement;
    var slug = string.normalize().split('')
      .reduce(function (result, ch) {
        return result + (locale[ch] || charMap[ch] || ch)
          .replace(options.remove || /[^\w\s$*_+~.()'"!\-:@]+/g, '')
      }, '')
      .trim()
      .replace(new RegExp('[\\s' + replacement + ']+', 'g'), replacement);
    if (options.lower) {
      slug = slug.toLowerCase();
    }
    if (options.strict) {
      slug = slug
        .replace(new RegExp('[^a-zA-Z0-9' + replacement + ']', 'g'), '')
        .replace(new RegExp('[\\s' + replacement + ']+', 'g'), replacement);
    }
    return slug
  }
  replace.extend = function (customMap) {
    for (var key in customMap) {
      charMap[key] = customMap[key];
    }
  };
  return replace
}));
});

const SONOS_PLAYER = '192.168.86.210';
const SONOS_PORT = 1400;
function albumArtUri (
  uri,
  { player = SONOS_PLAYER, port = SONOS_PORT } = {}
) {
  uri = normalizeUri(uri, 'track');
  return [
    `http://${player}:${port}`,
    '/getaa?s=1&u=',
    encodeURIComponent(
      [
        'x-sonos-spotify:',
        encodeURIComponent(uri),
        '?sid=9&flags=8224&sn=1'
      ].join('')
    )
  ].join('')
}
async function getAlbumArt (uri, destFile) {
  const coverData = await new Promise((resolve, reject) =>
    http
      .get(albumArtUri(uri), resolve)
      .once('error', reject)
      .end()
  ).then(res => {
    if (res.statusCode !== 200) {
      throw new Error(`${res.statusCode} - ${res.statusMessage}`)
    }
    return res
  });
  const fileStream = createWriteStream(destFile);
  coverData.once('error', err => fileStream.emit('error', err)).pipe(fileStream);
  await streamFinished(fileStream);
}

var s = 1000;
var m = s * 60;
var h = m * 60;
var d = h * 24;
var w = d * 7;
var y = d * 365.25;
var ms = function (val, options) {
  options = options || {};
  var type = typeof val;
  if (type === 'string' && val.length > 0) {
    return parse(val);
  } else if (type === 'number' && isFinite(val)) {
    return options.long ? fmtLong(val) : fmtShort(val);
  }
  throw new Error(
    'val is not a non-empty string or a valid number. val=' +
      JSON.stringify(val)
  );
};
function parse(str) {
  str = String(str);
  if (str.length > 100) {
    return;
  }
  var match = /^(-?(?:\d+)?\.?\d+) *(milliseconds?|msecs?|ms|seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|weeks?|w|years?|yrs?|y)?$/i.exec(
    str
  );
  if (!match) {
    return;
  }
  var n = parseFloat(match[1]);
  var type = (match[2] || 'ms').toLowerCase();
  switch (type) {
    case 'years':
    case 'year':
    case 'yrs':
    case 'yr':
    case 'y':
      return n * y;
    case 'weeks':
    case 'week':
    case 'w':
      return n * w;
    case 'days':
    case 'day':
    case 'd':
      return n * d;
    case 'hours':
    case 'hour':
    case 'hrs':
    case 'hr':
    case 'h':
      return n * h;
    case 'minutes':
    case 'minute':
    case 'mins':
    case 'min':
    case 'm':
      return n * m;
    case 'seconds':
    case 'second':
    case 'secs':
    case 'sec':
    case 's':
      return n * s;
    case 'milliseconds':
    case 'millisecond':
    case 'msecs':
    case 'msec':
    case 'ms':
      return n;
    default:
      return undefined;
  }
}
function fmtShort(ms) {
  var msAbs = Math.abs(ms);
  if (msAbs >= d) {
    return Math.round(ms / d) + 'd';
  }
  if (msAbs >= h) {
    return Math.round(ms / h) + 'h';
  }
  if (msAbs >= m) {
    return Math.round(ms / m) + 'm';
  }
  if (msAbs >= s) {
    return Math.round(ms / s) + 's';
  }
  return ms + 'ms';
}
function fmtLong(ms) {
  var msAbs = Math.abs(ms);
  if (msAbs >= d) {
    return plural(ms, msAbs, d, 'day');
  }
  if (msAbs >= h) {
    return plural(ms, msAbs, h, 'hour');
  }
  if (msAbs >= m) {
    return plural(ms, msAbs, m, 'minute');
  }
  if (msAbs >= s) {
    return plural(ms, msAbs, s, 'second');
  }
  return ms + ' ms';
}
function plural(ms, msAbs, n, name) {
  var isPlural = msAbs >= n * 1.5;
  return Math.round(ms / n) + ' ' + name + (isPlural ? 's' : '');
}

let FORCE_COLOR, NODE_DISABLE_COLORS, NO_COLOR, TERM, isTTY=true;
if (typeof process !== 'undefined') {
	({ FORCE_COLOR, NODE_DISABLE_COLORS, NO_COLOR, TERM } = process.env);
	isTTY = process.stdout && process.stdout.isTTY;
}
const $ = {
	enabled: !NODE_DISABLE_COLORS && NO_COLOR == null && TERM !== 'dumb' && (
		FORCE_COLOR != null && FORCE_COLOR !== '0' || isTTY
	)
};
function init(x, y) {
	let rgx = new RegExp(`\\x1b\\[${y}m`, 'g');
	let open = `\x1b[${x}m`, close = `\x1b[${y}m`;
	return function (txt) {
		if (!$.enabled || txt == null) return txt;
		return open + (!!~(''+txt).indexOf(close) ? txt.replace(rgx, close + open) : txt) + close;
	};
}
const red = init(31, 39);
const green = init(32, 39);
const yellow = init(33, 39);
const blue = init(34, 39);
const magenta = init(35, 39);
const cyan = init(36, 39);
const grey = init(90, 39);

const CSI = '\u001B[';
const CR = '\r';
const EOL = `${CSI}0K`;
const RE_DECOLOR = /(^|[^\x1b]*)((?:\x1b\[\d*m)|$)/g;
function log (string, { newline = true, limitWidth } = {}) {
  if (log.prefix) {
    string = log.prefix + string;
  }
  if (limitWidth && log.width) {
    string = truncateToWidth(string, log.width);
  }
  const start = log.dirty ? CR + EOL : '';
  const end = newline ? '\n' : '';
  log.dirty = newline ? false : !!string;
  log.write(start + string + end);
}
Object.assign(log, {
  write: process.stdout.write.bind(process.stdout),
  status: string =>
    log(string, {
      newline: false,
      limitWidth: true
    }),
  prefix: '',
  width: process.stdout.columns,
  red,
  green,
  yellow,
  blue,
  magenta,
  cyan,
  grey
});
process.stdout.on('resize', () => {
  log.width = process.stdout.columns;
});
function truncateToWidth (string, width) {
  const maxLength = width - 2;
  if (string.length <= maxLength) return string
  const parts = [];
  let w = 0;
  let full;
  for (const match of string.matchAll(RE_DECOLOR)) {
    const [, text, ansiCode] = match;
    if (full) {
      parts.push(ansiCode);
      continue
    } else if (w + text.length <= maxLength) {
      parts.push(text, ansiCode);
      w += text.length;
    } else {
      parts.push(text.slice(0, maxLength - w), ansiCode);
      full = true;
    }
  }
  return parts.join('')
}

const reporter = new EventEmitter();
const report = reporter.emit.bind(reporter);
reporter
  .on('spotrip.queue.start', uri => log(`Queue ${log.green(uri)}`))
  .on('spotrip.queue.done', name => {
    log('');
    log(`Queued ${log.cyan(name)} for ripping.`);
  })
  .on('spotrip.track.record.start', file => {
    const name = file.replace(/.*\//, '');
    log.prefix = `${log.green(name)} `;
    log.status('... ');
  })
  .on('spotrip.track.record.update', ({ percent, taken, eta }) =>
    log.status(`- ${percent}%  in ${ms(taken)}  eta ${ms(eta)}`)
  )
  .on('spotrip.track.record.done', ({ total, speed }) => {
    log.prefix += log.green(
      `- ${fmtDuration(total * 1e3)}  at ${speed.toFixed(1)}x`
    );
    log.status('');
  })
  .on('spotrip.track.convert.start', () => log.status(' ... converting'))
  .on('spotrip.track.convert.done', () => {
    log('');
    log.prefix = '';
  })
  .on('spotrip.album.record.start', md => {
    log(`Recording ${log.cyan(md.album)}`);
    log(`by ${log.cyan(md.albumArtist)}`);
    log(`from ${md.albumUri}`);
    log('');
  })
  .on('spotrip.album.record.done', () => log(''));
function fmtDuration (ms) {
  const secs = Math.round(ms / 1e3);
  const mn = Math.floor(secs / 60)
    .toString()
    .padStart(2, '0');
  const sc = (secs % 60).toString().padStart(2, '0');
  return `${mn}:${sc}`
}

async function queueAlbum (
  uri,
  { report: report$1 = report, workDir = WORK_DIRECTORY } = {}
) {
  uri = normalizeUri(uri, 'album');
  report$1('spotrip.queue.start', uri);
  const album = await getAlbumMetadata(uri);
  let metadata = {
    ...albumTags(album),
    tracks: album.tracks.map(track => trackTags(track, album))
  };
  const mdFile = `${workDir}/work/${uri.replace(/.*:/, '')}.json`;
  const jpgFile = mdFile.replace(/json$/, 'jpg');
  await promises.writeFile(mdFile, JSON.stringify(metadata, null, 2));
  await Promise.all([
    processEnded(spawn('vi', [mdFile], { stdio: 'inherit' })),
    getAlbumArt(metadata.tracks[0].trackUri, jpgFile)
  ]);
  metadata = JSON.parse(await promises.readFile(mdFile, 'utf8'));
  const jobName = metadata.path.replace(/\//g, '_');
  const destDir = `${workDir}/work/${jobName}`;
  await exec('mkdir', ['-p', destDir]);
  await promises.rename(mdFile, `${destDir}/metadata.json`);
  await promises.rename(jpgFile, `${destDir}/cover.jpg`);
  const jobFile = `${workDir}/queue/${jobName}`;
  await promises.writeFile(jobFile, `music spotrip ${destDir}`);
  report$1('spotrip.queue.done', jobName);
}
function albumTags (album) {
  const tags = {
    albumArtist: album.artist.name,
    album: album.name,
    genre: 'Classical',
    year: album.year,
    path: null,
    albumUri: album.uri
  };
  tags.path = slug(album.artist.name) + '/' + slug(album.name);
  const discTotal = countDiscs(album);
  if (discTotal > 1) {
    tags.discTotal = discTotal;
  }
  return tags
}
function slug (s) {
  const slugOpts = { remove: /[^\w\s_-]/ };
  return slugify(s, slugOpts)
}
function trackTags (track, album) {
  const tags = {
    title: track.name,
    artist: track.artists.map(a => a.name),
    trackNumber: track.number
  };
  const discTotal = countDiscs(album);
  const trackTotal = countTracks(album, track.disc);
  let file = 'track';
  if (discTotal > 1) {
    tags.discNumber = track.disc;
    file += track.disc;
  }
  const digits = trackTotal > 99 ? 3 : 2;
  file += track.number.toString().padStart(digits, '0');
  file += '.flac';
  tags.trackTotal = trackTotal;
  tags.trackUri = track.uri;
  tags.file = file;
  return tags
}
function countDiscs (album) {
  const discNumbers = album.tracks.map(t => t.disc).filter(Boolean);
  return uniq(discNumbers).length
}
function countTracks (album, discNumber) {
  return album.tracks.filter(t => t.disc === discNumber).length
}
function uniq (list) {
  return [...new Set(list)]
}

class Speedo {
  constructor ({ window = 10 } = {}) {
    this.windowSize = window;
    this.start = Date.now();
    this.readings = [[this.start, 0]];
  }
  update (data) {
    if (typeof data === 'number') data = { current: data };
    const { current, total } = data;
    if (total) this.total = total;
    this.readings = [...this.readings, [Date.now(), current]].slice(
      -this.windowSize
    );
    this.current = current;
  }
  get done () {
    return this.total && this.current >= this.total
  }
  rate () {
    if (this.readings.length < 2) return 0
    if (this.done) return (this.current * 1e3) / this.taken()
    const last = this.readings[this.readings.length - 1];
    const first = this.readings[0];
    return ((last[1] - first[1]) * 1e3) / (last[0] - first[0])
  }
  percent () {
    if (!this.total) return null
    return this.done ? 100 : Math.round((100 * this.current) / this.total)
  }
  eta () {
    if (!this.total || this.done) return 0
    const rate = this.rate();
    if (!rate) return 0
    return (1e3 * (this.total - this.current)) / rate
  }
  taken () {
    return this.readings[this.readings.length - 1][0] - this.start
  }
}
var dist$2 = Speedo;

function progress (opts = {}) {
  const { onProgress, progressInterval, ...rest } = opts;
  let interval;
  let bytes = 0;
  let done = false;
  let error;
  const ts = new stream.Transform({
    transform (chunk, encoding, cb) {
      bytes += chunk.length;
      cb(null, chunk);
    },
    flush (cb) {
      if (interval) clearInterval(interval);
      done = true;
      reportProgress();
      cb(error);
    }
  });
  if (progressInterval) {
    interval = setInterval(reportProgress, progressInterval);
  }
  if (typeof onProgress === 'function') {
    ts.on('progress', onProgress);
  }
  ts.on('pipe', src =>
    src.on('error', err => {
      error = error || err;
      ts.emit('error', err);
    })
  );
  return ts
  function reportProgress () {
    if (!error) ts.emit('progress', { bytes, done, ...rest });
  }
}
var dist$1 = progress;

function retry (fn, opts = {}) {
  return tryOne({ ...opts, fn, attempt: 1 })
}
function tryOne (options) {
  const {
    fn,
    attempt,
    retries = 10,
    delay = 1000,
    backoff = retry.exponential(1.5),
    onRetry
  } = options;
  return new Promise(resolve => resolve(fn())).catch(error => {
    if (attempt > retries) throw error
    if (onRetry) onRetry({ error, attempt, delay });
    return sleep(delay).then(() =>
      tryOne({ ...options, attempt: attempt + 1, delay: backoff(delay) })
    )
  })
}
retry.exponential = x => n => Math.round(n * x);
const sleep = delay => new Promise(resolve => setTimeout(resolve, delay));
var dist = retry;

const ONE_SECOND = 2 * 2 * 44100;
const FLAC_OPTIONS = [
  '--silent',
  '--force',
  '--force-raw-format',
  '--endian=little',
  '--channels=2',
  '--bps=16',
  '--sample-rate=44100',
  '--sign=signed',
  '--stdout'
];
async function recordTrack ({ report: report$1 = report, uri, file }) {
  uri = normalizeUri(uri, 'track');
  const pcmFile = file.replace(/(\.flac)?$/, '.pcm');
  await dist(() => captureTrackPCM({ uri, file: pcmFile, onProgress }), {
    onRetry: data => report$1('spotrip.retry', data),
    retries: 5,
    delay: 60 * 1000
  });
  report$1('spotrip.track.convert.start');
  await processEnded(
    spawn('flac', [...FLAC_OPTIONS, `--output-name=${file}`, pcmFile])
  );
  await unlink(pcmFile);
  report$1('spotrip.track.convert.done');
  function onProgress (data) {
    if (!data.current) {
      report$1('spotrip.track.record.start', file);
    } else if (data.done) {
      report$1('spotrip.track.record.done', data);
    } else {
      report$1('spotrip.track.record.update', data);
    }
  }
}
async function captureTrackPCM ({ uri, file, onProgress }) {
  onProgress({});
  const md = await getTrackMetadata(uri);
  const speedo = new dist$2({ window: 60 });
  speedo.total = 1 + md.duration / 1e3;
  const dataStream = await getPlayStream(uri);
  const progress = dist$1({
    progressInterval: 1000,
    onProgress ({ bytes, done }) {
      const current = bytes / ONE_SECOND;
      speedo.update({ current });
      if (done) speedo.total = current;
      onProgress({
        done,
        current,
        taken: speedo.taken(),
        percent: speedo.percent(),
        total: speedo.total,
        eta: speedo.eta(),
        speed: speedo.rate()
      });
    }
  });
  const fileStream = createWriteStream(file);
  await pipeline(dataStream, progress, fileStream);
  const { streamed, error } = await getStatus();
  if (!streamed || error) {
    throw new Error(`Recording of ${uri} failed: ${error}`)
  }
}

async function recordAlbum ({ report: report$1 = report, path }) {
  const md = JSON.parse(await readFile(`${path}/metadata.json`, 'utf8'));
  report$1('spotrip.album.record.start', md);
  for (const track of md.tracks) {
    const file = `${path}/${track.file}`;
    if (!(await exists(file))) {
      await recordTrack({ report: report$1, file, uri: track.trackUri });
    }
  }
  report$1('spotrip.album.record.done');
}

export { daemonPid, daemonStart, daemonStop, queueAlbum, recordAlbum, recordTrack };
