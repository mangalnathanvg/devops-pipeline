var fs = require('fs');

const data = fs.readFileSync('./build_status.txt', 'utf8');
console.log('STATIC ANALYSIS: ' + data);

if(data == 'FAIL'){
    console.log("Failing Build because of VIOLATIONS!");
    process.exit(1);
}