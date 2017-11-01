"use strict";

const http = require('http');
const path = require('path');
const fs   = require('fs');
//var sscp = require('sscp');

const socketio = require('socket.io');
const express = require('express');

const router = express();
const server = http.createServer(router);
const io = socketio.listen(server);

router.use(express.static(path.resolve(__dirname, 'client')));


// My "database" I guess
var groups = {};



//////////////////////
// START SOCKET I/O //
//////////////////////

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
      if (isGroupMember(groupId, socket)){
        
        // If this option does not exist
        if (!doesOptionExistForGroup(groupId, optionName)){
          
          // add the option
          addOptionToGroup(groupId, optionName);
          
          // Tell everyone to show the option
          io.to(groupId).emit('OptionAdded', optionName);
          
        } else {
          console.log("> failed: option already exists");
          socket.emit("Status", "Failed to add option", "This option already exists.");
        }
      } else {
        console.log("> failed: not member");
        socket.emit("Status", "Failed to add option", "You are not a member of this group.");
      }
    } else {
      console.log("> failed: no group: " + socket.id);
      socket.emit("Status", "Failed to add option", "Group does not exist");
    }
  });
  
  // Client deleted option, So we remove it if we can
  socket.on("RemoveOption", function(groupId, name){
    // if group exists
    if (groupExists(groupId)){
      
      // if is member of group
      if (isGroupMember(groupId, socket)){
      
        // if option exists
        if (doesOptionExistForGroup(groupId, name)){
          
          // delete it
          removeOptionFromGroup(groupId, name);
          
          // tell everyone to get rid of it
          io.to(groupId).emit("OptionRemoved", name);
        } else {
          socket.emit("Status", "Failed to remove option", "Option does not exist.");
        }
      } else {
        socket.emit("Status", "Failed to remove option", "You are not a member of this group.");
      }
    } else {
      socket.emit("Status", "Failed to remove option", "Group does not exist");
    }
  });
  
  // Client voted on an option
  socket.on("OptionVote", function(name, vote){
    
  });
  
  // Client requested a selection from the server
  socket.on("RequestSelection", function(){
    
  });
  
  // When the client disconnects, remove from group
  socket.on('disconnect', function () {
    
  });
  
  // While the client is disconnecting
  socket.on('disconnecting', function(){
    console.log("disconnecting: " + socket.id);
    
    // check socket.rooms for the groupId
    let rooms = Object.keys(socket.rooms);
    
    // The group is the second room, index 1
    let groupId = rooms[1];
    
    console.log("> From group " + groupId);
    
    // Get the group
    let group = io.sockets.adapter.rooms[groupId];
    
    // if the group exists
    if (group !== undefined){
      console.log("> > group exists");
      // if this is the last member of the group
      if (Object.keys(group.sockets).length < 2){
        console.log("> > > group will be empty");
        // remove the group
        delete groups[groupId];
      } else {
        console.log("> > > group still has people in it");
      }
    } else {
      console.log("> > group doesn't exist");
    }
  });
  
});

////////////////////
// END SOCKET I/O //
////////////////////






//////////////////
// START GROUPS //
//////////////////

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
      if (groups.hasOwnProperty(name)){
        delete groups[name];
        return true;
    }
    return false;
}

/** Determines whether or not a group exists
 */
function groupExists(id){
    return groups.hasOwnProperty(id);
}


/** Returns whether the socket is in a group
 * PARAMS:
 *    groupId : String - The id of the group we want to know if the socket is in
 *    socket : Socket - The socket we are checking
 * RETURNS:
 *    boolean - whether the socket is in a group
 */
function isGroupMember(groupId, socket){
  return socket.rooms.hasOwnProperty(groupId);
}

function socketJoinGroup(groupId, socket){
  
  // if the group exists and the socket isn't in another group
  if (groupExists(groupId)){
    
    // if the soscket isn't already in a group
    if (Object.keys(socket.rooms).length < 2){
      console.log("socksess: " + groupId);
      // add him to the object
      groups[groupId].members.push(socket.id);
      
      // join the group
      socket.join(groupId);
      
      // Let the socket know which group it joined
      socket.emit("JoinSuccess", groups[groupId].name, groupId);
      
      // Give the socket all of the options for this group
      let allOptions = getGroupOptions(groupId);
      // If there are any options
      if (allOptions.length > 0){
        socket.emit("AllOptions", allOptions);
      }
    } else {
      socket.emit("Status", "Failed to join group", "You are already in a group, you sneaky bugger.");
    }
    
  } else {
    // Let the socket know it failed
    io.to(socket.id).emit("Status", "Failed to join group", "Group Does not exist.");
  }
}

/** Returns all of the options that a group has
 * PARAMS:
 *    groupId : String - The ID of the group we want the options for
 * RETURNS:
 *    Array<String> - All of the options in the group. Empty if no options
 */
function getGroupOptions(groupId){
  let result = [];
  let keys = Object.keys(groups[groupId].options);
  let key = "";
  for (let i = 0; i < keys.length; i++){
    key = keys[i];
    result.push(groups[groupId].options[key].name);
  }
  return result;
}

////////////////
// END GROUPS //
////////////////







///////////////////
// START OPTIONS //
///////////////////

/** Produces a new option object from a given name
 * PARAMS:
 *    optionName : String - The name that the option needs to have
 * RETURNS:
 *    Object - The option object
 */
function newOption(optionName){
  let result = {};
  result.name = optionName;
  result.weight = 0;
  return result;
}

/** Produces a key based on the name of the option
 * PARAMS:
 *    name : String - The name of the option we are generating a key for
 * RETURNS:
 *    String - The key for the name
 */
function optionKeyFromName(optionName){
  return optionName.trim().toLowerCase();
}

/** Determines whether or not a group has an option
 * PARAMS:
 *    groupId : String - The Id of the group we are evaluating
 *    optionName : String - The name of the option that we are checking for
 * RETURNS:
 *    boolean - Whether or not a group has the given option
 */
function doesOptionExistForGroup(groupId, optionName){
  let key = optionKeyFromName(optionName);
  return groups[groupId].options.hasOwnProperty(key);
}

// TODO: Option needs to be referenced by id, contains a name, and a weighting
function addOptionToGroup(groupId, optionName){
  let key = optionKeyFromName(optionName);
  groups[groupId].options[key] = newOption(optionName);
}

function removeOptionFromGroup(groupId, optionName){
  let key = optionKeyFromName(optionName);
  delete groups[groupId].options[key];
}

/////////////////
// END OPTIONS //
/////////////////






//////////////////////////////////////
// Actually have the server running //
//////////////////////////////////////

server.listen(process.env.PORT, process.env.IP, function(){
  var addr = server.address();
  console.log("Server listening at", addr.address + ":" + addr.port);
});