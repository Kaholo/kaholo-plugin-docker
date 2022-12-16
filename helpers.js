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

function parseDockerImageString(imagestring) {
  let hostport, host, port, user, repotagdig, repo, tag, digest;
  let partsArray = [];
  let parts = 0;

  // divide by "/" into 1-3 distinct parts
  partsArray = imagestring.split("/");
  parts = partsArray.length;

  switch (parts) {
      case 1: {
          repotagdig = partsArray[0];
          break;
      }
      case 2: {
          // partOne is either hostport or user
          if (partsArray[0].includes(".") || partsArray[0].includes(":") || partsArray[0] == "localhost") {
              hostport = partsArray[0];
          } else {
              user = partsArray[0];
          }
          repotagdig = partsArray[1];
          break;
      }
      case 3: {
          hostport = partsArray[0];
          user = partsArray[1];
          repotagdig = partsArray[2];
          break;
      }
      default: {
          throw ("A docker image string may contain 0-2 \"/\" characters.");
      }
  }

  if (hostport) {
      if (hostport.includes(":")) {
          host = hostport.split(":")[0];
          port = hostport.split(":")[1];
      } else {
          host = hostport;
      }
  }

  if (repotagdig) {
      if (repotagdig.includes("@")) {
          repo = repotagdig.split("@")[0];
          digest = "@" + repotagdig.split("@")[1];
      } else if (repotagdig.includes(":")) {
          repo = repotagdig.split(":")[0];
          tag = repotagdig.split(":")[1];
      } else {
          repo = repotagdig;
      }
  }

  return {
      "imagestring": imagestring,
      "parts": parts,
      "hostport": hostport || "",
      "repotagdig": repotagdig || "",
      "host": host || "",
      "port": port || "",
      "user": user || "",
      "repo": repo || "",
      "tag": tag || "",
      "digest": digest || ""
  }
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
  parseDockerImageString,
  logToActivityLog,
  execCommand,
  isFile,
};
