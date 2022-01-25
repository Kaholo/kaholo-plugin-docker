const exec = require('child_process').exec;
const { lstatSync } = require('fs');

function _getUrl(url, image, tag){
    return `${url ? `${url}/` : ''}${image}:${tag}`
}

function _getAuth(action, settings){
    return {
        username: action.params.USER || settings.USER,
        password: action.params.PASSWORD || settings.PASSWORD
    }
}

function _streamFollow(stream, docker) {
    return new Promise((resolve,reject)=>{
        docker.modem.followProgress(stream, (err, res) => {
            if (err) return reject(err);
            let cmdOutput = "";
            res.forEach(result=>{
                cmdOutput += result.status;
            });
            resolve({output: cmdOutput})
        })
    })
}

async function execCmd(cmd){
    return new Promise((resolve,reject) => {
        exec(cmd, function (err, stdout, stderr) {
            if (err)
                return reject(err);
            if (stderr){
                console.error(stderr);
            }
            resolve(stdout)
        });
    })
}

function isFile(path) {
    try {
        let stat = lstatSync(path);
        return stat.isFile();
    } catch (error) {
        throw error
    }
}

module.exports = {
    _getUrl,
    _getAuth,
    _streamFollow,
    execCmd,
    isFile
};