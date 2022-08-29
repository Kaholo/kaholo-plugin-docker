const { lstat } = require("fs/promises");
const childProcess = require("child_process");
const { promisify } = require("util");

const exec = promisify(childProcess.exec);

const REGISTRY_URL_REGEX = /^(?:localhost|(?:[A-Za-z0-9-]+\.)+[A-Za-z0-9-]+(?::\d+)?)\//;

function logToActivityLog(message) {
  // TODO: Change console.error to console.info
  // Right now (Kaholo v4.3.2) console.info
  // does not print messages to Activity Log
  // Jira ticket: https://kaholo.atlassian.net/browse/KAH-3636
  console.error(message);
}

function standardizeImage(image) {
  let standardizedImage = "";

  if (REGISTRY_URL_REGEX.test(image)) {
    standardizedImage += image;
  } else {
    standardizedImage += `docker.io/${image}`;
  }

  if (!/:[a-z0-9-_]+$/i.test(image) && !/@\w+:\w+/.test(image)) {
    standardizedImage += ":latest";
  }

  return standardizedImage;
}

function extractRegistryUrl(image) {
  return image.match(REGISTRY_URL_REGEX)?.[0];
}

async function execCommand(cmd, environmentVariables = {}) {
  const result = await exec(cmd, { env: environmentVariables });

  const { stdout, stderr } = result;
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

function getLoginEnvironmentVariables(username, password) {
  if (!username || !password) {
    return {};
  }

  return {
    KAHOLO_DOCKER_PLUGIN_USER: username,
    KAHOLO_DOCKER_PLUGIN_PASSWORD: password,
  };
}

const createDockerLoginCommand = (registryUrl) => (
  `echo $KAHOLO_DOCKER_PLUGIN_PASSWORD | docker login ${registryUrl ? `${registryUrl} ` : ""}-u $KAHOLO_DOCKER_PLUGIN_USER --password-stdin`
);

module.exports = {
  getLoginEnvironmentVariables,
  createDockerLoginCommand,
  extractRegistryUrl,
  logToActivityLog,
  standardizeImage,
  execCommand,
  isFile,
};
