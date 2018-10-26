var express = require('express')
const morgan = require('morgan');
var http = require('http')
var https = require('https')
var app = express()
const os = require('os');
const jwt = require('jsonwebtoken');
var concat = require('concat-stream');

app.set('json spaces', 2);

app.use(morgan('combined'));

app.use(function(req, res, next){
  req.pipe(concat(function(data){
    req.body = data.toString('utf8');
    next();
  }));
});

app.all('*', (req, res) => {
  if (process.env.FORWARD_HEADERS) {
    const forwardHeadersCsv = process.env.FORWARD_HEADERS;
    console.log("forwardHeadersCsv '" + forwardHeadersCsv + "'");
    forwardHeadersCsv.split(',').forEach(function(header){
      var safeHeader = header.trim().toLowerCase();
      if (safeHeader in req.headers){
        console.log("Forwarding header '" + safeHeader + "'");
        res.setHeader(safeHeader, req.headers[safeHeader]);
      }
    });
  }
  if (process.env.ECHO_TO_BODY || process.env.ECHO_TO_LOG){
    const echo = {
      path: req.path,
      headers: req.headers,
      method: req.method,
      body: req.body,
      cookies: req.cookies,
      fresh: req.fresh,
      hostname: req.hostname,
      ip: req.ip,
      ips: req.ips,
      protocol: req.protocol,
      query: req.query,
      subdomains: req.subdomains,
      xhr: req.xhr,
      os: {
        hostname: os.hostname()
      }
    };
    if (process.env.JWT_HEADER) {
      const token = req.headers[process.env.JWT_HEADER.toLowerCase()];
      if (!token) {
        echo.jwt = token;
      } else {
        const decoded = jwt.decode(token, {complete: true});
        echo.jwt = decoded;
      }
    }
    if (process.env.ECHO_TO_BODY){
      res.json(echo);
    }
    if (process.env.ECHO_TO_LOG){
      console.log('-----------------')
      console.log(echo);
    }
  }
  if (! process.env.ECHO_TO_BODY){
    // Send an empty response to actually complete
    // handling of this request, or else we just timeout.
    res.json({});
  }
});

const sslOpts = {
  key: require('fs').readFileSync('privkey.pem'),
  cert: require('fs').readFileSync('fullchain.pem'),
};

http.createServer(app).listen(80);
https.createServer(sslOpts,app).listen(443);

let calledClose = false;

process.on('exit', function () {
  if (calledClose) return;
  console.log('Got exit event. Trying to stop Express server.');
  server.close(function() {
    console.log("Express server closed");
  });
});

process.on('SIGINT', function() {
  console.log('Got SIGINT. Trying to exit gracefully.');
  calledClose = true;
  server.close(function() {
    console.log("Express server closed. Asking process to exit.");
    process.exit()
  });
});
