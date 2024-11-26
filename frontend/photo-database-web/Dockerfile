FROM node:latest
WORKDIR /app
COPY package.json /app
COPY yarn.lock /app
RUN yarn install
COPY . /app
RUN yarn build
CMD yarn preview
EXPOSE 8081