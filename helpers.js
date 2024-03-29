const util = require("util");
const childProcess = require("child_process");
const { helpers } = require("@kaholo/plugin-library");

const constants = require("./consts.json");

const simpleExec = util.promisify(childProcess.exec);

async function exec(command, cmdOptions = {}, options = {}) {
  const {
    parseJson = false,
  } = options;

  const childProcessInstance = childProcess.exec(command, cmdOptions);
  const jsonChunks = [];
  const addJsonChunk = (chunk) => {
    if (!parseJson) {
      return {
        unparsed: [chunk],
      };
    }

    const unparsed = [];
    const parsedChunk = chunk
      .split("\n") // chunk may contain multiple lines of json values
      .filter(Boolean) // filter out empty lines
      .map((line) => safeParseJson(line.trim())); // try parsing trimmed line

    parsedChunk.forEach((parsingResult) => {
      if (parsingResult.parsed) {
        jsonChunks.push(parsingResult.value);
      } else {
        unparsed.push(parsingResult.value);
      }
    });

    return { unparsed };
  };

  childProcessInstance.stdout.on("data", (data) => {
    const { unparsed } = addJsonChunk(data);
    if (unparsed.length > 0) {
      process.stdout.write(unparsed.join("\n"));
    }
  });
  childProcessInstance.stderr.on("data", (data) => {
    const { unparsed } = addJsonChunk(data);
    if (unparsed.length > 0) {
      process.stderr.write(unparsed.join("\n"));
    }
  });
  childProcessInstance.on("error", (error) => {
    throw new Error(error);
  });

  await util.promisify(childProcessInstance.on.bind(childProcessInstance))("close");

  if (!parseJson) {
    return constants.EMPTY_RETURN_VALUE;
  }

  if (jsonChunks.length === 0) {
    console.info("No JSON found in output");
  }

  return jsonChunks.flat();
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

async function execCommand(
  cmd,
  environmentVariables = {},
  shred = false,
  parseJson = false,
) {
  if (!shred) {
    return exec(cmd, { env: environmentVariables }, { parseJson });
  }

  try {
    return await exec(cmd, { env: environmentVariables }, { parseJson });
  } finally {
    await shredFile("/root/.docker/config.json");
  }
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

function prepareContainerCommand(rawCommandInput) {
  const separateCommands = rawCommandInput
    .trim()
    .split(/(?<!\\\s*)(?:;\s*)?\n/g);

  if (separateCommands.length === 1) {
    return separateCommands[0];
  }

  const stringifiedCommands = JSON.stringify(
    separateCommands
      .map((command) => (
        command.replace(/\\\s*\n/g, "")
      ))
      .join("; "),
  );
  return `/bin/sh -c ${stringifiedCommands}`;
}

function safeParseJson(value) {
  try {
    return { parsed: true, value: JSON.parse(value) };
  } catch {
    return { parsed: false, value };
  }
}

module.exports = {
  getLoginEnvironmentVariables,
  createDockerLoginCommand,
  parseDockerImageString,
  execCommand,
  getDockerImage,
  resolveEnvironmentalVariablesObject,
  prepareContainerCommand,
};
