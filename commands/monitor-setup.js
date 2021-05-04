const child = require('child_process');
const chalk = require('chalk');
const path = require('path');
const os = require('os');

const scpSync = require('../lib/scp');
const sshSync = require('../lib/ssh');

exports.command = 'monitor-setup';
exports.desc = 'Deploy monitoring setup the projects';
exports.builder = (yargs) => {
  yargs.options({
    i: {
      describe: 'Inventory file',
      type: 'string',
    },
  });
};

exports.handler = async (argv) => {
  const { projectName } = argv;
  const inventoryFile = argv['i'];
  (async () => {
    await run(projectName, inventoryFile);
  })();
};

async function run(projectName, inventoryFile) {
  result = sshSync(
    `ansible-playbook "/bakerx/cm/monitor.yml" -i "/bakerx/cm/${inventoryFile} -e ip_monitor='134.209.122.71' --vault-password-file ~/.vault-pass"`,
    'vagrant@192.168.33.20'
  );
  if (result.error) {
    console.log(result.error);
    process.exit(result.status);
  }
}
