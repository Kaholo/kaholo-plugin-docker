const Docker = require("dockerode");
const path = require("path");
const {
  getUrl, getAuth, streamFollow, execCmd, isFile,
} = require("./helpers");

const docker = new Docker();

async function build(action) {
  const imageTag = action.params.TAG.trim();
  let inputPath = action.params.PATH.trim();
  if (!inputPath) {
    // eslint-disable-next-line no-throw-literal
    throw "Must provide docker file path";
  }

  if (isFile(inputPath)) {
    inputPath = path.join(inputPath, "..");
  }

  const cmd = `docker build ${imageTag ? `-t ${imageTag} ` : ""}${inputPath}`;
  return execCmd(cmd);
}

async function pull(action, settings) {
  const auth = getAuth(action, settings);
  const imageUrl = getUrl(action.params.URL, action.params.IMAGE, action.params.TAG);

  return docker.pull(imageUrl, { authconfig: auth })
    .then(
      (stream) => streamFollow(stream, docker),
    );
}

async function push(action, settings) {
  const imageTag = action.params.IMAGETAG;
  const imageRepo = action.params.IMAGE;

  const auth = getAuth(action, settings);
  const imageUrl = getUrl(action.params.URL, imageRepo, imageTag);

  const image = docker.getImage(`${imageRepo}:${imageTag}`);
  image.tag({ repo: imageUrl });

  const imageToPush = docker.getImage(imageUrl);

  return imageToPush.push({ authconfig: auth, registry: imageUrl })
    .then((stream) => streamFollow(stream, docker));
}

async function tag(action) {
  return new Promise((resolve, reject) => {
    const sourceReg = action.params.SOURCEIMAGE;
    const sourceImageTag = action.params.SOURCEIMAGETAG;
    const newReg = action.params.NEWIMAGE;
    const newImageTag = action.params.NEWIMAGETAG;
    const image = docker.getImage(`${sourceReg}/${sourceImageTag}`);
    image.tag({ repo: `${newReg}/${newImageTag}` }, (err, res) => {
      if (err) {
        return reject(err);
      }
      return resolve(res);
    });
  });
}

async function cmdExec(action) {
  const cmd = `docker ${action.params.PARAMS}`;
  return execCmd(cmd);
}

module.exports = {
  build,
  pull,
  push,
  tag,
  cmdExec,
};
