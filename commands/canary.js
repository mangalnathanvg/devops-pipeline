const child = require('child_process');
const chalk = require('chalk');
const path = require('path');
const yaml = require('js-yaml');
const fs = require('fs');
var mwu = require('mann-whitney-utest');

const sshSync = require('../lib/ssh');
const scpSync = require('../lib/scp');

exports.command = 'canary <blue_branch> <green_branch>';
exports.desc = 'Run Canary Analysis on the given branches';

const PASS = 'PASS';
const FAIL = 'FAIL';

const BLUE = path.join(__dirname, '../Monitoring/dashboard/', 'blue.json');
const GREEN = path.join(__dirname, '../Monitoring/dashboard/', 'green.json')
const REPORT = path.join(__dirname, '../canaryReport');

try {
    const vars_file =  path.join(__dirname, "../cm/", "canary_input_file.yml");
    let fileContents = fs.readFileSync(vars_file);
    let data = yaml.load(fileContents);

    var blue_ip = data['blue_server'];
    var green_ip = data['green_server'];
    var proxy_ip = data['proxy_server'];
    var config_srv_ip = '192.168.33.20';
  }
  catch(e) {
    console.log(e);
  }

exports.handler = async (argv) => {
  const { blue_branch, green_branch } = argv;

  (async () => {
    await run(blue_branch, green_branch);
  })();
};

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function provision_servers() {
    console.log(chalk.keyword('orange')('\nProvisioning Proxy server...'));
    let result = child.spawnSync(`bakerx`, `run proxy bionic --ip ${proxy_ip} --sync`.split(' '), {shell:true, stdio: 'inherit', cwd: path.join(__dirname, "../Monitoring/dashboard")} );
    if( result.error ) { console.log(result.error); process.exit( result.status ); }

    console.log(chalk.blueBright('\nProvisioning blue server...'));
    result = child.spawnSync(`bakerx`, `run blue bionic --ip ${blue_ip} --sync`.split(' '), {shell:true, stdio: 'inherit', cwd: path.join(__dirname, "../Monitoring/agent")} );
    if( result.error ) { console.log(result.error); process.exit( result.status ); }
    
    console.log(chalk.greenBright('\nProvisioning green server...'));
    result = child.spawnSync(`bakerx`, `run green bionic --ip ${green_ip} --sync`.split(' '), {shell:true, stdio: 'inherit', cwd: path.join(__dirname, "../Monitoring/agent")} );
    if( result.error ) { console.log(result.error); process.exit( result.status ); }
}

async function configure_redis() {
  console.log(chalk.keyword('orange')('\nInstalling and configuring redis-server on Proxy...'));
  let srcFile = path.join(__dirname, '../cm/redis.sh');
  
  result = await scpSync(srcFile, `vagrant@${proxy_ip}:/home/vagrant/redis.sh`);
      if( result.error ) { console.log(result.error); process.exit( result.status ); }

  result = await sshSync('chmod 700 redis.sh', `vagrant@${proxy_ip}`);

  result = await sshSync('./redis.sh', `vagrant@${proxy_ip}`);
}

async function clone_repositories(branch, ip) {
  // Clone checkbox microservice
  console.log('\nBranch: ', branch, " IP: ", ip);

  let result = await sshSync(`git clone -b ${branch} --single-branch https://github.com/chrisparnin/checkbox.io-micro-preview.git`, `vagrant@${ip}`);
  if (result.error) {
    console.log(result.error);
    process.exit(result.status);
  }

  // // Switch to branch
  // console.log(chalk.keyword('orange')(`Switching to ${branch}...`));
  // await sleep(2000);
  // result = await sshSync(`cd checkbox.io-micro-preview && git fetch && git checkout ${branch}`, `vagrant@${ip}`);
  // if (result.error) {
  //   console.log(result.error);
  //   process.exit(result.status);
  // }
}

async function start_dashboard() {
  let result = await sshSync(`cd /bakerx ; npm install`, `vagrant@${proxy_ip}`);
  if (result.error) {
    console.log(result.error);
  }

  console.log(chalk.keyword('orange')('\nStarting the Dashboard...'));
  sshSync(`cd /bakerx ; pm2 kill; pm2 start bin/www -- local ${blue_ip} ${green_ip}`, `vagrant@${proxy_ip}`);
}

async function start_agents() {
  console.log(chalk.keyword('orange')('\nSaving monitor ip in the agent VMs.'));
  
  fs.writeFileSync(path.join(__dirname, "../Monitoring/agent/", "proxy_ip.txt"), proxy_ip, {encoding: 'utf8', flag: "w"});

  console.log(chalk.blueBright('\nStarting the agent on blue...'));
  result = await sshSync(`cd /bakerx ; rm -rf package-lock.json; npm install --no-bin-links ; pm2 restart blue_agent;  pm2 start index.js --name blue_agent -- blue`, `vagrant@${blue_ip}`);

  console.log(chalk.greenBright('\nStarting the agent on green...'));
  result = await sshSync(`cd /bakerx ; rm -rf package-lock.json; npm install --no-bin-links ; pm2 restart green_agent; pm2 start index.js --name green_agent -- green`, `vagrant@${green_ip}`);
}

async function start_checkbox() {
    // Install dependencies
  console.log(chalk.blueBright(`\nInstalling checkbox dependencies on blue...`));
  let result = await sshSync(`cd checkbox.io-micro-preview/; npm install`, `vagrant@${blue_ip}`);
    
  console.log(chalk.blueBright('\nStarting checkbox microservice on blue...'));
  result = await sshSync("pm2 restart blue_checkbox.io; cd checkbox.io-micro-preview/; pm2 start index.js --name blue_checkbox.io", `vagrant@${blue_ip}`);

  console.log(chalk.greenBright(`\nInstalling checkbox dependencies on green...`));
  result = await sshSync(`cd checkbox.io-micro-preview/; npm install`, `vagrant@${green_ip}`);

  console.log(chalk.greenBright('\nStarting checkbox microservice on green...'));
  result = await sshSync("pm2 restart green_checkbox.io; cd checkbox.io-micro-preview/; pm2 start index.js --name green_checkbox.io", `vagrant@${green_ip}`);
}

async function run_playbook_BG() {
  console.log(chalk.keyword('orange')('\nRunning playbook on blue, green to install dependencies...'));
    const cmd = "ansible-playbook --vault-password-file ~/.vault-pass /bakerx/cm/canary_dependencies.yml -i /bakerx/cm/canary_inventory.ini";
    result = await sshSync(cmd,`vagrant@${config_srv_ip}`);
    if (result.error) {
        console.log(result.error);
        process.exit(result.status);
    }
}

async function run_playbook_proxy() {
  console.log(chalk.keyword('orange')('\nRunning playbook on proxy to install dependencies...'));
    const cmd = "ansible-playbook --vault-password-file ~/.vault-pass /bakerx/cm/canary_dependencies_proxy.yml -i /bakerx/cm/canary_inventory.ini";
    result = await sshSync(cmd,`vagrant@${config_srv_ip}`);
    if (result.error) {
        console.log(result.error);
        process.exit(result.status);
    }
}

async function generateReport(blue_branch, green_branch) {
    const blue_metrics = JSON.parse(await fs.readFileSync(BLUE, 'utf8'));
    const green_metrics = JSON.parse(await fs.readFileSync(GREEN, 'utf8'));

    console.log(chalk.keyword('magenta')('\n********** REPORT **********'));

    var canaryScore = {
      'latency': '',
      'memory': '',
      'cpu': '',
      'system': '',
      'statusCode': ''
    };

    var pass = 0;
    for (metric in blue_metrics) {
      if (metric == 'name'){
        continue
      }
      var len = Math.min(green_metrics[metric].length, blue_metrics[metric].length);
      var samples = [green_metrics[metric].slice(green_metrics[metric].length - len), blue_metrics[metric].slice(blue_metrics[metric].length - len)];
      var u = mwu.test(samples);

      if (!mwu.check(u, samples)) {
        console.error('Something went wrong!');
      }
      else {
      if (mwu.significant(u, samples)) {
        canaryScore[metric] = FAIL
      }
      else {
        canaryScore[metric] = PASS
        pass += 1;
      }
    }
  }

  var result;
  if (canaryScore['statusCode'] == PASS) {    
    if (pass / 5 >= 0.5)
      result = "The canary result is : " + PASS;
    else
      result =  "The canary result is : " + FAIL;
  }
  else {
    result = `Green Server wasn't responsive\nThe canary result is : ` + FAIL;
  }

  console.log(canaryScore)
  console.log(result);  
  var report = '***** REPORT *****\n\n';

  for (metric in canaryScore) {
    report += metric + ':' + canaryScore[metric] + '\n'
  }
  report += '\n' + result
  
  fs.writeFileSync(`${REPORT}_${blue_branch}_${green_branch}.txt`, report, 'utf8');
}

// async function shutDown() {
//     console.log(chalk.keyword('orange')('Shutting down canaries'));
//     let result = await child.spawnSync(`bakerx`, `delete vm blue`.split(' '), {shell:true, stdio: 'inherit'} );
//     if( result.error ) { console.log(result.error); process.exit( result.status ); }

//     result = await child.spawnSync(`bakerx`, `delete vm green`.split(' '), {shell:true, stdio: 'inherit'} );
//     if( result.error ) { console.log(result.error); process.exit( result.status ); }

//     console.log(chalk.keyword('orange')('Shutting down proxy'));
//     result = await child.spawnSync(`bakerx`, `delete vm proxy`.split(' '), {shell:true, stdio: 'inherit'} );
//     if( result.error ) { console.log(result.error); process.exit( result.status ); }

//     await deleteFile(BLUE);
//     await deleteFile(GREEN);
// }

// async function deleteFile(file) {
//   fs.unlinkSync(file, (err) => {
//     if (err) {
//       console.log(chalk.redBright(err));
//       process.exit(err.code);
//     }
//     console.log('File deleted');
//   })
// }

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));p
}

async function run(blue_branch, green_branch) {
    // await provision_servers();

    // //await sleep(5000);

    // console.log(chalk.keyword('orange')('\nCloning repositories...'));
    
    // await clone_repositories(blue_branch, blue_ip);
    
    // await clone_repositories(green_branch, green_ip);
    
    // await sleep(5000);

    //await run_playbook_BG();

    //await run_playbook_proxy();

    // await sleep(5000);
    //await configure_redis();

    //await start_checkbox();   
    
    //await start_agents(); 

    await start_dashboard(); 

    // // Wait for completion of canary analysis and then generate report
    console.log(chalk.keyword('orange')('Waiting to generate report...'));

    while (true) {

      if (fs.existsSync(BLUE) && fs.existsSync(GREEN)) { 
        break;
      }
      await sleep(5000);
    }
    
    await generateReport(blue_branch, green_branch);

    // shutDown();
}
