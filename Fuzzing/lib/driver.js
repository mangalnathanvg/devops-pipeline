const fs = require('fs');
const xml2js = require('xml2js');
const Bluebird = require('bluebird');
const path = require('path');
const Random = require('random-js');
const chalk = require('chalk');
const mutateStr = require('./mutate').mutateString;
const child = require('child_process');

var NUMBER_OF_TESTS = 32;

var countResult = {};

var parser = new xml2js.Parser();

var validFileExtensions = ["xml"];

class mutater {
    static random() {
        return mutater._random || fuzzer.seed(0)
    }
    
    static seed (kernel) {
        mutater._random = new Random.Random(Random.MersenneTwister19937.seed(kernel));
        return mutater._random;
    }

    static str( str )
    {
        return mutateStr(this, str);        
    }

};


function getResults(json){
    var testResults = []
    
    for(var i=0; i<json.testsuite['$'].tests; i++)
    {
        var testCase = json.testsuite.testcase[i];
        testResults.push({
            name: testCase['$'].classname + testCase['$'].name,
            time: testCase['$'].time,
            status: testCase.hasOwnProperty("failure") || testCase.hasOwnProperty("error") ? "failed" : "passed"
        });
    }
    return testResults;
}

const read = (dir) =>
    fs.readdirSync(dir)
    .reduce(function(files, file) {
        if (fs.statSync(path.join(dir, file)).isDirectory()) {
            var readFilesList = read(path.join(dir, file));
            if (readFilesList != undefined) {
                return files.concat(readFilesList);
            } else {
                return files;
            }
        } else {
            if (validFileExtensions.indexOf(file.substring(file.lastIndexOf(".") + 1)) > -1) {
                return files.concat(path.join(dir, file));
            } else {
                return files;
            }
        }
    }, []);

async function mtfuzz(iterations, seeds, testFn)
{    
    var failedTests = [];
    var passedTests = 0;

    var totalFailures = 0;

    mutater.seed(0);

    child.execSync("cd /home/vagrant/iTrust/iTrust2 && sudo mvn process-test-classes && mysql -u root -proot -e 'DROP DATABASE IF EXISTS iTrust2_test'");

    //console.log(chalk.green(`Fuzzing '${testFn}' with ${iterations} randomly generated-inputs.`))
    
    for (var i = 1; i <= iterations; i++)
    {
        var maxRetries = 50;
        
        while(maxRetries > 0)
        {
            var flag = 0;
            // Toggle between seed files
            try{
            let s = seeds;
            let mutuatedString = mutater.str(s);
            
            if( !fs.existsSync('.mutations') )
            {
                fs.mkdirSync('.mutations');
            }
            console.log('Writing into mutation file (iteration' + i + '): \n');

            fs.writeFileSync(path.join( '.mutations', `${i}.java`), mutuatedString);

            child.execSync("cd /home/vagrant/iTrust/iTrust2/ && sudo mvn clean test");

            } catch(e){
                console.log(e);
                var error1 = Buffer.from(e.stdout).toString("ascii");
                if (error1.includes("Compilation") == true) {
                    console.log("Failed due to Compilation error");
                    maxRetries -=1;
                    flag = 1;
                }
            }

            child.execSync(`cd /home/vagrant/iTrust/ && git reset --hard HEAD`);
            child.execSync(`cd /home/vagrant/iTrust/iTrust2 && sudo cp /bakerx/cm/Ansible_Scripts/JinjaTemplates/pom.xml .`);

            if(flag == 0){
                break;
            }
        }

        var files = read("/home/vagrant/iTrust/iTrust2/target/surefire-reports");

        for(const index in files)
        {
            var contents = fs.readFileSync(files[index]);

            let xml2json = await Bluebird.fromCallback(cb => parser.parseString(contents, cb));

            var tests = getResults(xml2json);

            for(var test of tests)
            {
                //console.log("Test:", test);
                if(!countResult.hasOwnProperty(test.name)){
                    countResult[test.name] = {pass: 0, fail: 0};
                }

                if(test.status == "passed") {
                    countResult[test.name].pass++;
                }

                if(test.status == "failed") {
                    countResult[test.name].fail++;
                    totalFailures++;
                }
            }
        }
        //console.log("Map:\n", map);
    }

    var mutationCoverage = (totalFailures/(NUMBER_OF_TESTS * iterations)) * 100;
    
    var mutationReport = "\nOverall Mutation Coverage = " + mutationCoverage.toString() + " %" + " mutations caught by the test suite.\n";
    //console.log("Mutation Report", mutationReport);

    results = [];

    for(key in countResult)
    {
        //console.log("Key: ", key);
        results.push({
            name: key, 
            pass: countResult[key].pass,
            fail: countResult[key].fail,
            total: countResult[key].pass + countResult[key].fail
        });
    }

    results.sort((x, y) => {
        if(x.fail > y.fail)
        {
            return -100;
        }
        else if(x.pass < y.pass && x.fail == y.fail){
            return -100;
        }
        else{
            return 100;
        }
    });

    var logStr = '';
    logStr = "\nUseful Tests (Fail/Pass)\n============\n";
    for(i in results){
        logStr += `${results[i].fail}/${results[i].pass} - ${results[i].name}\n`;
    }

    //console.log("Str: ", str);

    let data = JSON.stringify(countResult);

    fs.writeFileSync('map.json', data);

    fs.writeFile('/home/vagrant/result.txt', logStr, (err) =>{
        if(err) throw err;
    });

    fs.appendFile('/home/vagrant/result.txt', mutationReport, (err) => {
        if(err) throw err;
    });

    return;
}

exports.mtfuzz = mtfuzz;


