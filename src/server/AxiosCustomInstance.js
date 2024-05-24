const axios = require('axios');
const http = require('node:http');
const https = require('node:https');

const AxiosCustomInstance = () => {
  const httpAgent = new http.Agent({
    keepAlive: true,
    timeout: 60000,
    scheduling: 'fifo',
  });
  const httpsAgent = new https.Agent({
    keepAlive: true,
    timeout: 60000,
    scheduling: 'fifo',
  });
  let instance = axios.create({
    httpAgent,
    httpsAgent,
  });
  return instance;
};

module.exports = { AxiosCustomInstance };