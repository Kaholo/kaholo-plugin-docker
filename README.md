# Kaholo Docker Plugin
This plugin extends Kaholo's capabilities to include docker commands to build, tag, pull, push, and run images. Docker commands are run directly on the Kaholo agent. This plugin parameterizes options to make configuration more user-friendly.

Should there be a need to run a docker command not covered by any specific methods of this plugin, use method "Run Docker Command". For example to list docker images on the Kaholo agent, run this command.

    docker image ls

For still more generic and absolute command-line access to the Kaholo agent to run `docker` and other commands, consider using the [Command Line plugin](https://github.com/Kaholo/kaholo-plugin-cmd/releases).

## Docker Tags
The term "tag" in Docker has two meanings - one is just the version number, e.g. `2.1.0` or `latest`. The other includes additional information such as the server, repository, and the "tag", e.g. `nexus-a.kaholodemo.net/myapp:2.1.0`. Tags can also specify the SHA256 digest to refer to a specific image, e.g.`myapp@sha256:a6b7be1808b8443dde696c5f108be1cb6e7641d6b281ef7598df012c1d6871f8`.

**In this plugin the meaning of "tag" is the more expansive one, the 2nd meaning.**

This plugin works just like docker at the command line. If tag is left empty, the image will have only a digest and a short form of that digest as image ID, e.g. `18324dfa78cb`. A minimal tag would be the repo name only, e.g. `myapp`, in which case the "tag" (simple meaning) is assumed to be "latest". Specifying SHA256 digest is valid for methods such as Pull Image and Run Image but not Build Image, in which case the SHA256 digest is mathematically calculated as the image is built.

## Access and Authentication
The only methods potentially requiring authentication are methods Push Image and to a lesser extent maybe Pull Image. For this, parameters are provided for username and password. The server for images being pushed or pulled are included in the tag of the image. For example this image...

    nexus-a.kaholodemo.net/myapp

Would be pushed to the server at `nexus-a.kaholodemo.net`. For images tagged without specifying server, for example just `myapp`, Docker Hub is assumed to be the server. This is very similar to how Docker works at the command line.

Docker authentication information is normally stored in file `~/.docker/config.json` when a command is run with authentication information. Subsequent commands can then work without providing further authentication. To avoid leaving such credentials on the Kaholo agent, this plugin uses command `shred` to security delete the file when the command has completed. This action can be seen as messages in the Activity log:

    Login Succeeded
    ...
    Shredding credentials in /root/.docker/config.json

If it is preferred to log in and stay that way, use method "Run Docker Command" to run `docker login` appropriately and then leave username and password empty in Actions that would normally require a login.

## Plugin Settings
This plugin makes no use of plugin-level settings or Kaholo Accounts.

## Method: Build Image
This method creates a new Docker image with a new tag from a Dockerfile. This is equivalent to command `docker image build`.

### Parameter: Working Directory
This is the path to the directory containing a file named Dockerfile. A relative or absolute path may be used. If relative, it is relative to the default working directory on the Kaholo agent, e.g. `/twiddlebug/workspace`. To find the default working directory on any Kaholo agent, use the [Command Line plugin](https://github.com/Kaholo/kaholo-plugin-cmd/releases) to run command `pwd`.

### Parameter: Dockerfile Path
If left unspecified, the plugin will look for a file named `Dockerfile` in the Working Directory. To use a Dockerfile with a different file name or path, specify the path and filename here. For example, `dockerfiles/Dockerfile.debug`.

### Parameter: Tag
This is the tag for the docker image being built - at minimum usually the repository name, e.g. `myapp`, and often including a version, e.g. `myapp:1.2.0`. If no tag is provided, the image will be created with an ID only, e.g. `28e09682c387`. If a tag IS provided, the tag and other information about the image is provided in Final Result as a JSON document, which makes access to the details from the code layer easier. For example the size of the image might be `kaholo.actions.Docker1.result.Size`, were `Docker1` is the ID of the specific Action from which the result is to be obtained.

## Method: Run Docker Container
This method runs a new docker container. For example if a specific build server image, `builder001` has been created with method Docker Build, one might use this method to run it in order to build a maven project with command `mvn package`. This is particularly useful when specific version of packages or other uncommon components are required to execute a task. Another common use case is when a product or service is provided at a docker image, for example the Oracle Cloud CLI. Since there is no Kaholo Oracle CLI plugin, one could use this plugin to run the image instead, executing any Oracle Cloud CLI command without installing it or its dependencies on the Kaholo agent.

Note this method is meant to run an image to accomplish some task, which then exits and the container is destroyed to free resources on the Kaholo agent. Please do not use this method to deploy applications that run indefinitely on the Kaholo agent. To deploy an image for indefinite use, have a dedicated server and use the [SSH Plugin](https://github.com/Kaholo/kaholo-plugin-ssh/releases) to run command `docker run` there, or deploy the image to Kubernetes using the [Kubernetes Plugin](https://github.com/Kaholo/kaholo-plugin-kubernetes/releases).

Example: Busybox loop

    Method: Run Image
    Params:
    - Command: sh -c 'for i in $(seq 1 10); do echo "Output: $i"; sleep 1; done'
    - Image name: busybox

Configuration causes the plugin to run a docker command similar to running this at the command line:

    docker run busybox sh -c 'for i in $(seq 1 10); do echo "Output: $i"; sleep 1; done'

The actual command that it runs is a bit more complex, because it adds `--rm` to remove the container when the command completes, and mounts the working directory to accomodate commands that interact with the filesystem. These are benefits of using method Run Image instead of Run Docker Command.

    docker run --rm -v '/twiddlebug/workspace':'/twiddlebug/workspace' --workdir '/twiddlebug/workspace' busybox sh -c 'for i in $(seq 1 10); do echo "Output: $i"; sleep 1; done'

### Parameter: Image
This is the image to run as a docker container. At minimum it must be a repo name, e.g. `alpine` or image ID `1ee71564b1f2`, but may include any of the things discussed above in section [Docker Tags](#docker-tags).

### Parameter: Command
Docker images normally start with default commands or entrypoints, but a specific command can be injected as well. For example running image `alpine` with command `ls -la` will list all the files in the default home directory within the docker container.

Multiple commands may be entered one per line and the plugin will attempt to append them into a single command using `/bin/sh -c` as a wrapper and `; ` to separate the commands. Success will depend on the image used, but if this fails, it may be possible to manually assemble commands into a single line and still succeed, e.g. by not using `/bin/sh -c` or using `&&` instead of `; `, etc.

### Parameter: Environment Variables
These are one-per-line key=value pairs that will be passed into the docker container as environment variables. For example, if configured like so:

    MODE=development
    VERSION=3.2.1

Using the alpine image with command `echo Building Version $VERSION in mode $MODE.`, the Final Result will be `Building Version 3.2.1 in mode development.`. This has many potential purposes but is optional.

### Parameter: Secret Environment Variables
These are the same as Enviroinment Variables, however Secret ones are stored in Kaholo Vault so they will not appear in the UI, logs, or error messages. This is less transparent but more secure when dealing with sensitive information like tokens, passwords, ssh keys, etc.

### Parameter: Working Directory
The Working Directory is a path on the Kaholo agent that will be mounted as a Docker volume so it is accessible both within the container, and after the container is destroyed. In the example of using image `builder001` to build a Maven project with command `mvn package`, this can work only if the Working Directory is a path on the Kaholo agent that contains a Maven project. The Working Directory is typically a product of the [Git Plugin](https://github.com/Kaholo/kaholo-plugin-git/releases) - a repo that has been cloned from source onto the Kaholo Agent, but there are many other possibilities. In this example a Java `jar` file is probably built as a result. When the build is finished and the container destroyed, the product of the build can still be found in the Working Directory on the Kaholo agent, e.g. `target/myapp-3.2.1.jar`.

## Method: Pull Image
This method pulls docker images. If an image is already present on the Kaholo agent it immediately succeeds. Otherwise it downloads the image to make it available on the Kaholo agent for downstream actions in the pipeline.

Pull image provides information about the image pulled as a well-formed JSON document in Final Result. One might "pull" an image that is already present simply to get easy programmatic access to this result, For example the size of the image would be `kaholo.actions.Docker1.result.Size`, were `Docker1` is the ID of the specific Action pulling the image.

### Parameter: Username
Should the docker registry require authentication to pull images, put the username here.

### Parameter: Password
Should the docker registry require authentication to pull images, specify the Kaholo Vault item containing the password here.

### Parameter: Image
The tag of the image to pull, using the expansive meaning of "tag" as explained in above in section [Docker Tags](#docker-tags).

## Method: Push Image
This method pushes docker images to repositories, by default Docker Hub. To push to other repositories the tag of the image must include a server or IP address, e.g. `nexus-a.kaholodemo.net/myapp:lastest`. If the image already exists in the repository it quickly and effortlessly succeeds.

### Parameter: Username
Should the docker registry require authentication to push images, put the username here.

### Parameter: Password
Should the docker registry require authentication to push images, specify the Kaholo Vault item containing the password here.

### Parameter: Image
The tag of the image to push, using the expansive meaning of "tag" as explained in above in section [Docker Tags](#docker-tags).

## Method: Tag Image
This method tags docker images. There are a few reasons this might be useful.
* Giving an image a version number - suppose an image for `myapp` has been built and tested and is ready for release as version `1.3.0`. Use this method to tag the image `myapp:1.3.0`.
* To push images to alternative repositories - following the same example, tag image `myapp` `nexus-a.kaholodemo.net/myapp:lastest` and then method Push Image can be used to push the image to server `nexus-a.kaholodemo.net`.
* To "rename" images. If a specify project named `myapp` is built using an image `ubuntu:jammy-20220801`, one might wish to tag that image appropriately as `myapp-builder-20220801`. The original image with the original tag remains and nothing is copied, but this provides a logical way to organize images so, in this example, nobody has to memorize that to build `myapp` one should use image `ubuntu:jammy-20220801`.

In any case, tagging an image does not copy or move any images, it simply inserts another reference to existing images. This happens quickly and effortlessly. To actually copy or move images, use Method Pull Image to get sources, tag them, and then Push Image.

If multiple images are tagged identically, the most recently tagged image causes the others to lose their tag. They still display the repo in the output of `docker image ls`, but the tag is column is left empty. To subsequently delete these tag-orphaned images, the image ID must be used instead - for example `docker image rm a4ff08005fa8`. A useful "Run Docker Command" command to delete all in one go, for example the repository name contains a unique string `abc123`, is 

    docker image rm -f `docker image ls | grep abc123 | awk '{print $3}'`

### Parameter: Source Image
The tag of an existing image or one to be automatically pulled, using the expansive meaning of "tag" as explained in above in section [Docker Tags](#docker-tags).

### Parameter: Target Image
The new tag of the image, using the expansive meaning of "tag" as explained in above in section [Docker Tags](#docker-tags).

## Method: Run Docker Command
This method allows one to generically run any command that begins with `docker`. The main purpose is to cover any docker functionality that is not covered already by the other more user-friendly methods. If authentication is not required, for example running `docker image ls`, then the first three parameters may be left unconfigured.

Example: Busybox loop

    Method: Run Docker Command
    Params:
    - Command: docker run --rm busybox sh -c 'for i in $(seq 1 10); do echo "Output: $i"; sleep 1; done'

### Parameter: Username
Should the docker registry require authentication to run the docker command, put the username here.

### Parameter: Password
Should the docker registry require authentication to run the docker command, specify the Kaholo Vault item containing the password here.

### Parameter: Registry URL
Should the docker registry require authentication to run the docker command, specify the URL of the registry here. For example, `https://nexus-a.kaholodemo.net`. If left emtpy, `https://registry-1.docker.io` is assumed.

### Parameter: Command
The actual command to run. It must begin with `docker`. To run commands that are NOT `docker` commands, use the [Command Line plugin](https://github.com/Kaholo/kaholo-plugin-cmd/releases).

### Parameter: Attempt JSON Output
Many docker commands accept argument `--format "{{json . }}"` to provide JSON-formatted output. This makes the output readily available on the Kaholo code layer using notation such as `kaholo.actions.docker1.result[0].Size`. To conveniently add this argument to the docker command, enable this parameter. The same argument may also be entered directly into the Command parameter.