"use strict";

class OptionsHandler{
    constructor(remVotesEl){
        this.remainingVotes = 0;
        this.remainingVotesElem = remVotesEl; 
        this.votes = {};
        this.elements = {};
    }
    
    // Adds the option and links it to the voting and element datastructures
    addOption(id, el){
        this.votes[id] = 0;
        this.elements[id] = el;
        this.remainingVotes++;
    }
    
    // Cleans all datastructers of the option, rebalances votes, and then refreshed the displays
    removeOptionById(id){
        if (this.votes.hasOwnProperty(id)){
            // Regain votes from option, and reduce due to lost option
            this.remainingVotes += Math.abs(this.votes[id]) - 1;
            
            // Actually remove from datastructures
            delete this.votes[id];
            delete this.elements[id];
            
            // Handle negative remaining votes
            if (this.remainingVotes < 0){
                // take vote from option of least number of assigned votes
                const newId = this.getOptionIdWithLowVotes();
                // If the element exists
                if (newId){
                    // find the appropriate vote direction, +1 if negative, -1 if positive
                    const val = -this.votes[newId] / Math.abs(this.votes[newId]);
                    this.voteOnId(newId, val)
                }
            }
            
            // Refresh the remaining votes display
            this.refreshRemainingVotes();
            return true;
        }
        return false;
    }
    
    // Returns the id of the option with the lowest positive number of votes
    getOptionIdWithLowVotes(){
        let result;
        const list = Object.keys(this.votes)                      // Get the ids
                     .map(id => [id, Math.abs(this.votes[id])])   // Make them into objects containing id and # of votes
                     .sort((a, b) => a[1] - b[1])               // Sort by # of votes, ascending
                     .filter( e => e[1] > 0);                    // Only allow elements that have at least one vote
        
        // If there are any valid elements
        if (list.length > 0){
            // set the result to be the id of the first element
            result = list[0][0];
        }
        return result;
    }
    
    // Refreshes the display for an option with the given id
    refreshOption(id){
        let res = false;
        // If the option exists
        if (this.votes.hasOwnProperty(id)){
            let el = this.elements[id].querySelector(".optionVal");
            
            // if the element is there
            if (el !== null){
                el.value = this.votes[id];
                res = true;
            }
        }
        return res;
    }
    
    // Refreshes the display for the remaining number of votes
    refreshRemainingVotes(){
        this.remainingVotesElem.innerHTML = this.remainingVotes;
    }
    
    /** Applies a increment or decrement to an option, and then updates the displays
     *  PARAMS:
     *      id  : String - the id of the option we are voting on
     *      val : Number - value to be added to option, either 1 or -1
     */
    voteOnId(id, val){
        let res = false;
        
        // if option exists
        if (this.votes.hasOwnProperty(id)){
            const voteGain = Math.abs(this.votes[id]) - Math.abs(this.votes[id] + val);
            
            // if this vote can be cast
            if (this.remainingVotes + voteGain >= 0){
                
                this.votes[id] += val;
                this.remainingVotes += voteGain;
                socket.emit("OptionVote", GROUPID, clientIdToServerId(id), val);
                
                // refresh the remaining votes
                this.refreshRemainingVotes();
                
                // refresh the element (failure returns false)
                res = this.refreshOption(id);
            }
        }
        return res;
    }
}

let oh;
window.onload = () => {
    const el = document.getElementById("span_remaining-votes");
    oh = new OptionsHandler(el);
};

/*global io*/
// Requires /socket.io/socket.io.js
let socket = io();
let groupName = "";
let GROUPID = "";



////////////////////////////////////////
// All of the server I/O bottom level //
////////////////////////////////////////

// Receives All Options from Server
socket.on('AllOptions', function(names){
    for (let i = 0; i < names.length; i++){
        addNewOption(names[i]);
    }
});

// Notified that an option has been added
socket.on('OptionAdded', function(name){
    addNewOption(name);
});


// Is notified that an option has been removed
socket.on('OptionRemoved', function(name){
    console.log("OptionRemoved: " + name + "\n");
    removeOptionByName(name);
});

// Notified that someone has requested a selection
socket.on('SelectionRequested', function(){
    console.log("SelectionRequested\n");
});

// Notified of the server's selection
socket.on('NewSelection', function(name){
    console.log("NewSelection: " + name + "\n");
});

// Given the weights of the options from the server
socket.on('OptionWeights', function(options){
    console.log("OptionWeights:");
    console.log(options);
    console.log("");
});

// Received a message from the server
socket.on('message', function(msg){
    console.log("Message: " + msg + "\n");
    alert(msg);
});

// Received a status message from the server, like a failed join
socket.on('Status', function(status, msg){
    let str = "Status: " + status + "\nDetails: " + msg;
    console.log(str);
    alert(str);
});

// Successfully joined a group
socket.on('JoinSuccess', function(name, groupId){
    groupName = name;
    GROUPID = groupId;
    alterGroupInURLNoReload(groupId);
    
    console.log("JoinSuccess: " + name + ", " + groupId);
    // Hide the landing
    $("#landing").hide();
    
    $("#site").removeClass("hidden");
    
    document.getElementById("div_title-name").innerHTML = name;
    document.getElementById("div_title-id").innerHTML = "Group ID: " + groupId;
});

////////////////////////////
// End Server I/O low end //
////////////////////////////





//////////////////////////
// Server I/O top level //
//////////////////////////

/** Create the group if it can
 * PARAMS:
 *      groupName: String - The proposed name of the new group
 */
function createGroup(groupName){
    // If it is a valid group name
    if (validateGroupName(groupName)){
        socket.emit('CreateGroup', groupName);
    } else {
        alert("Invalid Group Name");
    }
}

/** Validates a group name
 * PARAMS:
 *      groupName: String - the proposed name for the group
 * RETURNS:
 *      boolean - Whether the group name is valid
 */
function validateGroupName(groupName){
    let valid = true;
    let expectedType = "string";
    
    // If the groupName is a String
    if (typeof groupName === expectedType){
        
        // If the group name, with all leading and trailing spaces removed, is empty
        if(groupName.trim().length == 0){
            
            // invalid length
            valid = false;
        }
            
    } else { // invalid type
        valid = false;
    }
    
    return valid;
}

/** Attempts to join a new group by Id
 * PARAMS:
 *      groupId: String - The Id of the group the socket is trying to join
 */
function joinGroup(groupId){
    if (validateGroupId(groupId)){
        socket.emit("JoinGroup", groupId);
    } else {
        alert("Invalid Group Id");
    }
}

/** Appends a group id to the url without redirecting
 * PARAMS:
 *      groupId: String - The ID of the group the socket is trying to join
 */
/* global history*/
function alterGroupInURLNoReload(groupId){
    if (history){
        // if group id provided
        if (groupId != undefined){
            history.pushState({}, null, window.location.pathname + "?id=" + groupId);
        } else {
            // if group id not provided, remove the group thing
            history.pushState({}, null, window.location.pathname);
        }
    }
}

/** Called once the page has loaded this js file. Tries to join whatever group is in the URL
 */ 
function checkURLForGroup(){
    var str = window.location.search;
    var idStart = str.lastIndexOf("id=");
    if (idStart != -1){
        idStart += 3;
        var idEnd = str.indexOf(";", idStart);
        idEnd = idEnd == -1 ? str.length : idEnd;
        var id = str.substr(idStart, idEnd - idStart);
        
        joinGroup(id);
    }
}

var charSet = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
/** Validates a group Id
 * PARAMS:
 *      groupId: String - The proposed group Id
 * RETURNS:
 *      boolean - Whether the group Id is valid
 */
function validateGroupId(groupId){
    let valid = true;
    let expectedType = "string";
    
    // If the groupId is a string
    if (typeof groupId === expectedType){
        let expectedLength = 4;
        
        // If the Id is the expected length
        if (groupId.length == expectedLength){
            
            // For each character in the groupId
            for (let i = 0; i < expectedLength; i++){
                
                // If the characters aren't in the character set
                if (charSet.indexOf(groupId.charAt(i)) == -1){
                    
                    // then it isn't valid
                    valid = false;
                }
            }
        } else { // invalid length
            valid = false;
        }
    } else { // invalid type
        valid = false;
    }
    
    return valid;
}

function submitNewOption(name){
    if (validateOptionName(name)){
        socket.emit("AddOption",GROUPID, name);
    } else {
        alert("\"" + name + "\" is not a valid option name. Please make sure there are no leading or trailing spaces.")
    }
}

function submitOptionRemoval(name){
    if (validateOptionName(name)){
        socket.emit("RemoveOption", GROUPID, name);
    } else {
        alert("\"" + name + "\" is not a valid option name. Please make sure there are no leading or trailing spaces.")
    }
}

function validateOptionName(name){
    let result = false;
    
    // Validate name
    if (name !== undefined){
        if (name === name.trim()){
            if (name.length > 0){
                result = true;
            }
        } // extra spaces
    } // undefined
    
    return result;
}

//////////////////////////////
// End server I/O top level //
//////////////////////////////





////////
// UI //
////////


function createGroupFormHelper(e){
    // Prevent the redirect
    e.preventDefault();
    
    // Hide modal
    $("#createDialog").modal("hide");
    
    let groupName = $("#createGroupInput")[0].value;
    $("#createGroupInput")[0].value = "";
    createGroup(groupName);
}

function joinGroupFormHelper(e){
    // Prevent the redirect
    e.preventDefault();
    
    // Hide modal
    $("#joinDialog").modal("hide");
    
    let groupId = $("#joinGroupInput")[0].value;
    $("#joinGroupInput")[0].value = "";
    joinGroup(groupId);
}

/* global $*/
$( document ).ready(function() {
    $("#createGroupBtn").on("click", createGroupFormHelper);
    $("#createGroupForm").on("submit", createGroupFormHelper);
    
    
    $("#joinGroupBtn").on("click", joinGroupFormHelper); 
    $("#joinGroupForm").on("submit", joinGroupFormHelper); 
    
    $('#createDialog').on('shown.bs.modal', function() {
        $('#createGroupInput').focus();
    });
   
    $('#joinDialog').on('shown.bs.modal', function() {
        $('#joinGroupInput').focus();
    });
    
    $("#btn_shareGroup").on("click", giveLink);
    
    $("#btn_addOption").on("click", addOptionOnClick);
});

// Pops up a message when you try to exit
window.onbeforeunload = function(){return true};

// Pops up an alert with the correct link
function giveLink(){
    alert(window.location.origin + "/?id=" + GROUPID);
}

/** Adds a new option once it is received from server
 * PARAMS:
 *      name: String - The name of the option
 * RETURNS:
 *      void
 */
function addNewOption(name){
    // make an ID for this option
    let id = optionIdFromName(name);
    
    // if it doesn't already exist
    if (document.querySelector("#" + id) !== undefined){
        let ul = document.getElementById("ul_optionList");
        let mo = document.getElementById("mockOption");
        let cln = mo.cloneNode(true);
        
        cln.id = id;
        
        cln.dataset.name = name;
        
        cln.querySelector(".span_option-name").innerHTML = name;
        
        ul.appendChild(cln);
        
        oh.addOption(id, cln);
        
        oh.refreshRemainingVotes();
    } else {
        // option already exists
    }
 }
 
 /** Makes the id for the option list item based on its name
  */
 function optionIdFromName(name){
     return "option_" + name.toLowerCase();
 }
 
 /** Turns a client side id into a server side id
  * PARAMS:
  *     id : String - The id of the option we are working with
  * RETURNS:
  *     String - The server side id of the option we are working with
  */
 function clientIdToServerId(id){
     let resp = "";
     
     // if it has "option_" at the front
     if (id.length > 7){
         // grab what is after that
         resp = id.substring(7);
     }
     return resp;
 }
 
 /** Searches for an option by its name and then removes it
  * PARAMS:
  *         name : String - The name of the option
  */
function removeOptionByName(name){
    let id = optionIdFromName(name);
    
    let li = document.getElementById(id);
    
    // if it exists
    if (li !== undefined){
     
        // remove from the option handler
        oh.removeOptionById(id);
        
        // Make it disapear
        li.classList.add("deleting");
        
        // Actually get rid of it
        setTimeout(function(){
            li.parentNode.removeChild(li);
        }, 500);
    }
}

/** The onClick for plus and minus buttons
 * PARAMS:
 *      btn - Input Element : The button that was clicked
 *      dv - Integer : The amount by which we want to change the value
 */
function plusMinusOnClick(btn, dv){
    let id = btn.parentNode.id;
    
    oh.voteOnId(id, dv);
    
}



////////////////////////////////////////
// Start OnClick function for buttons //
////////////////////////////////////////

/** The onClick for deleting an option
 * PARAMS:
 *      btn - Input Element : The button that was clicked
 */
function deleteOptionOnClick(btn){
    // This is dependent upon the structure of the DOM tree not changing
    // TODO: Come up with a less volitile way to find the li element
    
    let name = btn.parentNode.parentNode.dataset.name;
    
    // The submit function will do all of the validating
    submitOptionRemoval(name);
}

function addOptionOnClick(){
    let name = window.prompt("Please enter the name of your new option");
    
    // the submit function will do all of the validating
    submitNewOption(name);
}

///////////////////////////
// End OnClick functions //
///////////////////////////




///////////////////////////////
// Last bit before we finish //
///////////////////////////////

checkURLForGroup();