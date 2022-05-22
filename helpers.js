const childProcess = require("child_process");
const { promisify } = require("util");
const { lstatSync } = require("fs");

const exec = promisify(childProcess.exec);

function getUrl(url, image, tag) {
  return `${url ? `${url}/` : ""}${image}:${tag || "latest"}`;
}

function getAuth(authParams) {
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

async function execCmd(cmd, environmentVariables = {}) {
  const { stdout, stderr } = await exec(cmd, { env: environmentVariables });
  if (stderr) {
    console.error(stderr);
  }
  return stdout;
}

function isFile(path) {
  try {
    const stat = lstatSync(path);
    return stat.isFile();
  } catch (error) {
    console.error(error);
    throw error;
  }
}

module.exports = {
  getUrl,
  getAuth,
  streamFollow,
  execCmd,
  isFile,
};
