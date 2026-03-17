FROM node:alpine

WORKDIR /app

COPY package.json sysinfo.js .

RUN npm install

CMD ["npm", "start", "sysinfo.js"]































