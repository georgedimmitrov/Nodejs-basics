const http = require('http');
const server = http.createServer((req, res) => {
  // req is an http.IncomingMessage, which is a Readable Stream
  // res is an http.ServerResponse, which is a Writable Stream

  let body = '';

  // get the data as utf8 strings
  // if an encoding is not set, Buffer objects will be received
  req.setEncoding('utf8');

  // Readable streams emit 'data' events once a listener is added
  req.on('data', (chunk) => {
    console.log('chunk', chunk);
    body += chunk;
  });

  // the end event indicates that the entire body has been received
  req.on('end', () => {
    try {
      const data = JSON.parse(body);
      // write back something interesting to the user:
      res.write('typeof data is: ' + typeof data + ' and data is' + JSON.stringify(data));
      res.end();
    } catch (err) {
      // uh oh! bad json
      res.statusCode = 400;
      return res.end(`error: ${err.message}`);
    }
  });
});

server.listen(1337);