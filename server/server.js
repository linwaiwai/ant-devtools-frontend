const koa = require('koa');
const convert = require('koa-convert');
const app = new koa();
const staticMiddlware = require('koa-static');

const remoteDebuggingPort = parseInt(process.env.remotePort, 10) || 9224;
const serverPort = parseInt(process.env.frontendPort, 10) || 8090;

console.log('server start on port: ', serverPort);

app
  .use(convert(function* (next) {
    if (this.url === '/') {
      var landingURL = `http://localhost:${remoteDebuggingPort}#custom=true&experiments=true`;
      this.statusCode = 200;
      this.body = `<html>Please go to <a href="${landingURL}">${landingURL}</a></html>`;
    }
    yield next;
  }))
  .use(staticMiddlware('./release'))
  .listen(serverPort);
