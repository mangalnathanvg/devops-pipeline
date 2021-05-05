const path = require('path');
const os   = require('os');

const child = require('child_process');

let identifyFile = path.join(os.homedir(), '.bakerx', 'baker_rsa');

module.exports = function(port, src, dest) {
    
    let scpArgs = [];
    scpArgs.push(`-q`);
    scpArgs.push(`-P`);
    scpArgs.push(`${port}`);
    scpArgs.push(`-i`);
    scpArgs.push(`"${identifyFile}"`)
    scpArgs.push(`-o`);
    scpArgs.push(`StrictHostKeyChecking=no`);
    scpArgs.push(`-o`);
    scpArgs.push(`UserKnownHostsFile=/dev/null`);
    scpArgs.push(`"${src}"`);
    scpArgs.push(`"${dest}"`);        
    // console.log(scpArgs);
    return child.spawnSync(`scp`, scpArgs, {stdio: 'inherit', shell: true});
}