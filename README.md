# kaholo-plugin-docker
The Kaholo Plugin for Docker is based on [Dockerode npm package](https://www.npmjs.com/package/dockerode).

## Settings:
1. Username (String) **Optional** - Username to use as default for push and pull from registries.
2. Password (Vault) **Optional** - Password to use as default for push and pull from registries.

## Method: Build Docker Image
This method create a new docker image with a new tag from a docker file 
Based on the [Docker Documentation](https://docs.docker.com/engine/reference/commandline/image_build/)

```docker image build```

### Parameters:
1. Path to Dockerfile (String) **Required** - The path to the directory containing the dockerfile.
2. Tag (String) **Optional** - The tag for the new image.

## Method: Pull Image
This method pulls an Image from a repo such as Docker Hub.
Based on the [Docker Documentation](https://docs.docker.com/engine/reference/commandline/pull/)
```docker pull [OPTIONS] NAME[:TAG|@DIGEST]```

### Parameters:
1. Username (String) **Optional** - Username of the user to authenticate to the registry with.
2. Password (Vault) **Optional** - Password of the user to authenticate to the registry with.
3. Image name (String) **Required** - The name of the image to pull.
4. Image tag (String) **Optional** - The tag of the image to pull. If not specified assume latest.
5. Registry name (String) **Optional** - The url of the registry to pull from. if empty, assume docker hub as a default.

## Method: Push to repo
This method push an image to a repo such as docker hub
Based on [Docker Documentation](https://docs.docker.com/engine/reference/commandline/push/)
```docker push [OPTIONS] NAME[:TAG]```

### Parameters:
1. Username (String) **Optional** - Username of the user to authenticate to the registry with.
2. Password (Vault) **Optional** - Password of the user to authenticate to the registry with.
3. Image name (String) **Required** - The name of the image to pull.
4. Image tag (String) **Optional** - The tag of the image to pull. If not specified assume latest.
5. Registry name (String) **Optional** - The url of the registry to pull from. if empty, assume docker hub as a default.


## Method: Tag Image
Create a tag TARGET_IMAGE that refers to SOURCE_IMAGE
Based on [Docker Documentation](https://docs.docker.com/engine/reference/commandline/tag/)

```docker tag SOURCE_IMAGE[:TAG] TARGET_IMAGE[:TAG]```

### Parameters:
1. Source Registry (String) **Optional** - The URL of the registry the image is stored on. Assume docker hub if not specified.
2. Source Image Tag (String) **Required** - The name + tag(will assume 'latest' if tag not specified) of the image to tag.
3. New Registry (String) **Optional** - the url of the registry to store the new image in. Assume docker hub if not specified.
4. New Image Tag (String) **Required** - The name + tag of the new image to create.

## Method: Docker CMD
A general command line to execute any Docker command. 

* NOTE - No need to add the docker command the string is ```docker + (your Docker Command)```

### Parameters:
1. Docker Command (String) **Required** - The docker command to run. No need to specify 'docker' in the start of the command.






