FROM node

RUN mkdir -p /app
WORKDIR /app
VOLUME /data

COPY . /app
COPY .env.example /app/.env
RUN sed -E 's/^(DB_CONNECTION_FILENAME=).*/\1\/data\/sqlite.db/' /app/.env > /app/.env

RUN yarn
RUN yarn build
RUN yarn knex migrate:latest

CMD ["yarn", "start"]