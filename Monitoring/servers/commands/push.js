
const child = require('child_process');
const chalk = require('chalk');
const path = require('path');

const sshSync = require('../lib/ssh');
const scpSync = require('../lib/scp');
const VBox = require('../lib/VBoxManage');

exports.command = 'push';
exports.desc = 'Install and update monitoring agent running on servers';
exports.builder = yargs => {
    yargs.options({
    });
};


exports.handler = async argv => {
    const {} = argv;

    (async () => {

        await run( );

    })();

};

async function run() {

    console.log(chalk.greenBright('Pushing monitoring agent to servers...'));

    let agentJS = path.join(__dirname, '../../agent/index.js');
    let package = path.join(__dirname, '../../agent/package.json');

    let servers = ['alpine-01', 'alpine-02', 'alpine-03'];
    for( let server of servers )
    {
        let port=await VBox.getSSHPort(server);

        console.log(chalk.keyword('pink')(`Updated agent on server: ${server}`));
        // agent/index.js
        result = scpSync (port, agentJS, 'root@localhost:/root/agent.js');
        if( result.error ) { console.log(result.error); process.exit( result.status ); }

        // agent/package.json
        result = scpSync (port, package, 'root@localhost:/root/package.json');
        if( result.error ) { console.log(result.error); process.exit( result.status ); }

        if( process.platform=='win32')
            result = sshSync(`"npm install && forever stopall && forever start agent.js ${server}"`, 'root@localhost', port);
        else
        {
            result = sshSync(`'npm install && forever stopall && forever start agent.js ${server}'`, 'root@localhost', port);
        }
        if( result.error ) { console.log(result.error); process.exit( result.status ); }
    }




}


