"use strict";

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
            result = true;
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
    
    $("#btn_addOption").on("click", addOptionOnClick)
});

// Pops up a message
window.onbeforeunload = function(){return true};

function giveLink(){
    alert(window.location.origin + "/?id=" + GROUPID);
}

/** Adds a new option
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
        
        remainingVotes++;
        maxVotes++;
        
        let span_remaining_votes = document.getElementById("span_remaining-votes");
        span_remaining_votes.innerHTML = remainingVotes;
    } else {
        // option already exists
    }
 }
 
 /** Makes the id for the option list item based on its name
  */
 function optionIdFromName(name){
     return "option_" + name.toLowerCase();
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
         
         // Make it disapear
         li.classList.add("deleting");
         
         // Actually get rid of it
         setTimeout(function(){
             li.parentNode.removeChild(li);
         }, 500);
         
         // Adjust the remaining vote count
     }
 }

let remainingVotes = 0;
let maxVotes = 0;

/** The onClick for plus and minus buttons
 * PARAMS:
 *      btn - Input Element : The button that was clicked
 *      dv - Integer : The amount by which we want to change the value
 */
function plusMinusOnClick(btn, dv){
    let li = btn.parentNode;
    let val = li.querySelector(".optionval");
    let newVal = parseInt(val.value, 10) + dv;
    let newVotes = remainingVotes - Math.abs(newVal) + Math.abs(val.value);
    
    if (newVotes >= 0 && newVotes <= maxVotes){
        let span_remaining_votes = document.getElementById("span_remaining-votes");
        val.value = newVal;
        span_remaining_votes.innerHTML = newVotes;
        remainingVotes = newVotes;
    }
    
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