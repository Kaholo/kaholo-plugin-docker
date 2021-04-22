const Docker = require('dockerode');
const { _getUrl, _getAuth, _streamFollow, execCmd } = require("./helpers");
const docker = new Docker();

async function build(action) {
    const tag = action.params.TAG.trim();
    const path = action.params.PATH.trim();
    if (!path){
        throw "Must provide docker file path";
    }
    const cmd = `docker build ${tag ? `-t ${tag} `: ""}${path}`;
    return execCmd(cmd);
}

async function pull(action, settings) {
    let auth = _getAuth(action,settings);
    let imageUrl = _getUrl(action.params.URL, action.params.IMAGE, action.params.TAG)
    
    return docker.pull(imageUrl, {authconfig: auth}).then(stream=>{
        return _streamFollow(stream, docker);
    });
}

async function push(action, settings) {
    let imageTag = action.params.IMAGETAG;
    let imageRepo = action.params.IMAGE;
    
    let auth = _getAuth(action,settings);
    let imageUrl = _getUrl(action.params.URL, imageRepo, imageTag);
    let image = docker.getImage(imageRepo + ":" + imageTag);

    image.tag({repo: imageUrl});
    var imageToPush = docker.getImage(imageUrl);
    
    return imageToPush.push({authconfig: auth, registry: imageUrl}).then(stream=>{
        return _streamFollow(stream, docker);
    });
}


async function tag(action) {
    return new Promise((resolve, reject) => {
        let sourceReg = action.params.SOURCEIMAGE;
        let sourceImageTag = action.params.SOURCEIMAGETAG;
        let newReg = action.params.NEWIMAGE;
        let newImageTag = action.params.NEWIMAGETAG;
        let image = docker.getImage(sourceReg + "/" + sourceImageTag);
        image.tag({repo: newReg + "/" + newImageTag}, function (err, res) {
            if (err)
                return reject(err);
            resolve(res);
        })
    });
}

async function cmdExec(action) {
    const cmd = `docker ${action.params.PARAMS}`
    return execCmd(cmd);
}

module.exports = {
    build: build,
    pull: pull,
    push: push,
    tag: tag,
    cmdExec: cmdExec
};