# bf2js

__bf2js__ is a AltJS (translater from brainf\*ck to JS).

## What is new?

__bf2js__ supports [source-map].

so, you can debug brainf\*ck on browser!

## install

```
$ npm install -g bf2js
```

## usage

### translate

```
$ bf2js sample/a.bf
```

### translate and print

```
$ bf2js -p sample/a.bf
```

### translate to html

```
$ bf2js -h sample/a.bf
$ static &
$ open http://localhost:8080/a.html
```

### translate with source-map

```
$ bf2js -m sample/a.bf
```

### run

```
$ bf2js -r a.bf
```

## help

```
$ bf2js --help

  Usage: bf2js [options] <filename>

  Options:

    -h, --help     output usage information
    -V, --version  output the version number
    -r, --run      Running brainf*ck
    -p, --print    Print generated source to stdout
    -m, --map      Append source-map to generated code
    -h, --html     Generate html
```

## contributing

  1. fork it (<http://github.com/MakeNowJust/bf2js>)
  2. create your feature branch (`git checkout -b my-new-feature`)
  3. commit your changes (`git commit -am 'Add my new feature'`)
  4. push to the branch (`git push origin my-new-feature`)
  5. create new Pull Request

## license

bf2js is released under the [BSD-2-Clause].

## copyright

Copyright 2014, TSUYUSATO Kitsune <make.just.on@gmail.com>

[source-map]: https://github.com/mozilla/source-map/
[BSD-2-Clause]: http://opensource.org/licenses/BSD-2-Clause
