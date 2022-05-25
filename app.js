const kaholoPluginLibrary = require("kaholo-plugin-library");
const Docker = require("dockerode");
const path = require("path");
const {
  getUrl,
  mapParamsToAuthConfig,
  streamFollow,
  execCommand,
  isFile,
  getLoginEnvironmentVariables,
  deleteConfigFile,
} = require("./helpers");

const docker = new Docker();

const DOCKER_LOGIN_COMMAND = "echo $KAHOLO_DOCKER_PLUGIN_PASSWORD | docker login -u $KAHOLO_DOCKER_PLUGIN_USER --password-stdin";

async function build({
  TAG: imageTag,
  PATH: buildPath,
}) {
  let inputPath = buildPath;
  if (await isFile(buildPath)) {
    inputPath = path.dirname(buildPath);
  }

  const cmd = `docker build ${imageTag ? `-t ${imageTag} ` : ""}${inputPath}`;
  return execCommand(cmd);
}

async function pull({
  URL: url,
  IMAGE: image,
  TAG: imageTag,
  ...authParams
}) {
  const authConfig = mapParamsToAuthConfig(authParams);
  const imageUrl = getUrl(url, image, imageTag);

  return docker
    .pull(imageUrl, { authconfig: authConfig })
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
  const authConfig = mapParamsToAuthConfig(authParams);
  const imageUrl = getUrl(url, imageRepo, imageTag);

  const image = docker.getImage(`${imageRepo}:${imageTag}`);
  await image.tag({ repo: imageUrl });

  const imageToPush = docker.getImage(imageUrl);

  return imageToPush
    .push({ authconfig: authConfig, registry: imageUrl })
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

  const dockerPushCommand = `docker push ${imageUrl}`;
  const environmentVariables = getLoginEnvironmentVariables(username, password);

  const command = `${DOCKER_LOGIN_COMMAND} && ${dockerPushCommand}`;
  const result = await execCommand(command, environmentVariables);

  await deleteConfigFile();

  return result;
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
  PARAMS: inputCommand,
  USER: username,
  PASSWORD: password,
}) {
  const commandsToExecute = [];
  let environmentVariables = {};

  const authenticate = username && password;

  if (authenticate) {
    commandsToExecute.push(DOCKER_LOGIN_COMMAND);
    environmentVariables = getLoginEnvironmentVariables(username, password);
  }

  const userCommand = inputCommand.startsWith("docker ") ? inputCommand : `docker ${inputCommand}`;
  commandsToExecute.push(userCommand);

  const command = commandsToExecute.join(" && ");

  const result = await execCommand(command, environmentVariables);

  if (authenticate) {
    await deleteConfigFile();
  }

  return result;
}

module.exports = kaholoPluginLibrary.bootstrap({
  build,
  pull,
  push: pushImageToPrivateRepo,
  pushImage,
  tag,
  cmdExec,
});
