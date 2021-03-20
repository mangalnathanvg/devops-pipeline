const child = require('child_process');
const chalk = require('chalk');
const path = require('path');
const os = require('os');

const scpSync = require('../lib/scp');
const sshSync = require('../lib/ssh');

exports.command = 'build <job>';
exports.desc = 'Trigger a build job';
exports.builder = (yargs) => {
  yargs.options({
    privateKey: {
      describe: 'Install the provided private key on the configuration server',
      type: 'string',
    },
    'u': {
      describe: 'Jenkins username',
      type: 'string',
    },
    'p': {
      describe: 'Jenkins password',
      type: 'string',
    },
  });
};