// A simple table where each row is an object.  helps with data-driven testing.
'use strict'

function Table(header, rows) {
    this.header = header
    this.rows = rows
}
var tp = Table.prototype

tp.column = function (name) {
    return this.rows.reduce(function(a, r){ a.push(r[name]); return a}, [] )
}

tp.columnIndex = function (name) {
    return this.header.indexOf(name)
}

// property-getters
Object.defineProperty(tp, 'length', {
    get: function() { return this.rows.length }
})

tp.toString = function () {
    var header = this.header
    var rowstrings = this.rows.map(function(row) {
        return header.map(function(name){ return row[name] }).join(',')  // values as string
    })
    return header.join(',') + '\n' + rowstrings.join('\n')
}

exports.fromData = function (data) {
    var header = data[0]
    var hlen = header.length
    var rows = data.slice(1).map(function(r) {
        if (r.length !== hlen) {
            throw Error('number of columns should be consistent: ' + hlen + ' and ' + r.length)
        }
        return r.reduce(function(obj, v, i){
            obj[header[i]] = v
            return obj
        }, {})
    })
    return new Table(header, rows)
}
