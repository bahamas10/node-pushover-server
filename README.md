Pushover Server
===============

A webserver to expose pushover notifications

Usage
-----

Create a config file

``` json
{
  "buffer": 50,
  "cache": "/var/tmp/pushover-server.json",
  "host": "0.0.0.0",
  "port": 8080,
  "pushover": {
    "secret": "secret here",
    "device_id": "device id here"
  }
}
```

and start the server

```
$ pushover-server config.json
loaded 2 items from cache
pulling unread messages
fetched 0 messages
listening on http://0.0.0.0:8080
127.0.0.1 - - [19/May/2016:14:38:14 -0400] "GET /messages.json HTTP/1.1" 200 275 "-" "curl/7.43.0"
```

`GET /messages.json` to see the notifications

```
$ curl -s localhost:8080/messages.json | json
[
  {
    "id": 16,
    "message": "ok",
    "app": "Pushover",
    "aid": 1,
    "icon": "pushover",
    "date": 1463682341,
    "priority": 0,
    "acked": 0,
    "umid": 4476,
    "title": "hi"
  },
  {
    "id": 18,
    "message": "sticks",
    "app": "Pushover",
    "aid": 1,
    "icon": "pushover",
    "date": 1463682384,
    "priority": 0,
    "acked": 0,
    "umid": 4478,
    "title": "mozz"
  }
]
```

Config
------

- `buffer` - number of messages to store locally
- `cache` - optional filename to store messages to be loaded up when the server starts
- `host` - HTTP host to listen on
- `port` - HTTP port to listen on
- `pushover.secret` - pushover secret
- `pushover.device_id` - pushover device_id

See https://github.com/bahamas10/node-pushover-open-client for pushover config options

Installation
------------

    npm install -g pushover-server

License
-------

MIT License
