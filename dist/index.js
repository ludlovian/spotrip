#!/usr/bin/env node
'use strict';

var path = require('path');
var fs = require('fs');
var http = require('http');
var util = require('util');
var child_process = require('child_process');

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
		this.tree[cmd] = { usage, options:[], alias:{}, default:{}, examples:[] };
		if (desc) this.describe(desc);
		return this;
	}
	describe(str) {
		this.tree[this.curr || DEF$1].describe = Array.isArray(str) ? str : utils.sentences(str);
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
			let i=1, len=argv._.length + 1;
			for (; i < len; i++) {
				tmp = argv._.slice(0, i).join(' ');
				if (this.tree[tmp] !== void 0) {
					name=tmp; offset=(i + 2);
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

var version = "0.0.1";

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
  var charMap = JSON.parse('{"$":"dollar","%":"percent","&":"and","<":"less",">":"greater","|":"or","¢":"cent","£":"pound","¤":"currency","¥":"yen","©":"(c)","ª":"a","®":"(r)","º":"o","À":"A","Á":"A","Â":"A","Ã":"A","Ä":"A","Å":"A","Æ":"AE","Ç":"C","È":"E","É":"E","Ê":"E","Ë":"E","Ì":"I","Í":"I","Î":"I","Ï":"I","Ð":"D","Ñ":"N","Ò":"O","Ó":"O","Ô":"O","Õ":"O","Ö":"O","Ø":"O","Ù":"U","Ú":"U","Û":"U","Ü":"U","Ý":"Y","Þ":"TH","ß":"ss","à":"a","á":"a","â":"a","ã":"a","ä":"a","å":"a","æ":"ae","ç":"c","è":"e","é":"e","ê":"e","ë":"e","ì":"i","í":"i","î":"i","ï":"i","ð":"d","ñ":"n","ò":"o","ó":"o","ô":"o","õ":"o","ö":"o","ø":"o","ù":"u","ú":"u","û":"u","ü":"u","ý":"y","þ":"th","ÿ":"y","Ā":"A","ā":"a","Ă":"A","ă":"a","Ą":"A","ą":"a","Ć":"C","ć":"c","Č":"C","č":"c","Ď":"D","ď":"d","Đ":"DJ","đ":"dj","Ē":"E","ē":"e","Ė":"E","ė":"e","Ę":"e","ę":"e","Ě":"E","ě":"e","Ğ":"G","ğ":"g","Ģ":"G","ģ":"g","Ĩ":"I","ĩ":"i","Ī":"i","ī":"i","Į":"I","į":"i","İ":"I","ı":"i","Ķ":"k","ķ":"k","Ļ":"L","ļ":"l","Ľ":"L","ľ":"l","Ł":"L","ł":"l","Ń":"N","ń":"n","Ņ":"N","ņ":"n","Ň":"N","ň":"n","Ő":"O","ő":"o","Œ":"OE","œ":"oe","Ŕ":"R","ŕ":"r","Ř":"R","ř":"r","Ś":"S","ś":"s","Ş":"S","ş":"s","Š":"S","š":"s","Ţ":"T","ţ":"t","Ť":"T","ť":"t","Ũ":"U","ũ":"u","Ū":"u","ū":"u","Ů":"U","ů":"u","Ű":"U","ű":"u","Ų":"U","ų":"u","Ŵ":"W","ŵ":"w","Ŷ":"Y","ŷ":"y","Ÿ":"Y","Ź":"Z","ź":"z","Ż":"Z","ż":"z","Ž":"Z","ž":"z","ƒ":"f","Ơ":"O","ơ":"o","Ư":"U","ư":"u","ǈ":"LJ","ǉ":"lj","ǋ":"NJ","ǌ":"nj","Ș":"S","ș":"s","Ț":"T","ț":"t","˚":"o","Ά":"A","Έ":"E","Ή":"H","Ί":"I","Ό":"O","Ύ":"Y","Ώ":"W","ΐ":"i","Α":"A","Β":"B","Γ":"G","Δ":"D","Ε":"E","Ζ":"Z","Η":"H","Θ":"8","Ι":"I","Κ":"K","Λ":"L","Μ":"M","Ν":"N","Ξ":"3","Ο":"O","Π":"P","Ρ":"R","Σ":"S","Τ":"T","Υ":"Y","Φ":"F","Χ":"X","Ψ":"PS","Ω":"W","Ϊ":"I","Ϋ":"Y","ά":"a","έ":"e","ή":"h","ί":"i","ΰ":"y","α":"a","β":"b","γ":"g","δ":"d","ε":"e","ζ":"z","η":"h","θ":"8","ι":"i","κ":"k","λ":"l","μ":"m","ν":"n","ξ":"3","ο":"o","π":"p","ρ":"r","ς":"s","σ":"s","τ":"t","υ":"y","φ":"f","χ":"x","ψ":"ps","ω":"w","ϊ":"i","ϋ":"y","ό":"o","ύ":"y","ώ":"w","Ё":"Yo","Ђ":"DJ","Є":"Ye","І":"I","Ї":"Yi","Ј":"J","Љ":"LJ","Њ":"NJ","Ћ":"C","Џ":"DZ","А":"A","Б":"B","В":"V","Г":"G","Д":"D","Е":"E","Ж":"Zh","З":"Z","И":"I","Й":"J","К":"K","Л":"L","М":"M","Н":"N","О":"O","П":"P","Р":"R","С":"S","Т":"T","У":"U","Ф":"F","Х":"H","Ц":"C","Ч":"Ch","Ш":"Sh","Щ":"Sh","Ъ":"U","Ы":"Y","Ь":"","Э":"E","Ю":"Yu","Я":"Ya","а":"a","б":"b","в":"v","г":"g","д":"d","е":"e","ж":"zh","з":"z","и":"i","й":"j","к":"k","л":"l","м":"m","н":"n","о":"o","п":"p","р":"r","с":"s","т":"t","у":"u","ф":"f","х":"h","ц":"c","ч":"ch","ш":"sh","щ":"sh","ъ":"u","ы":"y","ь":"","э":"e","ю":"yu","я":"ya","ё":"yo","ђ":"dj","є":"ye","і":"i","ї":"yi","ј":"j","љ":"lj","њ":"nj","ћ":"c","џ":"dz","Ґ":"G","ґ":"g","฿":"baht","ა":"a","ბ":"b","გ":"g","დ":"d","ე":"e","ვ":"v","ზ":"z","თ":"t","ი":"i","კ":"k","ლ":"l","მ":"m","ნ":"n","ო":"o","პ":"p","ჟ":"zh","რ":"r","ს":"s","ტ":"t","უ":"u","ფ":"f","ქ":"k","ღ":"gh","ყ":"q","შ":"sh","ჩ":"ch","ც":"ts","ძ":"dz","წ":"ts","ჭ":"ch","ხ":"kh","ჯ":"j","ჰ":"h","Ẁ":"W","ẁ":"w","Ẃ":"W","ẃ":"w","Ẅ":"W","ẅ":"w","ẞ":"SS","Ạ":"A","ạ":"a","Ả":"A","ả":"a","Ấ":"A","ấ":"a","Ầ":"A","ầ":"a","Ẩ":"A","ẩ":"a","Ẫ":"A","ẫ":"a","Ậ":"A","ậ":"a","Ắ":"A","ắ":"a","Ằ":"A","ằ":"a","Ẳ":"A","ẳ":"a","Ẵ":"A","ẵ":"a","Ặ":"A","ặ":"a","Ẹ":"E","ẹ":"e","Ẻ":"E","ẻ":"e","Ẽ":"E","ẽ":"e","Ế":"E","ế":"e","Ề":"E","ề":"e","Ể":"E","ể":"e","Ễ":"E","ễ":"e","Ệ":"E","ệ":"e","Ỉ":"I","ỉ":"i","Ị":"I","ị":"i","Ọ":"O","ọ":"o","Ỏ":"O","ỏ":"o","Ố":"O","ố":"o","Ồ":"O","ồ":"o","Ổ":"O","ổ":"o","Ỗ":"O","ỗ":"o","Ộ":"O","ộ":"o","Ớ":"O","ớ":"o","Ờ":"O","ờ":"o","Ở":"O","ở":"o","Ỡ":"O","ỡ":"o","Ợ":"O","ợ":"o","Ụ":"U","ụ":"u","Ủ":"U","ủ":"u","Ứ":"U","ứ":"u","Ừ":"U","ừ":"u","Ử":"U","ử":"u","Ữ":"U","ữ":"u","Ự":"U","ự":"u","Ỳ":"Y","ỳ":"y","Ỵ":"Y","ỵ":"y","Ỷ":"Y","ỷ":"y","Ỹ":"Y","ỹ":"y","‘":"\'","’":"\'","“":"\\\"","”":"\\\"","†":"+","•":"*","…":"...","₠":"ecu","₢":"cruzeiro","₣":"french franc","₤":"lira","₥":"mill","₦":"naira","₧":"peseta","₨":"rupee","₩":"won","₪":"new shequel","₫":"dong","€":"euro","₭":"kip","₮":"tugrik","₯":"drachma","₰":"penny","₱":"peso","₲":"guarani","₳":"austral","₴":"hryvnia","₵":"cedi","₹":"indian rupee","₽":"russian ruble","₿":"bitcoin","℠":"sm","™":"tm","∂":"d","∆":"delta","∑":"sum","∞":"infinity","♥":"love","元":"yuan","円":"yen","﷼":"rial"}');
  var locales = JSON.parse('{"bg":{"locale":"Bulgarian","ѝ":"u"}}');
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

class Options {
  set (opts) {
    Object.assign(this, opts);
  }
}
const options = new Options();

function spotweb (path) {
  const opts = {
    path,
    port: options.spotweb,
    method: 'GET'
  };
  const pResponse = new Promise((resolve, reject) => {
    const req = http.request(opts, resolve);
    req.once('error', reject);
    req.end();
  }).catch(e => {
    if (e.code === 'ECONNREFUSED') throw new Error('Spotweb not running')
    throw e
  });
  pResponse.json = () => pResponse.then(r => toJson(r));
  pResponse.toFile = file => pResponse.then(r => toFile(r, file));
  return pResponse
}
function toJson (response) {
  return new Promise((resolve, reject) => {
    let data = '';
    response.setEncoding('utf8');
    response
      .once('error', reject)
      .on('data', chunk => {
        data += chunk;
      })
      .on('end', () => resolve(data));
  }).then(data => JSON.parse(data))
}
function toFile (response, file) {
  return new Promise((resolve, reject) => {
    const stream = fs.createWriteStream(file, { encoding: null });
    stream.once('error', reject).on('finish', resolve);
    response.once('error', reject);
    response.pipe(stream);
  })
}

const exec = util.promisify(child_process.execFile);
const writeFile = util.promisify(fs.writeFile);
const readFile = util.promisify(fs.readFile);
const stat = util.promisify(fs.stat);
function normalizeUri (uri, prefix) {
  return `spotify:${prefix}:${uri.replace(/.*[:/]/, '')}`
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

const CSI = '\u001B[';
const CR = '\r';
const EOL = `${CSI}0K`;
var dirty = false;
function log (string) {
  if (dirty) {
    string = CR + EOL + string;
    dirty = false;
  }
  console.log(string);
}
function status (string) {
  if (dirty) {
    string = CR + EOL + string;
  }
  process.stdout.write(string);
  dirty = true;
}
log.status = status;
log.log = log;

const { green, cyan } = kleur;
async function queue (uri, opts) {
  options.set(opts);
  uri = normalizeUri(uri, 'album');
  const workDir = path.join(options.work, 'work', uri.replace(/.*:/, ''));
  const queueFile = path.join(options.work, 'queue', uri.replace(/.*:/, ''));
  const jsonFile = path.join(workDir, 'metadata.json');
  log(`Queuing ${green(uri)}`);
  await exec('mkdir', ['-p', workDir]);
  await exec('mkdir', ['-p', path.dirname(queueFile)]);
  const album = await spotweb(`/album/${uri}`).json();
  const metadata = {
    ...albumTags(album),
    tracks: album.tracks.map(track => trackTags(track, album))
  };
  await writeFile(jsonFile, JSON.stringify(metadata, null, 2));
  await spawn('vi', [jsonFile], { stdio: 'inherit' }).done;
  await writeFile(
    queueFile,
    [
      process.execPath,
      ...process.execArgv,
      process.argv[1],
      'rip-album',
      workDir
    ].join(' ') + '\n'
  );
  log(`\nQueued ${cyan(uri)} for ripping`);
}
function slug (s) {
  const slugOpts = { remove: /[^\w\s_-]/ };
  return slugify(s, slugOpts)
}
function albumTags (album) {
  const tags = {
    albumArtist: album.artist.name,
    album: album.name,
    genre: ['Classical'],
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
  const discNumbers = album.tracks.map(t => t.disc).filter(d => !!d);
  return uniq(discNumbers).length
}
function countTracks (album, discNumber) {
  return album.tracks.filter(t => t.disc === discNumber).length
}
function uniq (list) {
  const s = new Set(list);
  return [...s]
}

async function recordTrack (uri, dest, opts = {}) {
  options.set(opts);
  uri = normalizeUri(uri, 'track');
  const pcm = dest.replace(/\.flac$/, '') + '.pcm';
  const filename = path.basename(dest);
  const { progressFrequency = 1000 } = options;
  showProgress('capturing');
  const progressInterval = setInterval(getProgress, progressFrequency);
  try {
    await spotweb(`/play/${uri}?format=raw`).toFile(pcm);
  } finally {
    clearInterval(progressInterval);
  }
  const receipt = await spotweb(`/receipt/${uri}`).json();
  if (receipt.failed) {
    throw new Error(`Recording of ${uri} failed: ${receipt.error}`)
  }
  showProgress('converting');
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
    pcm
  ]);
  await exec('rm', [pcm]);
  function showProgress (action, pct) {
    const pctString = pct == null ? '' : ` ... ${Math.floor(pct)}%`;
    log.status(`${filename} ${action}${pctString} `);
  }
  async function getProgress () {
    const data = await spotweb('/status').json();
    const { status } = data;
    if (
      !status.streaming ||
      status.uri !== uri ||
      typeof status.length !== 'number' ||
      status.length <= 0 ||
      typeof status.pos !== 'number'
    ) {
      return
    }
    showProgress('capturing', (100 * status.pos) / status.length);
  }
}

const { green: green$1, cyan: cyan$1 } = kleur;
async function recordAlbum (path$1, opts = {}) {
  options.set(opts);
  const md = await readJson(path.join(path$1, 'metadata.json'));
  log(`Recording ${cyan$1(md.album)}`);
  log(`by ${cyan$1(md.albumArtist.join(','))}`);
  log('');
  for (const track of md.tracks) {
    const flacFile = path.join(path$1, track.file);
    if (!(await exists(flacFile))) {
      await recordTrack(track.trackUri, flacFile);
    }
    log(green$1(track.file));
  }
  log('');
}

async function tagAlbum (path$1, opts = {}) {
  options.set(opts);
  const md = await readJson(path.join(path$1, 'metadata.json'));
  const coverFile = path.join(path$1, 'cover.jpg');
  const hasCover = await exists(coverFile);
  for (const track of md.tracks) {
    log.status(`Tagging ${track.file}`);
    const flacFile = path.join(path$1, track.file);
    if (hasCover) {
      await importCover(flacFile, coverFile);
    }
    const tags = [...getTags(md), ...getTags(track)];
    await addTags(flacFile, tags);
  }
  log.status('Calculating replay gain');
  await addReplayGain(md.tracks.map(track => path.join(path$1, track.file)));
}
async function importCover (file, cover) {
  await exec('metaflac', ['--remove', '--block-type=PICTURE', file]);
  await exec('metaflac', [`--import-picture-from=${cover}`, file]);
}
async function addTags (file, tags) {
  await exec('metaflac', [
    '--remove-all-tags',
    ...tags.map(tag => `--set-tag=${tag}`),
    file
  ]);
}
const EXCEPT_TAGS = new Set(['PATH', 'TRACKS', 'FILE']);
function getTags (obj) {
  const tags = [];
  for (const k of Object.keys(obj)) {
    const K = k.toUpperCase();
    if (EXCEPT_TAGS.has(K)) continue
    const v = obj[k];
    if (Array.isArray(v)) {
      tags.push(...v.map(v => K + '=' + v));
    } else if (v) {
      tags.push(K + '=' + v);
    }
  }
  return tags
}
async function addReplayGain (files) {
  await exec('metaflac', ['--add-replay-gain', ...files]);
}

async function publishAlbum (path$1, opts = {}) {
  options.set(opts);
  const md = await readJson(path.join(path$1, 'metadata.json'));
  const storePath = path.join(options.store, md.path);
  log(`Storing to ${md.path}`);
  await exec('mkdir', ['-p', storePath]);
  await exec('rsync', [
    '--times',
    '--recursive',
    '--omit-dir-times',
    path$1 + '/',
    storePath + '/'
  ]);
  await exec('rm', ['-rf', path$1]);
  log('Stored');
}

async function ripAlbum (path, opts = {}) {
  options.set(opts);
  await recordAlbum(path);
  await tagAlbum(path);
  await publishAlbum(path);
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
  .option('--spotweb', 'The port for spotweb', 39704);
prog.command('queue <album-url>', 'queue the album for ripping').action(queue);
prog
  .command('record-track <track-uri> <dest>', 'record a track')
  .action(recordTrack);
prog.command('record-album <dir>', 'record an album').action(recordAlbum);
prog.command('tag-album <dir>', 'set tags for an album').action(tagAlbum);
prog.command('publish-album <dir>', 'publish the album').action(publishAlbum);
prog
  .command('rip-album <dir>', 'record, tag and store an album')
  .action(ripAlbum);
prog.parse(process.argv);
