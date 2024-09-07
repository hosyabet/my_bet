FROM node:21.4.0

WORKDIR /var/www

COPY . .

RUN npm install

EXPOSE 3000

CMD [ "npm", "run", "start" ]