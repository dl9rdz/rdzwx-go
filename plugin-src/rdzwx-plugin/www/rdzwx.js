var exec = require("cordova/exec");

var RdzWx = {
    start: function(str, callback) {
        exec(callback, function(err) { callback('error: '+err); }, "RdzWx", "start", [str]);
    },
    stop: function(str, callback) {
            exec(callback, function(err) { callback('error: '+err); }, "RdzWx", "stop", [str]);
    },
    closeconn: function(str, callback) {
        exec(callback, function(err) { callback('error: '+err); }, "RdzWx", "closeconn", [str]);
    },
    showmap: function(str, callback) {
        exec(callback, function(err) { callback('error: '+err); }, "RdzWx", "showmap", [str]);
     },
    wgstoegm: function(lat, lon, callback) {
        exec(callback, function(err) { callback('error: '+err); }, "RdzWx", "wgstoegm", [lat, lon]);
     },
    gettile: function(x, y, z, callback, err) {
	console.log("gettile called, executing gettile");
	exec(callback, err, "RdzWx", "gettile", [x, y, z]);
	console.log("gettile called, executing gettile done");
     },
    selstorage: function(str, callback) {
	exec(callback, function(err) { callback('error: '+err); }, "RdzWx", "selstorage", [str]);
     },
    mdnsUpdateDiscovery: function( mode, addr, callback) {
        exec(callback, function(err) { callback('error: '+err); }, "RdzWx", "mdnsUpdateDiscovery", [mode, addr]);
     }

};

module.exports = RdzWx;
