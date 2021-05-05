const exec = require('child_process').exec;
const VBexe = process.platform === 'win32' ? '"C:\\Program Files\\Oracle\\VirtualBox\\VBoxManage.exe"' : 'VBoxManage';
const chalk = require('chalk');

module.exports.execute = function(cmd, args) {

    let verbose = true;

    return new Promise(function (resolve, reject) {

        let runCmd = `${VBexe} ${cmd} ${args}`;

        if( verbose )
        {
            console.log( chalk.gray(`Executing ${runCmd}`) );
        }

        exec(runCmd, (error, stdout, stderr) => {

            if(error && stderr.indexOf('VBOX_E_OBJECT_NOT_FOUND') == -1) {
                reject(error);
            } 
            else 
            {
                resolve(stdout, stderr);
            }

        });

    }.bind({cmd, args, verbose}));

};

module.exports.getSSHPort = async function(vmname)
{
    let properties = await getProperties(vmname);
    // Use VirtualBox driver
    Object.keys(properties).forEach(key => {
        if(properties[key].includes('guestssh')){
            port = parseInt( properties[key].split(',')[3]);
        }
    });
    return port;
}

async function getProperties(vmname)
{
    return new Promise(function (resolve, reject) {   
        exec(`${VBexe} showvminfo ${vmname} --machinereadable`, (error, stdout, stderr) => {
            if(error && stderr.indexOf('VBOX_E_OBJECT_NOT_FOUND') != -1) {
                resolve({VMState:'not_found'});
            }
            else if( error )
            {
                console.error(`=> ${error}, ${stderr}`);
                reject(error);
            }
            else
            {
                let properties = {state:'unknown'};
                let lines = stdout.split('\n');
                for (let i = 0; i < lines.length-1; i++) {
                    let lineSplit = lines[i].split('=');
                    let name= lineSplit[0].trim();
                    let id = lineSplit[1].trim();
                    properties[name]=id.toString();
                }
                resolve(properties);
            }
        });
    });
}


module.exports.show = async function(vmname) {

    let properties = await getProperties(vmname);
    return properties.VMState.replace(/"/g,'')
   
}
