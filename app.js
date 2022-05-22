const kaholoPluginLibrary = require("kaholo-plugin-library");
const Docker = require("dockerode");
const path = require("path");
const {
  getUrl, getAuth, streamFollow, execCmd, isFile,
} = require("./helpers");

const docker = new Docker();

async function build({
  TAG: imageTag,
  PATH,
}) {
  let inputPath = PATH.trim();
  if (!inputPath) {
    throw new Error("Must provide docker file path");
  }

  if (isFile(inputPath)) {
    inputPath = path.dirname(inputPath);
  }

  const cmd = `docker build ${imageTag ? `-t ${imageTag} ` : ""}${inputPath}`;
  return execCmd(cmd);
}

async function pull({
  URL: url,
  IMAGE: image,
  TAG: imageTag,
  ...authParams
}) {
  const auth = getAuth(authParams);
  const imageUrl = getUrl(url, image, imageTag);

  return docker
    .pull(imageUrl, { authconfig: auth })
    .then(
      (stream) => streamFollow(stream, docker),
    );
}

async function pushImageToPrivateRepo({
  IMAGETAG: imageTag,
  IMAGE: imageRepo,
  URL: url,
  ...authParams
}) {
  const auth = getAuth(authParams);
  const imageUrl = getUrl(url, imageRepo, imageTag);

  const image = docker.getImage(`${imageRepo}:${imageTag}`);
  await image.tag({ repo: imageUrl });

  const imageToPush = docker.getImage(imageUrl);

  return imageToPush
    .push({ authconfig: auth, registry: imageUrl })
    .then((stream) => streamFollow(stream, docker));
}

async function pushImage({
  image,
  imageTag,
  url,
  USER: username,
  PASSWORD: password,
}) {
  const imageUrl = getUrl(url, image, imageTag);

  const dockerLoginCommand = "echo $KAHOLO_DOCKER_PLUGIN_PASSWORD | docker login -u $KAHOLO_DOCKER_PLUGIN_USER --password-stdin";
  const dockerPushCommand = `docker push ${imageUrl}`;
  const environmentVariables = {
    KAHOLO_DOCKER_PLUGIN_USER: username,
    KAHOLO_DOCKER_PLUGIN_PASSWORD: password,
  };

  const command = `${dockerLoginCommand} && ${dockerPushCommand}`;
  return execCmd(command, environmentVariables);
}

async function tag({
  SOURCEIMAGE: sourceRegistry,
  SOURCEIMAGETAG: sourceImageTag,
  NEWIMAGE: newRegistry,
  NEWIMAGETAG: newImageTag,
}) {
  const image = docker.getImage(`${sourceRegistry}/${sourceImageTag}`);

  return image.tag({ repo: `${newRegistry}/${newImageTag}` });
}

async function cmdExec({
  PARAMS,
}) {
  const cmd = `docker ${PARAMS}`;
  return execCmd(cmd);
}

module.exports = kaholoPluginLibrary.bootstrap({
  build,
  pull,
  push: pushImageToPrivateRepo,
  pushImage,
  tag,
  cmdExec,
});
