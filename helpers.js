const path = require("path");
const { lstat, rm } = require("fs/promises");
const childProcess = require("child_process");
const { promisify } = require("util");

const exec = promisify(childProcess.exec);

function getUrl(url, image, tag) {
  return `${url ? `${url}/` : ""}${image}:${tag || "latest"}`;
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

function deleteConfigFile() {
  const filePath = path.resolve(".docker/config.json");

  return rm(filePath, { force: true });
}

const createDockerLoginCommand = (registryUrl) => (
  `echo $KAHOLO_DOCKER_PLUGIN_PASSWORD | docker login ${registryUrl ? `${registryUrl} ` : ""}-u $KAHOLO_DOCKER_PLUGIN_USER --password-stdin`
);

module.exports = {
  getUrl,
  mapParamsToAuthConfig,
  streamFollow,
  execCommand,
  isFile,
  getLoginEnvironmentVariables,
  deleteConfigFile,
  createDockerLoginCommand,
};
