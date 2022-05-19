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
/////var lastObj = { obj: null, marker: null, /*no longer used: */pred: null, land: null };
var lastMarker = null;

var mypos = {lat: 48.56, lon: 13.43, hdop: 25, alt: 480};
var myposMarker = null;

var ballonIcon, landIcon, burstIcon;
var infobox = null;

//var checkMark = "&#9989;";
var checkMark = "&#x2714;";
var crossMark = "&#x274C;";

var offlineMap = localStorage.getItem("mapstorage");
if(!offlineMap) offlineMap="file:///sdcard/Android/data/de.dl9rdz.files/";
console.log("Map storage location: "+offlineMap);

// add "top center" and "bottom center" to leaflet
(function (L) {
   L.Map.prototype._initControlPos = function(_initControlPos) {
      return function() {
           _initControlPos.apply(this, arguments);  // original function
           this._controlCorners['bottomcenter'] = L.DomUtil.create('div', 'leaflet-bottom leaflet-center',
               L.DomUtil.create('div', 'leaflet-control-bottomcenter', this._controlContainer)
           );
           this._controlCorners['topcenter'] = L.DomUtil.create('div', 'leaflet-top leaflet-center',
               L.DomUtil.create('div', 'leaflet-control-topcenter', this._controlContainer)
           );
      };
   } (L.Map.prototype._initControlPos);
}(L, this, document));

// Let's add bearing calculation to latLngs...
L.LatLng.prototype.bearingTo = function(target) {
    var lat1 = this.lat * Math.PI / 180;
    var lat2 = target.lat * Math.PI / 180;
    var dLon = (target.lng-this.lng) * Math.PI / 180;
    //console.log("b2: "+lat1+", "+lat2+", "+dLon+" -- "+JSON.stringify(target));

    var y    = Math.sin(dLon) * Math.cos(lat2);
    var x    = Math.cos(lat1)*Math.sin(lat2) - Math.sin(lat1)*Math.cos(lat2)*Math.cos(dLon);

    var bearing = Math.atan2(y, x) * 180 / Math.PI;
    bearing = ( parseInt( bearing ) + 360 ) % 360;
    console.log("bearing : "+x+", "+y+", => "+bearing);
    return bearing;
};



function onDeviceReady() {
    // Cordova is now initialized. Have fun!

    console.log('Running cordova-' + cordova.platformId + '@' + cordova.version);

    // Check for updates
    fetch("https://raw.githubusercontent.com/dl9rdz/rdzwx-go/main/version.json")
    .then(response => response.json())
    .then(data => {
      console.log('Success:', data);
          if(data.version > "1.0.6") {
             if(window.confirm("New version "+ data.version + " available! Download?")) {
		console.log("opening "+data.url);
		cordova.InAppBrowser.open(data.url, "_system");
	     }
	  }
    })
    .catch((error) => {
      console.error('Error:', error);
    });

    // Some map tile sources
    var tfapikey = "01be52efbdc14d38beac233a870c8d4f";
    var tfland = L.tileLayer('https://{s}.tile.thunderforest.com/landscape/{z}/{x}/{y}.png?apikey=' + tfapikey, {attribution: '&copy; <a href="http://www.thunderforest.com/">Thunderforest</a>, &copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'}),
    tftrans = L.tileLayer('https://{s}.tile.thunderforest.com/transport/{z}/{x}/{y}.png?apikey=' + tfapikey, {attribution: '&copy; <a href="http://www.thunderforest.com/">Thunderforest</a>, &copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'}),
    tfout = L.tileLayer('https://{s}.tile.thunderforest.com/outdoors/{z}/{x}/{y}.png?apikey=' + tfapikey, {attribution: '&copy; <a href="http://www.thunderforest.com/">Thunderforest</a>, &copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'}),
    tfcycle = L.tileLayer('https://{s}.tile.thunderforest.com/cycle/{z}/{x}/{y}.png?apikey=' + tfapikey, {attribution: '&copy; <a href="http://www.thunderforest.com/">Thunderforest</a>, &copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'}),
    tfatlas = L.tileLayer('https://{s}.tile.thunderforest.com/mobile-atlas/{z}/{x}/{y}.png?apikey=' + tfapikey, {attribution: '&copy; <a href="http://www.thunderforest.com/">Thunderforest</a>, &copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'}),
    opentopo = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {attribution: 'Kartendaten: &copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap</a>-Mitwirkende, <a href="http://viewfinderpanoramas.org">SRTM</a> | Kartendarstellung: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)'}),
    sat  = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {	attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'})

    L.OfflineTileLayer  = L.TileLayer.extend({
        getTileUrl: function(tilePoint, tile, done) {
	    var tilesrc;
            var z = tilePoint.z, x = tilePoint.x, y = tilePoint.y;
            console.log("Coord: "+x+","+y+","+z);
	    console.log("this: " + this);
	    tile.thethis = this;
            RdzWx.gettile(x, y, z, function(result) {
                if(result.tile) {
                    console.log("gettile: success: " + result.tile);
		    tile.onload = L.Util.bind(tile.thethis._tileOnLoad, this, done, tile);
		    tile.src = result.tile;
		    //done(tile);
                } else {
                    console.log("gettile: success but no tile");
                    tile.src =  "img/MapTileUnavailable.png";
		    done(tile);
                }
            }, function(error) {
                console.log("gettile: error: " + error);
                tile.src = "img/MapTileUnavailable.png";
		done(tile);
            });
	    console.log("getTileUrl returning...");
            //return tilestr;
        },
	createTile: function (coords, done) {
	    var tile = document.createElement('img');

	    //DomEvent.on(tile, 'load', Util.bind(this._tileOnLoad, this, done, tile));
	    //DomEvent.on(tile, 'error', Util.bind(this._tileOnError, this, done, tile));

	    if (this.options.crossOrigin || this.options.crossOrigin === '') {
		    tile.crossOrigin = this.options.crossOrigin === true ? '' : this.options.crossOrigin;
	    }

	    /*
	     Alt tag is set to empty string to keep screen readers from reading URL and for compliance reasons
	     http://www.w3.org/TR/WCAG20-TECHS/H67
	    */
	    tile.alt = '';

	    /*
	     Set role="presentation" to force screen readers to ignore this
	     https://www.w3.org/TR/wai-aria/roles#textalternativecomputation
	    */
	    tile.setAttribute('role', 'presentation');

	    //tile.src = this.getTileUrl(coords);
            this.getTileUrl(coords, tile, done);

	    return tile;
        }
/*
        _loadTile: function(tile, tilePoint) {
            tile._layer = this;
            tile.onload = this._tileOnLoad;
            tile.onerror = this._tileOnError;
            this._adjustTilePoint(tilePoint);
            this.getTileURL(tilePoint, tile);
            this.fire("tileloadstart", { tile: tile, url: tile.src } );
        },
*/
    });
    L.offlineTileLayer = function(url, options) {
        return new L.OfflineTileLayer(url, options);
    };
    var offline = L.offlineTileLayer("http://NOWHERE", {attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors', maxZoom: 22});
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

    map = L.map('map', { layers: [osm], contextmenu: true, zoomControl: false} ).setView([48,13],12);
    var baseMaps = {
	'Offline': offline,
	"Openstreetmap": osm,
	"Landscape": tfland,
	"Transport": tftrans,
	"Outdoors": tfout,
	"Atlas": tfatlas,
	"OpenCycleMap": tfcycle,
	"OpenTopoMap" : opentopo,
	"Sat": sat,
	"Sat/Hybrid": hybrid
    };

    var baseMapControl = new L.control.layers(baseMaps, {}, { collapsed: true, position: 'topright' } ).addTo(map);
    baseMaps["Openstreetmap"].addTo(map);
    // not working.......... map.addEventListener('baselayerchange', baseMapControl.collapse() );

    L.control.scale({metric: true, imperial: false, position: "bottomright"}).addTo(map);

    // main menu
    L.easyButton('<span class="target">&equiv;</span>', function(btn, map) {
        toolbar = L.DomUtil.get("toolbar");
	L.DomUtil.addClass(toolbar, "open");
	toolbarclose = L.DomUtil.get("toolbarclose");
	L.DomEvent.on(toolbarclose, 'click', function(e) {L.DomUtil.removeClass(toolbar, "open")});
    }).addTo(map);

    new L.Control.Zoom({position: "topleft" }).addTo(map);

    // prediction
    tbtn = L.easyButton('<span id="targetbtn" class="target">&target;</span>', function(btn, map) {
        getPrediction();
    }).addTo(map);
    L.DomEvent.on(tbtn.button, 'contextmenu', function(e) { tawhiriCtl.toggle(); } ); 

    map.locate({setView: true, maxZoom: 16});

    var TawhiriCtl = L.Control.extend({
      options: { position: 'bottomcenter' },
      onAdd: function(map) {
        var tawhiriContainer = L.DomUtil.create('div', 'leaflet-control-layers leaflet-control');
        var tawhiriBody = L.DomUtil.create('div', 'leaflet-popup-content-wrapper');
        tawhiriContainer.appendChild(tawhiriBody);
        var tawhiriContent = L.DomUtil.create('div', 'leaflet-popup-content tawhiridiv');
        tawhiriBody.appendChild(tawhiriContent);
	var infoCloseButton = L.DomUtil.create('a', 'leaflet-popup-close-button');
	tawhiriContainer.appendChild(infoCloseButton);
	infoCloseButton.innerHTML = 'x';
	infoCloseButton.setAttribute('style', 'cursor: pointer');
	var infoContent = L.DomUtil.create('div', 'tawhiricontent');
	infoContent.innerHTML = '<h3>Tawhiri prediction parameter</h3><form><table>' +
	  '<tr><td>Ascent rate:</td><td><input type="number" size="5" value="5.0" step="any" id="tawhiri-ascent"></input></td><td>m/s</td></tr>' +
	  '<tr><td>Burst alt:</td><td><input type="number" size="5" value="35000" step="any" id="tawhiri-burst"></input></td><td>m</td></tr>' +
	  '<tr><td>Sea-level descent rate:</td><td><input type="number" size="5" value="5.0" step="any" id="tawhiri-descent"></input></td><td>m/s</td></tr>' +
	  '<tr><td>Use current v<sub>v</sub>:</td><td><input type="checkbox" checked="yes" id="tawhiri-current"></input></td><td></td><tr>' +
	  '<tr><td colspan="3"><p class="tawhirismall">If checked: On ascent: ascent rate := v<sub>v</sub><br>' +
	  'On descent: descent rate := estimate_sea_level(v<sub>v</sub>)</p></td></tr>';
          '</table></form>'+
        tawhiriContent.appendChild(infoContent);
	this._tawhiriBody = tawhiriBody;
	this._infoCloseButton = infoCloseButton;
	this._hideContent();

	L.DomEvent.disableClickPropagation(tawhiriContainer);
	L.DomEvent.on(infoCloseButton, 'click', L.DomEvent.stop);
	L.DomEvent.on(infoCloseButton, 'click', this._hideContent, this);
        return tawhiriContainer;
      },
      toggle: function() {
        if(this._contentShown==false) {  this._showContent();  } else { this._hideContent(); }
      },
      _hideContent: function(ev) {
	this._tawhiriBody.style.display = 'none';
	this._infoCloseButton.style.display = 'none';
	this._contentShown = false;
      },
      _showContent: function(ev) {
	this._tawhiriBody.style.display = '';
	this._infoCloseButton.style.display = '';
	this._contentShown = true;
      },
    })
    tawhiriCtl = new TawhiriCtl();
    tawhiriCtl.addTo(map);


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
	this._icd = 0;
	this._layout = 0;
	this._gpsHeading = 0;
	this._gpsHeadingGood = false;
	return infoContainer;
      },
      toggle: function() {
	if(this._contentShown == false) { this._showContent(); }
	else if (this._layout==0) { this._showCompass(); }
	else { this._hideContent(); }
      },
      setContent: function(obj) {
        //alert(JSON.stringify(obj));
	if(!this._infoContentContainer) return;
 	if(obj.type == null) obj.type = "RS41";  // TODO fix in plugin
	distance = "";
        distance = L.latLng(obj).distanceTo(L.latLng(mypos))
        if(distance>9999) { distance = "d=" + (0.001*distance).toFixed(1) + "km"; }
	else if (distance>99) { distance = "d=" + distance.toFixed(0) + "m"; }
	else { distance = "d=" + distance.toFixed(1) + "m"; }
	sym = "<span class=\"lifenessinfo\">&#x2B24; </span>";
	l1 = "<table class=\"infotable\"><tr><td class=\"infotd\">" + sym + obj.type + "</td><td class=\"infotdr\">" + obj.ser + "</td></tr></table>";
	// normal layout
	if(this._layout==0) {
	  l2 = "<table class=\"infotable\"><tr><td class=\"infotd\">" + (1*obj.freq).toFixed(3) + " MHz </td><td class=\"infotdr\" style=\”font-size:0.9em;\">" + (0.001*obj.afc).toFixed(2) + " kHz</td></tr></table>";
	  l2 += "<table class=\"infotable\"><tr><td class=\"infotd\">" + ll2str(obj.lat,false) + "</td><td class=\"infotdr\">" + ll2str(obj.lon,true) + " </td></tr></table>";
	  l3 = "<table class=\"infotable\"><tr><td class=\"infotd\">" + obj.alt.toFixed(0) + "m</td><td class=\"infotd\">" + obj.vs + "m/s </td><td class=\"infotdr\">" + (obj.hs*3.6).toFixed(1) + "km/h </td></tr></table>";
	  l4 = "<table class=\"infotable\"><tr><td class=\"infotd\">RSSI: " + -0.5*obj.rssi + " </td><td class=\"infotdr\">" + distance + " </td></tr></table>";
	} else {
	  var b =  L.latLng(mypos).bearingTo(L.latLng(obj));
	  l2 = '<table class="infotable"><tr><td><svg width="100" height="110">' + 
	    '<marker id="arrowhead" fill="#f00" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto"> ' +
	    '<polygon points="0 0, 10 3.5, 0 7" />' +
	    '</marker>' +
	    ' <circle cx="50" cy="60" r="40" stroke="black" stroke-width="2" fill="#ffe" /> ' +
   	    '<text x="50" y="14" font-size="smaller" fill="black" dominant-baseline="middle" text-anchor="middle">N</text>' +
   	    '<rect visible=0 id="imgCompDir" x="46" y="12" width="8" height="16" transform="rotate(' + (this._icd) + ',50,60)"/>' +
   	    '<line id="imgToSonde" x1="50" y1="60" x2="50" y2="20" stroke="#f00" stroke-width="2" marker-end="url(#arrowhead)" transform="rotate('
		+ b + ',50,60)" />' +
   	    '<circle id="imgMoveDir" cx="50" cy="20" r="5" stroke="black" stroke-width="1" fill="' + (this._gpsHeadingGood?"yellow":"lightgray") + '" transform="rotate(' + this._gpsHeading + ',50,60)"/> ' +
	    '</svg>  ';
	  l2 += '</td><td class="infotd infomax">';
	  l2 += distance + '<br>';
  	  l2 += '<span class="infocontentl3">'+ obj.alt.toFixed(0) + "m "+obj.vs+'m/s </span><br>';
  	  l2 += '<span class="infocontentl3">'+ (obj.hs*3.6).toFixed(1)+' km/h</span><br>';
	  l2 += 'RSSI: '+ -0.5*obj.rssi + '</td></tr></table>'
	  l3 = "";
	  l4 = "";
	}
	this._infoContentL1.innerHTML = l1;
	this._infoContentL2.innerHTML = l2;
	this._infoContentL3.innerHTML = l3;
	this._infoContentL4.innerHTML = l4;
	this._currentObj = obj;
      },
      setStatus: function(status) {  // 0: rx, 1=to, 2=err, ...
	 L.DomUtil.setClass(this._infoContentL1, "infocontent infocontentl1 infocontent-status"+status);
      },
      _hideContent: function(ev) {
	if(this._layout == 1) { this._hideCompass(); }
	this._infoBody.style.display = 'none';
	this._infoCloseButton.style.display = 'none';
	this._contentShown = false;
      },
      _showContent: function(ev) {
	if(this._layout == 1) { this._hideCompass(); this._layout = 0; }
	this._infoBody.style.display = '';
	this._infoCloseButton.style.display = '';
	this._contentShown = true;
	this.setContent(this._currentObj);
      },
      _hideCompass: function() {
      	window.removeEventListener("deviceorientationabsolute", this._orientationListener); 
      },
      _showCompass: function(ev) {
	if(this._contentShown && this._layout==1) return;
        this._layout = 1
	this._infoBody.style.display = '';
        this._infoCloseButton.style.display = '';
        this._contentShown = true;
	this.setContent(this._currentObj);
	window.addEventListener("deviceorientationabsolute", this._orientationListener, true);
      },
      _orientationListener: function(event) {
        var icd = document.getElementById("imgCompDir");
	if(!icd) return;
	infobox._icd = 360-event.alpha;
        icd.setAttribute("transform","rotate(" + infobox._icd + ",50,60)");
      },
      _updateMypos: function(obj) {
	if(obj.dir>0) { this._gpsHeading = obj.dir; this._gpsHeadingGood = true; } else { this._gpsHeadingGood = false; }
	console.log("update GPS dir: "+obj.dir);
	if(this._contentShown && this._layout==1) {
	  var imd = document.getElementById("imgMoveDir");
	  if(!imd) return;
	  if(this._gpsHeadingGood == false) {
	    imd.setAttribute("fill", "lightgray");
	    imd.setAttribute("transform", "rotate(" + this._gpsHeading + ",50,60)");
	  } else {
	    imd.setAttribute("fill", "yellow");
	    imd.setAttribute("transform", "rotate(" + this._gpsHeading + ",50,60)");
	  }
	  if(obj.hdop<0) { // GPS fix lost
	  } else {
	    var p0 = L.latLng(obj);
	    var p1 = L.latLng(this._currentObj);
	    var b = p0.bearingTo(p1);
	    var d = p0.distanceTo(p1);
	    this._icd = b;
	    //console.log("mypos "+p0+" and sondepos "+p1+": bearing: "+b+", distance: "+d);
	    var icd = document.getElementById("imgToSonde");
	    icd.setAttribute("transform", "rotate(" + b + ",50,60)");
	    // TODO: also update distance to target
	  }
	}
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
	if(lastMarker == null) return;
        // self position
	if(mypos == null) return;
	var items = [ [lastMarker.obj.lat, lastMarker.obj.lon], [mypos.lat, mypos.lon] ];
	if(lastMarker.land) { items.push( lastMarker.land.getLatLng() ); }
	b = L.latLngBounds(items);
	map.fitBounds(b);
    }).addTo(map);

    ttgoStatus = L.easyButton( {
      ttgourl: "http://192.168.42.1",
      states: [{ stateName: 'offline',
                 //icon:      '<span class="ttgostatus">' + crossMark + '</span>'
	 	 icon:      '<img width=24 height=24 src="img/ttgooff.png"/>'
		 , onClick: function(btn, map) { /* just for testing btn.state('online');*/ }
               },
	       { stateName: 'online',
	 	 //icon:      '<span style="color: transparent; text-shadow: 0 0 0 #009900; font-size:15pt" class="ttgostatus">' + checkMark + '</span>',
                 icon:      '<img width=24 height=24 src="img/ttgoon.png"/>',
	 	 onClick: function(btn, map) { 
		   var app = cordova.InAppBrowser.open(btn.ttgourl, '_blank', "location=yes,beforeload=yes");
		   app.addEventListener("loadstart", function(e) {
			if(e.url.startsWith("geo:")) {
			    //alert("external: "+e.url);
			    RdzWx.showmap(e.url, function(){});
			    app.close();
			}
		   });
		 }
	       }
	      ],
      position: "topright"
   });
   ttgoStatus.state('offline');
   ttgoStatus.addTo(map);

    L.control.mousePosition({position: 'bottomleft', emptyString: ''}).addTo(map);


    ballonIcon = L.icon({
	  iconUrl: "img/ballon.png",
          iconSize: [32,32],
          iconAnchor: [16,32],
          popupAnchor: [0,-32]
    });
    landingIcon = L.icon({
	  iconUrl: "img/landing.png",
          iconSize: [24,24],
          iconAnchor: [12,12],
          popupAnchor: [0,0]
    });
    burstIcon = L.icon({
	  iconUrl: "img/pop-marker.png",
          iconSize: [16,16],
          iconAnchor: [8,8],
          popupAnchor: [0,0]
    });
    ready = 1;
    RdzWx.start("testarg", callBack);
    setInterval(periodicStatusCheck, 1000);

    // just for testing
    update( {res: 0, validId: 1, validPos: 127, id: "A1234567", lat: 48.8621, lon: 12.064, alt: 20744, vs: 4.8, hs: 11.0, rssi: -90, rxStat: "||||||||||||....", type: "RS41", freq: "400.000", afc: "+1.2", ser: "A1234567"} );
    var g = localStorage.getItem('lastgps');
    if(g) { mypos = JSON.parse( g ); }
    mypos.hdop = -1;

    // create mypos marker
    myposMarker = new L.marker(mypos, {
	contextmenu: true,
	contextmenuItems: [{
	    text: "Zoom to location",
            callback: function(e) { b=new L.LatLngBounds([myposMarker.getLatLng()]); map.fitBounds(b, {maxZoom: 16}); }
	}]
    });
    myposMarker.addTo(map);
    updateMypos(mypos);
    myposMarker.bindPopup( function(lay) {
       var alt = lay.getLatLng().alt;
       if(!alt) alt = 0;
       return  '<div class="pop-header"><img src="css/images/marker-icon.png"/><h4> Current position </h4></div>' +
	       '<p>Lat: ' + lay.getLatLng().lat.toFixed(5) + '<br>' +
       	       'Lon: ' + lay.getLatLng().lng.toFixed(5) + '<br>' +
	       'Altutide: ' + alt + '</p>' +
	       '<p>HDOP: ' + (lay.hdop>0 ? lay.hdop : 'no GPS fix') + '</p>';
    });

    document.addEventListener("pause", onPause);
    document.addEventListener("resume", onResume);
    document.addEventListener("backbutton", onBackButton);
}

function ll2str(l,islon) {
   var res;
   if(islon) { res = l<0 ? "W":"E"; }
   else { res = l<0 ? "S":"N"; }
   if(l<0) l=-l;
   return res + l.toFixed(5);
}
// so let's try this approach for state management
// -  "back" button on main screen -> close app (state is lost)? 
// -  "pause" event with TTGO connected: keep connection and all running in background, create notification entry
//                  without TTGO connected: stop background thread
// -  "resume" event: if stopped, start background thread
function onPause() {
   if(ttgoStatus.state() == 'offline') {
     console.log("onPause(): TTGO is offline, stopping all activities");
     window.localStorage.setItem('lastgps', JSON.stringify(mypos));
     RdzWx.stop("", function(){});
   } else {
     console.log("onPause(): TTGO is online, keeping activities running in background");
   }
}
function onResume() {
   console.log("onResume()");
   //if(ttgoStatus.state() == 'offline') {
   // if already started (not stopped in onPause()), start will do nothign....
   RdzWx.start("testarg", callBack);
   //}
}
function onBackButton() {
   console.log("onBackButton(): Exit");
   window.localStorage.setItem('lastgps', JSON.stringify(mypos));
   RdzWx.stop("", function(){});
   navigator.app.exitApp();  // note: this will also call onPause()
}

function formatParams(params) {
    return '?' + Object.keys(params).map( function(key) {
       return key+"="+encodeURIComponent(params[key])
    }).join('&');
}

// borrowed from wetterson.de/karte .....
function calc_drag(drag,alt,desc){
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
            drag = desc;
        }
        return drag;
}

function removePrediction(marker) {
  if(marker.pred) { marker.pred.remove(map); }
  if(marker.land) { marker.land.remove(map); }
  if(marker.burst) { marker.burst.remove(map); }
}

function getPrediction(refobj) {
    TAWHIRI = 'http://predict.cusf.co.uk/api/v1';
    if(refobj == null) { refobj = lastMarker; }
    if(refobj == null) {
        alert("no object available");
        return;
    }
    // lookup parameters from form
    var burst = document.getElementById("tawhiri-burst").value;
    if(burst) burst= parseInt(burst); else burst=35000;
    if(refobj.obj.alt > burst) burst = refobj.obj.alt;
    var asc = document.getElementById("tawhiri-ascent").value;
    if(asc) asc=parseFloat(asc); else asc=5.0;
    var desc = document.getElementById("tawhiri-descent").value;
    if(desc) desc=parseFloat(desc); else desc=5.0;
    var usecurrent = document.getElementById("tawhiri-current").checked;
    var lon = refobj.obj.lon;
    if(lon<0) lon+=360;  // tawhiri api needs 0..360

    var tParams = {
        "launch_latitude": refobj.obj.lat,
        "launch_longitude": lon,
        "launch_altitude": refobj.obj.alt.toFixed(1),
        "launch_datetime": new Date().toISOString().split('.')[0] + 'Z',
        "ascent_rate": asc,
        "descent_rate": desc,
        "burst_altitude": (refobj.obj.alt+2).toFixed(1),
        "profile": "standard_profile",
    }
    var vs = refobj.obj.vs;
    if( refobj.vsavg ) {
      vs = refobj.vsavg;
      if(vs*refobj.obj.vs < 0) vs=refobj.obj.vs;
    }
    if(vs > 0) {
	// still climbing up
      tParams["ascent_rate"] = usecurrent ? vs : asc;
      if(burst > refobj.obj.alt+2) { tParams["burst_altitude"] = burst; }
    } else {
      tParams["descent_rate"] = usecurrent ? calc_drag( -vs, refobj.obj.alt, desc ) : desc;
    }
    const xhr = new XMLHttpRequest();
    const url = TAWHIRI + formatParams(tParams);
    xhr.onreadystatechange = function() {
        if(xhr.readyState === 4) { 
	    if( (xhr.status/100)!=2 ) {
		alert("Request failed: "+xhr.statusText);
		return;
	    }
	    var pred = JSON.parse(xhr.response);
            var traj0 = pred.prediction[0].trajectory;  // 0 is ascent, 1 is descent...
            var traj1 = pred.prediction[1].trajectory;  // 0 is ascent, 1 is descent...
	    var latlons = [];
	    traj0.forEach( p => latlons.push( [p.latitude, wrap(p.longitude)] ) );
	    traj1.forEach( p => latlons.push( [p.latitude, wrap(p.longitude)] ) );
	    //alert("path: "+JSON.stringify(traj));
      	    poly = L.polyline(latlons, { opacity: 0.7, color: '#EE0000', dashArray: '8, 6'} );
            poly.addTo(map);
	    if( refobj.pred  ) { refobj.pred.remove(map); }
            refobj.pred = poly;
	    if( refobj.land ) { refobj.land.remove(map); }
	    refobj.land = new L.marker(latlons.slice(-1)[0], {icon: landingIcon,
              contextmenu: true,
              contextmenuItems: [{
	        text: "Zoom to location",
                callback: function(e) { b=new L.LatLngBounds([refobj.land.getLatLng()]); map.fitBounds(b, {maxZoom: 16}); }
              }, {
                separator: true
              }, {
                text: "Export to map app",
                callback: function(e) { ll=refobj.land.getLatLng(); uri="geo:0:0?q="+ll.lat+","+ll.lng+"(X-"+refobj.obj.id+")"; RdzWx.showmap(uri, function(){}); }
              }]
            });
	    refobj.land.addTo(map);

	    if( refobj.burst ) { refobj.burst.remove(map); }
	    if( vs>0 ) { // still climbing, so add burst mark
	       var b = traj0.slice(-1)[0];
	       refobj.burst = new L.marker( [b.latitude, b.longitude], {icon: burstIcon});
               refobj.burst.addTo(map);
            }
	    var lastpt = traj1.splice(-1)[0];
	    lastpt.datetime = new Date(lastpt.datetime).toISOString().split(".")[0] + "Z";
	    var popup = '<div class="pop-header"><img src="img/landing.png"><h4> Landing Point </h4></div>' +
                       '<strong>Time: ' + lastpt.datetime + '</strong><br/>' +
                       '<strong>(' + new Date(lastpt.datetime).toTimeString().split(" (")[0] + ')</strong><br/>' +
                       '<p> Altitude: ' + lastpt.altitude.toFixed(1) + ' m'+ 
                       '</br>Asc. Rate: ' + tParams["ascent_rate"].toFixed(2)  + ' m/s'+
                       '</br>Burst: ' + tParams["burst_altitude"]  + ' m'+
                       '</br>Desc. Rate: ' + tParams["descent_rate"].toFixed(2) + ' m/s</p>' +
                       '';
	    refobj.land.bindPopup(popup);
        }
    }
    xhr.open('GET', url, true);
    xhr.send(null);
}

function callBack(arg) {
    var obj;
    try {
	console.log("callback: "+arg);
        obj = JSON.parse(arg);
    } catch(err) {
        console.log("callBack: JSON error: "+arg+": "+err.message);
	return;
    }
    update(obj);
}

function updateMypos(obj) {
  console.log("updateMypos");
  infobox._updateMypos(obj);
  if(obj.hdop<0) {
    // GPS fix lost
    console.log("gps fix lost");
    if(myposMarker.hdop) myposMarker.hdop = 0;
    if(myposMarker.hdopCircle) {
      map.removeLayer(myposMarker.hdopCircle);
      myposMarker.hdopCircle = null;
    }
    return;
  }
  mypos = obj;
  var pos = [obj.lat, obj.lon, obj.alt];
  myposMarker.setLatLng(pos);
  myposMarker.update();
  if(myposMarker.hdop) {
    myposMarker.hdopCircle.setLatLng(pos)
    if(obj.hdop != myposMarker.hdop) {
      myposMarker.hdopCircle.setRadius(obj.hdop);
      myposMarker.hdop = obj.hdop;
    }
  } else {
    if(obj.hdop) {
      myposMarker.hdopCircle = L.circle(pos, {radius: obj.hdop, dashArray: "2 2" }).addTo(map);
      myposMarker.hdop = obj.hdop;
    }
  }
}

function periodicStatusCheck() {
    now = new Date();
    if( lastMsgTS && (now-lastMsgTS) > 10000 ) {
	// handle connection broken (if still connnected)
	//alert("Closing conn: "+now+" vs "+lastMsgTS);
	console.log("no data for 10 seconds, closing connection to rdzTTGOsonde");
	lastMsgTS = 0;
	RdzWx.closeconn("", function(){});
    }
}

function update(obj) {
    if(!ready || !map) {
 	console.log("not ready");
	return;
    }
    lastMsgTS = new Date();
    if(obj.msgtype) {
	if(obj.msgtype == "ttgostatus") {
	    ttgoStatus.ttgourl = 'http://' + obj.ip;
	    ttgoStatus.state(obj.state)
	    if(obj.state=="offline") { infobox.setStatus(1); }
        }
	if(obj.msgtype == "gps") {
	    updateMypos(obj);
	}
	console.log("update: type="+obj.msgtype);
	return;
    }

    // position update
    //console.log("Pos update: "+JSON.stringify(obj));
    if(obj.egmdiff && obj.alt) { obj.alt -= obj.egmdiff; }
    infobox.setContent(obj);
    infobox.setStatus(obj.res);
    var isValidPos = true;
    if( ((obj.validPos&0x03) != 0x03) || ((obj.validPos&0x80)!=0) ) {   // latitude and longitude are invalid
       isValidPos = false;
    }
    var marker;
    if( (!obj.validId) || (!isValidPos) || (obj.res!=0) ) {
	// no valid pos...
	// res: 1=Timeout, 2=CRC error, 3=unknown, 4=no position
	// Check if it is an object marked "old" from TTGO which we do not yet have on the map
	if( ((obj.validPos&0x3)==0x3) && obj.validId && !markers[obj.id]) {
          console.log("pos update: Adding old TTGO pos: "+JSON.stringify(obj));
    	  marker = createNewMarker(obj);
	  updateMarkerTooltip(marker, obj);
          markers[obj.id] = marker;
	  lastMarker = marker
	} else {
	  console.log("pos update: No valid update: "+JSON.stringify(obj));
	}
        return;
    }
    console.log("pos update: Good update! "+JSON.stringify(obj));
    var pos = new L.LatLng(obj.lat, obj.lon);
    if(markers[obj.id]) {
      marker = markers[obj.id];
      if(pos.equals(marker.getLatLng())) { console.log("update: position unchanged"); }
      else { marker.path.addLatLng(pos); console.log("update: appending new position"); }
      marker.vsavg = 0.9 * marker.vsavg + 0.1 * obj.vs;
    } else {
      marker = createNewMarker(obj);
      markers[obj.id] = marker;
    }
    lastMarker = marker;
    updateMarkerTooltip(marker, obj);
}
function updateMarkerTooltip(marker, obj) {
    var tt = '<div class="tooltip-container">' + obj.id + '<div class="text-speed tooltip-container">' + obj.alt.toFixed(1) + 'm '+ obj.vs +'m/s ' + (obj.hs*3.6).toFixed(1) + 'km/h </div></div>';
    marker.tt.setContent(tt);
    marker.setLatLng( new L.LatLng(obj.lat, obj.lon));
    marker.obj = obj;
    marker.getPopup().update();
    marker.update();
}
function createNewMarker(obj) {
  console.log("creating new marker");
  var pos = new L.LatLng(obj.lat, obj.lon);
  var marker = new L.marker(pos, {icon: ballonIcon,
    contextmenu: true,
    contextmenuItems: [{
      text: "Make prediction",
      callback: function(e) { lastMarker = marker; getPrediction(marker); }
    }, {
      text: "Configure prediction",
      callback: function(e) { tawhiriCtl.toggle(); }
    }, {
      text: "Remove prediction",
      callback: function(e) { removePrediction(marker); }
    }, {
      separator: true
    }, {
      text: "Zoom to location",
      callback: function(e) { b=new L.LatLngBounds([[marker.obj.lat, marker.obj.lon]]); map.fitBounds(b, {maxZoom: 16}); }
    }, {
      separator: true
    }, {
      text: "Export to map app",
      callback: function(e) { uri="geo:0:0?q="+marker.obj.lat+","+marker.obj.lon+"("+marker.obj.id+")"; RdzWx.showmap(uri, function(){}); }
    }, {
      separator: true
    }, {
      text: "Delete item",
      callback: function(e) { deleteMarker(marker); }
    }]
  });
  poly = L.polyline(pos, { opacity: 0.8, color: '#3388ff'} );
  marker.path = poly;
  marker.addTo(map);
  poly.addTo(map);
  var tooltip = L.tooltip({ direction: 'right', permanent: true, className: 'sondeTooltip', offset: [10,-16], interactive: true, opacity: 0.6 });

  marker.bindTooltip(tooltip);
  marker.tt = tooltip;
  marker.vsavg = obj.vs;
  marker.obj = obj;

  marker.bindPopup( function(lay) {
    var alt = lay.getLatLng().alt;
    if(!alt) alt = 0;
    return  '<div class="pop-header"><img src="img/ballon.png"/><h4> ' + lay.obj.id + '</h4></div>' +
      '<p>Serial: '+ lay.obj.ser + '<br>' +
      ''+(new Date(1000*lay.obj.time)).toString().split(" (")[0] + '<br/>' +
      '(' + formathms( new Date().valueOf() / 1000 - lay.obj.time ) + ' ago) <br/>' +
      'Frame #'+lay.obj.frame+', Sats='+lay.obj.sats + '<br/>' +
      'burstKT='+formathms(lay.obj.burstKT)+'<br>launchKT='+formathms(lay.obj.launchKT)+'<br>countdown='+formathms(lay.obj.countKT+lay.obj.crefKT-lay.obj.frame)+'<br/>' +
      '</p>';
 });

  return marker;
}
function formathms(ts) {
  if(typeof ts === "undefined") { return "<undef>"; }
  var h = Math.floor(ts/3600); ts-=h*3600;
  var m = Math.floor(ts/60); ts=Math.floor(ts-m*60);
  return ("0"+h).slice(-2) + ":" + ("0"+m).slice(-2) + ":" + ("0"+ts).slice(-2);
}

function deleteMarker(m) {
  removePrediction(m);
  m.unbindTooltip();
  map.removeLayer(m.path);
  map.removeLayer(m);
  if(m==lastMarker) lastMarker=null;
  delete markers[m.obj.id];
}

function createButton(label, container) {
  var btn = L.DomUtil.create("button", "", container);
  btn.setAttribute("type", "button");
  btn.innerHTML = label;
  return btn;
}
function wrap(lng) {
  if(lng>180) { return lng-360; }
  return lng;
}

// radiosondy.info
function reqauth() {
  var xhr = new XMLHttpRequest();
  xhr.open("POST", "https://radiosondy.info/user/login.php?", true);
  xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
  xhr.onreadystatechange = function() {
    if(http.readyState == 4 && http.satus == 200) {
      alert(http.resonseText);
    }
  }
  xhr.send('submitted=1&username=DL9RDZ&password=ct1jzmhr&Submit=Login');
}
