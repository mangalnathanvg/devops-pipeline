const child = require('child_process');
const chalk = require('chalk');
const path = require('path');
const os = require('os');

const scpSync = require('../lib/scp');
const sshSync = require('../lib/ssh');

exports.command = 'deploy <projectName>';
exports.desc = 'Deploy the projects';
exports.builder = (yargs) => {
  yargs.options({
    projectName: {
      describe: 'Project to be deployed',
      type: 'string',
    },
    i: {
      describe: 'Inventory file',
      type: 'string',
    },
  });
};

exports.handler = async (argv) => {
  const { projectName } = argv;
  const inventoryFile = encodeURIComponent(argv['i']);

  (async () => {
    await run(projectName, inventoryFile);
  })();
};

async function run(projectName, inventoryFile) {
  result = sshSync(
    `ansible-playbook --vault-password-file vault_pass.txt "/bakerx/cm/${projectName}-deploy.yml" -i "/bakerx/${inventoryFile}" -vvvv`,
    'vagrant@192.168.33.20'
  );
  if (result.error) {
    console.log(result.error);
    process.exit(result.status);
  }
}
