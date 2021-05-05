const child = require('child_process');
const chalk = require('chalk');
const path = require('path');
const os = require('os');

const scpSync = require('../lib/scp');
const sshSync = require('../lib/ssh');

exports.command = 'monitor-setup';
exports.desc = 'Deploy the projects';
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
    `ansible-playbook "/bakerx/cm/monitor_server.yml" -i "/bakerx/cm/${inventoryFile} --vault-password-file ~/.vault-pass"`,
    'vagrant@192.168.33.20'
  );
  if (result.error) {
    console.log(result.error);
    process.exit(result.status);
  }

  result = sshSync(
    `ansible-playbook "/bakerx/cm/agent_checkbox_server.yml" -i "/bakerx/cm/${inventoryFile} --vault-password-file ~/.vault-pass"`,
    'vagrant@192.168.33.20'
  );
  if (result.error) {
    console.log(result.error);
    process.exit(result.status);
  }

  result = sshSync(
    `ansible-playbook "/bakerx/cm/agent_iTrust_server.yml" -i "/bakerx/cm/${inventoryFile} --vault-password-file ~/.vault-pass"`,
    'vagrant@192.168.33.20'
  );
  if (result.error) {
    console.log(result.error);
    process.exit(result.status);
  }

  result = sshSync(
    `rm -rf /bakerx/ip.txt`,
    'vagrant@192.168.33.20'
  );
  if (result.error) {
    console.log(result.error);
    process.exit(result.status);
  }


}
