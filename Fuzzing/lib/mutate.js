
function mutateString (mutator, val) {

    // Step 3. Replace single quotes strings with integers

    var array = val.split('');

    if( mutator.random().bool(0.25) )
    {
        // Step 1. Randomly remove a random set of characters, from a random start position.
    }
    if( mutator.random().bool(0.25) )
    {
        // Step 2. Randomly add a set of characters.
    }

    return array.join('');
}

exports.mutateString = mutateString;
