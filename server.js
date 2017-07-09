var http = require('http');
var path = require('path');
var fs   = require('fs');

var async = require('async');
var socketio = require('socket.io');
var express = require('express');

var router = express();
var server = http.createServer(router);
var io = socketio.listen(server);

router.use(express.static(path.resolve(__dirname, 'client')));

var sockets = [];


io.on('connection', function (socket) {
    
    console.log("Socket Connected");

  sockets.push(socket);

  socket.on('disconnect', function () {
    sockets.splice(sockets.indexOf(socket), 1);
  });
  
});


// Actually have the server running
server.listen(process.env.PORT, process.env.IP, function(){
  var addr = server.address();
  console.log("Chat server listening at", addr.address + ":" + addr.port);
});