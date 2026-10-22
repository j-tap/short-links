FROM node:22-alpine

WORKDIR /app

COPY . .

RUN yarn install

EXPOSE 3000

CMD ["node", "src/index.mjs"]
