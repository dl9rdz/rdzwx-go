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
var ready = 0;
var map = null;
var lastObj = { obj: null, pred: null, land: null };
var mypos = {lat: 48.56, lon: 13.43};
//var mypos = {lat: 48.1, lon: 13.1};
var myposMarker = null;

var ballonIcon, landIcon;
var infobox = null;

var checkMark = "&#9989;";
var crossMark = "&#x274C;";

// add "bottom center" to leaflet
(function (L) {
   L.Map.prototype._initControlPos = function(_initControlPos) {
      return function() {
           _initControlPos.apply(this, arguments);  // original function
           this._controlCorners['bottomcenter'] = L.DomUtil.create('div', 'leaflet-bottom leaflet-center',
               L.DomUtil.create('div', 'leaflet-control-bottomcenter', this._controlContainer)
           );
      };
   } (L.Map.prototype._initControlPos);
}(L, this, document));


function onDeviceReady() {
    // Cordova is now initialized. Have fun!

    console.log('Running cordova-' + cordova.platformId + '@' + cordova.version);

    // Some map tile sources
    var tfapikey = "01be52efbdc14d38beac233a870c8d4f";
    var tfland = L.tileLayer('https://{s}.tile.thunderforest.com/landscape/{z}/{x}/{y}.png?apikey=' + tfapikey, {attribution: '&copy; <a href="http://www.thunderforest.com/">Thunderforest</a>, &copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'}),
    tftrans = L.tileLayer('https://{s}.tile.thunderforest.com/transport/{z}/{x}/{y}.png?apikey=' + tfapikey, {attribution: '&copy; <a href="http://www.thunderforest.com/">Thunderforest</a>, &copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'}),
    tfout = L.tileLayer('https://{s}.tile.thunderforest.com/outdoors/{z}/{x}/{y}.png?apikey=' + tfapikey, {attribution: '&copy; <a href="http://www.thunderforest.com/">Thunderforest</a>, &copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'}),
    tfcycle = L.tileLayer('https://{s}.tile.thunderforest.com/cycle/{z}/{x}/{y}.png?apikey=' + tfapikey, {attribution: '&copy; <a href="http://www.thunderforest.com/">Thunderforest</a>, &copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'}),
    tfatlas = L.tileLayer('https://{s}.tile.thunderforest.com/mobile-atlas/{z}/{x}/{y}.png?apikey=' + tfapikey, {attribution: '&copy; <a href="http://www.thunderforest.com/">Thunderforest</a>, &copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'}),
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
	"Atlas": tfatlas,
	"OpenCycleMap": tfcycle,
	"OpenTopoMap" : opentopo,
	"Sat": sat,
	"Hybdir": hybrid,
    };

    var baseMapControl = new L.control.layers(baseMaps, {}, { collapsed: true, position: 'topright' } ).addTo(map);
    baseMaps["Openstreetmap"].addTo(map);
    // not working.......... map.addEventListener('baselayerchange', baseMapControl.collapse() );

    L.control.scale({metric: true, imperial: false, position: "bottomright"}).addTo(map);

    // prediction
    L.easyButton('<span class="target">&target;</span>', function(btn, map) {
        getPrediction();
    }).addTo(map);

    map.locate({setView: true, maxZoom: 16});

    var Infobox = L.Control.extend({
      options: { position: 'bottomcenter' },
   
      onAdd: function(map) {
	var infoContainer = L.DomUtil.create('div', 'leaflet-control-layers leaflet-control');
	var infoBody = L.DomUtil.create('div', 'leaflet-popup-content-wrapper');
	infoContainer.appendChild(infoBody);
	//infoBody.setAttribute('style', 'max-width: 100vw');
	var infoContent = L.DomUtil.create('div', 'leaflet-popup-content infodiv');
	infoBody.appendChild(infoContent);
	var infoCloseButton = L.DomUtil.create('a', 'leaflet-popup-close-button');
	infoContainer.appendChild(infoCloseButton);
	infoCloseButton.innerHTML = 'x';
	infoCloseButton.setAttribute('style', 'cursor: pointer');
	this._infoContainer = infoContainer;
	this._infoBody = infoBody;
	this._infoContentContainer = infoContent;
	this._infoCloseButton = infoCloseButton;
	// Info content layout created here...
	this._infoContentL1 = L.DomUtil.create('div', 'infocontent infocontentl1');
	this._infoContentL2 = L.DomUtil.create('div', 'infocontent infocontentl2');
	this._infoContentL3 = L.DomUtil.create('div', 'infocontent infocontentl3');
	this._infoContentL4 = L.DomUtil.create('div', 'infocontent infocontentl4');
	infoContent.appendChild(this._infoContentL1);
	infoContent.appendChild(this._infoContentL2);
	infoContent.appendChild(this._infoContentL3);
	infoContent.appendChild(this._infoContentL4);
	//infoContent.innerHTML = 'This is the inner content';
	this._hideContent();

	L.DomEvent.disableClickPropagation(infoContainer);
	L.DomEvent.on(infoCloseButton, 'click', L.DomEvent.stop);
	L.DomEvent.on(infoCloseButton, 'click', this._hideContent, this);
/*
	this.setContent("<table style=\"width:100%;\"><tr><td>RS41</td><td style=\"float:right;\">R1234567</td></tr></table>",
                        "<table style=\"width:100%;\"><tr><td>403.012 MHz</td><td style=\"float:right; font-size:0.9em;\">+ 1.2 kHz</td></tr></table>",
      		        "12345m &nbsp; 102.4km/h &nbsp; -12.2m/s", "RSSI -90.5  ||||...EEE||||");
*/
	return infoContainer;
      },
      toggle: function() {
	if(this._contentShown == false) { this._showContent(); } else { this._hideContent(); }
      },
      setContent: function(obj) {
	if(!this._infoContentContainer) return;
 	if(obj.type == null) obj.type = "RS41";  // TODO fix in plugin
        distance = L.latLng(obj).distanceTo(L.latLng(mypos))
        if(distance>9999) { distance = distance.toFixed(0); }
	else { distance = distance.toFixed(1); }
	distance = "d=" + distance + "m";
	l1 = "<table class=\"infotable\"><tr><td class=\"infotd\">" + obj.type + "</td><td class=\"infotdr\">" + obj.ser + "</td></tr></table>";
	l2 = "<table class=\"infotable\"><tr><td class=\"infotd\">" + obj.freq.toFixed(3) + " MHz </td><td class=\"infotdr\" style=\”font-size:0.9em;\">" + (0.001*obj.afc).toFixed(2) + " kHz</td></tr></table>";
	l3 = "<table class=\"infotable\"><tr><td class=\"infotd\">" + obj.alt.toFixed(0) + "m</td><td class=\"infotd\">" + obj.vs + "m/s </td><td class=\"infotdr\">" + (obj.hs*3.6).toFixed(1) + "km/h </td></tr></table>";
	l4 = "<table class=\"infotable\"><tr><td class=\"infotd\">RSSI: " + -0.5*obj.rssi + " </td><td class=\"infotdr\">" + distance + " </td></tr></table>";
	this._infoContentL1.innerHTML = l1;
	this._infoContentL2.innerHTML = l2;
	this._infoContentL3.innerHTML = l3;
	this._infoContentL4.innerHTML = l4;
      },
      _hideContent: function(ev) {
	this._infoBody.style.display = 'none';
	this._infoCloseButton.style.display = 'none';
	this._contentShown = false;
      },
      _showContent: function(ev) {
	this._infoBody.style.display = '';
	this._infoCloseButton.style.display = '';
	this._contentShown = true;
      },
    });
    infobox = new Infobox();
    infobox.addTo(map);
    
    // button to show/hide info box on bottom 
    L.easyButton('<span class="infobutton">i</span>', function(btn, map) {
        infobox.toggle();
    }).addTo(map);

    // fit map to enclosing rectangle of (last pos, own pos)
    L.easyButton('<span class="fitbutton">&#9635;</span>', function(btn, map) {
        // last item
	if(lastObj.obj == null) return;
        // self position
	if(mypos == null) return;
	var items = [ [lastObj.obj.lat, lastObj.obj.lon], [mypos.lat, mypos.lon] ];
	if(lastObj.land) { items.push( lastObj.land.getLatLng() ); }
	b = L.latLngBounds(items);
	map.fitBounds(b);
    }).addTo(map);

    ttgoStatus = L.easyButton( {
      ttgourl: "http://192.168.42.1",
      states: [{ stateName: 'offline',
                 icon:      '<span class="ttgostatus">' + crossMark + '</span>'
		 //, onClick: function(btn, map) { btn.state('online'); }
               },
	       { stateName: 'online',
                 icon:      '<span class="ttgostatus">' + checkMark + '</span>',
		 onClick: function(btn, map) { cordova.InAppBrowser.open(btn.ttgourl, '_blank', "location=yes"); }
	       }
	      ],
      position: "topright"
   });
   ttgoStatus.state('offline');
   ttgoStatus.addTo(map);

	// '<span class="ttgosttus">&#9989;</span>', )

    ballonIcon = L.icon({
	  iconUrl: "img/ballon.png",
          iconSize: [17,22],
          iconAnchor: [9,22],
          popupAnchor: [0,-28]
    });
    landingIcon = L.icon({
	  iconUrl: "img/landing.png",
          iconSize: [24,24],
          iconAnchor: [12,12],
          popupAnchor: [0,0]
    });
    ready = 1;
    RdzWx.start("testarg", callBack);

    // just for testing
    update( {id: "A1234567", lat: 48, lon: 13, alt: 10000, vs: 10, hs: 30, rssi: -90, rxStat: "||||||||||||....", type: "RS41", freq: "400.000", afc: "+1.2", ser: "A1234567"} );
    updateMypos(mypos);
}

function formatParams(params) {
    return '?' + Object.keys(params).map( function(key) {
       return key+"="+encodeURIComponent(params[key])
    }).join('&');
}

// borrowed from wetterson.de/karte .....
function calc_drag(drag,alt){
        if (alt < 1000 ){
            drag = drag * 1;
        } else if (alt < 2000){
            dragfak = (( alt - 1000 ) * ( 0.98 - 1) / ( 2000 - 1000)) + 1;
            drag = drag * dragfak;
        } else if (alt < 3000){
            dragfak = (( alt - 2000 ) * ( 0.95 - 0.98) / ( 3000 - 2000)) + 0.98;
            drag = drag * dragfak;
	} else if (alt < 6000){
            dragfak = (( alt - 3000 ) * ( 0.75 - 0.95) / ( 6000 - 3000)) + 0.95;
            drag = drag * dragfak;
        } else if (alt < 8000){
            dragfak = (( alt - 6000 ) * ( 0.62- 0.75) / ( 8000 - 6000)) + 0.75;
            drag = drag * dragfak;
        } else if (alt < 10000){
            dragfak = (( alt - 8000 )* ( 0.55 - 0.62) / ( 10000 - 8000)) + 0.62;
            drag = drag * dragfak;
        } else if (alt < 20000){
            dragfak = (( alt - 10000 )* ( 0.3 - 0.55) / ( 20000 - 10000)) + 0.55;
            drag = drag * dragfak;
        } else { 
            drag = 5;
        }
        return drag;
}

function getPrediction() {
    TAWHIRI = 'http://predict.cusf.co.uk/api/v1';
    if(lastObj.obj == null) {
        alert("no object available");
        return;
    }
    var tParams = {
        "launch_latitude": lastObj.obj.lat,
        "launch_longitude": lastObj.obj.lon,
        "launch_altitude": lastObj.obj.alt,
        "launch_datetime": new Date().toISOString().split('.')[0] + 'Z',
        "ascent_rate": 5,
        "descent_rate": 5,
        "burst_altitude": lastObj.obj.alt+2,
        "profile": "standard_profile",
    }
    if(lastObj.obj.vs > 0) {
	// still climbing up
      tParams["burst_altitude"] = 35000;
    } else {
      tParams["descent_rate"] = calc_drag( -lastObj.obj.vs, lastObj.obj.alt );
    }
    const xhr = new XMLHttpRequest();
    const url = TAWHIRI + formatParams(tParams);
    xhr.onreadystatechange = function() {
        if(xhr.readyState === 4) { 
	    console.log(xhr.response);
	    var pred = JSON.parse(xhr.response);
            var traj0 = pred.prediction[0].trajectory;  // 0 is ascent, 1 is descent...
            var traj1 = pred.prediction[1].trajectory;  // 0 is ascent, 1 is descent...
	    var latlons = [];
	    traj0.forEach( p => latlons.push( [p.latitude, p.longitude] ) );
	    traj1.forEach( p => latlons.push( [p.latitude, p.longitude] ) );
	    //alert("path: "+JSON.stringify(traj));
      	    poly = L.polyline(latlons, { opacity: 0.5, color: '#EE0000', dashArray: '8, 6'} );
            poly.addTo(map);
	    if( lastObj.pred  ) { lastObj.pred.remove(map); }
            lastObj.pred = poly;
	    if( lastObj.land ) { lastObj.land.remove(map); }
	    lastObj.land = new L.marker(latlons.slice(-1)[0], {icon: landingIcon});
	    lastObj.land.addTo(map);
        }
    }
    xhr.open('GET', url, true);
    xhr.send(null);
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
    if(obj.id || obj.msgtype) {
       update(obj);
    }
}

function updateMypos(obj) {
  mypos = obj;
  var pos = [obj.lat, obj.lon]
  if(myposMarker == null) {
    // create marker
    myposMarker = new L.marker(pos);
    myposMarker.addTo(map);
  } else {
    myposMarker.setLatLng(pos);
    myposMarker.update();
  }
}

function update(obj) {
    console.log("update called");
    if(!ready || !map) {
 	console.log("not ready");
	return;
    }
    if(obj.msgtype) {
	if(obj.msgtype == "ttgostatus") {
	    ttgoStatus.ttgourl = 'http://' + obj.ip;
	    ttgoStatus.state(obj.state)
        }
	if(obj.msgtype == "gps") {
	    updateMypos(obj);
	}
	return;
    }

    lastObj.obj = obj;
    var pos = new L.LatLng(obj.lat, obj.lon);
    var marker;
    var tooltip;
    if(markers[obj.id]) {
      marker = markers[obj.id];
      if(pos.equals(marker.getLatLng())) { console.log("update: position unchanged"); }
      else { marker.path.addLatLng(pos); console.log("update: appending new position"); }
      tooltip = marker.tt;
    } else {
      console.log("creating new marker");
      marker = new L.marker(pos, {icon: ballonIcon});
      poly = L.polyline(pos, { opacity: 0.5, color: '#3388ff'} );
      marker.path = poly;
      //marker.on('clock', function() { showMarkerInfoWindow( obj.id, pos) } );
      markers[obj.id] = marker;
      marker.addTo(map);
      poly.addTo(map);
      tooltip = L.tooltip({ direction: 'right', permanent: true, className: 'sondeTooltip', offset: [10,0], interactive: false, opacity: 0.6 });
      marker.bindTooltip(tooltip);
      marker.tt = tooltip;
   }
   var tt = '<div class="tooltip-container">' + obj.id + '<div class="text-speed tooltip-container">' + obj.alt + 'm '+ obj.vs +'m/s ' + (obj.hs*3.6).toFixed(1) + 'km/h </div></div>';
   tooltip.setContent(tt);
   infobox.setContent(obj);

   marker.setLatLng(pos);
   marker.update();  // necessary?
}

