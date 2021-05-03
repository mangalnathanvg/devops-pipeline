const redis = require('redis');
const util  = require('util');
const os = require('os');
const si = require('systeminformation');
const app = express();

var ip = '192.168.33.32';

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
    async sysload(){
        let load = await si.currentLoad();
        return load.currentload_system.toFixed(2);
    }
    async mongodb_memory(){
        let load = await si.processLoad('mongod');
        return load.mem.toFixed(2);
    }
    async nginx_memory(){
        let load = await si.processLoad('nginx');
        return load.mem.toFixed(2);
    }
    async mysql_memory(){
        let load = await si.processLoad('mysqld');
        return load.mem.toFixed(2);
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

    let connection = redis.createClient(6379, '192.168.44.92', {})
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
            sysload: await agent.sysload(),
            nginx: await agent.nginx_memory(),
            mysql: await agent.mysql_memory(),
            mongodb: await agent.mongodb_memory()
        };
        let msg = JSON.stringify(payload);
        await client.publish(name, msg);
        console.log(`${name} ${msg}`);
    }, 1000);

}



