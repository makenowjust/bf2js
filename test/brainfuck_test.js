var
expect = require('expect.js');

var
brainfuck = require('..'),
Inst      = brainfuck.Inst,
Segment   = brainfuck.Segment;

describe('brainfuck', function () {
  var
  // from http://en.wikipedia.org/wiki/Brainfuck
  helloworld =
    '++++++++[>++++[>++>+++>+++>+<<<<-]>+>+>->>+[<]<-]>>.>---.+++++++..+++.>>.<-.<.+++.------.--------.>>+.>++.';

  describe('.parse', function () {
    '+ - > < . , [+] [] [brainf*ck] [#]\n] +#-#brainf*ck brainf*ck [[]][][[[][]]]'
      .split(' ')
      .concat('', helloworld)
      .forEach(function (src) {
        it('(' + JSON.stringify(src) + ') don\'t throws a parse error',
          function () {
            expect(brainfuck.parse)
              .withArgs(src)
              .to.not.throwException();
          });
      });

    '[ ] ][ [[[]'
      .split(' ')
      .forEach(function (src) {
        it('(' + JSON.stringify(src) + ') throws a parse error',
           function () {
             expect(brainfuck.parse)
               .withArgs(src)
               .to.throwException(/expected/);
           });
      });

      [
        ['+', [Inst('+', [1, 1])]],
        ['#ok', [Inst('comment', [1, 1], 'ok')]],
        ['+-', [Inst('+', [1, 1]), Inst('-', [1, 2])]],
        ['>\n<', [Inst('>', [1, 1]), Inst('<', [2, 1])]],
      ].forEach(function (testCase) {
        var
        src = testCase[0],
        insts = [Inst('begin', [1, 1])]
          .concat(testCase[1], Inst('end', [
            (src.match(/\n/g)||[]).length + 1,
            src.match(/(?:^|\n)(.*)$/)[1].length
          ]));

        it('return instruments having position in source', function () {
          expect(brainfuck.parse(src)).to.eql(insts);
        });
      });
  });

  describe('.vlqBase64', function () {
    [[0, 'A'], [7, 'O'], [8, 'Q'], [-3, 'H'], [27, '2B'], [-19, 'nB'], [16, 'gB'], [-2000, 'h9D']]
      .forEach(function (testCase) {
        var
        x = testCase[0], str = testCase[1];

        it('(' + x + ') returns ' + JSON.stringify(str), function () {
          expect(brainfuck.vlqBase64(x)).to.be(str);
        });
      });
  });

  describe('.Segment', function () {

    describe('#toBase64', function () {
      [
        [Segment(0, 0, 0, 0), 'AAAA'],
        [Segment(6, 0, 0, 7), 'MAAO'],
        [Segment(8, 0, 0, 27, -3), 'QAA2BH'],
      ].forEach(function (testCase) {
        var
        seg = testCase[0], b64 = testCase[1];

        it('returns Base64 VLQ string', function () {
          expect(seg.toBase64()).to.be(b64);
        });
      });
    });

  });

});
