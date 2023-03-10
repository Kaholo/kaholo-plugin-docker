const {
  bootstrap,
  docker,
} = require("@kaholo/plugin-library");
const path = require("path");
const {
  getLoginEnvironmentVariables,
  createDockerLoginCommand,
  parseDockerImageString,
  logToActivityLog,
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

async function run({
  imageName,
  command,
  environmentalVariables,
  workingDirectory,
}) {
  let cmd;

  if (environmentalVariables) {
    const environmentVariablesParams = docker.buildEnvironmentVariableArguments(environmentalVariables).join(" ");
    cmd = `docker run --rm ${environmentVariablesParams} --workdir ${workingDirectory} ${imageName} ${command}`;
  } else {
    cmd = `docker run --rm --workdir ${workingDirectory} ${imageName} ${command}`;
  }

  return execCommand(cmd, {
    ...process.env,
    ...(environmentalVariables || {}),
  });
}

async function pull({
  image,
  USER: username,
  PASSWORD: password,
}) {
  const environmentVariables = getLoginEnvironmentVariables(username, password);
  const parsedImage = parseDockerImageString(image);
  const dockerPullCommand = `docker pull ${parsedImage.imagestring}`;

  const command = (
    (username && password)
      ? `${createDockerLoginCommand(parsedImage.hostport)} && ${dockerPullCommand}`
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
  const parsedImage = parseDockerImageString(image);
  const dockerPushCommand = `docker push ${parsedImage.imagestring}`;
  const environmentVariables = getLoginEnvironmentVariables(username, password);

  const command = `${createDockerLoginCommand(parsedImage.hostport)} && ${dockerPushCommand}`;

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

module.exports = bootstrap({
  build,
  run,
  pull,
  pushImage,
  tag,
  cmdExec,
});
