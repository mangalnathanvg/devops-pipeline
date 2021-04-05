const fs = require('fs');
const Random = require('random-js');
const path = require('path');

function modify(file_name) {
    var data = fs.readFileSync(file_name, 'utf-8');
    //fs.writeFileSync(file_name,'','utf8');
    var lines = data.split("\n");

    lines.forEach(function(line) {
            // Split lines to list of words
            let words = line.split(' ');
            for(var i=0; i < words.length; i++){
                console.log(words);
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
                console.log(words);
            }
        
    });
}
