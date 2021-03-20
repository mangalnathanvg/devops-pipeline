const child = require('child_process');
const chalk = require('chalk');
const path = require('path');
const os = require('os');

const scpSync = require('../lib/scp');
const sshSync = require('../lib/ssh');

exports.command = "build <job>";
exports.desc = "Trigger a build job";
exports.builder = yargs => {
  yargs.options({
    privateKey: {
      describe: 'Install the provided private key on the configuration server',
      type: 'string',
    },
    'u': {
      describe: 'Jenkins username',
      default: 'admin',
      type: 'string',
    },
    'p': {
      describe: 'Jenkins password',
      default: 'admin',
      type: 'string',
    },
  });
};


exports.handler = async argv => {
  (async () => {
    await run(argv);
  })();
};


async function run(argv){
  const {job, u, p} = argv;
  let file = '/bakerx/cm/Ansible_Scripts/' + job +'.yml';

  console.log(chalk.greenBright('Triggering a build job!'));
  result = sshSync(`ansible-playbook ${file} --vault-password-file .vault-pass -e user=${u} -e password=${p}`, 'vagrant@192.168.33.20');
  if( result.error ) { console.log(result.error); process.exit( result.status ); }
}
