const mockImagePush = jest.fn(() => Promise.resolve());
const mockImageTag = jest.fn(() => Promise.resolve());

const mockDockerGetImage = jest.fn(() => ({
  push: mockImagePush,
  tag: mockImageTag,
}));

const mockDockerPull = jest.fn(() => Promise.resolve());

const helpers = require("./helpers");
const app = require("./app");
const { getAuth, getUrl } = require("./helpers");

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
  getUrl: jest.fn(() => "url:image:tag"),
  deleteConfigFile: jest.fn(),
  streamFollow: jest.fn(),
}));

describe("docker plugin test", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });
  describe("build", () => {
    it("should return docker build command with path", async () => {
      const action = {
        params: {
          TAG: "tag",
          PATH: "path/path/file",
        },
        method: { name: "build" },
      };
      const settings = {};

      const cmd = "docker build -t tag path/path/file";
      helpers.isFile.mockImplementation(() => false);
      await app.build(action, settings);

      expect(helpers.execCommand).toHaveBeenCalledTimes(1);
      expect(helpers.execCommand).toHaveBeenCalledWith(cmd);
    });

    it("it should return docker build command with current directory", async () => {
      const action = {
        params: {
          TAG: "tag",
          PATH: "file",
        },
        method: { name: "build" },
      };
      const settings = {};

      const cmd = "docker build -t tag .";
      helpers.isFile.mockImplementation(() => true);
      await app.build(action, settings);

      expect(helpers.execCommand).toHaveBeenCalledTimes(1);
      expect(helpers.execCommand).toHaveBeenCalledWith(cmd);
    });
  });

  describe("pull", () => {
    it("should call docker pull", async () => {
      const action = {
        params: {
          USER: "username",
          PASSWORD: "password",
          URL: "url",
          IMAGE: "image",
          TAG: "tag",
        },
        method: { name: "pull" },
      };
      const settings = {};

      await app.pull(action, settings);
      const auth = getAuth();
      const url = getUrl();

      expect(mockDockerPull).toHaveBeenCalledTimes(1);
      expect(mockDockerPull).toHaveBeenCalledWith(url, { authconfig: auth });
    });
  });

  describe("push", () => {
    it("should call docker push", async () => {
      const action = {
        params: {
          USER: "username",
          PASSWORD: "password",
          URL: "url",
          IMAGE: "image",
          IMAGETAG: "image-tag",
          TAG: "tag",
        },
        method: { name: "push" },
      };
      const settings = {};
      const auth = getAuth();
      const url = getUrl();

      await app.push(action, settings);

      expect(mockDockerGetImage).toHaveBeenCalledTimes(2);
      expect(mockDockerGetImage).toHaveBeenCalledWith(`${action.params.IMAGE}:${action.params.IMAGETAG}`);
      expect(mockDockerGetImage).toHaveBeenCalledWith(url);

      expect(mockImageTag).toHaveBeenCalledTimes(1);
      expect(mockImageTag).toHaveBeenCalledWith({ repo: url });

      expect(mockImagePush).toHaveBeenCalledTimes(1);
      expect(mockImagePush).toHaveBeenCalledWith({ authconfig: auth, registry: url });
    });
  });

  describe("tag", () => {
    it("should tag docker image", async () => {
      const action = {
        params: {
          NEWIMAGE: "image",
          NEWIMAGETAG: "image-tag",
          SOURCEIMAGE: "sourceimage",
          SOURCEIMAGETAG: "sourceimage-tag",
        },
        method: { name: "tag" },
      };

      const settings = {};

      await app.tag(action, settings);

      expect(mockDockerGetImage).toHaveBeenCalledTimes(1);
      expect(mockDockerGetImage).toHaveBeenCalledWith(`${action.params.SOURCEIMAGE}/${action.params.SOURCEIMAGETAG}`);

      expect(mockImageTag).toHaveBeenCalledTimes(1);
      expect(mockImageTag.mock.calls[0][0]).toStrictEqual({ repo: `${action.params.NEWIMAGE}/${action.params.NEWIMAGETAG}` });
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
