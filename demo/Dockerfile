
FROM alpine:latest
RUN apk add --no-cache wget
WORKDIR /app

RUN wget https://github.com/yavuzceliker/sample-images/archive/refs/heads/main.zip
RUN unzip main.zip 

ENTRYPOINT ["mv", "/app/sample-images-main/images", "/photos"]
# ENTRYPOINT ["tail", "-f", "/dev/null"]