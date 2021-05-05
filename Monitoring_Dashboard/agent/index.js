const redis = require('redis');
const util  = require('util');
const os = require('os');
const si = require('systeminformation');
const toFixed = require('tofixed');
const fs = require('fs');

let ip = ''
try
{
	ip = fs.readFileSync('/bakerx/agent/ip.txt').toString();
}
catch(e)
{
	console.log(e);
	throw new Error("Missing required json file");	
}

// Calculate metrics.
// TASK 1:
class Agent
{
    memoryLoad()
    {
       console.log( os.totalmem(), os.freemem() );
       return toFixed((((os.totalmem() - os.freemem()) / os.totalmem()) * 100), 2);
    }
    async cpu()
    {
       let load = await si.currentLoad();
       return toFixed(load.currentload,2);
    }
	
}

(async () => 
{
    // Get agent name from command line.
    let args = process.argv.slice(2);
    main('agent_node');

})();


async function main(name)
{
    let agent = new Agent();
    let connection = redis.createClient(6379, ip , {})
    connection.on('error', function(e)
    {
        console.log(e);
        process.exit(1);
    });
    let client = {};
    client.publish = util.promisify(connection.publish).bind(connection);

    // Push update ever 1 second
    setInterval(async function()
    {
        let payload = {
            memoryLoad: agent.memoryLoad(),
            cpu: await agent.cpu()
        };
        let msg = JSON.stringify(payload);
        await client.publish(name, msg);
        console.log(`${name} ${msg}`);
    }, 1000);

}



