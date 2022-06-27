const { lstat } = require("fs/promises");
const childProcess = require("child_process");
const { promisify } = require("util");

const exec = promisify(childProcess.exec);

const REGISTRY_URL_REGEX = /^(?:localhost|(?:[A-Za-z0-9-]+\.)+[A-Za-z0-9-]+(?::\d+)?)\//;

function extractRegistryUrl(image) {
  return image.match(REGISTRY_URL_REGEX)?.[0];
}

function mapParamsToAuthConfig(authParams) {
  return {
    username: authParams.USER,
    password: authParams.PASSWORD,
  };
}

function streamFollow(stream, docker) {
  return new Promise((resolve, reject) => {
    docker.modem.followProgress(stream, (err, res) => {
      if (err) {
        return reject(err);
      }
      const cmdOutput = res.reduce(
        (accumulatedCmd, singleResult) => accumulatedCmd + singleResult.status,
        "",
      );
      return resolve({ output: cmdOutput });
    });
  });
}

async function execCommand(cmd, environmentVariables = {}) {
  const { stdout, stderr } = await exec(cmd, { env: environmentVariables });
  if (stderr) {
    console.error(stderr);
  }

  return stdout;
}

async function isFile(filePath) {
  try {
    const stat = await lstat(filePath);
    return stat.isFile();
  } catch (error) {
    console.error(error);
    throw error;
  }
}

const getLoginEnvironmentVariables = (username, password) => ({
  KAHOLO_DOCKER_PLUGIN_USER: username,
  KAHOLO_DOCKER_PLUGIN_PASSWORD: password,
});

const createDockerLoginCommand = (registryUrl) => (
  `echo $KAHOLO_DOCKER_PLUGIN_PASSWORD | docker login ${registryUrl ? `${registryUrl} ` : ""}-u $KAHOLO_DOCKER_PLUGIN_USER --password-stdin`
);

module.exports = {
  mapParamsToAuthConfig,
  streamFollow,
  execCommand,
  isFile,
  getLoginEnvironmentVariables,
  createDockerLoginCommand,
  extractRegistryUrl,
};
