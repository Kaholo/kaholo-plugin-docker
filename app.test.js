const helpers = require("./helpers");
const app = require("./app");

jest.mock("./helpers", () => ({
  ...jest.requireActual("./helpers"),
  execCommand: jest.fn(),
  logToActivityLog: jest.fn(),
  isFile: jest.fn(),
}));

describe("docker plugin test", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("build", () => {
    it("should return docker build command with path", async () => {
      helpers.isFile.mockImplementation(() => false);

      const cmd = "docker build -t tag path/path/file";

      const action = {
        params: {
          TAG: "tag",
          PATH: "path/path/file",
        },
        method: { name: "build" },
      };
      const settings = {};
      await app.build(action, settings);

      expect(helpers.execCommand).toHaveBeenCalledTimes(1);
      expect(helpers.execCommand).toHaveBeenCalledWith(cmd);
    });

    it("it should return docker build command with current directory", async () => {
      helpers.isFile.mockImplementation(() => true);

      const cmd = "docker build -t tag .";

      const action = {
        params: {
          TAG: "tag",
          PATH: "file",
        },
        method: { name: "build" },
      };
      const settings = {};
      await app.build(action, settings);

      expect(helpers.execCommand).toHaveBeenCalledTimes(1);
      expect(helpers.execCommand).toHaveBeenCalledWith(cmd);
    });
  });

  describe("pull", () => {
    it("should call docker pull", async () => {
      const image = "example.com:443/image:tag";
      const auth = {
        username: "username",
        password: "password",
      };

      const action = {
        params: {
          USER: auth.username,
          PASSWORD: auth.password,
          image,
        },
        method: { name: "pull" },
      };
      const settings = {};

      await app.pull(action, settings);

      expect(helpers.execCommand).toHaveBeenCalledTimes(1);
      expect(helpers.execCommand).toHaveBeenCalledWith(
        "echo $KAHOLO_DOCKER_PLUGIN_PASSWORD | docker login example.com:443 -u $KAHOLO_DOCKER_PLUGIN_USER --password-stdin && docker pull example.com:443/image:tag",
        {
          KAHOLO_DOCKER_PLUGIN_PASSWORD: auth.password,
          KAHOLO_DOCKER_PLUGIN_USER: auth.username,
        },
      );
    });

    it("should call docker pull with no authentication", async () => {
      const image = "example.com:443/image:tag";

      const action = {
        params: {
          image,
        },
        method: { name: "pull" },
      };
      const settings = {};

      await app.pull(action, settings);

      expect(helpers.execCommand).toHaveBeenCalledTimes(1);
      expect(helpers.execCommand).toHaveBeenCalledWith("docker pull example.com:443/image:tag", {});
    });
  });

  describe("push", () => {
    it("should call docker push", async () => {
      const image = "example.com:443/image:tag";
      const auth = {
        username: "username",
        password: "password",
      };

      const action = {
        params: {
          USER: auth.username,
          PASSWORD: auth.password,
          image,
        },
        method: { name: "pushImage" },
      };
      const settings = {};

      await app.pushImage(action, settings);

      expect(helpers.execCommand).toHaveBeenCalledTimes(1);
      expect(helpers.execCommand).toHaveBeenCalledWith(
        "echo $KAHOLO_DOCKER_PLUGIN_PASSWORD | docker login example.com:443 -u $KAHOLO_DOCKER_PLUGIN_USER --password-stdin && docker push example.com:443/image:tag",
        {
          KAHOLO_DOCKER_PLUGIN_PASSWORD: auth.password,
          KAHOLO_DOCKER_PLUGIN_USER: auth.username,
        },
      );
    });
  });

  describe("tag", () => {
    it("should tag docker image", async () => {
      const action = {
        params: {
          targetImage: "image:image-tag",
          sourceImage: "sourceimage:sourceimage-tag",
        },
        method: { name: "tag" },
      };
      const settings = {};

      const output = await app.tag(action, settings);

      expect(output).toStrictEqual("Operation finished successfully!");
      expect(helpers.execCommand).toHaveBeenCalledTimes(1);
      expect(helpers.execCommand).toHaveBeenCalledWith("docker tag sourceimage:sourceimage-tag image:image-tag");
    });
  });

  describe("cmdExec", () => {
    it("should execute docker command", async () => {
      const action = {
        params: {
          PARAMS: "command to execute",
          USER: null,
          PASSWORD: null,
        },
        method: { name: "cmdExec" },
      };
      const settings = {};

      await app.cmdExec(action, settings);

      expect(helpers.execCommand).toHaveBeenCalledTimes(1);
      expect(helpers.execCommand).toHaveBeenCalledWith(`docker ${action.params.PARAMS}`, {});
    });
  });
});
