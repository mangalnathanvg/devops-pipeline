// websocket server that dashboard connects to.
const chalk = require('chalk');
const redis = require('redis');
const got = require('got');
const fs = require('fs');
const http = require('http');
const httpProxy = require('http-proxy');
var child  = require('child_process'); 

// Sending traffic to each server for 1 min
const SEND_DURATION = 60000;

// Sending traffic to each server every 2 seconds for a total of 1 min
const TRAFFIC_INTERVAL = 2000;

// Survey file sent to checkbox microservice
const SURVEY = 'survey.json';

// Metrics collected for canary report.
var cpuData = [];
var memData = [];
var sysData = [];
var latencyData = [];
var statusData = [];
var serverName;

let args = process.argv.slice(2);

// Checkbox servers running on blue and green machines
const BLUE = `http://${args[1]}:3000/preview`;
const GREEN = `http://${args[2]}:3000/preview`;

// Required for Monitoring dashboard
var	servers = 
	[
	{name: "blue", url:`http://${args[1]}:3000/preview`, status: "#cccccc",  scoreTrend : [0]},
	{name: "green", url:`http://${args[2]}:3000/preview`, status: "#cccccc",  scoreTrend : [0]}
	];


async function saveData() 
{
	const data = {
		name : serverName,
		latency: latencyData,
		memory: memData,
		cpu: cpuData,
		system: sysData,
		statusCode: statusData
	};
	 
	await fs.writeFileSync(`${data.name}.json`, JSON.stringify(data), 'utf8');

	cpuData = [];
	memData = [];
	sysData = [];
	latencyData = [];
	statusData = [];
	serverName = '';
}

//////////////////////////////////////////////////////////////////////////////////////////
/// LOAD BALANCER - Proxy server that directs traffic to either blue or green checkbox server
//////////////////////////////////////////////////////////////////////////////////////////

class LoadBalancer
{
    constructor()
    {
		this.TARGET = BLUE;
		setInterval(this.sendTraffic.bind(this), TRAFFIC_INTERVAL);
		setTimeout( this.switchRoute.bind(this), SEND_DURATION );
    }

	// Load balancer server
    async load_balancer()
    {
        let options = {};
        
		let proxy = httpProxy.createProxyServer(options);
        
		let self = this;

        let server  = http.createServer(function(req, res)
        {
		    proxy.web( req, res, {target: self.TARGET } );
        });
		
		server.listen(3080);	
   }

   // Switch route from blue to green after 1 min
   async switchRoute()
   {
	  await saveData();
      
	  this.TARGET = GREEN;
	  
	  console.log(chalk.keyword('pink')(`Switching Traffic route to ${this.TARGET} ...`));
	  
	  setTimeout(async function() {
		await saveData();
		child.execSync('pm2 kill', {stdio: 'inherit'});
	}, SEND_DURATION); 
   } 
   
   // Send traffic to server every 2 seconds.
   async sendTraffic() {
       
            var options = {
                headers: {
                    'Content-type': 'application/json'
                },
                body: fs.readFileSync(SURVEY, 'utf8'),
				throwHttpErrors: false,
				timeout: 5000
			};

			let time_snapshot = Date.now();
			
			var CURRENT_TARGET = this.TARGET;
			
			try {
            
				got.post(this.TARGET, options).then(function(res){
                for (var server of servers) {
					
					let captureServer = server;
					
					if (captureServer.url == CURRENT_TARGET) {						
					
						captureServer.statusCode = res.statusCode;
						captureServer.latency = res.statusCode == 200 ? Date.now() - time_snapshot: 5000;
						updateHealth(captureServer);
					
					}
				}
			})
		}
		catch(e) {}
	}
}


/************************************
 * BEGIN THE MONITORING AND METRICS
*************************************/
function start(app)
{
	////////////////////////////////////////////////////////////////////////////////////////
	// DASHBOARD
	////////////////////////////////////////////////////////////////////////////////////////
	const io = require('socket.io')(3000);
	// Force websocket protocol, otherwise some browsers may try polling.
	io.set('transports', ['websocket']);
	// Whenever a new page/client opens a dashboard, we handle the request for the new socket.
	io.on('connection', function (socket) {
        // console.log(`Received connection id ${socket.id} connected ${socket.connected}`);

		if( socket.connected )
		{
			//// Broadcast heartbeat event over websockets ever 1 second
			var heartbeatTimer = setInterval( function () 
			{
				socket.emit("heartbeat", servers);
			}, 1000);

			//// If a client disconnects, we will stop sending events for them.
			socket.on('disconnect', function (reason) {
				console.log(`closing connection ${reason}`);
				clearInterval(heartbeatTimer);
			});
		}
	});

	/////////////////////////////////////////////////////////////////////////////////////////
	// REDIS SUBSCRIPTION
	/////////////////////////////////////////////////////////////////////////////////////////
	let client = redis.createClient(6379, 'localhost', {});
	// We subscribe to all the data being published by the server's metric agent.
	for( var server of servers )
	{
		// The name of the server is the name of the channel to recent published events on redis.
		client.subscribe(server.name);
	}

	// When an agent has published information to a channel, we will receive notification here.
	client.on("message", function (channel, message) 
	{
		// console.log(`Received message from agent: ${channel}`)
		for( var server of servers )
		{
			// Update our current snapshot for a server's metrics.
			if( server.name == channel)
			{
				let payload = JSON.parse(message);
				server.memoryLoad = payload.memoryLoad;
				server.cpu = payload.cpu;
				server.sysLoad = payload.sysLoad;
			}
		}
	});

	let loadBalancer = new LoadBalancer();
	loadBalancer.load_balancer();
}

async function updateHealth(server)
{
	let score = 0;
	// Update score calculation.

	// Save metrics collected.
	latencyData.push(server.latency);
	memData.push(server.memoryLoad);
	cpuData.push(server.cpu);
	sysData.push(server.sysLoad);
	statusData.push(server.statusCode);
	serverName = server.name;

	server.status = score2color(score/4);

	server.scoreTrend.push( (4-score));
	if( server.scoreTrend.length > 100 )
	{
		server.scoreTrend.shift();
	}
}

function score2color(score)
{
	if (score <= 0.25) return "#ff0000";
	if (score <= 0.50) return "#ffcc00";
	if (score <= 0.75) return "#00cc00";
	return "#00ff00";
}

module.exports.start = start;