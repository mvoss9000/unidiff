let test = require('test-kit')('tape')
let unidiff = require('.')
let hunk = require('./hunk.js')

// generate an array of line changes, one-per-character in the given shorthand string.s
function genChanges (off, shorthand) {
    let ret = []
    for(let i=0; i<shorthand.length; i++) {
        ret.push(hunk.linechange(shorthand[i], 'line ' + (i + off + 1)))
    }
    return ret
}

test('hunk: offset and shorthand', function (t) {
    let tbl = t.table([
        [ 'shorthand',   'alen', 'blen' ],
        [ '',             0,      0 ],
        [ '-',            1,      0 ],
        [ '+',            0,      1 ],
        [ 's',            1,      1 ],
        [ 'ss---++sss',   8,      7 ],
        [ '-+++sss--+',   6,      7 ],
    ])

    t.plan(tbl.length * 5)
    tbl.rows.forEach(function(r, i) {
        let h = hunk.hunk(i, i+1, genChanges(0, r.shorthand))
        t.equals(h.aoff, i)
        t.equals(h.boff, i+1)
        t.equals(h.alen, r.alen)
        t.equals(h.blen, r.blen)
        t.equals(h.shorthand(), r.shorthand)
    })
})

test('hunk: nthIndexOf', function (t) {
    t.table_assert([
        ['s',                 'v',    'from', 'n', 'rev', 'expect'],
        ['a',                 'a',     0,      1,   0,     0],
        ['a',                 'a',     0,      1,   1,     0],
        ['aaa',               'a',     0,      2,   0,     1],
        ['aaa',               'a',     0,      2,   0,     1],
        ['aaa',               'a',     2,      3,   1,     0],
        ['aaa',               'a',     1,      2,   0,     2],
        ['aaa',               'a',     2,      1,   0,     2],
        ['xa',                'a',     0,      1,   0,     1],
        ['xaxaxaxa',          'a',     0,      2,   0,     3],
        ['xaxaxaxa',          'a',     0,      3,   0,     5],
        ['xaxaxaxa',          'a',     0,      4,   0,     7],
    ], hunk.nthIndexOf)
})

test('hunk: lineChanges', function (t) {
    t.table_assert([
        [ 'value',     'select',  'expect' ],
        [ '1\n',       undefined, [ '1' ] ],
        [ '1\n2\n3\n', undefined, [ '1', '2', '3' ] ],
        [ '1\n2\n3\n', 1,         [ '1' ] ],
        [ '1\n2\n3\n', 2,         [ '1', '2' ] ],
        [ '1\n2\n3\n', 3,         [ '1', '2', '3' ] ],
        [ '1\n2\n3\n', -1,        [ '3' ] ],
        [ '1\n2\n3\n', -2,        [ '2', '3' ] ],
        [ '1\n2\n3\n', -3,        [ '1', '2', '3' ] ],
    ], function (value, select) {
        return hunk.lineChanges({type:'unmodified', value: value}, select).map(function(lc) { return lc.text })
    })

})


test('unidiff: check inherited api', function (t) {
  let expectedFns = [
  "Diff",
      "applyPatch",
      "applyPatches",
      "canonicalize",
      "convertChangesToDMP",
      "convertChangesToXML",
      "createPatch",
      "createTwoFilesPatch",
      "diffAsText",               // unidiff added
      "diffChars",
      "diffCss",
      "diffJson",
      "diffLines",
      "diffSentences",
      "diffTrimmedLines",
      "diffWords",
      "diffWordsWithSpace",
      "formatLines",              // unidiff added
      "parsePatch",
      "structuredPatch"
  ]
  t.plan(expectedFns.length)
  expectedFns.forEach(function (fname){
      t.ok(unidiff.hasOwnProperty(fname), 'has function ' + fname)
  })
})


test('unidiff: diffAsText - zero changes', function (t) {
  let a = ['line 1', 'line 2', 'line 3']

  t.plan(1)
  t.equals(unidiff.diffAsText(a, a), '')
})

test('unidiff: diffAsText - empty', function (t) {
  let txt = 'line 1\nline 2\n'

  t.plan(2)
  t.equals(unidiff.diffAsText(txt, ''), [
      '--- a',
      '+++ b',
      '@@ -1,2 +0,0 @@',
      '-line 1',
      '-line 2'
  ].join('\n'))

  t.equals(unidiff.diffAsText('', txt), [
      '--- a',
      '+++ b',
      '@@ -0,0 +1,2 @@',
      '+line 1',
      '+line 2'
  ].join('\n'))
})

test('unidiff: diffAsText - add and remove', function (t) {
  let a = []
  for (let i = 1; i <= 12; i++) {
      a.push('line ' + i)
  }

  let b = [
      'line 1',
      // line 2
      'line 3',
      'line 4',
      // lines 5-6
      'line 7',
      'line 8',
      'line 9'
      // lines 10-12
  ]

  // handy for testing... compare with diff -U<context> f1 f2
  //fs.writeFileSync('f1', a.join('\n') + '\n')
  //fs.writeFileSync('f2', b.join('\n') + '\n')

  t.plan(6)

  // Full Context (> 1)
  // test with lines removed (b missing lines)
  t.equals(unidiff.diffAsText(a, b, {context: 2}), [
      '--- a',
      '+++ b',
      '@@ -1,12 +1,6 @@',
      ' line 1',
      '-line 2',
      ' line 3',
      ' line 4',
      '-line 5',
      '-line 6',
      ' line 7',
      ' line 8',
      ' line 9',
      '-line 10',
      '-line 11',
      '-line 12'
  ].join('\n'))
  //*/

  // test add by swapping files a and b
  t.equals(unidiff.diffAsText(b, a, {context: 2, aname: 'b', bname: 'a'}), [
      '--- b',
      '+++ a',
      '@@ -1,6 +1,12 @@',
      ' line 1',
      '+line 2',
      ' line 3',
      ' line 4',
      '+line 5',
      '+line 6',
      ' line 7',
      ' line 8',
      ' line 9',
      '+line 10',
      '+line 11',
      '+line 12'
  ].join('\n'))
  //*/

  // Parital Context (1)
  // test removed
  t.equals(unidiff.diffAsText(a, b, {context: 1}), [
      '--- a',
      '+++ b',
      '@@ -1,7 +1,4 @@',
      ' line 1',
      '-line 2',
      ' line 3',
      ' line 4',
      '-line 5',
      '-line 6',
      ' line 7',
      '@@ -9,4 +6 @@',  // '+6,1' is abbreviated to '+6'
      ' line 9',
      '-line 10',
      '-line 11',
      '-line 12'
  ].join('\n'))
  //*/

  // test added by swapping a and b
  t.equals(unidiff.diffAsText(b, a, {context: 1, aname: 'b', bname: 'a'}), [
      '--- b',
      '+++ a',
      '@@ -1,4 +1,7 @@',
      ' line 1',
      '+line 2',
      ' line 3',
      ' line 4',
      '+line 5',
      '+line 6',
      ' line 7',
      '@@ -6 +9,4 @@',  // '+6,1' is abbreviated to '+6'
      ' line 9',
      '+line 10',
      '+line 11',
      '+line 12'
  ].join('\n'))
  //*/

  // test added by swapping a and b
  t.equals(unidiff.diffAsText(b, a, {context: 0, aname: 'b', bname: 'a'}), [
      '--- b',
      '+++ a',
      '@@ -1,0 +2 @@',
      '+line 2',
      '@@ -3,0 +5,2 @@',
      '+line 5',
      '+line 6',
      '@@ -6,0 +10,3 @@',
      '+line 10',
      '+line 11',
      '+line 12'
  ].join('\n'))
  //*/

  t.equals(unidiff.diffAsText(a, b, {context: 0}), [
      '--- a',
      '+++ b',
      '@@ -2 +1,0 @@',
      '-line 2',
      '@@ -5,2 +3,0 @@',
      '-line 5',
      '-line 6',
      '@@ -10,3 +6,0 @@',
      '-line 10',
      '-line 11',
      '-line 12'
  ].join('\n'))
//*/
})


test('unidiff: diffAsText - replace', function (t) {
  let a = []
  for (let i = 1; i <= 12; i++) {
      a.push('line ' + i)
  }

  // modify every 3rd line from 0
  let b = a.map(function (v) {
      return v
  })
  for (let i = 0; i < b.length; i += 3) {
      b[i] = '{' + b[i] + '}'
  }
  // handy for testing... compare with diff -U<context> f1 f2
  //fs.writeFileSync('f1', a.join('\n') + '\n')
  //fs.writeFileSync('f2', b.join('\n') + '\n')

  t.plan(2)
  t.equals(unidiff.diffAsText(a, b, {context: 1}), [
      '--- a',
      '+++ b',
      '@@ -1,11 +1,11 @@',
      '-line 1',
      '+{line 1}',
      ' line 2',
      ' line 3',
      '-line 4',
      '+{line 4}',
      ' line 5',
      ' line 6',
      '-line 7',
      '+{line 7}',
      ' line 8',
      ' line 9',
      '-line 10',
      '+{line 10}',
      ' line 11'
  ].join('\n'))

  t.equals(unidiff.diffAsText(a, b, {context: 0}), [
      '--- a',
      '+++ b',
      '@@ -1 +1 @@',
      '-line 1',
      '+{line 1}',
      '@@ -4 +4 @@',
      '-line 4',
      '+{line 4}',
      '@@ -7 +7 @@',
      '-line 7',
      '+{line 7}',
      '@@ -10 +10 @@',
      '-line 10',
      '+{line 10}'
  ].join('\n'))
})

test('unidiff: assertEqual', function (t) {
  t.plan(4)
  let lbl = 'foo'
  let eqFn = function(expr, msg) {t.ok(expr, 'no diff'); t.assert(msg === lbl, 'label') }
  let neqFn = function(expr, msg) {t.ok(!expr, 'has diff');t.assert(msg === lbl, 'label') }
  unidiff.assertEqual([1,2,3], [1,2,3], eqFn, lbl)
  unidiff.assertEqual([1,2,3], [1,2,3,4], neqFn, lbl, function(s){})
})



