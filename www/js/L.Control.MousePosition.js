L.Control.MousePosition = L.Control.extend({
  options: {
    position: 'bottomleft',
    separator: ' : ',
    emptyString: 'Unavailable',
    lngFirst: false,
    numDigits: 5,
    lngFormatter: undefined,
    latFormatter: undefined,
    prefix: ""
  },

  onAdd: function (map) {
    this._container = L.DomUtil.create('div', 'leaflet-control-mouseposition');
    L.DomEvent.disableClickPropagation(this._container);
    map.on('mousemove', this._onMouseMove, this);
    this._container.innerHTML=this.options.emptyString;
    return this._container;
  },

  onRemove: function (map) {
    map.off('mousemove', this._onMouseMove)
  },

  _onMouseMove: function (e) {
    var lng = this.options.lngFormatter ? this.options.lngFormatter(e.latlng.lng) : L.Util.formatNum(e.latlng.lng, this.options.numDigits);
    var lat = this.options.latFormatter ? this.options.latFormatter(e.latlng.lat) : L.Util.formatNum(e.latlng.lat, this.options.numDigits);
    var value = this.options.lngFirst ? lng + this.options.separator + lat : lat + this.options.separator + lng;
    var prefixAndValue = this.options.prefix + ' ' + value;
    //var locator = calcLocator(lat,lng);
    this._container.innerHTML = prefixAndValue; // +  " | " + locator ;
  }

});

L.Map.mergeOptions({
    positionControl: false
});

L.Map.addInitHook(function () {
    if (this.options.positionControl) {
        this.positionControl = new L.Control.MousePosition();
        this.addControl(this.positionControl);
    }
});

L.control.mousePosition = function (options) {
    return new L.Control.MousePosition(options);
};

function calcLocator(lat,lon)
	  {
	    //lon = document.getElementById("longitude").value;
	    //lat = document.getElementById("latitude").value;
	    var locator = "";
      //lat=47.78689;
      //lon=12.98875;
			//lat=47.8093
			//lon=12.9904
			lon=parseFloat(lon);
			lat=parseFloat(lat);
			lat += 90;
			lon += 180;
			locator += String.fromCharCode(65 + Math.floor(lon / 20));
			locator += String.fromCharCode(65 + Math.floor(lat / 10));
			lon = lon % 20;
			if (lon < 0) lon += 20;
			lat = lat % 10;
			if (lat < 0) lat += 10;

			locator += String.fromCharCode(48 + Math.floor(lon / 2));
			locator += String.fromCharCode(48 + Math.floor(lat / 1));
			lon = lon % 2;
			if (lon < 0) lon += 2;
			lat = lat % 1;
			if (lat < 0) lat += 1;

			locator += String.fromCharCode(65 + Math.floor(lon * 12));
			locator += String.fromCharCode(65 + Math.floor(lat * 24));
			lon = lon % ( 1 / 12);
			if (lon < 0) lon +=  1 / 12;
			lat = lat % ( 1 / 24);
			if (lat < 0) lat += 1 / 24;

			locator += String.fromCharCode(48 + Math.floor(lon * 120));
			locator += String.fromCharCode(48 + Math.floor(lat * 240));
			lon = lon % (1 / 120);
			if (lon < 0) lon +=  1 / 120;
			lat = lat %( 1 / 240);
			if (lat < 0) lat += 1 / 240;

			locator += String.fromCharCode(65 + Math.floor(lon * 120 * 24));
			locator += String.fromCharCode(65 + Math.floor(lat * 240 * 24));
			lon = lon % ( 1 / 120 / 24);
			if (lon < 0) lon +=  1 / 120 / 24;
			lat = lat % (1 / 240 / 24);
			if (lat < 0) lat += 1 / 240 / 24;
      if(/[A-Z0-9]{10}/.test(locator))
      return locator;
	  }
