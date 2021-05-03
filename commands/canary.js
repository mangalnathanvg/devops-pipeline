const child = require('child_process');
const chalk = require('chalk');
const path = require('path');
const os = require('os');
const yaml = require('js-yaml');
const fs = require('fs');
const mwu = require('mann-whitney-utest');
const scpSync = require('../lib/scp');
const sshSync = require('../lib/ssh');
const waitssh = require('waitssh');
const BLUE = path.join(__dirname, '../Monitoring/dashboard/', 'blue.json');
const GREEN = path.join(__dirname, '../Monitoring/dashboard/', 'green.json')
const REPORT = path.join(__dirname, '../canaryReport');

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
    let result = child.spawnSync(`bakerx`, `run master bionic --ip ${blue_server_ip} --sync`.split(' '), {shell:true, stdio: 'inherit'} );
    if( result.error ) { console.log(result.error); process.exit( result.status ); }

    console.log(chalk.greenBright('Provisioning green server ....'));
    result = child.spawnSync(`bakerx`, `run broken bionic --ip ${green_server_ip} --sync`.split(' '), {shell:true, stdio: 'inherit'} );
    if( result.error ) { console.log(result.error); process.exit( result.status ); }

    console.log(chalk.greenBright('Provisioning proxy server ....'));
    result = child.spawnSync(`bakerx`, `run proxy bionic --ip ${proxy_server_ip} --sync`.split(' '), {shell:true, stdio: 'inherit'} );
    if( result.error ) { console.log(result.error); process.exit( result.status ); }
}

async function canaryReport(master, broken)
{
    const blueData = JSON.parse(await fs.readFileSync(BLUE, 'utf8'));
    const greenData = JSON.parse(await fs.readFileSync(GREEN, 'utf8'));

    console.log('\n----------CANARY REPORT!----------\n');

    var canaryScore = {
        'cpu': '',
        'memory': '',
        'latency': '',
        'sysload': '',
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
        canaryScore[metric] = 'FAIL'
      }
      else {
        canaryScore[metric] = 'PASS'
        pass += 1;
      }
    }
  }

    var result;
    if (canaryScore['statusCode'] == 'PASS') {    
      if (pass / 7 >= 0.5)
        result = "The canary result is : " + 'PASS';
      else
        result =  "The canary result is : " + 'FAIL';
    }
    else {
      result = `Green Server wasn't responsive\nThe canary result is : ` + 'FAIL';
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

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function waitForSSH(sshInfo)
{
    try{
        await waitssh(sshInfo);
    } catch (error)
    {
        console.error(error);
        process.exit(1);
    }
}

async function configure_servers(master, broken){    
    (async () => {
        await spawn_instances();
    })();

    let sshInfoBlue = {port: 22, hostname: blue_server_ip};
    let sshInfoGreen = {port: 22, hostname: green_server_ip};
    let sshInfoProxy = {port: 22, hostname: proxy_server_ip};

    await waitForSSH(sshInfoBlue);
    await waitForSSH(sshInfoGreen);
    await waitForSSH(sshInfoProxy);

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

    //start_agents() both blue and green - /Monitoring/agents/index.js - Done
    console.log(`Starting agent on the master (blue) node .....`);
    result = await sshSync(`ansible-playbook /bakerx/cm/start_agent_service_master_blue.yml --vault-password-file ~/.vault-pass -i /bakerx/cm/canary_inventory.ini`, `vagrant@192.168.33.20`);
    if( result.error ) { console.log(result.error); process.exit( result.status ); }

    // start_agents() both blue and green - /Monitoring/agents/index.js - Done
    console.log(`Starting agent on the broken (green) node .....`);
    result = await sshSync(`ansible-playbook /bakerx/cm/start_agent_service_broken_green.yml --vault-password-file ~/.vault-pass -i /bakerx/cm/canary_inventory.ini`, `vagrant@192.168.33.20`);
    if( result.error ) { console.log(result.error); process.exit( result.status ); }
    

    // start_dashboard() on the proxy server.
    console.log(`Starting dashboard on the proxy server ....`);
    result = await sshSync(`ansible-playbook /bakerx/cm/start_canary_dashboard.yml --vault-password-file ~/.vault-pass -i /bakerx/cm/canary_inventory.ini -e blue_ip=${blue_server_ip} -e green_ip=${green_server_ip}`, `vagrant@192.168.33.20`)
    if( result.error ) { console.log(result.error); process.exit( result.status ); }
    
    console.log('Generating Report....');

    while(true){
        if(fs.existsSync(BLUE) && fs.existsSync(GREEN)){
            break;
        }
        await sleep(5000);
    }

    await canaryReport(master, broken);

}