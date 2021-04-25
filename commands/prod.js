const child = require('child_process');
const chalk = require('chalk');
const path = require('path');
const os = require('os');
const got    = require("got");
var config = {};
// Retrieve our api token from the environment variables.
config.token = process.env.NCSU_DOTOKEN;
const scpSync = require('../lib/scp');
const sshSync = require('../lib/ssh');

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

class DigitalOceanProvider
{
    
    async createDroplet (dropletName, region, imageName )
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
            "ssh_keys":null,
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

        console.log(response.statusCode);
        console.log(response.body);

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
  

async function spawnVM(name, region, image){
    let client = new DigitalOceanProvider();
    
    var dropletId1 = await client.createDroplet(name, region, image);
    var dropletId = dropletId1.toString();
    console.log(dropletId);
    
    await sleep(50000, `Spawing Instance ${name} .... Waiting for a minute for services to be up.`);

    var dropletPubIP = await client.dropletInfo(dropletId1);
    console.log(dropletPubIP);
    await sleep(3000, '');
    return dropletPubIP
}

async function run()
{
    
    // #############################################
    // #3 Create an droplet with the specified name, region, and image
    // Comment out when completed. ONLY RUN ONCE!!!!!
    var ip1 = await spawnVM("iTrust", "nyc1", "ubuntu-18-04-x64" );
    console.log(`Droplet IP of iTrust Node : ${ip1.toString()}`);
    var ip2 = await spawnVM("checkbox.io", "nyc1", "ubuntu-18-04-x64" );
    console.log(`Droplet IP of iTrust Node : ${ip2.toString()}`);
    var ip3 = await spawnVM("monitor", "nyc1", "ubuntu-18-04-x64" );
    console.log(`Droplet IP of iTrust Node : ${ip3.toString()}`);
    
}