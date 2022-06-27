const kaholoPluginLibrary = require("@kaholo/plugin-library");
const Docker = require("dockerode");
const path = require("path");
const {
  mapParamsToAuthConfig,
  streamFollow,
  execCommand,
  isFile,
  getLoginEnvironmentVariables,
  createDockerLoginCommand,
  extractRegistryUrl,
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
  image,
  ...authParams
}) {
  const authConfig = mapParamsToAuthConfig(authParams);

  return docker
    .pull(image, { authconfig: authConfig })
    .then((stream) => streamFollow(stream, docker));
}

async function pushImage({
  image,
  USER: username,
  PASSWORD: password,
}) {
  const dockerPushCommand = `docker push ${image}`;
  const environmentVariables = getLoginEnvironmentVariables(username, password);

  const registryUrl = extractRegistryUrl(image);
  const command = `${createDockerLoginCommand(registryUrl)} && ${dockerPushCommand}`;

  return execCommand(command, environmentVariables);
}

async function tag({
  sourceImage,
  targetImage,
}) {
  const command = `docker tag ${sourceImage} ${targetImage}`;

  return execCommand(command);
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

  return result;
}

module.exports = kaholoPluginLibrary.bootstrap({
  build,
  pull,
  pushImage,
  tag,
  cmdExec,
});
