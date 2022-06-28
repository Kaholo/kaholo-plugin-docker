const kaholoPluginLibrary = require("@kaholo/plugin-library");
const path = require("path");
const {
  getLoginEnvironmentVariables,
  createDockerLoginCommand,
  extractRegistryUrl,
  logToActivityLog,
  standardizeImage,
  execCommand,
  isFile,
} = require("./helpers");

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
  USER: username,
  PASSWORD: password,
}) {
  const environmentVariables = getLoginEnvironmentVariables(username, password);
  const standardizedImage = standardizeImage(image);
  const dockerPullCommand = `docker pull ${standardizedImage}`;

  const registryUrl = extractRegistryUrl(image);
  const command = (
    (username && password)
      ? `${createDockerLoginCommand(registryUrl)} && ${dockerPullCommand}`
      : dockerPullCommand
  );

  logToActivityLog(`Generated command: ${command}`);

  return execCommand(command, environmentVariables);
}

async function pushImage({
  image,
  USER: username,
  PASSWORD: password,
}) {
  const standardizedImage = standardizeImage(image);
  const dockerPushCommand = `docker push ${standardizedImage}`;
  const environmentVariables = getLoginEnvironmentVariables(username, password);

  const registryUrl = extractRegistryUrl(image);
  const command = `${createDockerLoginCommand(registryUrl)} && ${dockerPushCommand}`;

  logToActivityLog(`Generated command: ${command}`);

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
