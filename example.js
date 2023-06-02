let unidiff = require('.')

let diff = unidiff.diffLines(
    'a quick\nbrown\nfox\njumped\nover\nthe\nlazy\ndog\n',
    'a quick\nbrown\ncat\njumped\nat\nthe\nnot-so-lazy\nfox\n'
)
console.log(unidiff.formatLines(diff, {context: 2}))
