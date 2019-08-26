FROM node:10.16-buster
#
EXPOSE 3000

WORKDIR /app

COPY package.json yarn.lock ./

RUN yarn install --verbose

# COPY . .

CMD [ "yarn", "start" ]