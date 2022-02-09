const mockImagePush = jest.fn();
const mockImageTag = jest.fn();

const mockDockerGetImage = jest.fn(() => ({
  push: mockImagePush,
  tag: mockImageTag,
}));

const mockDockerPull = jest.fn();

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
  execCmd: jest.fn(),
  getAuth: jest.fn(() => ({
    username: "username",
    password: "password",
  })),
  getUrl: jest.fn(() => "url:image:tag"),
}));

describe("docker plugin test", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });
  describe("build", () => {
    it("should return docker build command with path", () => {
      const action = {
        params: {
          TAG: "tag",
          PATH: "path/path/file",
        },
      };

      const cmd = "docker build -t tag path/path/file";
      helpers.isFile.mockImplementation(() => false);
      app.build(action);

      expect(helpers.execCmd).toHaveBeenCalledTimes(1);
      expect(helpers.execCmd).toHaveBeenCalledWith(cmd);
    });

    it("it should return docker build command with current directory", () => {
      const action = {
        params: {
          TAG: "tag",
          PATH: "file",
        },
      };

      const cmd = "docker build -t tag .";
      helpers.isFile.mockImplementation(() => true);
      app.build(action);

      expect(helpers.execCmd).toHaveBeenCalledTimes(1);
      expect(helpers.execCmd).toHaveBeenCalledWith(cmd);
    });
  });

  describe("pull", () => {
    it("should call docker pull", () => {
      const action = {
        params: {
          USER: "user",
          PASSWORD: "password",
          URL: "url",
          IMAGE: "image",
          TAG: "tag",
        },
      };
      const settings = {};

      app.pull(action, settings);
      const auth = getAuth();
      const url = getUrl();

      expect(mockDockerPull).toHaveBeenCalledTimes(1);
      expect(mockDockerPull).toHaveBeenCalledWith(url, { authconfig: auth });
    });
  });

  describe("push", () => {
    it("should call docker push", () => {
      const action = {
        params: {
          USER: "user",
          PASSWORD: "password",
          URL: "url",
          IMAGE: "image",
          IMAGETAG: "image-tag",
          TAG: "tag",
        },
      };
      const settings = {};
      const auth = getAuth();
      const url = getUrl();

      app.push(action, settings);

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
    it("should tag docker image", () => {
      const action = {
        params: {
          NEWIMAGE: "image",
          NEWIMAGETAG: "image-tag",
          SOURCEIMAGE: "sourceimage",
          SOURCEIMAGETAG: "sourceimage-tag",
        },
      };

      app.tag(action);

      expect(mockDockerGetImage).toHaveBeenCalledTimes(1);
      expect(mockDockerGetImage).toHaveBeenCalledWith(`${action.params.SOURCEIMAGE}/${action.params.SOURCEIMAGETAG}`);

      expect(mockImageTag).toHaveBeenCalledTimes(1);
      expect(mockImageTag.mock.calls[0][0]).toStrictEqual({ repo: `${action.params.NEWIMAGE}/${action.params.NEWIMAGETAG}` });
    });
  });

  describe("cmdExec", () => {
    it("should execute docker command", () => {
      const action = { params: { PARAMS: "command to execute" } };

      app.cmdExec(action);

      expect(helpers.execCmd).toHaveBeenCalledTimes(1);
      expect(helpers.execCmd).toHaveBeenCalledWith(`docker ${action.params.PARAMS}`);
    });
  });
});
