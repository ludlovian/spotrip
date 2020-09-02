#!/usr/bin/env node
'use strict';

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var path = require('path');
var fs = require('fs');
var fs__default = _interopDefault(fs);
var stream = _interopDefault(require('stream'));
var http = _interopDefault(require('http'));
var child_process = require('child_process');
var util = require('util');
var EventEmitter = _interopDefault(require('events'));

function toArr(any) {
	return any == null ? [] : Array.isArray(any) ? any : [any];
}
function toVal(out, key, val, opts) {
	var x, old=out[key], nxt=(
		!!~opts.string.indexOf(key) ? (val == null || val === true ? '' : String(val))
		: typeof val === 'boolean' ? val
		: !!~opts.boolean.indexOf(key) ? (val === 'false' ? false : val === 'true' || (out._.push((x = +val,x * 0 === 0) ? x : val),!!val))
		: (x = +val,x * 0 === 0) ? x : val
	);
	out[key] = old == null ? nxt : (Array.isArray(old) ? old.concat(nxt) : [old, nxt]);
}
var lib = function (args, opts) {
	args = args || [];
	opts = opts || {};
	var k, arr, arg, name, val, out={ _:[] };
	var i=0, j=0, idx=0, len=args.length;
	const alibi = opts.alias !== void 0;
	const strict = opts.unknown !== void 0;
	const defaults = opts.default !== void 0;
	opts.alias = opts.alias || {};
	opts.string = toArr(opts.string);
	opts.boolean = toArr(opts.boolean);
	if (alibi) {
		for (k in opts.alias) {
			arr = opts.alias[k] = toArr(opts.alias[k]);
			for (i=0; i < arr.length; i++) {
				(opts.alias[arr[i]] = arr.concat(k)).splice(i, 1);
			}
		}
	}
	opts.boolean.forEach(key => {
		opts.boolean = opts.boolean.concat(opts.alias[key] = opts.alias[key] || []);
	});
	opts.string.forEach(key => {
		opts.string = opts.string.concat(opts.alias[key] = opts.alias[key] || []);
	});
	if (defaults) {
		for (k in opts.default) {
			opts.alias[k] = opts.alias[k] || [];
			(opts[typeof opts.default[k]] || []).push(k);
		}
	}
	const keys = strict ? Object.keys(opts.alias) : [];
	for (i=0; i < len; i++) {
		arg = args[i];
		if (arg === '--') {
			out._ = out._.concat(args.slice(++i));
			break;
		}
		for (j=0; j < arg.length; j++) {
			if (arg.charCodeAt(j) !== 45) break;
		}
		if (j === 0) {
			out._.push(arg);
		} else if (arg.substring(j, j + 3) === 'no-') {
			name = arg.substring(j + 3);
			if (strict && !~keys.indexOf(name)) {
				return opts.unknown(arg);
			}
			out[name] = false;
		} else {
			for (idx=j+1; idx < arg.length; idx++) {
				if (arg.charCodeAt(idx) === 61) break;
			}
			name = arg.substring(j, idx);
			val = arg.substring(++idx) || (i+1 === len || (''+args[i+1]).charCodeAt(0) === 45 || args[++i]);
			arr = (j === 2 ? [name] : name);
			for (idx=0; idx < arr.length; idx++) {
				name = arr[idx];
				if (strict && !~keys.indexOf(name)) return opts.unknown('-'.repeat(j) + name);
				toVal(out, name, (idx + 1 < arr.length) || val, opts);
			}
		}
	}
	if (defaults) {
		for (k in opts.default) {
			if (out[k] === void 0) {
				out[k] = opts.default[k];
			}
		}
	}
	if (alibi) {
		for (k in out) {
			arr = opts.alias[k] || [];
			while (arr.length > 0) {
				out[arr.shift()] = out[k];
			}
		}
	}
	return out;
};

const GAP = 4;
const __ = '  ';
const ALL = '__all__';
const DEF = '__default__';
const NL = '\n';
function format(arr) {
	if (!arr.length) return '';
	let len = maxLen( arr.map(x => x[0]) ) + GAP;
	let join = a => a[0] + ' '.repeat(len - a[0].length) + a[1] + (a[2] == null ? '' : `  (default ${a[2]})`);
	return arr.map(join);
}
function maxLen(arr) {
  let c=0, d=0, l=0, i=arr.length;
  if (i) while (i--) {
    d = arr[i].length;
    if (d > c) {
      l = i; c = d;
    }
  }
  return arr[l].length;
}
function noop(s) {
	return s;
}
function section(str, arr, fn) {
	if (!arr || !arr.length) return '';
	let i=0, out='';
	out += (NL + __ + str);
	for (; i < arr.length; i++) {
		out += (NL + __ + __ + fn(arr[i]));
	}
	return out + NL;
}
var help = function (bin, tree, key, single) {
	let out='', cmd=tree[key], pfx=`$ ${bin}`, all=tree[ALL];
	let prefix = s => `${pfx} ${s}`.replace(/\s+/g, ' ');
	let tail = [['-h, --help', 'Displays this message']];
	if (key === DEF) tail.unshift(['-v, --version', 'Displays current version']);
	cmd.options = (cmd.options || []).concat(all.options, tail);
	if (cmd.options.length > 0) cmd.usage += ' [options]';
	out += section('Description', cmd.describe, noop);
	out += section('Usage', [cmd.usage], prefix);
	if (!single && key === DEF) {
		let cmds = Object.keys(tree).filter(k => !/__/.test(k));
		let text = cmds.map(k => [k, (tree[k].describe || [''])[0]]);
		out += section('Available Commands', format(text), noop);
		out += (NL + __ + 'For more info, run any command with the `--help` flag');
		cmds.slice(0, 2).forEach(k => {
			out += (NL + __ + __ + `${pfx} ${k} --help`);
		});
		out += NL;
	} else if (!single && key !== DEF) {
		out += section('Aliases', cmd.alibi, prefix);
	}
	out += section('Options', format(cmd.options), noop);
	out += section('Examples', cmd.examples.map(prefix), noop);
	return out;
};
var error = function (bin, str, num=1) {
	let out = section('ERROR', [str], noop);
	out += (NL + __ + `Run \`$ ${bin} --help\` for more info.` + NL);
	console.error(out);
	process.exit(num);
};
var parse = function (str) {
	return (str || '').split(/^-{1,2}|,|\s+-{1,2}|\s+/).filter(Boolean);
};
var sentences = function (str) {
	return (str || '').replace(/([.?!])\s*(?=[A-Z])/g, '$1|').split('|');
};
var utils = {
	help: help,
	error: error,
	parse: parse,
	sentences: sentences
};

const ALL$1 = '__all__';
const DEF$1 = '__default__';
class Sade {
	constructor(name, isOne) {
		let [bin, ...rest] = name.split(/\s+/);
		isOne = isOne || rest.length > 0;
		this.bin = bin;
		this.ver = '0.0.0';
		this.default = '';
		this.tree = {};
		this.command(ALL$1);
		this.command([DEF$1].concat(isOne ? rest : '<command>').join(' '));
		this.single = isOne;
		this.curr = '';
	}
	command(str, desc, opts={}) {
		if (this.single) {
			throw new Error('Disable "single" mode to add commands');
		}
		let cmd=[], usage=[], rgx=/(\[|<)/;
		str.split(/\s+/).forEach(x => {
			(rgx.test(x.charAt(0)) ? usage : cmd).push(x);
		});
		cmd = cmd.join(' ');
		if (cmd in this.tree) {
			throw new Error(`Command already exists: ${cmd}`);
		}
		cmd.includes('__') || usage.unshift(cmd);
		usage = usage.join(' ');
		this.curr = cmd;
		if (opts.default) this.default=cmd;
		this.tree[cmd] = { usage, alibi:[], options:[], alias:{}, default:{}, examples:[] };
		if (opts.alias) this.alias(opts.alias);
		if (desc) this.describe(desc);
		return this;
	}
	describe(str) {
		this.tree[this.curr || DEF$1].describe = Array.isArray(str) ? str : utils.sentences(str);
		return this;
	}
	alias(...names) {
		if (this.single) throw new Error('Cannot call `alias()` in "single" mode');
		if (!this.curr) throw new Error('Cannot call `alias()` before defining a command');
		this.tree[this.curr].alibi = this.tree[this.curr].alibi.concat(...names);
		return this;
	}
	option(str, desc, val) {
		let cmd = this.tree[ this.curr || ALL$1 ];
		let [flag, alias] = utils.parse(str);
		if (alias && alias.length > 1) [flag, alias]=[alias, flag];
		str = `--${flag}`;
		if (alias && alias.length > 0) {
			str = `-${alias}, ${str}`;
			let old = cmd.alias[alias];
			cmd.alias[alias] = (old || []).concat(flag);
		}
		let arr = [str, desc || ''];
		if (val !== void 0) {
			arr.push(val);
			cmd.default[flag] = val;
		} else if (!alias) {
			cmd.default[flag] = void 0;
		}
		cmd.options.push(arr);
		return this;
	}
	action(handler) {
		this.tree[ this.curr || DEF$1 ].handler = handler;
		return this;
	}
	example(str) {
		this.tree[ this.curr || DEF$1 ].examples.push(str);
		return this;
	}
	version(str) {
		this.ver = str;
		return this;
	}
	parse(arr, opts={}) {
		let offset = 2;
		let alias = { h:'help', v:'version' };
		let argv = lib(arr.slice(offset), { alias });
		let isSingle = this.single;
		let bin = this.bin;
		let tmp, name = '';
		let isVoid, cmd;
		if (isSingle) {
			cmd = this.tree[DEF$1];
		} else {
			let k, i=1, len=argv._.length + 1;
			for (; i < len; i++) {
				tmp = argv._.slice(0, i).join(' ');
				if (this.tree[tmp] !== void 0) {
					name=tmp; offset=(i + 2);
				} else {
					for (k in this.tree) {
						if (this.tree[k].alibi.includes(tmp)) {
							name=k; offset=(i + 2);
							break;
						}
					}
				}
			}
			cmd = this.tree[name];
			isVoid = (cmd === void 0);
			if (isVoid) {
				if (this.default) {
					name = this.default;
					cmd = this.tree[name];
					arr.unshift(name);
					offset++;
				} else if (tmp) {
					return utils.error(bin, `Invalid command: ${tmp}`);
				}
			}
		}
		if (argv.help) return this.help(!isSingle && !isVoid && name);
		if (argv.version) return this._version();
		if (!isSingle && cmd === void 0) {
			return utils.error(bin, 'No command specified.');
		}
		let all = this.tree[ALL$1];
		opts.alias = Object.assign(all.alias, cmd.alias, opts.alias);
		opts.default = Object.assign(all.default, cmd.default, opts.default);
		let vals = lib(arr.slice(offset), opts);
		if (!vals || typeof vals === 'string') {
			return utils.error(bin, vals || 'Parsed unknown option flag(s)!');
		}
		let segs = cmd.usage.split(/\s+/);
		let reqs = segs.filter(x => x.charAt(0)==='<');
		let args = vals._.splice(0, reqs.length);
		if (args.length < reqs.length) {
			if (name) bin += ` ${name}`;
			return utils.error(bin, 'Insufficient arguments!');
		}
		segs.filter(x => x.charAt(0)==='[').forEach(_ => {
			args.push(vals._.shift());
		});
		args.push(vals);
		let handler = cmd.handler;
		return opts.lazy ? { args, name, handler } : handler.apply(null, args);
	}
	help(str) {
		console.log(
			utils.help(this.bin, this.tree, str || DEF$1, this.single)
		);
	}
	_version() {
		console.log(`${this.bin}, ${this.ver}`);
	}
}
var lib$1 = (str, isOne) => new Sade(str, isOne);

var version = "1.3.2";

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

const pipeline = util.promisify(stream.pipeline);
const exec = util.promisify(child_process.execFile);
const writeFile = fs__default.promises.writeFile;
const readFile = fs__default.promises.readFile;
const readdir = fs__default.promises.readdir;
const stat = fs__default.promises.stat;
const URI_PATTERN = /^[a-zA-Z0-9]{22}$/;
function normalizeUri (uri, prefix) {
  const coreUri = uri.replace(/.*[:/]/, '');
  if (!URI_PATTERN.test(coreUri)) {
    throw new Error(`Bad URI: ${uri}`)
  }
  return `spotify:${prefix}:${coreUri}`
}
function spawn (...args) {
  const proc = child_process.spawn(...args);
  proc.done = new Promise((resolve, reject) => {
    proc.once('error', reject);
    proc.on('exit', (code, signal) => {
      if (signal) return reject(new Error(signal))
      resolve(code);
    });
  });
  return proc
}
async function readJson (file) {
  const data = await readFile(file, { encoding: 'utf8' });
  return JSON.parse(data)
}
async function exists (file) {
  try {
    await stat(file);
    return true
  } catch (e) {
    return false
  }
}

class Options {
  set (opts) {
    Object.assign(this, opts);
  }
}
const options = new Options();

async function getData (path) {
  const response = await getResponse(path);
  response.setEncoding('utf8');
  let data = '';
  for await (const chunk of response) {
    data += chunk;
  }
  return JSON.parse(data)
}
function getStream (path) {
  return getResponse(path)
}
function getResponse (path) {
  return new Promise((resolve, reject) => {
    const port = options['spotweb-port'];
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
function getSpotwebPid () {
  const port = options['spotweb-port'];
  return exec('fuser', [`${port}/tcp`]).then(
    ({ stdout }) => stdout.trim().split('/')[0],
    err => {
      if (err.code) return ''
      throw err
    }
  )
}
async function stopSpotweb () {
  const pid = await getSpotwebPid();
  if (pid) await exec('kill', [pid]);
}
async function startSpotweb () {
  const [cmd, ...args] = options['spotweb-command'].split(' ');
  child_process.spawn(cmd, args, { detached: true, stdio: 'ignore' }).unref();
}

const ONE_SECOND = 2 * 2 * 44100;
async function captureTrackPCM (uri, dest, { onProgress } = {}) {
  onProgress && onProgress({});
  const md = await getData(`/track/${uri}`);
  const speedo = new dist$2(60);
  speedo.total = 1 + md.duration / 1e3;
  const dataStream = await getStream(`/play/${uri}`);
  const progress = dist$1({
    progressInterval: 1000,
    onProgress ({ bytes, done }) {
      const curr = bytes / ONE_SECOND;
      speedo.update(curr);
      if (done) speedo.total = curr;
      onProgress &&
        onProgress({
          done,
          curr,
          taken: speedo.taken(),
          percent: speedo.percent(),
          total: speedo.total,
          eta: speedo.eta(),
          speed: speedo.rate()
        });
    }
  });
  const fileStream = fs.createWriteStream(dest);
  await pipeline(dataStream, progress, fileStream);
  const { streamed, error } = await getData('/status');
  if (!streamed || error) {
    throw new Error(`Recording of ${uri} failed: ${error}`)
  }
}
async function convertPCMtoFLAC (src, dest) {
  await exec('flac', [
    '--silent',
    '--force',
    '--force-raw-format',
    '--endian=little',
    '--channels=2',
    '--bps=16',
    '--sample-rate=44100',
    '--sign=signed',
    `--output-name=${dest}`,
    src
  ]);
  await exec('rm', [src]);
}
async function tagTrack (file, albumData, trackData, cover) {
  if (cover) {
    await exec('metaflac', ['--remove', '--block-type=PICTURE', file]);
    await exec('metaflac', [`--import-picture-from=${cover}`, file]);
  }
  const tags = [...getTags(albumData), ...getTags(trackData)];
  await exec('metaflac', [
    '--remove-all-tags',
    ...tags.map(tag => `--set-tag=${tag}`),
    file
  ]);
}
async function addReplayGain (files) {
  await exec('metaflac', ['--add-replay-gain', ...files]);
}
function getTags (obj) {
  const EXCEPT_TAGS = new Set(['PATH', 'TRACKS', 'FILE']);
  return Object.entries(obj)
    .map(([k, v]) => [k.toUpperCase(), v])
    .filter(([k, v]) => !EXCEPT_TAGS.has(k))
    .map(([k, v]) => `${k}=${Array.isArray(v) ? v.join(', ') : v}`)
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
  var charMap = JSON.parse('{"$":"dollar","%":"percent","&":"and","<":"less",">":"greater","|":"or","¢":"cent","£":"pound","¤":"currency","¥":"yen","©":"(c)","ª":"a","®":"(r)","º":"o","À":"A","Á":"A","Â":"A","Ã":"A","Ä":"A","Å":"A","Æ":"AE","Ç":"C","È":"E","É":"E","Ê":"E","Ë":"E","Ì":"I","Í":"I","Î":"I","Ï":"I","Ð":"D","Ñ":"N","Ò":"O","Ó":"O","Ô":"O","Õ":"O","Ö":"O","Ø":"O","Ù":"U","Ú":"U","Û":"U","Ü":"U","Ý":"Y","Þ":"TH","ß":"ss","à":"a","á":"a","â":"a","ã":"a","ä":"a","å":"a","æ":"ae","ç":"c","è":"e","é":"e","ê":"e","ë":"e","ì":"i","í":"i","î":"i","ï":"i","ð":"d","ñ":"n","ò":"o","ó":"o","ô":"o","õ":"o","ö":"o","ø":"o","ù":"u","ú":"u","û":"u","ü":"u","ý":"y","þ":"th","ÿ":"y","Ā":"A","ā":"a","Ă":"A","ă":"a","Ą":"A","ą":"a","Ć":"C","ć":"c","Č":"C","č":"c","Ď":"D","ď":"d","Đ":"DJ","đ":"dj","Ē":"E","ē":"e","Ė":"E","ė":"e","Ę":"e","ę":"e","Ě":"E","ě":"e","Ğ":"G","ğ":"g","Ģ":"G","ģ":"g","Ĩ":"I","ĩ":"i","Ī":"i","ī":"i","Į":"I","į":"i","İ":"I","ı":"i","Ķ":"k","ķ":"k","Ļ":"L","ļ":"l","Ľ":"L","ľ":"l","Ł":"L","ł":"l","Ń":"N","ń":"n","Ņ":"N","ņ":"n","Ň":"N","ň":"n","Ő":"O","ő":"o","Œ":"OE","œ":"oe","Ŕ":"R","ŕ":"r","Ř":"R","ř":"r","Ś":"S","ś":"s","Ş":"S","ş":"s","Š":"S","š":"s","Ţ":"T","ţ":"t","Ť":"T","ť":"t","Ũ":"U","ũ":"u","Ū":"u","ū":"u","Ů":"U","ů":"u","Ű":"U","ű":"u","Ų":"U","ų":"u","Ŵ":"W","ŵ":"w","Ŷ":"Y","ŷ":"y","Ÿ":"Y","Ź":"Z","ź":"z","Ż":"Z","ż":"z","Ž":"Z","ž":"z","ƒ":"f","Ơ":"O","ơ":"o","Ư":"U","ư":"u","ǈ":"LJ","ǉ":"lj","ǋ":"NJ","ǌ":"nj","Ș":"S","ș":"s","Ț":"T","ț":"t","˚":"o","Ά":"A","Έ":"E","Ή":"H","Ί":"I","Ό":"O","Ύ":"Y","Ώ":"W","ΐ":"i","Α":"A","Β":"B","Γ":"G","Δ":"D","Ε":"E","Ζ":"Z","Η":"H","Θ":"8","Ι":"I","Κ":"K","Λ":"L","Μ":"M","Ν":"N","Ξ":"3","Ο":"O","Π":"P","Ρ":"R","Σ":"S","Τ":"T","Υ":"Y","Φ":"F","Χ":"X","Ψ":"PS","Ω":"W","Ϊ":"I","Ϋ":"Y","ά":"a","έ":"e","ή":"h","ί":"i","ΰ":"y","α":"a","β":"b","γ":"g","δ":"d","ε":"e","ζ":"z","η":"h","θ":"8","ι":"i","κ":"k","λ":"l","μ":"m","ν":"n","ξ":"3","ο":"o","π":"p","ρ":"r","ς":"s","σ":"s","τ":"t","υ":"y","φ":"f","χ":"x","ψ":"ps","ω":"w","ϊ":"i","ϋ":"y","ό":"o","ύ":"y","ώ":"w","Ё":"Yo","Ђ":"DJ","Є":"Ye","І":"I","Ї":"Yi","Ј":"J","Љ":"LJ","Њ":"NJ","Ћ":"C","Џ":"DZ","А":"A","Б":"B","В":"V","Г":"G","Д":"D","Е":"E","Ж":"Zh","З":"Z","И":"I","Й":"J","К":"K","Л":"L","М":"M","Н":"N","О":"O","П":"P","Р":"R","С":"S","Т":"T","У":"U","Ф":"F","Х":"H","Ц":"C","Ч":"Ch","Ш":"Sh","Щ":"Sh","Ъ":"U","Ы":"Y","Ь":"","Э":"E","Ю":"Yu","Я":"Ya","а":"a","б":"b","в":"v","г":"g","д":"d","е":"e","ж":"zh","з":"z","и":"i","й":"j","к":"k","л":"l","м":"m","н":"n","о":"o","п":"p","р":"r","с":"s","т":"t","у":"u","ф":"f","х":"h","ц":"c","ч":"ch","ш":"sh","щ":"sh","ъ":"u","ы":"y","ь":"","э":"e","ю":"yu","я":"ya","ё":"yo","ђ":"dj","є":"ye","і":"i","ї":"yi","ј":"j","љ":"lj","њ":"nj","ћ":"c","ѝ":"u","џ":"dz","Ґ":"G","ґ":"g","Ғ":"GH","ғ":"gh","Қ":"KH","қ":"kh","Ң":"NG","ң":"ng","Ү":"UE","ү":"ue","Ұ":"U","ұ":"u","Һ":"H","һ":"h","Ә":"AE","ә":"ae","Ө":"OE","ө":"oe","฿":"baht","ა":"a","ბ":"b","გ":"g","დ":"d","ე":"e","ვ":"v","ზ":"z","თ":"t","ი":"i","კ":"k","ლ":"l","მ":"m","ნ":"n","ო":"o","პ":"p","ჟ":"zh","რ":"r","ს":"s","ტ":"t","უ":"u","ფ":"f","ქ":"k","ღ":"gh","ყ":"q","შ":"sh","ჩ":"ch","ც":"ts","ძ":"dz","წ":"ts","ჭ":"ch","ხ":"kh","ჯ":"j","ჰ":"h","Ẁ":"W","ẁ":"w","Ẃ":"W","ẃ":"w","Ẅ":"W","ẅ":"w","ẞ":"SS","Ạ":"A","ạ":"a","Ả":"A","ả":"a","Ấ":"A","ấ":"a","Ầ":"A","ầ":"a","Ẩ":"A","ẩ":"a","Ẫ":"A","ẫ":"a","Ậ":"A","ậ":"a","Ắ":"A","ắ":"a","Ằ":"A","ằ":"a","Ẳ":"A","ẳ":"a","Ẵ":"A","ẵ":"a","Ặ":"A","ặ":"a","Ẹ":"E","ẹ":"e","Ẻ":"E","ẻ":"e","Ẽ":"E","ẽ":"e","Ế":"E","ế":"e","Ề":"E","ề":"e","Ể":"E","ể":"e","Ễ":"E","ễ":"e","Ệ":"E","ệ":"e","Ỉ":"I","ỉ":"i","Ị":"I","ị":"i","Ọ":"O","ọ":"o","Ỏ":"O","ỏ":"o","Ố":"O","ố":"o","Ồ":"O","ồ":"o","Ổ":"O","ổ":"o","Ỗ":"O","ỗ":"o","Ộ":"O","ộ":"o","Ớ":"O","ớ":"o","Ờ":"O","ờ":"o","Ở":"O","ở":"o","Ỡ":"O","ỡ":"o","Ợ":"O","ợ":"o","Ụ":"U","ụ":"u","Ủ":"U","ủ":"u","Ứ":"U","ứ":"u","Ừ":"U","ừ":"u","Ử":"U","ử":"u","Ữ":"U","ữ":"u","Ự":"U","ự":"u","Ỳ":"Y","ỳ":"y","Ỵ":"Y","ỵ":"y","Ỷ":"Y","ỷ":"y","Ỹ":"Y","ỹ":"y","‘":"\'","’":"\'","“":"\\\"","”":"\\\"","†":"+","•":"*","…":"...","₠":"ecu","₢":"cruzeiro","₣":"french franc","₤":"lira","₥":"mill","₦":"naira","₧":"peseta","₨":"rupee","₩":"won","₪":"new shequel","₫":"dong","€":"euro","₭":"kip","₮":"tugrik","₯":"drachma","₰":"penny","₱":"peso","₲":"guarani","₳":"austral","₴":"hryvnia","₵":"cedi","₸":"kazakhstani tenge","₹":"indian rupee","₽":"russian ruble","₿":"bitcoin","℠":"sm","™":"tm","∂":"d","∆":"delta","∑":"sum","∞":"infinity","♥":"love","元":"yuan","円":"yen","﷼":"rial"}');
  var locales = JSON.parse('{"vi":{"Đ":"D","đ":"d"}}');
  function replace (string, options) {
    if (typeof string !== 'string') {
      throw new Error('slugify: string argument expected')
    }
    options = (typeof options === 'string')
      ? { replacement: options }
      : options || {};
    var locale = locales[options.locale] || {};
    var slug = string.split('')
      .reduce(function (result, ch) {
        return result + (locale[ch] || charMap[ch] || ch)
          .replace(options.remove || /[^\w\s$*_+~.()'"!\-:@]/g, '')
      }, '')
      .trim()
      .replace(/[-\s]+/g, options.replacement || '-');
    return options.lower ? slug.toLowerCase() : slug
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
function getAlbumArtUri (
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
async function downloadAlbumArt (uri, destFile) {
  const coverData = await new Promise((resolve, reject) =>
    http
      .get(getAlbumArtUri(uri), resolve)
      .once('error', reject)
      .end()
  ).then(res => {
    if (res.statusCode !== 200) {
      throw new Error(`${res.statusCode} - ${res.statusMessage}`)
    }
    return res
  });
  const fileStream = fs.createWriteStream(destFile);
  await pipeline(coverData, fileStream);
}

async function copyToStore (path, storePath) {
  await exec('mkdir', ['-p', storePath]);
  await exec('rsync', [
    '--times',
    '--recursive',
    '--omit-dir-times',
    path + '/',
    storePath + '/'
  ]);
  await exec('rm', ['-rf', path]);
}
async function copyFromStore (storePath, workPath) {
  await exec('mkdir', ['-p', workPath]);
  await exec('rsync', [
    '--times',
    '--recursive',
    '--omit-dir-times',
    storePath + '/',
    workPath + '/'
  ]);
}
async function downloadMetadata (uri) {
  const album = await getData(`/album/${uri}`);
  let metadata = {
    ...albumTags(album),
    tracks: album.tracks.map(track => trackTags(track, album))
  };
  const jsonFile = path.join(options.work, 'work', uri.replace(/.*:/, '') + '.json');
  await writeFile(jsonFile, JSON.stringify(metadata, null, 2));
  await spawn('vi', [jsonFile], { stdio: 'inherit' }).done;
  metadata = await readJson(jsonFile);
  await exec('rm', [jsonFile]);
  const storePath = path.join(options.store, metadata.path);
  if (await exists(storePath)) {
    throw new Error(`Already exists: ${storePath}`)
  }
  await exec('mkdir', ['-p', storePath]);
  await writeFile(
    path.join(storePath, 'metadata.json'),
    JSON.stringify(metadata, null, 2)
  );
  await downloadAlbumArt(
    metadata.tracks[0].trackUri,
    path.join(storePath, 'cover.jpg')
  );
  return storePath
}
function slug (s) {
  const slugOpts = { remove: /[^\w\s_-]/ };
  return slugify(s, slugOpts)
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

const { FORCE_COLOR, NODE_DISABLE_COLORS, TERM } = process.env;
const $ = {
	enabled: !NODE_DISABLE_COLORS && TERM !== 'dumb' && FORCE_COLOR !== '0',
	reset: init(0, 0),
	bold: init(1, 22),
	dim: init(2, 22),
	italic: init(3, 23),
	underline: init(4, 24),
	inverse: init(7, 27),
	hidden: init(8, 28),
	strikethrough: init(9, 29),
	black: init(30, 39),
	red: init(31, 39),
	green: init(32, 39),
	yellow: init(33, 39),
	blue: init(34, 39),
	magenta: init(35, 39),
	cyan: init(36, 39),
	white: init(37, 39),
	gray: init(90, 39),
	grey: init(90, 39),
	bgBlack: init(40, 49),
	bgRed: init(41, 49),
	bgGreen: init(42, 49),
	bgYellow: init(43, 49),
	bgBlue: init(44, 49),
	bgMagenta: init(45, 49),
	bgCyan: init(46, 49),
	bgWhite: init(47, 49)
};
function run(arr, str) {
	let i=0, tmp, beg='', end='';
	for (; i < arr.length; i++) {
		tmp = arr[i];
		beg += tmp.open;
		end += tmp.close;
		if (str.includes(tmp.close)) {
			str = str.replace(tmp.rgx, tmp.close + tmp.open);
		}
	}
	return beg + str + end;
}
function chain(has, keys) {
	let ctx = { has, keys };
	ctx.reset = $.reset.bind(ctx);
	ctx.bold = $.bold.bind(ctx);
	ctx.dim = $.dim.bind(ctx);
	ctx.italic = $.italic.bind(ctx);
	ctx.underline = $.underline.bind(ctx);
	ctx.inverse = $.inverse.bind(ctx);
	ctx.hidden = $.hidden.bind(ctx);
	ctx.strikethrough = $.strikethrough.bind(ctx);
	ctx.black = $.black.bind(ctx);
	ctx.red = $.red.bind(ctx);
	ctx.green = $.green.bind(ctx);
	ctx.yellow = $.yellow.bind(ctx);
	ctx.blue = $.blue.bind(ctx);
	ctx.magenta = $.magenta.bind(ctx);
	ctx.cyan = $.cyan.bind(ctx);
	ctx.white = $.white.bind(ctx);
	ctx.gray = $.gray.bind(ctx);
	ctx.grey = $.grey.bind(ctx);
	ctx.bgBlack = $.bgBlack.bind(ctx);
	ctx.bgRed = $.bgRed.bind(ctx);
	ctx.bgGreen = $.bgGreen.bind(ctx);
	ctx.bgYellow = $.bgYellow.bind(ctx);
	ctx.bgBlue = $.bgBlue.bind(ctx);
	ctx.bgMagenta = $.bgMagenta.bind(ctx);
	ctx.bgCyan = $.bgCyan.bind(ctx);
	ctx.bgWhite = $.bgWhite.bind(ctx);
	return ctx;
}
function init(open, close) {
	let blk = {
		open: `\x1b[${open}m`,
		close: `\x1b[${close}m`,
		rgx: new RegExp(`\\x1b\\[${close}m`, 'g')
	};
	return function (txt) {
		if (this !== void 0 && this.has !== void 0) {
			this.has.includes(open) || (this.has.push(open),this.keys.push(blk));
			return txt === void 0 ? this : $.enabled ? run(this.keys, txt+'') : txt+'';
		}
		return txt === void 0 ? chain([open], [blk]) : $.enabled ? run([blk], txt+'') : txt+'';
	};
}
var kleur = $;

var s = 1000;
var m = s * 60;
var h = m * 60;
var d = h * 24;
var w = d * 7;
var y = d * 365.25;
var ms = function(val, options) {
  options = options || {};
  var type = typeof val;
  if (type === 'string' && val.length > 0) {
    return parse$1(val);
  } else if (type === 'number' && isFinite(val)) {
    return options.long ? fmtLong(val) : fmtShort(val);
  }
  throw new Error(
    'val is not a non-empty string or a valid number. val=' +
      JSON.stringify(val)
  );
};
function parse$1(str) {
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

const CSI = '\u001B[';
const CR = '\r';
const EOL = `${CSI}0K`;
function log (string) {
  log.status(string + '\n');
  log.dirty = false;
}
log.status = string => {
  const clear = log.dirty ? CR + EOL : '';
  process.stdout.write(`${clear}${log.prefix}${string}`);
  log.dirty = true;
};
log.prefix = '';

const { green, cyan } = kleur;
const reporter = new EventEmitter();
function report (msg, payload) {
  reporter.emit(msg, payload);
}
reporter
  .on('track.capturing.start', name => {
    log.prefix = `${green(name)} `;
    log.status('... ');
  })
  .on('track.capturing.update', ({ percent, taken, eta }) =>
    log.status(`- ${percent}%  in ${ms(taken)}  eta ${ms(eta)}`)
  )
  .on('track.capturing.done', ({ total, speed }) => {
    log.prefix += green(
      `- ${fmtDuration(total * 1e3)}  at ${speed.toFixed(1)}x`
    );
    log.status(' ');
  })
  .on('track.converting.start', () => log.status(' ... converting'))
  .on('track.converting.done', () => {
    log('');
    log.prefix = '';
  })
  .on('track.tagging', name => log.status(`Tagging ${name}`))
  .on('album.recording.start', md => {
    log(`Recording ${cyan(md.album)}`);
    log(`by ${cyan(md.albumArtist)}`);
    log(`from ${md.albumUri}`);
    log('');
  })
  .on('album.recording.done', () => log(''))
  .on('album.replayGain.start', () => log.status('Calculating replay gain'))
  .on('album.replayGain.done', () => log('Album tags written'))
  .on('album.publishing.start', path => log(`Storing to ${path}`))
  .on('album.publishing.done', () => log('Stored'))
  .on('album.checkout.start', dir => log.status(`Copying to ${dir}`))
  .on('album.checkout.done', dir => log(`Copied to ${dir}`))
  .on('album.queue.start', uri => log(`Queue ${green(uri)}`))
  .on('album.queue.done', name => log(`\nQueued ${cyan(name)} for ripping`))
  .on('daemon.status', pid =>
    log(pid ? `spotweb running as pid ${pid}` : 'spotweb not running')
  )
  .on('daemon.stopped', () => log('spotweb stopped'))
  .on('daemon.started', () => log('spotweb started'))
  .on('retry', ({ delay, error }) => {
    console.error(
      `\nError occured: ${error ? error.message : 'Unknown'}\nWaiting ${ms(
        delay
      )} to retry...`
    );
  })
  .on('extract.mp3.track.start', name => log.status(`${name} extracting`))
  .on('extract.mp3.track.convert', name => log.status(`${name} converting`))
  .on('extract.mp3.track.done', track => log(green(track)))
  .on('extract.mp3.album.done', () => log('\nExtracted'))
  .on('extract.flac.track', track => log(green(track)))
  .on('extract.flac.album', () => log('\nExtracted'));
function fmtDuration (ms) {
  const secs = Math.round(ms / 1e3);
  const mn = Math.floor(secs / 60)
    .toString()
    .padStart(2, '0');
  const sc = (secs % 60).toString().padStart(2, '0');
  return `${mn}:${sc}`
}

async function recordTrack (uri, flacFile) {
  uri = normalizeUri(uri, 'track');
  const pcmFile = flacFile.replace(/\.flac$/, '') + '.pcm';
  await dist(() => captureTrackPCM(uri, pcmFile, { onProgress }), {
    onRetry: data => report('retry', data),
    retries: 5,
    delay: 60 * 1000
  });
  report('track.converting.start');
  await convertPCMtoFLAC(pcmFile, flacFile);
  report('track.converting.done');
  function onProgress (data) {
    if (!data.curr) {
      report('track.capturing.start', path.basename(flacFile));
    } else if (data.done) {
      report('track.capturing.done', data);
    } else {
      report('track.capturing.update', data);
    }
  }
}
async function recordAlbum (path$1) {
  const md = await readJson(path.join(path$1, 'metadata.json'));
  report('album.recording.start', md);
  for (const track of md.tracks) {
    const flacFile = path.join(path$1, track.file);
    if (!(await exists(flacFile))) {
      await recordTrack(track.trackUri, flacFile);
    }
  }
  report('album.recording.done');
}
async function tagAlbum (path$1) {
  const md = await readJson(path.join(path$1, 'metadata.json'));
  const coverFile = path.join(path$1, 'cover.jpg');
  const hasCover = await exists(coverFile);
  for (const track of md.tracks) {
    report('track.tagging', track.file);
    const flacFile = path.join(path$1, track.file);
    await tagTrack(flacFile, md, track, hasCover && coverFile);
  }
  report('album.replayGain.start');
  await addReplayGain(md.tracks.map(track => path.join(path$1, track.file)));
  report('album.replayGain.done');
}
async function publishAlbum (path$1) {
  const md = await readJson(path.join(path$1, 'metadata.json'));
  const storePath = path.join(options.store, md.path);
  report('album.publishing.start', storePath);
  await copyToStore(path$1, storePath);
  report('album.publishing.done');
}
async function checkoutAlbum (path$1) {
  path$1 = path.resolve(path$1);
  if (path$1.startsWith(options.work)) return path$1
  const md = await readJson(path.join(path$1, 'metadata.json'));
  const workDir = md.path.replace('/', '_');
  const workPath = path.join(options.work, 'work', workDir);
  report('album.checkout.start', workDir);
  await copyFromStore(path$1, workPath);
  report('album.checkout.done', workDir);
  return workPath
}
async function ripAlbum (path) {
  const workPath = await checkoutAlbum(path);
  await recordAlbum(workPath);
  await tagAlbum(workPath);
  await publishAlbum(workPath);
}
async function queueAlbum (uri) {
  uri = normalizeUri(uri, 'album');
  report('album.queue.start', uri);
  const path$1 = await downloadMetadata(uri);
  const workPath = await checkoutAlbum(path$1);
  const jobName = path.basename(workPath);
  const queueFile = path.join(options.work, 'queue', jobName);
  await writeFile(queueFile, `spotrip rip ${workPath}\n`);
  report('album.queue.done', jobName);
}
async function daemonStatus () {
  report('daemon.status', await getSpotwebPid());
}
async function daemonStart () {
  await startSpotweb();
  report('daemon.started');
}
async function daemonStop () {
  await stopSpotweb();
  report('daemon.stopped');
}

async function extractMp3 (path$1) {
  const tracks = await getTracks(path$1);
  const md = {};
  let trackNumber = 1;
  for (const track of tracks) {
    const mp3File = path.join(path$1, track);
    const flacFile = mp3File.replace(/\.mp3$/, '.flac');
    await convertToFlac(mp3File, flacFile);
    const tags = await readTrackTags(mp3File);
    if (trackNumber === 1) {
      md.albumArtist = tags.artist;
      md.album = tags.album;
      md.genre = tags.genre;
      md.year = tags.year;
      md.path = slugify(md.albumArtist) + '/' + slugify(md.album);
      md.tracks = [];
    }
    md.tracks.push({
      title: tags.title,
      artist: tags.artist,
      trackNumber: trackNumber++,
      trackTotal: tracks.length,
      file: path.basename(flacFile)
    });
    report('extract.mp3.track.done', track);
  }
  await writeFile(path.join(path$1, 'metadata.json'), JSON.stringify(md, null, 2));
  report('extract.mp3.album.done');
}
async function getTracks (path) {
  const files = await readdir(path);
  return files.filter(name => name.endsWith('.mp3')).sort()
}
async function readTrackTags (file) {
  const { stdout } = await exec('id3v2', ['--list', file]);
  const data = stdout.split('\n');
  return {
    artist: getTag('TPE1', data),
    album: getTag('TALB', data),
    genre: getTag('TCON', data),
    year: getTag('TYER', data),
    title: getTag('TIT2', data)
  }
}
function getTag (prefix, rows) {
  const row = rows.filter(text => text.startsWith(prefix))[0];
  if (!row) return undefined
  return row.replace(/^.*?: /, '')
}
async function convertToFlac (mp3File, flacFile) {
  const pcmFile = mp3File.replace(/\.mp3$/, '') + '.pcm';
  report('extract.mp3.track.start', path.basename(mp3File));
  await exec('lame', ['--silent', '--decode', '-t', mp3File, pcmFile]);
  report('extract.mp3.track.convert', path.basename(mp3File));
  await exec('flac', [
    '--silent',
    '--force',
    '--force-raw-format',
    '--endian=little',
    '--channels=2',
    '--bps=16',
    '--sample-rate=44100',
    '--sign=signed',
    '--output-name=' + flacFile,
    pcmFile
  ]);
  await exec('rm', [pcmFile]);
}

async function extractFlac (path$1) {
  const tracks = await getTracks$1(path$1);
  const md = {};
  let trackNumber = 1;
  for (const track of tracks) {
    const flacFile = path.join(path$1, track);
    const tags = await readTrackTags$1(flacFile);
    if (trackNumber === 1) {
      md.albumArtist = tags.ALBUMARTIST;
      md.album = tags.ALBUM;
      md.genre = tags.GENRE || 'Classical';
      md.year = tags.YEAR;
      md.path = slugify(md.albumArtist) + '/' + slugify(md.album);
      md.discTotal = tags.DISCTOTAL;
      md.tracks = [];
    }
    md.tracks.push({
      title: tags.TITLE,
      artist: tags.ARTIST,
      trackNumber: trackNumber++,
      trackTotal: tracks.length,
      file: path.basename(flacFile)
    });
    report('extract.flac.track', track);
  }
  await writeFile(path.join(path$1, 'metadata.json'), JSON.stringify(md, null, 2));
  report('extract.flac.album');
}
async function getTracks$1 (path) {
  const files = await readdir(path);
  return files.filter(name => name.endsWith('.flac')).sort()
}
const TAGS = [
  'TITLE',
  'TRACKNUMBER',
  'DISCNUMMBER',
  'TRACKTOTAL',
  'TOTALDISCS',
  'ALBUM',
  'ALBUMARTIST',
  'YEAR',
  'ARTIST',
  'GENRE'
];
async function readTrackTags$1 (file) {
  const { stdout } = await exec('metaflac', [
    ...TAGS.map(tag => `--show-tag=${tag}`),
    file
  ]);
  const lines = stdout.split('\n').filter(Boolean);
  const tags = {};
  for (const line of lines) {
    const match = /^(\w+)=(.*)$/.exec(line);
    if (!match) continue
    const key = match[1];
    const value = match[2].trim();
    if (!tags[key]) {
      tags[key] = value;
    } else if (Array.isArray(tags[key])) {
      tags[key].push(value);
    } else {
      tags[key] = [tags[key], value];
    }
  }
  return tags
}

async function showAlbum (uri) {
  uri = normalizeUri(uri, 'album');
  const md = await getData(`/album/${uri}`);
  console.log(JSON.stringify(md, null, 2));
}
async function showTrack (uri) {
  uri = normalizeUri(uri, 'track');
  const md = await getData(`/track/${uri}`);
  console.log(JSON.stringify(md, null, 2));
}

const prog = lib$1('spotrip');
prog
  .version(version)
  .option('--work', 'The working directory structure', '/home/alan/music')
  .option(
    '--store',
    'The store for music',
    '/nas/data/media/music/albums/Classical'
  )
  .option('--spotweb-port', 'The port for spotweb', 39705)
  .option(
    '--spotweb-command',
    'The command for spotweb',
    '/home/alan/dev/spotweb/start'
  );
prog
  .command('queue <album-url>')
  .describe('queue the album for ripping')
  .action(queueAlbum);
prog
  .command('record track <track-uri> <dest>')
  .describe('record a track')
  .action(recordTrack);
prog
  .command('record album <dir>')
  .describe('record an album')
  .action(recordAlbum);
prog
  .command('tag <dir>')
  .describe('set tags for an album')
  .action(tagAlbum);
prog
  .command('checkout <dir>')
  .describe('checkout a working copy of the album')
  .action(checkoutAlbum);
prog
  .command('publish <dir>')
  .describe('publish the album')
  .action(publishAlbum);
prog
  .command('rip <dir>')
  .describe('record, tag and store an album')
  .action(ripAlbum);
prog
  .command('extract mp3 <dir>')
  .describe('converts MP3 dir')
  .action(extractMp3);
prog
  .command('extract flac <dir>')
  .describe('converts FLAC dir')
  .action(extractFlac);
prog
  .command('daemon status')
  .describe('report on spotweb')
  .action(daemonStatus);
prog
  .command('daemon stop')
  .describe('stop spotweb')
  .action(daemonStop);
prog
  .command('daemon start')
  .describe('start spotweb')
  .action(daemonStart);
prog
  .command('show album <uri>')
  .describe('show the metadata for an album')
  .action(showAlbum);
prog
  .command('show track <uri>')
  .describe('show the metadata for a track')
  .action(showTrack);
const parse$2 = prog.parse(process.argv, { lazy: true });
if (parse$2) {
  const { handler, args } = parse$2;
  options.set(args.pop());
  handler.apply(null, args).catch(err => {
    console.error('An unexpected error occured');
    console.error(err);
    process.exit(1);
  });
}
