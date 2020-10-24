FROM node

RUN mkdir -p /srv/fnordcredit

WORKDIR /srv/fnordcredit

COPY package.json /srv/fnordcredit/

RUN npm install

COPY . /srv/fnordcredit

COPY docker/config-docker.js /srv/fnordcredit/config.js

EXPOSE 8000

CMD [ "npm", "start" ]
