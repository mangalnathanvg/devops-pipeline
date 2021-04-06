const esprima = require("esprima");
const options = {tokens:true, tolerant: true, loc: true, range: true };
const fs = require("fs");
const chalk = require('chalk');

function main()
{
	var args = process.argv.slice(2);

	if( args.length == 0 )
	{
		// default value is self if no other script is provided.
		args = ['analysis.js'];
	}
	var filePath = args[0];

	console.log( "Parsing ast and running static analysis...");
	var builders = {};
	complexity(filePath, builders);
	console.log( "Complete.");

	var buildFlag = true;

	var buildLog = "PASS";

	path = './build_status.txt';

	if (!fs.existsSync(path)) {
		fs.writeFile(path, buildLog, function (err) {		  
			if (err) throw err;		  	
		});
	}

	fs.appendFile('analysis_log.txt', '\n' + "\nFile: " + filePath + '\n', function (err) {		  
		if (err) throw err;		  	
	});

	// Report
	for( var node in builders )
	{
		var builder = builders[node];
		builder.report();
		
		if(builder.blockBuild == true){
			buildFlag = false;
		}
	}

	// Fail build if static analysis failed
	if(!buildFlag){
		buildLog = "FAIL"
		fs.writeFile(path, buildLog, function (err) {		  
			if (err) throw err;		  
			console.log('Saved!');		
		});
	}

}



function complexity(filePath, builders)
{
	var buf = fs.readFileSync(filePath, "utf8");
	var ast = esprima.parse(buf, options);

	var i = 0;

	// Initialize builder for file-level information
	var fileBuilder = new FileBuilder();
	fileBuilder.FileName = filePath;
	builders[filePath] = fileBuilder;
	
	// Traverse program with a function visitor.
	traverseWithParents(ast, function (node) 
	{
		// File level calculations
		// 1. Strings
		if( node.type == "Literal" && typeof node.value == "string" )
		{
			fileBuilder.Strings++;
		}

		// 2. Packages
		if( node.type == "CallExpression" && node.callee.type == "Identifier" && node.callee.name == "require")
		{
			fileBuilder.ImportCount++;			
		}

		if (node.type === 'FunctionDeclaration') 
		{
			var builder = new FunctionBuilder();
			
			builder.FunctionName = functionName(node);
			builder.StartLine    = node.loc.start.line;
			
			// Method Length - Number of lines
			builder.Length = node.loc.end.line - node.loc.start.line + 1;
			
			// Message Chains - Finding out maximum length of message chain
			traverseWithParents(node, function(child){
				if(child.type == 'MemberExpression')
				{
					var currentChainLength = 1;

					traverseWithParents(child.object, function(newchild){
						if(newchild.type == 'MemberExpression'){
							currentChainLength+=1;
						}
					});

					builder.MaxMessageChains = Math.max(currentChainLength, builder.MaxMessageChains);
				}
			});
	
			// Max Depth - Count max depth of if statements in a function
			calculateMaxDepth(node, builder, 0);

			builders[builder.FunctionName] = builder;
		}

	});

}

function calculateMaxDepth(object, builder, depth){
	
	var key, child;
	
	for (key in object)
	{
		if(object.hasOwnProperty(key))
		{
			child = object[key];

			if(typeof child === 'object' && child!==null && key !='parent')
			{
				if(key == 'alternate')
				{
					calculateMaxDepth(child, builder, depth);
				}
				else if(child.type == 'IfStatement')
				{
					calculateMaxDepth(child, builder, depth + 1);
				}
				else
				{
					calculateMaxDepth(child, builder, depth);
				}

			}
		}
	}
	if(childrenLength(object) == 0){
		builder.MaxNestingDepth = Math.max(builder.MaxNestingDepth, depth);
	}
}

// Represent a reusable "class" following the Builder pattern.
class FunctionBuilder
{
	constructor() {
		this.StartLine = 0;
		this.FunctionName = "";

		// The number of lines.
		this.Length = 0;

		// The max depth of scopes (nested ifs, loops, etc)
		this.MaxNestingDepth    = 0;

		// The max length of message chains in a function
		this.MaxMessageChains = 0;

		// Flag to decide if build should run or not
		this.blockBuild = false;
	}


	report()
	{
		// console.log(
		// 	chalk`{blue.underline ${this.FunctionName}}(): starts at Line: ${this.StartLine}\n
		// 	\nLongMethod: ${this.Length}\t
		// 	MaxMessageChains: ${this.MaxMessageChains}\t
		// 	MaxDepth: ${this.MaxNestingDepth}\n`
		// 	);
		
		var resultLog = `\n${this.FunctionName}(): starts at Line: ${this.StartLine}\n
		LongMethod: ${this.Length}
		MaxMessageChains: ${this.MaxMessageChains}
		MaxDepth: ${this.MaxNestingDepth}\n`;

		fs.appendFile('analysis_log.txt', resultLog, function (err) {
				if (err) throw err;
		});

		var violationLog = "";
		if(this.Length > 100)
		{
			violationLog = "\nVIOLATION: The function " + this.FunctionName + "()" + " exceeds 100 LOC. Currently has " + this.Length + " LOC\n";
			
			// fs.appendFile('analysis_log.txt', resultLog, function (err) {
			// 	if (err) throw err;
			//   });
			//console.log("\nThe function " + this.FunctionName + " exceeds 100 LOC. Currently has " + this.Length + " LOC");
			this.blockBuild = true;
		}

		if(this.MaxMessageChains > 10)
		{
			violationLog = "\nVIOLATION: The function " + this.FunctionName + "()" + " contains message chain exceeding max limit(10). Length found: " + this.MaxMessageChains + '\n';
			// fs.appendFile('analysis_log.txt', resultLog, function (err) {
			// 	if (err) throw err;
			//   });
			//console.log("\nThe function " + this.FunctionName + " contains message chain exceeding max limit(10). Length found: " + this.MaxMessageChains);
			this.blockBuild = true;
		}

		if(this.MaxNestingDepth > 5)
		{
			violationLog = "\nVIOLATION: The function " + this.FunctionName + "()" + " exceeds Max Nesting depth (5). Nesting Depth reached: " + this.MaxNestingDepth + '\n';
			//console.log("\nThe function " + this.FunctionName + " exceeds Max Nesting depth (5). Nesting Depth reached: " + this.MaxNestingDepth);
			this.blockBuild = true;
		}

		if(violationLog!=""){
			fs.appendFile('analysis_log.txt', violationLog, function (err) {
				if (err) throw err;
		});
		}

	}
};

// A builder for storing file level information.
function FileBuilder()
{
	this.FileName = "";
	// Number of strings in a file.
	this.Strings = 0;
	// Number of imports in a file.
	this.ImportCount = 0;

	this.report = function()
	{
		console.log (
			chalk`{magenta.underline ${this.FileName}}
Packages: ${this.ImportCount}
Strings ${this.Strings}
`);

	}
}

// A function following the Visitor pattern.
// Annotates nodes with parent objects.
function traverseWithParents(object, visitor)
{
    var key, child;

    visitor.call(null, object);

    for (key in object) {
        if (object.hasOwnProperty(key)) {
            child = object[key];
            if (typeof child === 'object' && child !== null && key != 'parent') 
            {
            	child.parent = object;
					traverseWithParents(child, visitor);
            }
        }
    }
}

// Helper function for counting children of node.
function childrenLength(node)
{
	var key, child;
	var count = 0;
	for (key in node) 
	{
		if (node.hasOwnProperty(key)) 
		{
			child = node[key];
			if (typeof child === 'object' && child !== null && key != 'parent') 
			{
				count++;
			}
		}
	}	
	return count;
}


// Helper function for checking if a node is a "decision type node"
function isDecision(node)
{
	if( node.type == 'IfStatement' || node.type == 'ForStatement' || node.type == 'WhileStatement' ||
		 node.type == 'ForInStatement' || node.type == 'DoWhileStatement')
	{
		return true;
	}
	return false;
}

// Helper function for printing out function name.
function functionName( node )
{
	if( node.id )
	{
		return node.id.name;
	}
	return "anon function @" + node.loc.start.line;
}

main();
exports.main = main;