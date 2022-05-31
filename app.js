const kaholoPluginLibrary = require("@kaholo/plugin-library");
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
  createDockerLoginCommand,
} = require("./helpers");

const docker = new Docker();

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
  url: registryUrl,
  USER: username,
  PASSWORD: password,
}) {
  const imageUrl = getUrl(registryUrl, image, imageTag);

  const dockerPushCommand = `docker push ${imageUrl}`;
  const environmentVariables = getLoginEnvironmentVariables(username, password);

  const command = `${createDockerLoginCommand(registryUrl)} && ${dockerPushCommand}`;
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
  registryUrl,
}) {
  const commandsToExecute = [];
  let environmentVariables = {};

  const useAuthentication = username && password;

  if (useAuthentication) {
    commandsToExecute.push(createDockerLoginCommand(registryUrl));
    environmentVariables = getLoginEnvironmentVariables(username, password);
  }

  const userCommand = inputCommand.startsWith("docker ") ? inputCommand : `docker ${inputCommand}`;
  commandsToExecute.push(userCommand);

  const command = commandsToExecute.join(" && ");

  const result = await execCommand(command, environmentVariables);

  if (useAuthentication) {
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
