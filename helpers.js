const util = require("util");
const childProcess = require("child_process");
const { helpers } = require("@kaholo/plugin-library");

const constants = require("./consts.json");

const simpleExec = util.promisify(childProcess.exec);

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

async function execCommand(cmd, environmentVariables = {}, shred = false) {
  if (shred) {
    try {
      await exec(cmd, { env: environmentVariables });
      await shredFile("/root/.docker/config.json");
    } catch (error) {
      await shredFile("/root/.docker/config.json");
      throw new Error(error);
    }
  } else {
    return exec(cmd, { env: environmentVariables });
  }
  return constants.EMPTY_RETURN_VALUE;
}

async function shredFile(filePath) {
  const shredFilePathInfo = await helpers.analyzePath(filePath);
  if (shredFilePathInfo.exists && shredFilePathInfo.type === "file") {
    console.error(`\nShredding credentials in ${filePath}\n`);
    return exec(`shred -u -n 3 -f ${filePath}`);
  }
  return constants.EMPTY_RETURN_VALUE;
}

async function getDockerImage(tag) {
  const { stdout, stderr } = await simpleExec(`docker image ls ${tag} --format "{{json . }}"`);
  if (!stderr) {
    return stdout;
  }
  return constants.EMPTY_RETURN_VALUE;
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

function resolveEnvironmentalVariablesObject(environmentalVariables, secretEnvironmentalVariables) {
  let resolvedEnv = {};
  if (environmentalVariables) {
    resolvedEnv = {
      ...resolvedEnv,
      ...environmentalVariables,
    };
  }
  if (secretEnvironmentalVariables) {
    resolvedEnv = {
      ...resolvedEnv,
      ...secretEnvironmentalVariables,
    };
  }
  return resolvedEnv;
}

module.exports = {
  getLoginEnvironmentVariables,
  createDockerLoginCommand,
  parseDockerImageString,
  execCommand,
  getDockerImage,
  resolveEnvironmentalVariablesObject,
};
