const child = require('child_process');
const chalk = require('chalk');
const path = require('path');
const os = require('os');
const yaml = require('js-yaml');
const fs = require('fs');

const scpSync = require('../lib/scp');
const sshSync = require('../lib/ssh');
exports.command = 'canary <master_branch> <broken_branch>';
exports.builder = yargs => {
    yargs.options({
        privateKey: {
            describe: 'Install the provided private key on the configuration server',
            type: 'string'
        },
    });
};

// Reading from the yaml file
// Reference: https://stackabuse.com/reading-and-writing-yaml-to-a-file-in-node-js-javascript/
try{
    let fileContents = fs.readFileSync('./cm/canary_input_file.yml', 'utf8');
    let data = yaml.load(fileContents);
    var blue_server_ip = data['blue_server'];
    var green_server_ip = data['green_server'];
    var proxy_server_ip = data['proxy_server'];
    console.log(data);
} catch(e){
    console.log(e)
}

exports.handler = async argv => {
    const { master_branch, broken_branch } = argv;
    (async () => {
        await configure_servers( master_branch, broken_branch);
    })();
};


async function spawn_instances() {

    console.log(chalk.greenBright('Provisioning blue server ....'));
    let result = child.spawnSync(`bakerx`, `run master focal --ip ${blue_server_ip} --sync`.split(' '), {shell:true, stdio: 'inherit'} );
    if( result.error ) { console.log(result.error); process.exit( result.status ); }

    console.log(chalk.greenBright('Provisioning green server ....'));
    result = child.spawnSync(`bakerx`, `run broken focal --ip ${green_server_ip} --sync`.split(' '), {shell:true, stdio: 'inherit'} );
    if( result.error ) { console.log(result.error); process.exit( result.status ); }

    console.log(chalk.greenBright('Provisioning proxy server ....'));
    result = child.spawnSync(`bakerx`, `run proxy focal --ip ${proxy_server_ip} --sync`.split(' '), {shell:true, stdio: 'inherit'} );
    if( result.error ) { console.log(result.error); process.exit( result.status ); }
}


async function configure_servers(master, broken){    
    (async () => {
        await spawn_instances();
    })();

    // Populating the inventory file for the canary analysis
    console.log(`Populating the inventory file for the canary analysis....`);
    let result = sshSync(`ansible-playbook /bakerx/cm/canary_populate_inventory.yml -e blue_server_ip=${blue_server_ip} -e green_server_ip=${green_server_ip} -e proxy_server_ip=${proxy_server_ip}`, 'vagrant@192.168.33.20');
    if( result.error ) { console.log(result.error); process.exit( result.status ); }

    // Cloning Repository
    // Checkout the checkbox.io-micro-preview from the git repository
    console.log(`CLone the checkbox.io-micro-preview to the master (Blue) node.....`);
    result = await sshSync(`git clone --single-branch --branch master https://github.com/chrisparnin/checkbox.io-micro-preview.git`, `vagrant@${blue_server_ip}`);
    if (result.error) { console.log(result.error); process.exit(result.status); }

    // Checkout the checkbox.io-micro-preview from the git repository
    console.log(`Clone the checkbox.io-micro-preview to the broken (Green) node.....`);
    result = await sshSync(`git clone --single-branch --branch broken https://github.com/chrisparnin/checkbox.io-micro-preview.git`, `vagrant@${green_server_ip}`);
    if (result.error) { console.log(result.error); process.exit(result.status); }

    // Running checkbox.io dependencies playbook.
    console.log(`Running ansible config file to install dependencies for checkbox.io on master blue node ...`);
    result = sshSync(`ansible-playbook /bakerx/cm/canary-dependencies_master_blue.yml --vault-password-file ~/.vault-pass -i /bakerx/cm/canary_inventory.ini`, 'vagrant@192.168.33.20');
    if( result.error ) { console.log(result.error); process.exit( result.status ); }

    // Running checkbox.io dependencies playbook.
    console.log(`Running ansible config file to install dependencies for checkbox.io on broken green node ...`);
    result = sshSync(`ansible-playbook /bakerx/cm/canary-dependencies_broken_green.yml --vault-password-file ~/.vault-pass -i /bakerx/cm/canary_inventory.ini`, 'vagrant@192.168.33.20');
    if( result.error ) { console.log(result.error); process.exit( result.status ); }

    // Running checkbox.io dependencies playbook.
    console.log(`Running ansible config file to install dependencies on proxy node ...`);
    result = sshSync(`ansible-playbook /bakerx/cm/canary-dependencies_proxy.yml --vault-password-file ~/.vault-pass -i /bakerx/cm/canary_inventory.ini`, 'vagrant@192.168.33.20');
    if( result.error ) { console.log(result.error); process.exit( result.status ); }

    // Configure Redis
    console.log(`Configuring the Redis on the proxy_server`);
    result = sshSync(`ansible-playbook /bakerx/cm/redis_installation.yml --vault-password-file ~/.vault-pass -i /bakerx/cm/canary_inventory.ini`, `vagrant@192.168.33.20`);
    if( result.error ) { console.log(result.error); process.exit( result.status ); }

    // Start the checkbox.io on master (blue) node
    console.log(`Running redis service on master (blue) node ${blue_server_ip}.....`);
    result = await sshSync(`ansible-playbook /bakerx/cm/start_redis_service_master_blue.yml --vault-password-file ~/.vault-pass -i /bakerx/cm/canary_inventory.ini`, `vagrant@192.168.33.20`);
    if( result.error ) { console.log(result.error); process.exit( result.status ); }

    console.log(`Running redis service on broken (green) node ${green_server_ip}.....`);
    result = await sshSync(`ansible-playbook /bakerx/cm/start_redis_service_broken_green.yml --vault-password-file ~/.vault-pass -i /bakerx/cm/canary_inventory.ini`, `vagrant@192.168.33.20`);
    if( result.error ) { console.log(result.error); process.exit( result.status ); }

}