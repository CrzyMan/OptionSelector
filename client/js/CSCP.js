"use strict";

function CSCP(){
    this.events = {};
}

var cscp = new CSCP();
function getCSCP(){return cscp;}

/** Loads a socket with all of the events and functions
 * PARAMS:
 *      socket: Socket - The socket to load every event to
 * RETURNS:
 *      void
 */
CSCP.prototype.loadSocket = function(socket){
    for (var e in this.events){
        socket.on(e, this.events[e]);
    }
};

/** Adds an event to the events object
 * PARAMS:
 *      name: String - the name of the command
 *      fn: Function - The function that will be called when the event occurs
 * RETURNS:
 *      Boolean - Whether or not the add was successful
 */
CSCP.prototype.addEvent = function(name, fn){
    if (!this.events.hasOwnProperty(name)){
        this.events[name] = fn;
        return true;
    } else {
        return false;
    }
};