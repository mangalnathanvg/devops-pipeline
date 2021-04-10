
const fs = require('fs');
const path = require('path');
var validFileExtensions = ["java"];

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

function mutateString (mutator, value) {
    var listOfFiles = read(value);
    sel_file_idx = mutator.random().integer(0,value.length)
    let val = fs.readFileSync(listOfFiles[sel_file_idx],'utf-8');
    fs.writeFileSync(listOfFiles[sel_file_idx],'','utf8');
    //let mdB = fs.readFileSync('test/simple.md','utf-8');
    //var array = val.split('');
    var lines = val.split("\n");
    
    lines.forEach(function(line) {
        if( mutator.random().bool(0.1) )
        {
            // Step 1. Randomly remove a random set of characters, from a random start position.
            let words = line.split(' ');
                for(var i=0; i < words.length; i++){
                    if(words[i]==">")
                    {
                        words[i] = "<";
                    }
                    else if(words[i]=="<")
                    {
                        words[i] = ">";
                    }
                    else if(words[i]=="==")
                    {
                        words[i] = "!=";
                    }
                    else if(words[i]=="!=")
                    {
                        words[i] = "==";
                    }
                    else if((words[i].startsWith('"') && words[i].endsWith('"')) || (words[i].startsWith("'") && words[i].endsWith("'")))
                    {   
                        let letters = words[i].split("");
                        letters.splice(1, 0, 'fuzzedtext');
                        words[i] = letters.join("");  
                    }
                    else if(words[i]=="0")
                    {
                        words[i] = "1";
                    }
                    else if(words[i]=="1")
                    {
                        words[i] = "0";
                    }
                    else if(words[i] == "true")
                    {
                        words[i] = "false";
                    }
                    else if(words[i] == "false")
                    {
                        words[i] = "true";
                    }
                    else if(words[i] == "&&")
                    {
                        words[i] = "||";
                    }
                    else if(words[i] == "||")
                    {
                        words[i] == "&&";
                    }
                    
                }  
                line = words.join(" ");
        }
        if(line != '\r'){
            line += '\n';
        }    
        //fs.appendFileSync(val, line)
        fs.appendFileSync(listOfFiles[sel_file_idx], line);
    })
    return lines.join('');
}

exports.mutateString = mutateString;
