const { exec } = require("child_process");
const { lstatSync } = require("fs");

function getUrl(url, image, tag) {
  return `${url ? `${url}/` : ""}${image}:${tag || "latest"}`;
}

function getAuth(action, settings) {
  return {
    username: action.params.USER || settings.USER,
    password: action.params.PASSWORD || settings.PASSWORD,
  };
}

function streamFollow(stream, docker) {
  return new Promise((resolve, reject) => {
    docker.modem.followProgress(stream, (err, res) => {
      if (err) return reject(err);
      let cmdOutput = "";
      res.forEach((result) => {
        cmdOutput += result.status;
      });
      return resolve({ output: cmdOutput });
    });
  });
}

async function execCmd(cmd) {
  return new Promise((resolve, reject) => {
    exec(cmd, (err, stdout, stderr) => {
      if (err) return reject(err);
      if (stderr) {
        console.error(stderr);
      }
      return resolve(stdout);
    });
  });
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
