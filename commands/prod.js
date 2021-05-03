const child = require('child_process');
const chalk = require('chalk');
const path = require('path');
const os = require('os');
const got    = require('got');
const axios = require('axios');
const fs = require('fs');

var config = {};
// Retrieve our api token from the environment variables.
config.token = process.env.NCSU_DOTOKEN;
const scpSync = require('../lib/scp');
const sshSync = require('../lib/ssh');
//const { request } = require('http');

exports.command = 'prod up';
exports.desc = 'Provisioning 3VM for iTrust, Checkbox, Monitoring';
exports.builder = (yargs) => {
    yargs.options({});
  };
// If config.token is not configured.
if( !config.token )
{
	console.log(chalk`{red.bold NCSU_DOTOKEN is not defined!}`);
	console.log(`Please set your environment variables with appropriate token.`);
	console.log(chalk`{italic You may need to refresh your shell in order for your changes to take place.}`);
	process.exit(1);
}

// Configure our headers to use our token when making REST api requests.
const headers =
{
	'Content-Type':'application/json',
	Authorization: 'Bearer ' + config.token
};

exports.handler = async (argv) => {
    (async () => {
        await run();
      } 
    )();
  };

//Sleep
async function sleep(milliseconds, string) { 
	let timeStart = new Date().getTime(); 
	console.log(string)
    while (true) { 
	  let elapsedTime = new Date().getTime() - timeStart; 
      if (elapsedTime > milliseconds) { 
        break; 
      } 
    } 
  }

// Adding the ssh key to the instances.

class DigitalOceanProvider
{
   
    async createDroplet (dropletName, region, imageName, ssh_id )
    {
        if( dropletName == "" || region == "" || imageName == "" )
        {
            console.log( chalk.red("You must provide non-empty parameters for createDroplet!") );
            return;
        }

        var data = 
        {
            "name": dropletName,
            "region":region,
            "size":"s-2vcpu-4gb",
            "image":imageName,
            "ssh_keys":ssh_id,
            "backups":false,
            "ipv6":false,
            "user_data":null,
            "private_networking":null
        };
        console.log("Attempting to create: "+ JSON.stringify(data) );
        let response = await got.post("https://api.digitalocean.com/v2/droplets", 
        {
            headers:headers,
            json: data
        }).catch( err => 
            console.error(chalk.red(`createDroplet: ${err}`)) 
        );

        if( !response ) return;

        if(response.statusCode == 202)
        {	
            var droplet_id = JSON.parse(response.body).droplet.id
            console.log(chalk.green(`Created droplet id ${JSON.parse(response.body).droplet.id}`));
        }
        return droplet_id;
    }

    async dropletInfo (id)
    {
        if( typeof id != "number" )
        {
            console.log( chalk.red("You must provide an integer id for your droplet!") );
            return;
        }

        // Make REST request
        let response = await got(`https://api.digitalocean.com/v2/droplets/${id}`, {headers: headers, responseType: 'json'})
                            .catch(err => console.error(`dropletInfo ${err}`));

        if( !response ) return;

        if( response.body.droplet )
        {
            let droplet = response.body.droplet;
            //console.log(droplet);

            console.log('')
            console.log('Details of the droplet - ', droplet.name)
            console.log('----------------------------------------------------')
            console.log('Private IP  : ', droplet.networks.v4[0].ip_address)
            var publicIP = droplet.networks.v4[1].ip_address
            console.log('Floating IP : ', publicIP)
            console.log('Image       : ', droplet.image.slug)

        }

        return publicIP;
    }
    
};
  

async function spawnVM(client, name, region, image, ssh_id){
    // let client = new DigitalOceanProvider();
    
    
    var dropletId1 = await client.createDroplet(name, region, image, ssh_id);
    var dropletId = dropletId1.toString();
    console.log("Droplet ID: ", dropletId);
    
    await sleep(50000, `Spawing Instance ${name} .... Waiting for a minute for services to be up.`);

    var dropletPubIP = await client.dropletInfo(dropletId1);

    await sleep(3000, '');
    return dropletPubIP
}

async function run()
{
    
    // #############################################
    // #3 Create an droplet with the specified name, region, and image
    // Comment out when completed. ONLY RUN ONCE!!!!!
    let client = new DigitalOceanProvider();
    
    // Adding ssh key of config-srv to DigitalOcean Dashboard 
    // Make sure that pipeline prod up should be run in the root directory of the project
    const pub_key = fs.readFileSync('./cm/public_key_config_srv.pub', 'utf-8').toString();

    var data = 
    {
        "name": "Config Server SSH Public key",
        "public_key": pub_key
    };

    const res1 = await axios.post('https://api.digitalocean.com/v2/account/keys', data, {
        headers: headers
    });


    // Retrieve id of ssh key
    const res2 = await axios.get('https://api.digitalocean.com/v2/account/keys', {
        headers: headers
    });

    var ssh_id = res2.data.ssh_keys[0].id;

    var ip1 = await spawnVM(client, "iTrust", "nyc1", "ubuntu-20-04-x64", ssh_id);
    console.log(`Droplet IP of iTrust Node : ${ip1.toString()}`);
    var ip2 = await spawnVM(client, "checkbox.io", "nyc1", "ubuntu-20-04-x64", ssh_id);
    console.log(`Droplet IP of iTrust Node : ${ip2.toString()}`);
    var ip3 = await spawnVM(client, "monitor", "nyc1", "ubuntu-20-04-x64", ssh_id);
    console.log(`Droplet IP of iTrust Node : ${ip3.toString()}`);

    // populating the inventory file with the IPs of the instances.
    // Using ansible script to create an inventory.ini file in the config-srv.
    console.log(chalk.greenBright('Create an inventory.ini file in the config-srv'));
    result = sshSync(`ansible-playbook /bakerx/cm/Ansible_scripts/Update_inventory.yml -e itrust_ip=${ip1.toString()} -e checkbox_ip=${ip2.toString()} -e monitoring_ip=${ip3.toString()}`, 'vagrant@192.168.33.20');
    if( result.error ) { console.log(result.error); process.exit( result.status ); }

}