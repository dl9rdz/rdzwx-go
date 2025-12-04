/*
 * Copyright (C) Hansi Reiser <dl9rdz@darc.de>
 *
 * SPDX-License-Identifier: Apache-2.0
 */

package de.dl9rdz

import android.location.LocationManager
import android.location.LocationListener
import android.location.Location
import android.location.OnNmeaMessageListener
import android.os.Bundle
import android.Manifest

import android.content.Context
import android.os.Handler
import android.os.Looper
import android.util.Log

import org.apache.cordova.CordovaArgs
import org.apache.cordova.CallbackContext
import org.apache.cordova.CordovaPlugin
import org.apache.cordova.CordovaInterface

import android.net.nsd.NsdManager
import android.net.nsd.NsdServiceInfo
import java.net.InetAddress
import java.net.Socket

import kotlin.concurrent.thread
import android.content.Intent
import android.content.ServiceConnection
//import kotlinx.android.synthetic.main.activity_main.tvResult

import android.content.ComponentName
import android.os.IBinder
//import de.dl9rdz.rdzwx_predict.*
import android.app.Activity
import android.content.res.AssetManager.AssetInputStream
import android.content.res.AssetManager
import java.io.InputStream
import android.os.Build

/* Class with android specific code */

const val SERVICE_TYPE = "_jsonrdz._tcp."

class WgsToEgm {
    private var rdzwx: RdzWx? = null
    private var ais: InputStream? = null
    fun initialize(cordovaPlugin: RdzWx) {
        rdzwx = cordovaPlugin
        try {
            val am = cordovaPlugin.cordova.getActivity().getApplicationContext().getAssets()
            ais = am.open("WW15MGH.DAC", AssetManager.ACCESS_RANDOM)
        } catch (e: Exception) {
            Log.e("de.dl9rdz.rdzwx", e.toString())
        }
    }

    fun stop() {
        ais?.close()
        ais = null
    }

    fun rdgeoid(lat: Int, lon: Int): Int {
        val input = ais
        if (input == null) return Int.MIN_VALUE
        input.reset()
        val pos = ((lat * 1440) + lon) * 2
        input.skip(pos + 0L)
        val b = ByteArray(2)
        input.read(b)
        var res = b[0] * 256 + b[1]
        if (res > 32767) res -= 65536
        //Log.d("rdzwx-plugin", "at lat "+lat+", lon "+lon+": (pos="+pos+"): diff is "+res)
        return res
    }

    fun wgsToEgm(lat: Double, lon: Double): Float {
        if (ais == null) return Float.NaN
        var flat = (90.0 - lat) * 4
        var flon = (if (lon < 0) lon + 360 else lon) * 4
        val ilat: Int = flat.toInt()
        val ilon: Int = flon.toInt()
        flat -= ilat
        flon -= ilon
        val g: Float = (((rdgeoid(ilat, ilon) * (1.0 - flat) + rdgeoid(ilat + 1, ilon) * flat) * (1 - flon) +
                (rdgeoid(ilat, ilon + 1) * (1.0 - flat) + rdgeoid(ilat + 1, ilon + 1) * flat) * flon) * 0.01).toFloat()
        //Log.d("rdzwx-plugin", "return value is "+g.toString())
        return g
    }
}

/*
class PredictHandler {
    var isBound: Boolean = false
    var iRemoteService: IrdzwxPredict? = null
    var rdzwx: RdzWx? = null

    private val mConnection = object : ServiceConnection {
        override fun onServiceConnected(className: ComponentName, service: IBinder) {
            // Following the example above for an AIDL interface,
            // this gets an instance of the IRemoteInterface, which we can use to call on the service
            Log.e("client", "Service connected!")
            iRemoteService = IrdzwxPredict.Stub.asInterface(service)

            val res = iRemoteService?.testPredict(1.0, 2.0)
            Log.e("dl9rdz", "remote result is " + res)
        }

        // Called when the connection with the service disconnects unexpectedly
        override fun onServiceDisconnected(className: ComponentName) {
            Log.e("client", "Service disconnected!")
            iRemoteService = null
        }
    }

    /*
        fun setupPred() {
            Log.e("dl9rdz", "setupPred called")
            val intent = Intent("de.dl9rdz.rdzwx_predict.rdzwxPredictService")
            intent.action = IrdzwxPredict::class.java.name
            bindService(intent, mConnection, Context.BIND_AUTO_CREATE)
            isBound = true
        }
        fun closePred() {
            Log.e("dl9rdz", "closePred called")
            if(!isBound) return
            unbindService(mConnection)
            isBound = false
        }
        override fun onCreate(savedInstanceState: Bundle?) {
            //super.onCreate(savedInstanceState)
            //setContentView(R.layout.activity_main)
            setupPred()
            //btEquals.setOnClickListener {
            //    onPerformAddition()
            //}
        }
    */
    fun performPrediction(lat: Double, lon: Double) {

        val res = if (isBound) {
            val result = iRemoteService?.testPredict(lat, lon)
            result.toString()
        } else {
            "Service not bound!"
        }
        Log.d("dl9rdz-client", "onPerform result is " + res)
    }

    /*
    override fun onDestroy() {
        unbindService()
        super.onDestroy()
    }
*/
    fun initialize(cordovaPlugin: RdzWx) {
        rdzwx = cordovaPlugin
        Log.e("client", "Attempting to bind service")
        val serviceIntent = Intent()
        serviceIntent.setClassName(PACKAGE_NAME, SERVICE_NAME)
        serviceIntent.action = ACTION_REMOTE_BIND
        rdzwx!!.cordova.getActivity().bindService(serviceIntent, mConnection, Context.BIND_AUTO_CREATE)
        isBound = true
    }

    fun stop() {
        if (isBound) {
            // Detach our existing connection.
            rdzwx!!.cordova.getActivity().unbindService(mConnection)
            isBound = false
        }
    }

    companion object {
        @JvmStatic
        val PACKAGE_NAME: String = "de.dl9rdz.rdzwx_predict"

        @JvmStatic
        val SERVICE_NAME: String = "de.dl9rdz.rdzwx_predict.rdzwxPredictService"

        @JvmStatic
        //val ACTION_REMOTE_BIND = "$SERVICE_NAME-remote-bind"
        val ACTION_REMOTE_BIND = "de.dl9rdz.rdzwx_predict.IrdzwxPredict"
    }
}
*/

class GPSHandler {
    private var locationManager: LocationManager? = null
    private var rdzwx: RdzWx? = null

    var permissions: Array<String> = arrayOf(Manifest.permission.ACCESS_COARSE_LOCATION, Manifest.permission.ACCESS_FINE_LOCATION)

    //define the listener
    private val locationListener: LocationListener = object : LocationListener {
        override fun onLocationChanged(location: Location) {
            Log.d(LOG_TAG, ("GPS Location update: " + location.longitude + ":" + location.latitude))
            rdzwx?.updateGps(location.latitude, location.longitude, location.altitude, location.bearing, location.getAccuracy())
        }

        //override fun onStatusChanged(provider: String, status: Int, extras: Bundle) {} @Deprecated
        override fun onProviderEnabled(provider: String) {}
        override fun onProviderDisabled(provider: String) {}
    }


    fun initialize(cordovaPlugin: RdzWx) {
        if (hasPermission(cordovaPlugin.cordova)) {
            setupLocationManager(cordovaPlugin)
        } else {
            cordovaPlugin.cordova.requestPermissions(cordovaPlugin, 0, permissions)
        }
        rdzwx = cordovaPlugin
    }

    fun stop() {
        val cp = rdzwx
        if (cp != null) {
            removeLocationManager(cp)
        }
    }

    fun hasPermission(cordova: CordovaInterface): Boolean {
        for (p in permissions) {
            if (!cordova.hasPermission(p))
                return false
        }
        return true
    }

    private var nmeaListener: Any? = null

    fun setupLocationManager(cordovaPlugin: CordovaPlugin) {
        locationManager = cordovaPlugin.cordova.getActivity().getSystemService(Context.LOCATION_SERVICE) as LocationManager?
        locationManager?.requestLocationUpdates(LocationManager.GPS_PROVIDER, 0L, 0f, locationListener)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            val l = NmeaListener()
            l.initialize(rdzwx, locationManager)
            nmeaListener = l
        }
        //locationManager?.addNmeaListener(nmeaListener)
    }

    fun removeLocationManager(cordovaPlugin: CordovaPlugin) {
        locationManager = cordovaPlugin.cordova.getActivity().getSystemService(Context.LOCATION_SERVICE) as LocationManager?
        locationManager?.removeUpdates(locationListener)
        //locationManager?.removeNmeaListener(nmeaListener)
        if (nmeaListener != null) {
            (nmeaListener as? NmeaListener)?.stop(locationManager)
        }
    }
}


// define the NMEA listener
class NmeaListener : OnNmeaMessageListener {
    private var rdzwx: RdzWx? = null
    private var lastGood: Long = 0

    fun initialize(cordovaPlugin: RdzWx?, locationManager: LocationManager?) {
        rdzwx = cordovaPlugin
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            locationManager?.addNmeaListener(this, Handler(Looper.getMainLooper()))
        } else {
            @Suppress("DEPRECATION")
            locationManager?.addNmeaListener(this)
        }
    }

    fun stop(locationManager: LocationManager?) {
        locationManager?.removeNmeaListener(this)
    }

    override fun onNmeaMessage(message: String, timestamp: Long) {
        //Log.d(LOG_TAG, "Nmea msg:" + message + " TS: " + timestamp.toString())
        if (message.startsWith("\$GPRMC")) {
            if (message.split(",")[2] == "V") { // invalid
                if (lastGood != 0L && timestamp - lastGood > 2000) {
                    Log.d(LOG_TAG, "clearing GPS position")
                    lastGood = 0
                    rdzwx?.updateGps(0.0, 0.0, 0.0, 0.0f, -1.0f)
                }
            } else {
                if (lastGood == 0L) {
                    Log.d(LOG_TAG, "GPS becomes available"); }
                lastGood = timestamp
            }
        }
    }
}


class MDNSHandler {
    private var nsdManager: NsdManager? = null
    private var rdzwx: RdzWx? = null

    fun initialize(cordovaPlugin: RdzWx) {
        nsdManager = cordovaPlugin.cordova.getActivity().getSystemService(Context.NSD_SERVICE) as NsdManager?
        rdzwx = cordovaPlugin
    }

    fun updateDiscovery(mode: String, addr: String?) {
        if(mode == "auto") {
            start();
        } else {
            stop();
            if(!addr.isNullOrEmpty()) {
                try {
                    val (host, port) = addr.split(":").let {
                        val resolvedHost = it[0]
                        val resolvedPort = if (it.size > 1) it[1].toIntOrNull() ?: 14570 else 14570
                        resolvedHost to resolvedPort
                    }
                    val inetAddr = InetAddress.getByName(host)
                    rdzwx?.runJsonRdz(inetAddr, port)
                } catch (e: Exception) {
                    e.printStackTrace()
                    println("Invalid address: $addr")
                }
            }
        }
    }

    fun start() {
        nsdManager?.discoverServices(SERVICE_TYPE, NsdManager.PROTOCOL_DNS_SD, discoveryListener)
    }

    fun stop() {
        try {
            nsdManager?.stopServiceDiscovery(discoveryListener)
        } catch(e: Exception) {
        }
    }

    class MyResolveListener(val rdzwx: RdzWx?) : NsdManager.ResolveListener {
        override fun onResolveFailed(serviceInfo: NsdServiceInfo?, errorCode: Int) {
            Log.d(LOG_TAG, "Resolve failed: $errorCode")
        }

        override fun onServiceResolved(serviceInfo: NsdServiceInfo?) {
            if (serviceInfo == null) {
                Log.d(LOG_TAG, "Resolve succeeded but serviceInfo is null")
                return
            }
            // Inline, no helper function:
            val host =
                if (Build.VERSION.SDK_INT >= 34) {
                    serviceInfo.hostAddresses.firstOrNull()
                } else {
                    @Suppress("DEPRECATION")
                    serviceInfo.host
                }
            Log.d(LOG_TAG, "Resolve suceeded with host $host and port ${serviceInfo.port}")
	    if(host != null) { rdzwx?.runJsonRdz(host, serviceInfo.port) }
        }
    }

    // Instantiate a new DiscoveryListener
    private val discoveryListener = object : NsdManager.DiscoveryListener {

        // Called as soon as service discovery begins.
        override fun onDiscoveryStarted(regType: String) {
            Log.d(LOG_TAG, "Service discovery started")
        }

        override fun onServiceFound(service: NsdServiceInfo) {
            // A service was found! Do something with it.
            Log.d(LOG_TAG, "Service discovery success$service")
            when {
                // If it is not the right type, complain....
                service.serviceType != SERVICE_TYPE ->
                    Log.d(LOG_TAG, "Unknown Service Type: ${service.serviceType}")
                // else lookup host and port
                else ->
                    nsdManager?.resolveService(service, MyResolveListener(rdzwx))
            }
            Log.d(LOG_TAG, "serviceName: ${service.serviceName}  host: ${service.host}, port: ${service.port}")
        }

        override fun onServiceLost(service: NsdServiceInfo) {
            // When the network service is no longer available.
            // Internal bookkeeping code goes here.
            Log.e(LOG_TAG, "service lost: $service")
            // TODO: remove from available devices...
        }

        override fun onDiscoveryStopped(serviceType: String) {
            Log.i(LOG_TAG, "Discovery stopped: $serviceType")
        }

        override fun onStartDiscoveryFailed(serviceType: String, errorCode: Int) {
            Log.e(LOG_TAG, "Discovery failed: Error code:$errorCode")
            nsdManager?.stopServiceDiscovery(this)
        }

        override fun onStopDiscoveryFailed(serviceType: String, errorCode: Int) {
            Log.e(LOG_TAG, "Discovery failed: Error code:$errorCode")
            nsdManager?.stopServiceDiscovery(this)
        }
    }
}

