# Build an x86 docker image on M1 Mac
DOCKER_BUILDKIT=1 docker build --platform linux/amd64 -t usdzconverter .
# Build an x86 docker image on M1 Mac
docker container run -it -p 9090:9090 usdzconverter