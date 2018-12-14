let test = require('test-kit')('tape')
let hunk = require('../hunk')

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


