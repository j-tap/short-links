FROM node:20-alpine

WORKDIR /app

COPY . .

RUN yarn install
RUN yarn add -D ts-node typescript @types/node

EXPOSE 3000

CMD ["node", "--loader", "ts-node/esm", "src/index.mts"]
