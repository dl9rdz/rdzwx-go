/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

// Wait for the deviceready event before using any of Cordova's device APIs.
// See https://cordova.apache.org/docs/en/latest/cordova/events/events.html#deviceready
document.addEventListener('deviceready', onDeviceReady, false);

// map from sondeid to marker (and path)
var markers = {};
var mypos;
var ready = 0;
var map = null;

function onDeviceReady() {
    // Cordova is now initialized. Have fun!

    console.log('Running cordova-' + cordova.platformId + '@' + cordova.version);

    // Some map tile sources
    var tfapikey = "01be52efbdc14d38beac233a870c8d4f";
    var tfland = L.tileLayer('https://{s}.tile.thunderforest.com/landscape/{z}/{x}/{y}.png?apikey=' + tfapikey, {attribution: '&copy; <a href="http://www.thunderforest.com/">Thunderforest</a>, &copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'}),
    tftrans = L.tileLayer('https://{s}.tile.thunderforest.com/transport/{z}/{x}/{y}.png?apikey=' + tfapikey, {attribution: '&copy; <a href="http://www.thunderforest.com/">Thunderforest</a>, &copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'}),
    tfout = L.tileLayer('https://{s}.tile.thunderforest.com/outdoors/{z}/{x}/{y}.png?apikey=' + tfapikey, {attribution: '&copy; <a href="http://www.thunderforest.com/">Thunderforest</a>, &copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'}),
    tfcycle = L.tileLayer('https://{s}.tile.thunderforest.com/cycle/{z}/{x}/{y}.png?apikey=' + tfapikey, {attribution: '&copy; <a href="http://www.thunderforest.com/">Thunderforest</a>, &copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'}),
    opentopo = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {attribution: 'Kartendaten: &copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap</a>-Mitwirkende, <a href="http://viewfinderpanoramas.org">SRTM</a> | Kartendarstellung: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)'}),
    sat  = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {	attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'}),
    Stamen_TonerHybrid = L.tileLayer('https://stamen-tiles-{s}.a.ssl.fastly.net/toner-hybrid/{z}/{x}/{y}{r}.{ext}', {
	    attribution: 'Map tiles by <a href="http://stamen.com">Stamen Design</a>, <a href="http://creativecommons.org/licenses/by/3.0">CC BY 3.0</a> &mdash; Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
	    subdomains: 'abcd',
	    minZoom: 0,
	    maxZoom: 18,
	    ext: 'png'
    }),
    osm = L.tileLayer('https://{s}.tile.openstreetmap.de/tiles/osmde/{z}/{x}/{y}.png', {
	maxZoom: 20,
	attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    });
    var hybrid = new L.layerGroup([sat, Stamen_TonerHybrid]);

    map = L.map('map', { layers: [osm] } ).setView([48,13],12);

    var baseMaps = {
	"Openstreetmap": osm,
	"Landscape": tfland,
	"Transport": tftrans,
	"Outdoors": tfout,
	"OpenCycleMap": tfcycle,
	"OpenTopoMap" : opentopo,
	"Sat": sat,
	"Hybdir": hybrid,
    };

    var baseMapControl = new L.control.layers(baseMaps, {}, { collapsed: true, position: 'topright' } ).addTo(map);
    baseMaps["Openstreetmap"].addTo(map);
    //map.addEventListener('baselayerchange', function(){ map.fire('click'); });

    L.control.scale({metric: true, imperial: false, position: "bottomright"}).addTo(map);


    //L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    //    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    //}).addTo(map);

    map.locate({setView: true, maxZoom: 16});

    RdzWx.start("testarg", callBack);
    ready = 1;
}

function callBack(arg) {
    var obj;
    try {
        obj = JSON.parse(arg);
    } catch(err) {
        console.log("callBack: JSON error: "+arg+": "+err.message);
	return;
    }
    console.log("callback: "+JSON.stringify(arg));
    if(obj.id) {
       update(obj);
    }
}

function update(obj) {
    console.log("update called");
    if(!ready || !map) {
 	console.log("not ready");
	return;
    }

    var pos = new L.LatLng(obj.lat, obj.lon);
    var marker;
    if(markers[obj.id]) {
      marker = markers[obj.id];
      if(pos.equals(marker.getLatLng())) { console.log("update: position unchanged"); }
      else { marker.path.addLatLng(pos); console.log("update: appending new position"); }
    } else {
      console.log("creating new marker");
      var myIcon = L.icon({
          //iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
	  iconUrl: "img/ballon.png",
          iconSize: [17,22],
          iconAnchor: [9,22],
          popupAnchor: [0,-28],
      });
      marker = new L.marker(pos, {icon: myIcon});
      poly = L.polyline(pos, { opacity: 0.5, color: '#3388ff'} );
      marker.path = poly;
      //marker.on('clock', function() { showMarkerInfoWindow( obj.id, pos) } );
      markers[obj.id] = marker;
      marker.addTo(map);
      poly.addTo(map);
   }
   //var icon = new Icon();
   //marker.set
   marker.setLatLng(pos);
   marker.update();  // necessary?
}
