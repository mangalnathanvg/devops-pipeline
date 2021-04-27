
const child = require('child_process');
const chalk = require('chalk');
const path = require('path');
const os = require('os');
const fs = require('fs');

const scpSync = require('../lib/scp');
const VBox = require('../lib/VBoxManage');

exports.command = 'up';
exports.desc = 'Provision monitoring infrastructure';
exports.builder = yargs => {
    yargs.options({
        privateKey: {
            describe: 'Install the provided private key on the configuration server',
            type: 'string'
        }
    });
};


exports.handler = async argv => {
    const { privateKey } = argv;

    (async () => {

        await run( privateKey );

    })();

};

async function run(privateKey) {

    console.log(chalk.greenBright('Provisioning monitoring server...'));
    let result = child.spawnSync(`bakerx`, `run monitor queues --ip 192.168.44.92 --sync`.split(' '), 
        {shell:true, stdio: 'inherit', cwd: path.join(__dirname, "../../dashboard")} );
    if( result.error ) { console.log(result.error); process.exit( result.status ); }

    let ip = getIPAddress();
    console.log(chalk.greenBright(`Setting host network as ${ip}...`));
    fs.writeFileSync(path.join(__dirname, "../../dashboard/metrics/ip.txt"), ip);


    console.log(chalk.greenBright('Provisioning alpine-01...'));
    result = child.spawnSync(`bakerx`, `run alpine-01 alpine-node`.split(' '), {shell:true, stdio: 'inherit'} );
    if( result.error ) { console.log(result.error); process.exit( result.status ); }
    VBox.execute('controlvm', 'alpine-01 natpf1 "service,tcp,,9001,,3000"').catch( e => e );

    console.log(chalk.greenBright('Provisioning alpine-02...'));
    result = child.spawnSync(`bakerx`, `run alpine-02 alpine-node`.split(' '), {shell:true, stdio: 'inherit'} );
    if( result.error ) { console.log(result.error); process.exit( result.status ); }
    VBox.execute('controlvm', 'alpine-02 natpf1 "service,tcp,,9002,,3000"').catch( e => e );

    console.log(chalk.greenBright('Provisioning alpine-03...'));
    result = child.spawnSync(`bakerx`, `run alpine-03 alpine-node`.split(' '), {shell:true, stdio: 'inherit'} );
    if( result.error ) { console.log(result.error); process.exit( result.status ); }
    VBox.execute('controlvm', 'alpine-03 natpf1 "service,tcp,,9003,,3000"').catch( e => e );

    // console.log(chalk.blueBright('Running init script...'));
    // result = sshSync('/bakerx/cm/server-init.sh', 'vagrant@192.168.33.10');
    // if( result.error ) { console.log(result.error); process.exit( result.status ); }

}

function getIPAddress() {
    var interfaces = require('os').networkInterfaces();
    for (var devName in interfaces) {
      var iface = interfaces[devName];
  
      for (var i = 0; i < iface.length; i++) {
        var alias = iface[i];
        if (alias.family === 'IPv4' && alias.address !== '127.0.0.1' && !alias.internal)
          return alias.address;
      }
    }
  
    return '0.0.0.0';
  }

