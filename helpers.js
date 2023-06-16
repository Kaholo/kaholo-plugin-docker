const { lstat } = require("fs/promises");
const util = require("util");
const childProcess = require("child_process");
const constants = require("./consts.json");

async function exec(command, cmdOptions = {}, options = {}) {
  const {
    onProgressFn = process.stdout.write.bind(process.stdout),
  } = options;

  let childProcessInstance;
  try {
    childProcessInstance = childProcess.exec(command, cmdOptions);
  } catch (error) {
    throw new Error(error);
  }

  childProcessInstance.stdout.on("data", (data) => {
    onProgressFn?.(data);
  });
  childProcessInstance.stderr.on("data", (data) => {
    onProgressFn?.(data);
  });
  childProcessInstance.on("error", (error) => {
    throw new Error(error);
  });

  try {
    await util.promisify(childProcessInstance.on.bind(childProcessInstance))("close");
  } catch (error) {
    throw new Error(error);
  }

  return constants.EMPTY_RETURN_VALUE;
}

function logToActivityLog(message) {
  // TODO: Change console.error to console.info
  // Right now (Kaholo v4.3.2) console.info
  // does not print messages to Activity Log
  // Jira ticket: https://kaholo.atlassian.net/browse/KAH-3636
  console.error(message);
}

function parseDockerImageString(imagestring) {
  let hostport; let host; let port; let user;
  let repotagdig; let repo; let tag; let digest;

  // divide by "/" into 1-3 distinct parts
  const partsArray = imagestring.split("/");
  const parts = partsArray.length;

  switch (parts) {
    case 1: {
      [repotagdig] = partsArray;
      break;
    }
    case 2: {
      // partOne is either hostport or user
      const [partOne, partTwo] = partsArray;
      if (partOne.includes(".") || partOne.includes(":") || partOne === "localhost") {
        hostport = partOne;
      } else {
        user = partOne;
      }
      repotagdig = partTwo;
      break;
    }
    default: {
      hostport = imagestring.substring(0, imagestring.indexOf("/"));
      user = imagestring.substring(imagestring.indexOf("/") + 1, imagestring.lastIndexOf("/"));
      repotagdig = imagestring.substring(imagestring.lastIndexOf("/") + 1, imagestring.length);
    }
  }

  if (hostport) {
    if (hostport.includes(":")) {
      [host, port] = hostport.split(":");
    } else {
      host = hostport;
    }
  }

  if (repotagdig) {
    // check for digest first because it will include a ":"
    if (repotagdig.includes("@")) {
      [repo, digest] = repotagdig.split("@");
    } else if (repotagdig.includes(":")) {
      [repo, tag] = repotagdig.split(":");
    } else {
      repo = repotagdig;
    }
  }

  return {
    imagestring,
    parts,
    hostport,
    repotagdig,
    host,
    port,
    user,
    repo,
    tag,
    digest,
  };
}

async function execCommand(cmd, environmentVariables = {}) {
  await exec(cmd, { env: environmentVariables });
  await shredFile("/root/.docker/config.json");
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

async function shredFile(filePath) {
  let stat;
  try {
    stat = await lstat(filePath);
  } catch {
    return {};
  }
  if (!stat.isFile()) {
    return {};
  }

  console.error(`\nShredding docker config in ${filePath}\n`);
  return exec(`shred -u -n 3 -f ${filePath}`);
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
