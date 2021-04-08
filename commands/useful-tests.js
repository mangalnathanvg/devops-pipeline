const sshSync = require("../lib/ssh");
const chalk = require("chalk");

exports.command = "useful-tests";
exports.desc = "Running useful tests";
exports.builder = yargs => {
    yargs.options({
        check: {
            alias: 'c',
            describe: "Number of iterations to run the tests",
            type: "number",
            default: 100
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
    const { check } = argv;
    const username = argv['gh-user'];
    const password = argv['gh-pass'];

    (async () => {
      await run(check, username, password);
    })();
};

async function run(check, username, password) {
    
        let filePath = "/bakerx/cm/iTrust_Mutation.yml";
        console.log(chalk.blueBright(`Running tests ${check} time(s)...`));
        let result = sshSync(
          `ansible-playbook ${filePath} --vault-password-file ~/.vault-pass -e "check=${check}" -e git_uname=${encodeURIComponent(username)} -e git_passwd=${encodeURIComponent(password)}`,
          "vagrant@192.168.33.20"
        );
        if (result.error) {
          process.exit(result.status);
    }
}
