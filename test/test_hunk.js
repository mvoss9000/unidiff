var test = require('tape').test
var hunk = require('../hunk')
var table = require('./table.js')

// generate an array of line changes, one-per-character in the given shorthand string.s
function genChanges(off, shorthand) {
    var ret = []
    for(var i=0; i<shorthand.length; i++) {
        ret.push(hunk.linechange(shorthand[i], 'line ' + (i + off + 1)))
    }
    return ret
}

test('hunk: offset and shorthand', function(t) {
    var tbl = table.fromData([
        [ 'shorthand',   'alen', 'blen' ],
        //[ '',             0,      0 ],
        [ '-',            1,      0 ],
        [ '+',            0,      1 ],
        [ 's',            1,      1 ],
        [ 'ss---++sss',   8,      7 ],
        [ '-+++sss--+',   6,      7 ],
    ])

    t.plan(tbl.length * 5)
    tbl.rows.forEach(function(r, i) {
        var h = hunk.hunk(i, i+1, genChanges(0, r.shorthand))
        t.equals(h.aoff, i)
        t.equals(h.boff, i+1)
        t.equals(h.alen, r.alen)
        t.equals(h.blen, r.blen)
        t.equals(h.shorthand(), r.shorthand)
    })
})

test('hunk: nthIndexOf', function(t) {
    var tbl = table.fromData([
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
    ])
    t.plan(tbl.length)
    tbl.rows.forEach(function(r) {
        var dir = r.rev ? ('<-' + r.from) : (r.from + '->')
        var msg = ':: ' + dir + ' (' + r.v + ' in "' + r.s + '") n:' + r.n
        t.equals(hunk.nthIndexOf(r.s, r.v, r.from, r.n, r.rev), r.expect, msg)
    })
})

test('hunk: lineChanges', function(t) {
    var tbl = table.fromData([
        ['value',                                  'select', 'expect'],
        //['1\n',                                   undefined, ['1']],
        ['1\n2\n3\n',                             undefined, ['1','2','3']],
        ['1\n2\n3\n',                             1, ['1']],
        ['1\n2\n3\n',                             2, ['1','2']],
        ['1\n2\n3\n',                             3, ['1','2','3']],
        ['1\n2\n3\n',                             -1, ['3']],
        ['1\n2\n3\n',                             -2, ['2','3']],
        ['1\n2\n3\n',                             -3, ['1','2','3']],
    ])

    t.plan(tbl.length)
    tbl.rows.forEach(function(r) {
        var lcs = hunk.lineChanges({type:'unmodified', value: r.value}, r.select)
        var lines = lcs.map(function(lc) { return lc.text })
        var msg = ':: "' + r.value + '" (' + r.select + ')'
        t.deepEquals(lines, r.expect, msg)
    })
})


