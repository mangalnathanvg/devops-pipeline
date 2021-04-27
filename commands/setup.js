const child = require('child_process');
const chalk = require('chalk');
const path = require('path');
const os = require('os');

const scpSync = require('../lib/scp');
const sshSync = require('../lib/ssh');

exports.command = 'setup';
exports.desc = 'Provision and configure the configuration server';
exports.builder = yargs => {
    yargs.options({
        privateKey: {
            describe: 'Install the provided private key on the configuration server',
            type: 'string'
        },
        'gh-user': {
          describe: 'GitHub username',
          type: 'string',
        },
        'gh-pass': {
          describe: 'GitHub password',
          type: 'string',
        },
    });
};


exports.handler = async argv => {
    const { privateKey } = argv;
    const username = argv['gh-user'];
    const password = argv['gh-pass'];

    (async () => {

        await run( privateKey, username, password);

    })();

};

async function run(privateKey, username, password) {

    console.log(chalk.greenBright('Installing configuration server!'));

    console.log(chalk.blueBright('Provisioning configuration server...'));
    let result = child.spawnSync(`bakerx`, `run config-srv focal --ip 192.168.33.20 -m 4096 --sync`.split(' '), {shell:true, stdio: 'inherit'} );
    if( result.error ) { console.log(result.error); process.exit( result.status ); }

    console.log(chalk.blueBright('Running init script...'));
    result = sshSync('/bakerx/cm/server-init.sh', 'vagrant@192.168.33.20');
    if( result.error ) { console.log(result.error); process.exit( result.status ); }

    console.log(chalk.blueBright('Copying .vault-pass file from host to VM'));
    result = sshSync('ansible-playbook /bakerx/cm/Ansible_scripts/copy_vault_pass.yml', 'vagrant@192.168.33.20');
    if( result.error ) { console.log(result.error); process.exit( result.status ); }

    console.log(chalk.blueBright('Installing NodeJS, NPM and Java'));
    result = sshSync('ansible-playbook /bakerx/cm/Ansible_scripts/install_dependencies.yml --vault-password-file ~/.vault-pass', 'vagrant@192.168.33.20');
    if( result.error ) { console.log(result.error); process.exit( result.status ); }

    console.log(chalk.blueBright('Installing MongoDB'));
    result = sshSync('ansible-playbook /bakerx/cm/Ansible_scripts/setup_mongodb.yml --vault-password-file ~/.vault-pass', 'vagrant@192.168.33.20');
    if( result.error ) { console.log(result.error); process.exit( result.status ); }
    
    console.log(chalk.blueBright('Installing and Configuring Jenkins'));
    result = sshSync('ansible-playbook /bakerx/cm/Ansible_scripts/jenkins_install_plugin.yml --vault-password-file ~/.vault-pass', 'vagrant@192.168.33.20');
    if( result.error ) { console.log(result.error); process.exit( result.status ); }

    console.log(chalk.blueBright(' Configuring Jenkins CLI'));
    result = sshSync('ansible-playbook /bakerx/cm/Ansible_scripts/jenkins_cli.yml --vault-password-file ~/.vault-pass', 'vagrant@192.168.33.20');
    if( result.error ) { console.log(result.error); process.exit( result.status ); }

    console.log(chalk.greenBright('Setting environment for ITrust2'));
    result = sshSync(`ansible-playbook /bakerx/cm/itrust.yml --vault-password-file ~/.vault-pass -e git_uname=${encodeURIComponent(username)} -e git_passwd=${encodeURIComponent(password)}`, 'vagrant@192.168.33.20');
    if( result.error ) { console.log(result.error); process.exit( result.status ); }

}
