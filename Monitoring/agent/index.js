const redis = require('redis');
const util  = require('util');
const os = require('os');
const si = require('systeminformation');
const fs = require('fs');
const path = require('path');
const express = require('express');

const app = express();

app.get('/', (req, res) => res.send('Hello World!'))
app.listen(9001,'0.0.0.0',()=>{
      console.log("server is listening");
})

let proxy_ip = ''
try
{
    proxy_ip = fs.readFileSync(path.join('./','proxy_ip.txt')).toString();
}
catch(e)
{
    console.log(e);
    throw new Error("Missing required proxy_ip.txt file");    
}

// Calculate metrics.
// TASK 1:
class Agent
{
    memoryLoad()
    {
       console.log( os.totalmem(), os.freemem() );
       return (((os.totalmem() - os.freemem()) / os.totalmem()) * 100).toFixed(2);
    }
    async cpu()
    {
       let load = await si.currentLoad();
       return load.currentload.toFixed(2);
    }
    async sysLoad(){
        let load = await si.currentLoad();
        return load.currentload_system.toFixed(2);
    }
}

(async () => 
{
    // Get agent name from command line.
    let args = process.argv.slice(2);
    main(args[0]);

})();


async function main(name)
{
    let agent = new Agent();

    let connection = redis.createClient(6379, proxy_ip, {})
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
            cpu: await agent.cpu(),
            sysLoad: await agent.sysLoad()
        };
        let msg = JSON.stringify(payload);
        await client.publish(name, msg);
        console.log(`${name} ${msg}`);
    }, 1000);

}



