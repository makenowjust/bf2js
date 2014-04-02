'use strict'

// class Inst
function Inst(name, pos, val) {
  // calling as constructor check
  if (!(this instanceof Inst)) return new Inst(name, pos, val);

  // set members
  this.name = name;
  this.pos = pos;
  this.val = val;
}

exports.Inst = Inst;

// parse `src` as brainf*ck code
function parse(src, pos) {
  // convert to a mutable string (array)
  // "abc" -> ['a', 'b', 'c']
  src = src.split('');

  var
  pos  = [1, 0], // [line, column]

  cmds = [Inst('begin', [1, 1])].concat(parseList()); // parsing

  // check eof
  if (src.length) expected('<eof>');
  cmds.push(Inst('end', pos));
  return cmds;

  // parse implementation
  function parseList() {
    var
    cmds = [], c, comment, commentPos;

    while (c = src.shift()) {
      // increment column number
      pos[1] += 1;

      switch (c) {

      // simple operators
      case '+':
      case '-':
      case '>':
      case '<':
      case '.':
      case ',':
        cmds.push(Inst(c, pos.slice()));
        break;

      // bracket begin
      case '[':
        cmds.push(Inst('loop', pos.slice(), [parseList(), pos.slice()]));
        if (src.shift() !== ']') expected('"]"');
        break;

      // bracket end
      case ']':
        src.unshift(c);
        return cmds;

      // comment
      case '#':
        comment = '';
        commentPos = pos.slice();
        do {
          if (c !== '#' || comment) {
            comment += c;
            pos[1]  += 1;
          }
          c = src.shift();
        } while (c && c !== '\n')
        cmds.push(Inst('comment', commentPos, comment));
        if (!c) break;
      // fallthrough

      // line break
      case '\n':
        pos[0] += 1;
        pos[1]  = 0;
        break;

      default:
        // nop
      }
    }

    return cmds;
  }

  // parse error reporter
  function expected(token) {
    throw new Error('expected ' + token + '(' + pos.join(', ') + ')');
  }
}

exports.parse = parse;

// class Segment
function Segment(genCol, srcId, origLine, origCol, nameId) {
  // calling as constructor check
  if (!(this instanceof Segment)) return new Segment(genCol, srcId, origLine, origCol, nameId);

  // set members
  var
  members = [genCol, srcId, origLine, origCol];
  if (typeof nameId !== 'undefined') members.push(nameId);
  members.forEach(function (val, i) {
    this[i] = val;
  }, this);
  this.length = members.length;
}

exports.Segment = Segment;

Segment.prototype.map = Array.prototype.map;

Segment.prototype.toBase64 = function () {
  return this.map(vlqBase64).join('');
};

var
BASE64CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'.split('');

/*
first
 |0|0000|0|
  |      \sign bit
  |
  \continuation bit

second...
 |0|00000|
  \continuation bit
 */
function vlqBase64(x) {
  x |= 0;

  var
  sign = +(x < 0),
  cont, i, str;
  if (sign) x = -x;
  cont = +(x > 0xf);

  str = BASE64CHARS[(cont << 5) | ((x & 0xf) << 1) | sign];
  x >>= 4;

  while (x !== 0) {
    cont = +(x > 0x1f);
    str += BASE64CHARS[cont << 5 | x & 0x1f];
    x >>= 5;
  }

  return str;
}

exports.vlqBase64 = vlqBase64;

// support default value
function def(val, def) {
  return val != null ? val : def;
}

// generate source map
function generateMap(filenames, srcCont, name, map, names) {
  var
  json = {
    version: 3,
    file: name + '.js',
    sourceRoot: '',
    sources: filenames,
    sourcesContent: srcCont,
    names: names,
    mappings: map.map(function (line) {
      return line.map(function (seg) { return seg.toBase64(); }).join(',');
    }).join(';'),
  };
  return JSON.stringify(json);
}

// generate from instruments to JavaScript code
function generate(insts, option) {
  var
  filename = def(option.filename, '<string>'),
  srcCont  = def(option.source,   null),
  name     = filename.replace(/\..*$/, ''),
  putchar  = def(option.putchar,  'function (c) {console.log(String.fromCharCode(c));}').replace(/\n/g, ''),
  getchar  = def(option.getchar,  'undefined').replace(/\n/g, ''),
  async    = def(option.async,    false),
  useMap   = def(option.useMap,   false),
  nodejs   = def(option.nodejs,   true),
  cbs      = 0,
  pos      = [1, 1],
  src      = '',
  map      = [];

  walkInsts(insts, 0);

  // append source-map as dataURL
  if (useMap) {
    src += '//@ sourceMappingURL=data:application/json;base64,';
    map.push([]);
    src += new Buffer(generateMap([filename], [srcCont], name, map, []), 'utf-8').toString('base64') + '\n';
  }

  return src;

  // walker to generate JavaScript code
  function walkInsts(insts, indent) {
    var
    inst, i, len = insts.length, getchars_;

    while (insts.length) {
      inst = insts.shift();

      switch (inst.name) {

      case 'begin':
        appendSrc('(function () {');
        indent += 2;
        appendSrc('var buffer = new Uint8Array(30000), pointer = 0;');
        appendSrc('var putchar = ' + putchar + ';');
        appendSrc('var getchar = ' + getchar + ';');
        if (async) appendSrc('var asyncWhile = function (fn, cb) { buffer[pointer] ? fn(function () { asyncWhile(fn, cb); }) : cb(); };');
        src += '\n';
        map.push([]);
        inst = insts[insts.length-1];
        walkInsts(insts, indent);
        indent -= 2;
        appendSrc('})();');
        break;

      case 'end':
        if (nodejs) appendSrc('process.exit();');
        break;


      case '+':
      case '-':
        appendSrc('buffer[pointer]' + inst.name + inst.name + ';');
        break;

      case '>':
        appendSrc('pointer++;');
        break;
      case '<':
        appendSrc('pointer--;');
        break;

      case '.':
        appendSrc('putchar(buffer[pointer]);');
        break;

      case ',':
        if (async) {
          appendSrc('getchar(function (c) {');
          indent += 2;
          appendSrc('buffer[pointer] = c;');
          walkInsts(insts, indent);
          if (cbs) {
            cbs -= 1;
            appendSrc('cb();');
          }
          indent -= 2;
          appendSrc('});');
        } else appendSrc('buffer[pointer] = getchar();');
        break;

      case 'loop':
        if (async) {
          cbs += 1;
          appendSrc('asyncWhile(function (cb) {');
        } else appendSrc('while(buffer[pointer]) {');
        walkInsts(inst.val[0], indent + 2);
        inst = {pos: inst.val[1]};
        if (async) {
          if (cbs) {
            cbs -= 1;
            indent += 2;
            appendSrc('cb();');
            indent -= 2;
          }
          appendSrc('}, function () {');
          walkInsts(insts, indent + 2);
          appendSrc('});');
        } else appendSrc('}');
        break;

      case 'comment':
        appendSrc('//' + inst.val);
        break;
      }
    }

    function appendSrc(line, offset) {
      offset = offset || 0;

      var
      rpos = [inst.pos[0] - pos[0], inst.pos[1] - pos[1]];

      line = Array(indent + 1).join(' ') + line;

      src += line + '\n';
      map.push([Segment(indent + offset, 0, rpos[0], rpos[1])]);
      pos[0] += rpos[0]; pos[1] += rpos[1];
    }
  }

}

exports.generate = generate;

function compile(src, option) {
  var
  insts = parse(src);

  option.source = src;
  return generate(insts, option);
}

exports.compile = compile;
