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

  describe("extractRegistryUrl", () => {
    const expectedImageUrls = [
      ["docker.io/google/cloud-sdk", "docker.io/"],
      ["docker.io/google/cloud-sdk:latest", "docker.io/"],
      ["google/cloud-sdk", undefined],
      ["docker.io/alpine", "docker.io/"],
      ["docker.io:80/alpine", "docker.io:80/"],
      ["asia-southeast1-docker.pkg.dev/kaholo-charlie/kaholo-docker/hashstrings:0.0.3", "asia-southeast1-docker.pkg.dev/"],
      ["asia-southeast1-docker.pkg.dev:8080/kaholo-charlie/kaholo-docker/hashstrings:0.0.3", "asia-southeast1-docker.pkg.dev:8080/"],
      ["localhost/alpine:latest", "localhost/"],
      ["kaholoio/kaholo", undefined],
      ["orchard-services.nova-ten.com:8088/hash/hashtest@sha256:ed0d24bd95e07b420f44ecf046aa780d597b586791383ea8c98d6965c70bfa28", "orchard-services.nova-ten.com:8088/"],
      ["delfer/alpine-ftp-server", undefined],
      ["willhallonline/ansible", undefined],
      ["amazon/aws-cli", undefined],
      ["node", undefined],
    ];

    expectedImageUrls.forEach(([image, expectedUrl]) => {
      expect(helpers.extractRegistryUrl(image)).toStrictEqual(expectedUrl);
    });
  });
});
