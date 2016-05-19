#!/usr/bin/env node
/**
 * Pushover Server
 *
 * View pushover notifications over an http server
 *
 * Author: Dave Eddy <dave@daveeddy.com>
 * Date: May 17, 2016
 * License: MIT
 */

var fs = require('fs');
var http = require('http');

var accesslog = require('access-log');
var easyreq = require('easyreq');
var CircularBuffer = require('circular-buffer');
var PushoverOpenClient = require('pushover-open-client');
var vasync = require('vasync');

var config = {
  buffer: +process.env.PUSHOVERSERVER_BUFFER || 50,
  cache: process.env.PUSHOVERSERVER_CACHE,
  host: process.env.PUSHOVERSERVER_HOST || '0.0.0.0',
  port: +process.env.PUSHOVERSERVER_PORT || 8080,
  pushover: {
    secret: process.env.PUSHOVERSERVER_SECRET,
    device_id: process.env.PUSHOVERSERVER_DEVICE_ID
  }
};

var file = process.argv[2] || process.env.PUSHOVERSERVER_CONFIG_FILE;
if (file) {
  var _config = JSON.parse(fs.readFileSync(file, 'utf8'));
  Object.keys(_config).forEach(function (key) {
    config[key] = _config[key];
  });
}

if (!config.pushover.secret || !config.pushover.device_id) {
  console.error('pushover config not found');
  process.exit(1);
}

// buffer to store messages
var messagebuf = new CircularBuffer(config.buffer);

// load up the cache if specified
var q;
if (config.cache) {
  var cache;
  try {
    cache = JSON.parse(fs.readFileSync(config.cache, 'utf8'));
  } catch (e) {
    cache = [];
  }
  cache.forEach(function (message) {
    messagebuf.enq(message);
  });
  console.log('loaded %d items from cache', cache.length);

  q = vasync.queue(function (_, cb) {
    var temp = config.cache + '.temp';
    var data = JSON.stringify(messagebuf.toarray());
    fs.writeFile(temp, data, 'utf8', function (err) {
      if (err) {
        console.error('failed to write cache to temp file %s: %s',
            temp, err.message);
        cb();
        return;
      }
      fs.rename(temp, config.cache, function (err) {
        if (err) {
          console.error('failed to write cache to temp file %s: %s',
              temp, err.message);
          cb();
          return;
        }
        cb();
      });
    });
  }, 1);
}

var poc = new PushoverOpenClient(config.pushover);
console.log('pulling unread messages');
poc.fetchAndDeleteMessages(function (err, messages) {
  if (err)
    throw err;

  console.log('fetched %d messages', messages.length);
  messages.forEach(function (message) {
    messagebuf.enq(message);
  });
  if (messages.length > 0 && q)
    q.push(null);

  poc.on('message', function (message) {
    messagebuf.enq(message);
    if (q)
      q.push(null);
  });
  poc.startWatcher();

  http.createServer(onrequest).listen(config.port, config.host, started);
});


function started() {
  console.log('listening on http://%s:%d', config.host, config.port);
}

function onrequest(req, res) {
  accesslog(req, res);
  easyreq(req, res);

  switch (req.urlparsed.normalizedpathname) {
    case '/':
      res.redirect('/ping');
      break;
    case '/ping':
      res.end('pong\n');
      break;
    case '/messages.json':
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.json(messagebuf.toarray());
      break;
    default:
      res.notfound();
      break;
  }
}
