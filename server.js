"use strict";

var http = require('http');
var path = require('path');
var fs   = require('fs');
//var sscp = require('sscp');

var async = require('async');
var socketio = require('socket.io');
var express = require('express');

var router = express();
var server = http.createServer(router);
var io = socketio.listen(server);

router.use(express.static(path.resolve(__dirname, 'client')));

var groups = {};

io.on('connection', function (socket) {
  console.log("Socket Connected: " + socket.id + "\n");
  
  
  //*****************************
  //* All of the built-in events*
  //*****************************
  
  // logs a message, then emits it to all sockets
  socket.on('msg', function(msg){
    console.log('msg: ' + msg);
    io.emit('message', msg);
  });
  
  // emits message to one room
  socket.on('msgTo', function(room, msg){
    console.log('msg: ' + msg + "\n   to: " + room);
    console.log("id: " + socket.id);
    io.to(room).emit('message', msg);
  });
  
  socket.on("CreateGroup", function(name){
    // if we can create the group (which we should)
    let g = makeGroup(name);
    addGroup(g);
    socketJoinGroup(g.id, socket);
    
  });
  
  // allows the socket to join a group
  socket.on('JoinGroup', function(id){
    console.log("attempting to join group");
    socketJoinGroup(id, socket);
  });
  
  // Client added a new option
  socket.on("AddOption", function(groupId, optionName){
      console.log("attempting to add option \"" + optionName + "\" to group \"" + groupId +"\"");
      // if the group exists
      if (groupExists(groupId)){
          // If this socket belongs to that group
          if (isGroupMember(groupId, socket.id)){
              io.to(groupId).emit('OptionAdded', optionName);
          } else {
              console.log("> failed: not member");
              io.to(socket.id).emit("Status", "Failed to add option", "You are not a member of this group.");
          }
      } else {
          console.log("> failed: no group: " + socket.id);
          io.to(socket.id).emit("Status", "Failed to add option", "Group does not exist");
      }
  });
  
  // Client deleted option, So we remove it if we can
  socket.on("RemoveOption", function(name, gorupId){
    
  });
  
  // Client voted on an option
  socket.on("OptionVote", function(name, vote){
    
  });
  
  // Client requested a selection from the server
  socket.on("RequestSelection", function(){
    
  });
  
  // When the client disconnects, remove from group
  socket.on('disconnect', function () {
      // check socket.rooms for the groupId
      // Remove socket from that group
  });
  
});

/** Returns a new object
 * PARAMS:
 *      name: String - The name of the new group
 */
function makeGroup(name){
    let result = {};
    result.name = name;
    result.id = getNextGroupId();
    result.members = [];
    result.options = {};
    return result;
}

var charSet = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
/** Returns a random string of 10 randomly selected characters from the charSet
 */
function getNextGroupId(){
    let r = 4;
    let strBuff = [];
    let str = "";
    do {
      // Assemble id
      while (r--) strBuff[r] = charSet.charAt(~~(Math.random()*charSet.length)); 
      str = strBuff.join('');
      
      // until the group doesn't exist
    } while(groupExists(str));
    return str;
}

/** Adds a group to the server
 * PARAMS:
 *      name: String - the name of the new group
 * RETURN:
 *      boolean - whether or not the group was created
 */
function addGroup(group){
  groups[group.id] = group;
}

/** Remove a group from the server
 * PARAMS:
 *      name: String - The name of the group to be removed
 * RETURN:
 *      boolean - Whether or not the remove was successful
 */
function removeGroup(name){
    if (groups.hasOwnProperty(name) && groups[name].members.length == 0){
        delete groups[name];
        return true;
    }
    return false;
}

function groupExists(id){
    return groups.hasOwnProperty(id);
}


function isGroupMember(groupId, socketID){
    return(groups[groupId].members.indexOf(socketID) != -1);
}

function socketJoinGroup(groupId, socket){
  // if the group exists and the socket isn't in another group
  if (groupExists(groupId)){
    console.log("socksess: " + groupId);
    // add him to the object
    groups[groupId].members.push(socket.id);
    
    // join the group
    socket.join(groupId);
    
    // Let the socket know which group it joined
    socket.emit("JoinSuccess", groups[groupId].name, groupId);
  } else {
    console.log("unsocksessful");
    // Let the socket know it failed
    io.to(socket.id).emit("Status", "Failed to join group", "Try again, buddy. You'll make friends some day.");
  }
}

// Actually have the server running
server.listen(process.env.PORT, process.env.IP, function(){
  var addr = server.address();
  console.log("Server listening at", addr.address + ":" + addr.port);
});