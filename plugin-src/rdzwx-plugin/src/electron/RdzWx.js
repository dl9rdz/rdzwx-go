//var net = global.require('net');
//var nodecon = global.require('console');
const fs = require("fs")
const el = require("electron")

const net = require('net');
const nodecon = require('console');
const con = new nodecon.Console(process.stdout, process.stderr);

console.log("Running...");
con.log("or what is this");

var rdzhost = "rdzsonde.local";
var rdzport = 14570;

// cordova electron has no keepCallback as of today
// so, start runs runService, which basically adds each event to a queue
// and the callback handler in the web frontend calls get next event after getting each event

var client = null;
var dataqueue =  [];
var successcallback = null;

function doSuccess(data) {
  if(successcallback != null) {
    console.log("Delivering data to successcallback");
    successcallback(data);
    successcallback = null;
  } 
  else {
    console.log("No callback, pushing data to callback queue");
    dataqueue.push(data);
  }
}

function runService(success) {
  console.log("Connecting");
  client = new net.Socket();
  client.connect(rdzport, rdzhost, function() {
    console.log("Connected");
    con.log("Connected...");
    doSuccess('{ "msgtype": "ttgostatus", "state": "online", "ip": "'+client.remoteAddress+'" }' );
  });
  client.on('data', function(data) {
    console.log("Received: "+data);
    doSuccess(data);
  });
  client.on("close", function() {
    // keep on trying
    console.log("Connection closed");
    con.log("Close called......");
    doSuccess('{ "msgtype": "ttgostatus", "state": "offline", "ip": "" }' );
    client = null;
    runService(success);
  });
}

exports.start = function(success, fail, args) {
  console.log("Started");
  runService(success);
  console.log("Running");
}

exports.stop = function(success, fail, args) {
  console.log("Stopped");
  success(true);
}

exports.next = function(args) {
  // if there is anything in the queue, deliver that
  return new Promise((resolve,reject) => {
    var next = dataqueue.shift();
    if(next != undefined) {
      return resolve(next);
    } else {
      this.successcallback = { 
  if(next == undefined) {
    // dataqueue is empty, register for callback as soon as data is received
    console.log("Next is called, dataqueue is empty, setting callback");
    successcallback = success
  } else {
    console.log("Next is called, returning element from data queue");
    return next;
  }
}

exports.closeconn = function(success, fail, args) {
  // TODO. shut down connection. whatever...
}

exports.showmap = function(success, fail, args) {
  // do nothing. TODO. wtf is this?
}

exports.wgstoegm = function(args) {
  // do nothing. TODO
}

export.mdnsUpdateDiscovery = function(success, fail, args) {
    console.log("mdnsUpdateDiscover")
}

//cordova.commandProxy.add('RdzWx', exports);
