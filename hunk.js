// objects and functions for formatting diffs with partial context.  see the 'makeHunks()' documentation, below
// for details.

'use strict'

function calcLen (linechanges, ab) {
    let len = 0
    for (let ci = 0; ci < linechanges.length; ci++) {
        switch (linechanges[ci].type) {
            case REMOVED:
                len += ab[0]
                break
            case ADDED:
                len += ab[1]
                break
            case UNMODIFIED:
                len++
                break
            default:
                throw Error('unknown change type: ' + linechanges[ci].type)
        }
    }
    return len
}

function Hunk (aoff, boff, changes) {
    this.changes = changes
    this.aoff = aoff
    this.boff = boff
    this._alen = -1
    this._blen = -1
}

Object.defineProperty (Hunk.prototype, 'alen', {
    get: function () { return this._alen === -1 ? (this._alen = calcLen(this.changes, [1,0])) : this._alen }
})

Object.defineProperty (Hunk.prototype, 'blen', {
    get: function () { return this._blen === -1 ? (this._blen = calcLen(this.changes, [0,1])) : this._blen }
})

Hunk.prototype.unified = function () {
    let ret = [this.unifiedHeader()]
    this.changes.forEach(function(c) {
        ret.push(c.unified())
    })
    // console.log("expect:\n'" + ret.join("'\n'") + "'")   // useful for creating test output
    return ret.join('\n')
}

Hunk.prototype.unifiedHeader = function () {
    let alen = this.alen === 1 ? '' : ',' + this.alen
    let blen = this.blen === 1 ? '' : ',' + this.blen
    // empty hunks show zeroith line (prior).  hunks with lines show first line number
    let afudg = this.alen === 0 ? 0 : 1
    let bfudg = this.blen === 0 ? 0 : 1
    return '@@ -' + (this.aoff+afudg) + alen + ' +' + (this.boff+bfudg) + blen + ' @@'
}

Hunk.prototype.shorthand = function () {
    return this.changes.reduce(function(s,c){ return s + c.type }, '')
}

Hunk.prototype.toString = function () {
    return "{" + this.shorthand() + "} " + this.unifiedHeader()
}

const ADDED = '+'
const REMOVED = '-'
const UNMODIFIED = 's'

function type2unified (type) { return type === 's' ? ' ' : type }

// LineChange objects represent a single line of change.  Converting diff.diffLine() result array into LineChange
// object array:
//
//    1.  simplifies logic that needs work with lines
//    2.  separates this extension module from specific dependency on the diff library
function LineChange (type, text) {
    this.type = type   // ADDED, REMOVED, UNMODIFIED
    this.text = text
}
LineChange.prototype.unified = function () {
    return type2unified(this.type) + this.text
}
LineChange.prototype.toString = function () {  return this.unified() }

// convert a single change from diff.diffLines() into a single line string
// (handy for debugging)
function change2string (c, maxwidth) {
    maxwidth = maxwidth || 60
    let ret = c.count + ': ' + type2unified(c.type)
    let lim = Math.min(maxwidth - ret.length, c.value.length-1) // remove last newline
    let txt = c.value.substring(0,lim).replace(/\n/g, ',') + (c.value.length > (lim+1) ? '...' : '')
    return  ret + txt
}

// Convert a change as returned from diff.diffLines() into an LineChange objects with offset information.
//
//     change    - object returned from diff.diffLines() containing one or more lines of change info
//     select    - (int)
//                  positive, return up to this many lines from the start of change.
//                  negative, return up to this many lines from the end of the change.
//                  zero, return empty array
//                  undefined, return all lines
//
function lineChanges (change, select) {
    // debug:
    // console.log(change2str(change) + (select === undefined ? '' : '  (select:' + select + ')'))
    if (select === 0) {
        return []
    }
    let lines = []
    let v = change.value
    if (select === undefined) {
        lines = v.split('\n')
        if (!lines[lines.length-1]) { lines.pop() }  // remove terminating new line
    } else if(select > 0) {
        let i = nthIndexOf(v, '\n', 0, select, false)
        lines = v.substring(0,i).split('\n')
    } else {
        let len = v[v.length-1] === '\n' ? v.length-1 : v.length
        let i = nthIndexOf(v, '\n', len-1, -select, true)
        lines = v.substring(i+1, len).split('\n')
    }
    return lines.map(function (line){ return new LineChange(change.type, line)})
}

// convert a list of changes into a shorthand notation like 'ss--+++ss-+ss'
function changes2shorthand (changes) {
    return '{' + changes.reduce(function (s,c) { for(let i=0; i< c.count; i++) s += c.type; return s }, '') + '}'
}

// concat-in-place, a -> b and return b
function concatTo (a, b) {
    Array.prototype.push.apply(b, a)
    return b
}

// Make Hunk objects from changes as returned from a call to unidiff.lineChanges().  Hunks are collections
// of continuous line changes, therefore every hunk after the first marks a gap
// where unmodified context lines are skipped.
//
//      let 's' represent an unmodifed line 'same'
//          '-' represent a removed line
//          '+' represent an added line
//
//      then hunks with a context of 2 could might like this:
//
//             hunk                hunk         hunk
//           ___|____            ___|__        ___|___
//          |        |          |       |     |       |
//       sssss----++ssssssssssssss-ss--sssssssss+++++ssssssssss
//
//      or this:
//
//             hunk              hunk             hunk
//           ___|____       ______|_______     ____|___
//          |        |     |              |   |        |
//          ++++++++sssssssss+++ssss---++sssssss--++++++
//
//      notice that with a context of 2, series of 4 or fewer unmodified lines are included in the same hunk.
//
// basic algo with context of 3, for illustration:
//
//     0. loop (over each block change)
//        modified block:
//           add all modified lines, continue loop 0
//
//        unmodified block:
//           first hunk: collect tail portion, continue
//           subsequent hunks: get head portion, and tail (iff there are more changes)
//              head + tail <= 6 ?
//                 add all to current hunk, continue loop 0
//              head + tail > 6 ?
//                 finish hunk with head portion
//                 start new hunk with tail portion (iff there are more changes), continue loop 0
//
function makeHunks (changes, precontext, postcontext) {

    //console.log('--------\nmakeHunks(' + [changes2shorthand(changes), precontext, postcontext].join(', ') + ')')
    let ret = []        // completed hunks to return
    let lchanges = []   // accumulated line changes (continous/no-gap) to put into next hunk
    let lskipped = 0    // skipped context to take into account in next hunk line numbers
    function finishHunk () {
        if (lchanges.length) {
            let aoff = lskipped, boff = lskipped
            if (ret.length) {
                let prev = ret[ret.length-1]
                aoff += prev.aoff + prev.alen
                boff += prev.boff + prev.blen
            }
            // add hunk and reset state
            ret.push(new Hunk(aoff, boff, lchanges))
            lchanges = []
            lskipped = 0
        }
        // else keep state (lskipped) and continue
    }

    for (let ci=0; ci < changes.length; ci++) {
        let change = changes[ci]
        if (change.type === UNMODIFIED) {
            // add context
            let ctx_after  = ci > 0 ? postcontext : 0              // context lines following previous change
            let ctx_before = ci < changes.length - 1 ? precontext : 0  // context lines preceding next change (iff there are more changes)
            let skip = Math.max(change.count - (ctx_after + ctx_before), 0)
            if (skip > 0) {
                concatTo(lineChanges(change, ctx_after), lchanges)          // finish up previous hunk
                finishHunk()
                concatTo(lineChanges(change, -ctx_before), lchanges)
                lskipped = skip                                             // remember skipped for next hunk
            } else {
                concatTo(lineChanges(change), lchanges)                     // add all context
            }
        } else {
            concatTo(lineChanges(change), lchanges)                         // add all modifications
        }
    }
    finishHunk()
    //console.log(ret.map(function(h){ return h.toString() }).join('\n'))
    return ret
}

// no safty checks. caller knows that there are at least n occurances of v in s to be found.
// reverse will search from high to low using lastIndexOf().
function nthIndexOf (s, v, from, n, reverse) {
    let d = reverse ? -1 : 1
    from -= d
    for (let c=0; c<n; c++) {
        from = reverse ? s.lastIndexOf(v, from + d) : s.indexOf(v, from + d)
    }
    return from
}

// for testing and debugging
exports.hunk = function (aoff, boff, lchanges) { return new Hunk(aoff, boff, lchanges) }
exports.linechange = function (type, text) { return new LineChange(type, text)}
exports.lineChanges = lineChanges
exports.change2string = change2string
exports.changes2shorthand = changes2shorthand
exports.nthIndexOf = nthIndexOf

// main API
exports.makeHunks = makeHunks
exports.ADDED = ADDED
exports.REMOVED = REMOVED
exports.UNMODIFIED = UNMODIFIED



