const {
  bootstrap,
  docker,
  helpers,
} = require("@kaholo/plugin-library");
const {
  getLoginEnvironmentVariables,
  createDockerLoginCommand,
  parseDockerImageString,
  execCommand,
  getDockerImage,
} = require("./helpers");
const constants = require("./consts.json");

async function build({
  TAG: imageTag,
  PATH: buildPathInfo,
}) {
  // using parserOptions - buildPathInfo.exists and type === directory
  const dockerFilePathInfo = await helpers.analyzePath(`${buildPathInfo.absolutePath}/Dockerfile`);
  if (dockerFilePathInfo.type !== "file") {
    throw new Error(`No Dockerfile was found at ${dockerFilePathInfo.absolutePath} on the Kaholo agent.`);
  }

  const cmd = `docker build ${imageTag ? `-t ${imageTag} ` : ""}${buildPathInfo.absolutePath}`;
  await execCommand(cmd);
  if (imageTag) {
    return getDockerImage(imageTag);
  }
  return constants.EMPTY_RETURN_VALUE;
}

async function run(params) {
  const {
    imageName,
    command,
    environmentalVariables,
  } = params;

  const workingDirectoryInfo = params.workingDirectory || await helpers.analyzePath("./");
  const workingDirectory = workingDirectoryInfo.absolutePath;
  if (workingDirectoryInfo.type !== "directory") {
    throw new Error(`Working Directory must be a directory, provided path type: "${workingDirectoryInfo.type}"`);
  }

  let cmd;
  if (environmentalVariables) {
    const environmentVariablesParams = docker.buildEnvironmentVariableArguments(environmentalVariables).join(" ");
    cmd = `docker run --rm ${environmentVariablesParams} -v '${workingDirectory}':'${workingDirectory}' --workdir '${workingDirectory}' ${imageName} ${command}`;
  } else {
    cmd = `docker run --rm -v '${workingDirectory}':'${workingDirectory}' --workdir '${workingDirectory}' ${imageName} ${command}`;
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
  const credentialsGiven = (username && password);

  const command = (
    (credentialsGiven)
      ? `${createDockerLoginCommand(parsedImage.hostport)} && ${dockerPullCommand}`
      : dockerPullCommand
  );

  console.info(`Running command: ${command}`);
  await execCommand(command, environmentVariables, credentialsGiven);
  return getDockerImage(parsedImage.imagestring);
}

async function pushImage({
  image,
  USER: username,
  PASSWORD: password,
}) {
  const parsedImage = parseDockerImageString(image);
  const dockerPushCommand = `docker push ${parsedImage.imagestring}`;
  const environmentVariables = getLoginEnvironmentVariables(username, password);
  const credentialsGiven = true; // required in config.json

  const command = `${createDockerLoginCommand(parsedImage.hostport)} && ${dockerPushCommand}`;

  console.info(`Running command: ${command}`);

  return execCommand(command, environmentVariables, credentialsGiven);
}

async function tag({
  sourceImage,
  targetImage,
}) {
  const command = `docker tag ${sourceImage} ${targetImage}`;

  await execCommand(command);
  return getDockerImage(targetImage);
}

async function cmdExec({
  PARAMS: inputCommand,
  USER: username,
  PASSWORD: password,
  registryUrl,
}) {
  const commandsToExecute = [];
  let environmentVariables = {};
  let shredCredentials = false;

  const useAuthentication = username && password;

  if (useAuthentication) {
    commandsToExecute.push(createDockerLoginCommand(registryUrl));
    environmentVariables = getLoginEnvironmentVariables(username, password);
    shredCredentials = true;
  }

  const userCommand = inputCommand.startsWith("docker ") ? inputCommand : `docker ${inputCommand}`;
  commandsToExecute.push(userCommand);

  const command = commandsToExecute.join(" && ");

  return execCommand(command, environmentVariables, shredCredentials);
}

module.exports = bootstrap({
  build,
  run,
  pull,
  pushImage,
  tag,
  cmdExec,
});
