#!/usr/bin/env node
'use strict';

var
colors  = require('colors'),
program = require('commander');

program
  .version('0.0.1')
  .usage('[options] <filename>')
  .option('-r, --run', 'Running brainf*ck')
  .option('-p, --print', 'Print generated source to stdout')
  .option('-m, --map', 'Append source-map to generated code')
  .option('-h, --html', 'Generate html')
  .parse(process.argv);

var
filename = program.args.shift();

if (!filename) {
  console.error('  Please give a filename!'.red);
  program.help();
}

if (program.run && (program.print || program.html || program.map)) {
  console.error('  I can\'t generate a file while I am running!'.red);
  program.help();
}

if (program.print && program.html) {
  console.error('I can\'t print single html file!'.red);
  program.help();
}

var
fs = require('fs'),
path = require('path'),
brainfuck = require('..');

var
option = {};
option.filename = filename;

if (program.map) option.useMap = true;
if (program.html) {
  option.nodejs = false;
  option.putchar = '(' + function () {
    var chrs = [];
    setTimeout(function () {
      document.getElementById('output').value = decodeURIComponent(
        !chrs.length ? '' : '%' + chrs.map(function (c) {
          return ('00' + c.toString(16)).slice(-2);
        }).join('%'));
    }, 0);
    return function (c) { if (c) chrs.push(c); else throw ''; };
  } + ')()';
  option.getchar = '(' + function () {
    var input = encodeURIComponent(document.getElementById('input').value),
    chrs = [], i, len = input.length;
    for (i = 0; i < len; i++) {
      if (input.charAt(i) === '%') {
        chrs.push(parseInt(input.charAt(i+1)+input.charAt(i+2), 16));
        i += 2;
      } else {
        chrs.push(input.charCodeAt(i));
      }
    }
    return function () { return chrs.length ? chrs.shift() : 0; };
  } + ')()';
} else {
  option.async = true;
  option.putchar = '(' + function () {
    return function (c) { process.stdout.write(new Buffer([c])); };
  } + ')()';
  option.getchar = '(' + function () {
    var buf = [], callback = null;
    process.stdin.on('readable', function () {
      var chunk = process.stdin.read();
      buf.push.apply(buf, chunk);
      if (callback && buf.length) callback(buf.shift());
    });
    process.stdin.on('end', function () {
      buf.push(0);
      if (callback) callback(buf.shift());
    });
    return function (cb) {
      if (buf.length) {
        cb(buf.shift());
      } else {
        callback = cb;
      }
    };
  } + ')()';
}
option.putchar = option.putchar.replace(/^[ ]+/mg, '');
option.getchar = option.getchar.replace(/^[ ]+/mg, '');

var
basename = path.basename(filename, '.bf'),
source = fs.readFileSync(filename, 'utf-8'),
generate = brainfuck.compile(source, option);

if (program.run) {
  eval(generate);
} else if (program.html) {
  generate = 'onClick' + generate;
  var
  html = [
    '<!doctype html>',
    '',
    '<html>',
    '  <head>',
    '    <meta charset="utf-8">',
    '    <title>' + filename + '</title>',
    '  </head>',
    '  <body>',
    '    <h1>' + filename + '</h1>',
    '    <section>',
    '      <h2>Source code</h2>',
    '      <code><pre>',
    source,
    '      </pre></code>',
    '    </section>',
    '    <section>',
    '      <button type="button" id="run" style="display:block;">Run</button>',
    '      <textarea id="input"  placeholder="Input"  cols="80" rows="10"></textarea>',
    '      <textarea id="output" placeholder="Output" cols="80" rows="10"></textarea>',
    '    </section>',
    '    <script>',
    '      function onClick(click) {',
    '        document.getElementById("run").onclick = click;',
    '        return function () {};',
    '      }',
    '    </script>',
    '    <script src="./' + basename + '.js"></script>',
    '  </body>',
    '</html>'
  ].join('\n');

  fs.writeFileSync(basename + '.js', generate);
  fs.writeFileSync(basename + '.html', html);
} else if (program.print) {
  console.log(generate);
} else {
  fs.writeFileSync(basename + '.js', generate);
}
