const express = require('express');
const bodyParser = require('body-parser');
const jsonBodyParser = bodyParser.json({ limit: '10mb' });
const path = require('path');
const PORT = process.env.PORT || 5000;
const fs = require('fs');
const util = require('util');
const readdir = util.promisify(fs.readdir);
const readfile = util.promisify(fs.readFile);

var app = express();
var expressWs = require('express-ws')(app);

app.use(express.static(path.join(__dirname, 'static')));

function parseLines(text)
{
  var rawLines = text.split('\n');
  var lines = [];
  for (const i in rawLines) {
    var line = rawLines[i];
    line = line.replace(/\n/g,'');
    if (line == '' || line.startsWith('#'))
    {
      continue;
    }
    lines.push(line);
  }

  return lines;
}

async function compileGameData()
{
  const SRC = 'src';
  var srcFiles = await readdir(SRC);
  var start = 'intro';
  var passages = {};
  for (const i in srcFiles) {
    var fileName = srcFiles[i];
    var key = fileName.replace(/\.txt$/,'');
    var buffer = await readfile(SRC+'/'+fileName);
    var lines = parseLines(buffer.toString());
    passages[key] = lines;
  }

  var artFiles = await readdir('static/art');
  var art = {};
  for (const i in artFiles) {
    var fileName = artFiles[i];
    var key = fileName.replace(/\.png$/,'').replace(/\.jpg$/,'');
    var path = '/art/'+fileName;
    art[key] = path;
  }
  return {passages, art, start};
}

app.get('/data', async function(req,res){ 
  var gameData = await compileGameData();
  res.send(gameData);
});

var sockets = [];
app.ws('/ws', function(ws, req) {
  sockets.push(ws);
});

const WebSocket = require('ws');
function broadcast(msg)
{
  var json = JSON.stringify(msg);
  console.log('broadcasting: ' + json);
  sockets.forEach((client)=>{
    if (client.readyState === WebSocket.OPEN) {
      client.send(json);
    }
  })
}

app.post('/state', jsonBodyParser,function(req,res){
  console.log(req.body);
  broadcast(req.body);
});

app.listen(PORT, () => {
  console.log(`Listening on ${ PORT }`);
});
