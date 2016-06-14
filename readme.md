# unidiff #

unidiff adds support for creating [unified diff format](https://en.wikipedia.org/wiki/Diff_utility#Unified_format)
to [jsdiff](https://github.com/kpdecker/jsdiff)

The following snippet:

    var unidiff = require('unidiff')

    var diff = unidiff.diffLines(
        'a quick\nbrown\nfox\njumped\nover\nthe\nlazy\ndog\n',
        'a quick\nbrown\ncat\njumped\nat\nthe\nnot-so-lazy\nfox\n'
    )
    console.log(unidiff.formatLines(diff), {context: 2})

Produces this [unified diff](https://en.wikipedia.org/wiki/Diff_utility#Unified_format) output:

    --- a
    +++ b
    @@ -1,8 +1,8 @@
     a quick
     brown
    -fox
    +cat
     jumped
    -over
    +at
     the
    -lazy
    -dog
    +not-so-lazy
    +fox

This same output can be achieved more concisely using the diffAsText function:

    console.log(require('unidiff').diffAsText(
        'a quick\nbrown\nfox\njumped\nover\nthe\nlazy\ndog\n',
        'a quick\nbrown\ncat\njumped\nat\nthe\nnot-so-lazy\nfox\n'
    ))
    
Both formatLines() and diffAsText() take a format options parameter with the
following options.

    {
        aname:        file name for input a, defaults to 'a'
        bname:        file name for input b, defaults to 'b'
        pre_context:  write up to this many unmodified lines before each change
        post_context: write up to this many unmodified lines after each change
        context:      default values for pre_context and post_context (specify both in one setting)
                      (context defaults to 3 when nothing is specified)
        format:       format of output text.  currently only "unified" is supported
    }


## Differences From JSDiff ##
All js-diff functions are also availalbe in unidiff, with a couple minor changes:

* unidiff.diffLines() and unidiff.diffAsText() accept arrays of strings as well as strings with new lines for input.
* unidiff.diffLines() returns an empty array when there are no differences instead of an array with a single unmodified change.


## Useful features to add to unidiff ##

* implement parsing of unified format to convert text output into patches.