const mockImagePush = () => Promise.resolve();
const mockImageTag = () => Promise.resolve();
const mockDockerGetImage = () => ({
  push: mockImagePush,
  tag: mockImageTag,
});
const mockDockerPull = jest.fn(() => Promise.resolve());

const helpers = require("./helpers");
const app = require("./app");

jest.mock("dockerode", () => jest.fn().mockImplementation(() => ({
  getImage: mockDockerGetImage,
  pull: mockDockerPull,
})));

jest.mock("./helpers", () => ({
  __esModule: true,
  isFile: jest.fn(),
  execCommand: jest.fn(),
  getAuth: jest.fn(() => ({
    username: "username",
    password: "password",
  })),
  mapParamsToAuthConfig: jest.fn((authParams) => ({
    username: authParams.USER,
    password: authParams.PASSWORD,
  })),
  deleteConfigFile: jest.fn(),
  streamFollow: jest.fn(),
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
      const image = "url:443/image:tag";
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

      expect(mockDockerPull).toHaveBeenCalledTimes(1);
      expect(mockDockerPull).toHaveBeenCalledWith(image, { authconfig: auth });
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
