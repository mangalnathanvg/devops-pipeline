// websocket server that dashboard connects to.
const redis = require('redis');
const got = require('got');
const fs = require('fs');
const path = require('path');
const http = require('http');
const httpProxy = require('http-proxy');
var child = require('child_process');
const { throws } = require('assert');

// We need your host computer ip address in order to use port forwards to servers.

// Metrics for canary report
var cpuData = [];
var memData = [];
var sysData = [];
var latencyData = [];
var statusData = [];
var serverName;

const args = process.argv.slice(2);

const BLUE = `http://${args[1]}:3000/preview`;
const GREEN = `http://${args[2]}:3000/preview`;

var servers = [
	{name: 'blue', url: BLUE, status:"#cccccc", scoreTrend: [0]},
	{name: 'green', url: GREEN, status: "#cccccc", scoreTrend: [0]}
];

async function saveData()
{
	var data = {
		name: serverName,
		cpu: cpuData,
		latency: latencyData,
		memory: memData,
		sysload: sysData,
		statusCode: statusData
	};

	await fs.writeFileSync(`${data.name}.json`, JSON.stringify(data), 'utf8');

	serverName = '';
    cpuData = [];
	memData = [];
	sysData = [];
	latencyData = [];
	statusData = [];

}

	////////////////////////////////////////////////////////////////////////////////////////
	// LOAD BALANCER
	////////////////////////////////////////////////////////////////////////////////////////
	// Routes traffic to BLUE for the first 1 minute and then routes traffic to GREEN for 
	// next 1 minute before terminating proxy, blue and green servers.

	class LoadBalancer
	{
		constructor()
		{
			this.ROUTE_TO = BLUE;
			setInterval(this.sendTraffic.bind(this), 5000);
			setTimeout(this.switchRoute.bind(this), 60000);
		}

		async load_balancer()
		{
			let loadBalancer = httpProxy.createProxyServer({});

			let proxyServer = http.createServer(function(req, res){
				loadBalancer.web(req, res, {target: this.ROUTE_TO});
			});

			proxyServer.listen(3080);
		}

		async switchRoute()
		{
			await saveData();
			
			this.ROUTE_TO = GREEN;
			
			console.log(`Routing traffic to ${this.ROUTE_TO}`);

			setTimeout(async function(){
				await saveData();
				child.execSync('pm2 kill', {stdio: 'inherit'});
			}, 60000);
		}

		async sendTraffic()
		{
			var options = {
				headers: {
					'Content-type': 'application/json'
				},

				body: fs.readFileSync('survey.json', 'utf8'),
				throwHttpErrors: false, 
				timeout: 5000
			};

			var TARGET = this.ROUTE_TO;

			try{
				got.post(this.ROUTE_TO, options)
				.then(function(res){
					for(var server of servers)
					{
						let captureServer = server;

						if(captureServer.url == TARGET)
						{
							captureServer.statusCode = res.statusCode;
							captureServer.latency = res.timings.response - res.timings.start;
							updateHealth(captureServer);
						}	
					}
				})
			}
			catch(e){
				captureServer.statusCode = e.statusCode;
				captureServer.latency = 5000;
			}
			
		}
	}

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
        console.log(`Received connection id ${socket.id} connected ${socket.connected}`);

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
		console.log(`Received message from agent: ${channel}`)
		for( var server of servers )
		{
			// Update our current snapshot for a server's metrics.
			if( server.name == channel)
			{
				let payload = JSON.parse(message);
				server.memoryLoad = payload.memoryLoad;
				server.cpu = payload.cpu;
				server.sysload = payload.sysload;	
			}
		}
	});

	let loadBal = new LoadBalancer();
	loadBal.load_balancer();
}

// TASK 3
function updateHealth(server)
{
	let score = 0;
	// Update score calculation.
	// Score calculated based on server responsiveness

	if(server.statusCode == 200){
		score+=1;

		if(server.memoryLoad < 30){
			score+=1;
		}

		if(server.latency < 100){
			score+=1;
		}

		if(server.cpu < 30){
			score+=1;
		}

		if(server.sysload < 30){
			score+=1;
		}
	}

	latencyData.push(server.latency);
	memData.push(server.memoryLoad);
	cpuData.push(server.cpu);
	statusData.push(server.statusCode);
	sysData.push(server.sysload);
	serverName = server.name;

	server.status = score2color(score/4);

	console.log(`${server.name} ${score}`);

	// Add score to trend data.
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