FROM node:20-alpine

WORKDIR /app

COPY . .

RUN yarn install

EXPOSE 3000

CMD ["node", "src/index.mts"]
