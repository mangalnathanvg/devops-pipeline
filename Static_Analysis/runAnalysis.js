var fs = require('fs');
const path = require("path");
const { exec } = require('child_process');

const dir_path = process.argv[2];
console.log("Analysis Directory: ", dir_path);

const getAllFiles = function(dirPath, arrayOfFiles) {
    files = fs.readdirSync(dirPath)
  
    arrayOfFiles = arrayOfFiles || []
  
    files.forEach(function(file) {
      if (fs.statSync(dirPath + "/" + file).isDirectory()) {
        if(file!=="node_modules"){
            arrayOfFiles = getAllFiles(dirPath + "/" + file, arrayOfFiles)
        }
      } else {
        if(file.endsWith('.js')){
        arrayOfFiles.push(path.join(dirPath, "/", file))
        }
      }
    })
  
    return arrayOfFiles
  }

  var listAnalysis = getAllFiles(dir_path);

  console.log(listAnalysis);
  console.log("Running Static analysis for all .js files in server-side/site/");
  listAnalysis.forEach(function(file){
    exec("node /home/vagrant/Static_Analysis/analysis.js " + file);
  });