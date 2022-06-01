const { exec } = require("child_process");
const fs = require("fs/promises");
const helpers = require("./helpers");

jest.mock("child_process", () => ({
  exec: jest.fn(),
}));

const mockIsFile = jest.fn();

jest.mock("fs/promises", () => ({
  lstat: jest.fn(() => ({
    isFile: mockIsFile,
  })),
}));

describe("docker plugin helpers test", () => {
  describe("getUrl test", () => {
    it("should return valid url for a given url, image and tag", () => {
      const url = "url";
      const image = "image";
      const tag = "tag";

      expect(helpers.getUrl(url, image, tag)).toBe("url/image:tag");
    });

    it("should return valid url for a empty url, image and tag", () => {
      const url = "";
      const image = "image";
      const tag = "tag";

      expect(helpers.getUrl(url, image, tag)).toBe("image:tag");
    });

    it("should return valid url for a given url, image and no tag", () => {
      const url = "url";
      const image = "image";
      const tag = "";

      expect(helpers.getUrl(url, image, tag)).toBe("url/image:latest");
    });
  });

  describe("execCommand test", () => {
    it("should execute a command", () => {
      const cmd = "test command";

      helpers.execCommand(cmd);

      expect(exec).toHaveBeenCalledTimes(1);
      expect(exec.mock.calls[0][0]).toBe(cmd);
    });
  });

  describe("isFile test", () => {
    it("should call isFile on object with path", async () => {
      const path = "path";

      await helpers.isFile(path);

      expect(fs.lstat).toHaveBeenCalledTimes(1);
      expect(fs.lstat).toHaveBeenCalledWith(path);
      expect(mockIsFile).toHaveBeenCalledTimes(1);
    });
  });
});
