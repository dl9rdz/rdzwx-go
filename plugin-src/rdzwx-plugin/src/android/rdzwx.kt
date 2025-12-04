/*
 * Copyright (C) Hansi Reiser <dl9rdz@darc.de>
 *
 * SPDX-License-Identifier: Apache-2.0
 */

package de.dl9rdz

import android.os.Handler
import android.os.Looper
import android.content.Intent
import android.net.Uri
import android.content.Context
import android.util.Base64
import android.provider.DocumentsContract
import android.app.Activity

import org.apache.cordova.LOG
import org.apache.cordova.CordovaArgs
import org.apache.cordova.CallbackContext
import org.apache.cordova.CordovaPlugin
import org.apache.cordova.CordovaInterface
import org.apache.cordova.CordovaWebView
import org.apache.cordova.PluginResult

import android.net.nsd.NsdManager
import android.net.nsd.NsdServiceInfo
import java.net.InetAddress
import java.net.InetSocketAddress
import java.net.Socket
import java.io.ByteArrayInputStream
import java.io.OutputStream
import kotlin.text.Charsets

import kotlin.concurrent.thread

import java.io.File
import java.io.FileOutputStream
import java.io.FileInputStream
import org.json.JSONObject
import java.io.BufferedInputStream
import java.util.zip.ZipInputStream;

import org.mapsforge.core.graphics.TileBitmap
import org.mapsforge.core.model.LatLong
import org.mapsforge.core.model.Tile
import org.mapsforge.core.util.IOUtils
import org.mapsforge.map.layer.cache.FileSystemTileCache
import org.mapsforge.map.layer.queue.JobQueue
import org.mapsforge.map.layer.renderer.DatabaseRenderer
import org.mapsforge.map.layer.renderer.RendererJob
import org.mapsforge.map.model.DisplayModel
import org.mapsforge.map.model.MapViewPosition
import org.mapsforge.map.reader.MapFile

import org.mapsforge.map.android.graphics.AndroidGraphicFactory

import org.mapsforge.map.rendertheme.rule.RenderThemeFuture
import org.mapsforge.map.rendertheme.XmlRenderTheme
import org.mapsforge.map.rendertheme.InternalRenderTheme
//import org.mapsforge.map.android.rendertheme.AssetsRenderTheme
//import org.mapsforge.map.rendertheme.ExternalRenderTheme
//import org.mapsforge.map.rendertheme.XmlRenderTheme
import org.mapsforge.map.rendertheme.ZipRenderTheme
import org.mapsforge.map.rendertheme.ZipXmlThemeResourceProvider

const val LOG_TAG = "dl9rdz-rdzwx"

// Just for testing
val fakeData: ByteArray =
        "?????????`????a?;S2260991 *120313z4830.24N/01228.21EO076/015/A=090787!ws:!&Clb=7.8m/s 402.300MHz Type=RS41Ì????????`????a?;S2260991 *120314z4830.25N/01228.23EO075/015/A=090812!w;F!&Clb=7.2m/s 402.300MHz Type=RS41Ì????????`????a?;S2260991 *120315z4830.25N/01228.25EO075/016/A=090838!waX!&Clb=8.8m/s 402.300MHz Type=RS41Ì????????`????a?;S2260991 *120316z4830.26N/01228.27EO076/017/A=090868!w0x!&Clb=8.7m/s 402.300MHz Type=RS41Ì????????`????a?;S2260991 *120317z4830.26N/01228.30EO076/017/A=090893!wUH!&Clb=6.9m/s 402.300MHz Type=RS41Ì????????`????a?;S2260991 *120318z4830.27N/01228.32EO075/018/A=090917!w'y!&Clb=7.8m/s 402.300MHz Type=RS41Ì????????`????a?;S2260991 *120319z4830.27N/01228.35EO073/017/A=090945!wVL!&Clb=9.2m/s 402.300MHz Type=RS41Ì????????`????a?;S2260991 *120320z4830.28N/01228.37EO070/016/A=090975!w/m!&Clb=9.2m/s 402.300MHz Type=RS41Ì????????`????a?;S2260991 *120321z4830.28N/01228.40EO067/016/A=091000!wg&!&Clb=6.0m/s 402.300MHz Type=RS41Ì????????`????a?;S2260991 *120322z4830.29N/01228.42EO066/015/A=091021!wF0!&Clb=5.8m/s 402.300MHz Type=RS41Ì????????`????a?;S2260991 *120323z4830.30N/01228.44EO066/015/A=091042!w#1!&Clb=8.3m/s 402.300MHz Type=RS41Ì????????`????a?;S2260991 *120324z4830.30N/01228.46EO068/015/A=091070!wX0!&Clb=8.2m/s 402.300MHz Type=RS41Ì????????`????a?;S2260991 *120325z4830.31N/01228.48EO069/015/A=091095!w24!&Clb=7.3m/s 402.300MHz Type=RS41Ì????????`????a?;S2260991 *120326z4830.31N/01228.50EO068/015/A=091120!wi>!&Clb=8.3m/s 402.300MHz Type=RS41Ì????????`????a?;S2260991 *120327z4830.32N/01228.52EO066/016/A=091149!wEL!&Clb=8.9m/s 402.300MHz Type=RS41Ì????????`????a?;S2260991 *120328z4830.33N/01228.54EO065/016/A=091175!w)\\!&Clb=6.7m/s 402.300MHz Type=RS41Ì????????`????a?;S2260991 *120329z4830.33N/01228.56EO065/017/A=091198!wlr!&Clb=7.0m/s 402.300MHz Type=RS41Ì????????`????a?;S2260991 *120330z4830.34N/01228.59EO066/018/A=091222!wX9!&Clb=7.9m/s 402.300MHz Type=RS41Ì????????`????a?;S2260991 *120331z4830.35N/01228.61EO067/019/A=091245!wBf!&Clb=6.6m/s 402.300MHz Type=RS41Ì????????`????a?;S2260991 *120332z4830.36N/01228.64EO068/019/A=091266!w+D!&Clb=5.7m/s 402.300MHz Type=RS41Ì????????`????a?;S2260991 *120333z4830.36N/01228.67EO067/020/A=091290!wt'!&Clb=7.9m/s 402.300MHz Type=RS41Ì????????`????a?;S2260991 *120334z4830.37N/01228.69EO065/019/A=091314!w``!&Clb=8.5m/s 402.300MHz Type=RS41Ì????????`????a?;S2260991 *120335z4830.38N/01228.72EO062/018/A=091341!wR0!&Clb=7.7m/s 402.300MHz Type=RS41Ì????????`????a?;S2260991 *120336z4830.39N/01228.74EO061/017/A=091366!wHN!&Clb=6.6m/s 402.300MHz Type=RS41Ì????????`????a?;S2260991 *120337z4830.40N/01228.76EO060/016/A=091388!w:^!&Clb=6.2m/s 402.300MHz Type=RS41Ì????????`????a?;S2260991 *120338z4830.41N/01228.78EO062/016/A=091410!w(f!&Clb=7.7m/s 402.300MHz Type=RS41Ì????????`????a?;S2260991 *120339z4830.41N/01228.80EO065/015/A=091434!wil!&Clb=7.9m/s 402.300MHz Type=RS41".toByteArray(Charsets.ISO_8859_1)

class JsonRdzHandler {
    private var running: Boolean = false
    private var tactive: Boolean = false
    private var host: InetAddress? = null
    private var port: Int? = null
    private var rdzwx: RdzWx? = null


    fun initialize(rdzwx: RdzWx) {
        this.rdzwx = rdzwx
        thread { tactive = true; this.run() }
    }

    fun stop() {
        tactive = false
        closeConnection()
    }

    // public methods:
    fun connectTo(host: InetAddress, port: Int) {
        this.host = host
        this.port = port
    }


    // internal private methods
    fun run() {
	var i: Int = 0
        LOG.d(LOG_TAG, "JsonRdz thread is running")
        while (tactive) {
            // if no host/port known: do nothing, retry in a second
            val host = this.host
            val port = this.port
            if (host == null || port == null) {
                if( (i++)%10 == 0 ) { LOG.d(LOG_TAG, "no host/port") }
                Thread.sleep(1000)
                continue
            }
            running = true
            try {
                runConnection(host, port)
            } catch (ex: Exception) {
                LOG.d(LOG_TAG, "Connection closed by exception " + ex.toString())
            }
            rdzwx?.handleTtgoStatus(null)
            running = false
        }
        LOG.d(LOG_TAG, "JsonRdz thread is terminating")
    }

    private var output: OutputStream? = null
    private var sock: Socket? = null

    fun postGpsPosition(latitude: Double, longitude: Double, altitude: Double, bearing: Float, accuracy: Float) {
        val b: ByteArray = ("{\"lat\": " + latitude + " , \"lon\": " + longitude + " , \"alt\": " + altitude +
                " , \"course\": " + bearing + " , \"hdop\": " + accuracy + " }\n").toByteArray(Charsets.ISO_8859_1)
        try {
            output?.write(b)
        } catch (ex: Exception) {
            output = null
        }
    }

    fun postAlive() {
        try {
            output?.write("{\"status\": 1}\n".toByteArray(Charsets.ISO_8859_1))
        } catch (ex: Exception) {
            output = null
        }
        LOG.d(LOG_TAG, "status update")
    }

    private fun runConnection(host: InetAddress, port: Int) {
        LOG.d(LOG_TAG, "Trying to connect!")
        val socket: Socket?
        try {
            socket = Socket()
            socket.connect(InetSocketAddress(host, port), 3000)
        } catch (ex: Exception) {
            Thread.sleep(1000)
            LOG.d(LOG_TAG, "connect failed: " + ex.toString())
            running = false
            return
        }
        sock = socket
        LOG.d(LOG_TAG, "Connected!")
        rdzwx?.handleTtgoStatus(host.getHostAddress())

        val input = socket.getInputStream()
        output = socket.getOutputStream()
        // for testing
        //val input = ByteArrayInputStream(fakeData)

        var buf = byteArrayOf()

        LOG.d(LOG_TAG, "Reading from input stream")

        // new: jsonrdz
        jloop@ while (true) {
            val byte = input.read()
            when (byte) {
                -1 -> break@jloop
                '}'.code -> {
                    buf += byte.toByte(); processFrame(buf); buf = byteArrayOf()
                }
                '\n'.code -> {
                }
                else -> buf += byte.toByte()
            }
        }
        output = null
        socket.close()
    }

    fun closeConnection() {
        try {
            if (running) sock?.close()
        } catch (e: Exception) {
        }
    }

    fun processFrame(data: ByteArray) {
        val s = String(data)
        //LOG.d(LOG_TAG, s)
        rdzwx?.handleJsonrdzData(s)
    }
}

// Always created
// If mapFile is undefined, return "default" tiles
class OfflineTileCache: Thread {
    val cachePath: File
    val mapFile: MapFile
    val mapCachedFile: File
    val tileCache: FileSystemTileCache
    val displayModel: DisplayModel
    val mapViewPosition: MapViewPosition

    val androidGraphicFactory: AndroidGraphicFactory
    var xmlRenderTheme: XmlRenderTheme = InternalRenderTheme.DEFAULT
    val databaseRenderer: DatabaseRenderer
    val jobQueue: JobQueue<RendererJob>
    val rdzwx: RdzWx

    var rtf: RenderThemeFuture

    constructor(activity: Activity, rdzwx: RdzWx, mapFileUri: Uri?, mapThemeUri: Uri?) {
	val context: Context = activity.getApplicationContext()
	this.rdzwx = rdzwx
	LOG.d(LOG_TAG, "Initializing offline tile cache")
	cachePath = context.getExternalFilesDir(null) ?: throw Exception("External files dir not defined")
	LOG.d(LOG_TAG, "cachePath is " + cachePath.toString() )

	AndroidGraphicFactory.createInstance(context)
	AndroidGraphicFactory.clearResourceFileCache();
	androidGraphicFactory = AndroidGraphicFactory.INSTANCE

	//val mFile = File(mapPath, "austria.map")
	//LOG.d(LOG_TAG, "map file name is "+mFile.toString())
	//mapFile = MapFile(mFile)

	DisplayModel.setDeviceScaleFactor(1f)
	DisplayModel.setDefaultUserScaleFactor(1f)
	displayModel = DisplayModel()
	displayModel.setFixedTileSize(256)
	mapViewPosition = MapViewPosition(displayModel)

        jobQueue = JobQueue<RendererJob>(mapViewPosition, displayModel)

	// Open content input stream for map
	if(mapFileUri == null) {
	    mapFile = MapFile.TEST_MAP_FILE
	} else {
            val fis : FileInputStream = activity.getContentResolver().openInputStream(mapFileUri) as FileInputStream
	    mapFile = MapFile(fis)
	}
	mapCachedFile = File(cachePath, "mapcache.ser")
	tileCache = FileSystemTileCache(1000, mapCachedFile, androidGraphicFactory)
	tileCache.purge()

	databaseRenderer = DatabaseRenderer(mapFile, androidGraphicFactory, tileCache, null, true, false, null)

	// Open content input stream for theme
	if(mapThemeUri != null) {
	    try {
	    val zipin = ZipInputStream( BufferedInputStream( activity.getContentResolver().openInputStream(mapThemeUri) ) )
	    val xmlthemes = ZipXmlThemeResourceProvider.scanXmlThemes( zipin )
	    val zipinn = ZipInputStream( BufferedInputStream( activity.getContentResolver().openInputStream(mapThemeUri) ) )
	    xmlRenderTheme = ZipRenderTheme(xmlthemes.get(0), ZipXmlThemeResourceProvider( zipinn) )
	    LOG.d(LOG_TAG, "Setting render theme to "+mapThemeUri)
	    //builder = AlertDialog.Builder(this)
	    } catch(e: Exception) {
		LOG.d(LOG_TAG, "Not setting theme due to exception "+e)
	    }
        }

	rtf = RenderThemeFuture( androidGraphicFactory, xmlRenderTheme, displayModel )
	val t = Thread(rtf)
	t.start()
	LOG.d(LOG_TAG, "Initializing offline tile cache finished")
    }

    //fun setRenderTheme(uri: Uri) {
    //    val zipin = ZipInputStream(BufferedInputStream(FileInputStream(uri)))
    //	xmlRenderTheme = ZipRenderTheme("freizeitkarte-v5/freizeitkarte-v5.xml", ZipXmlThemeResourceProvider(zipin))
    //}

    fun get(x: Int, y: Int, z: Int): String {
      try {
	LOG.d(LOG_TAG, "Getting tile at " + x + " / " + y + " / " + z)
	val tile = Tile(x, y, z.toByte(), 256)
        LOG.d(LOG_TAG, "Executing renderer")
	val rendererJob = RendererJob(tile, mapFile, rtf, displayModel, 1f, false, false)
	val bitmap = databaseRenderer.executeJob(rendererJob)
        LOG.d(LOG_TAG, "Executing renderer done")
	File(cachePath, "MapCache/" + z + "/" + x + "/").mkdirs()
	val cachedTile = File(cachePath, "MapCache/" + z + "/" + x + "/" + y + ".png")
	val outStream = FileOutputStream(cachedTile)
	bitmap.compress(outStream)
	var filePath = cachedTile.getAbsolutePath()
	IOUtils.closeQuietly(outStream)
	LOG.d(LOG_TAG, "Getting tile done, result is in " + filePath)
	return "file://" + filePath.toString();
      } catch(e: Exception) {
        LOG.d(LOG_TAG, "Getting tile: Exception")
        return ""
      }
    }
}


class RdzWx : CordovaPlugin() {
    var running: Boolean = false
    val handler = Handler(Looper.getMainLooper())
    val gpsHandler = GPSHandler()
    val mdnsHandler = MDNSHandler()
    val jsonrdzHandler = JsonRdzHandler()
    //val predictHandler = PredictHandler()
    val wgsToEgm = WgsToEgm()
    var cb: CallbackContext? = null
    var offlineTileCache: OfflineTileCache? = null
    var offlineMap: Uri? = null
    var offlineTheme: Uri? = null

    val runnable: Runnable = run {
        Runnable {
            //LOG.d(LOG_TAG, "Runnable is running - test")
            jsonrdzHandler.postAlive()
            if (running) {
                handler.postDelayed(runnable, 5000)
            }
        }
    }

    fun runJsonRdz(host: InetAddress, port: Int) {
        LOG.d(LOG_TAG, "setting target host for jsonrdz handler")
        jsonrdzHandler.connectTo(host, port)
    }

    fun handleJsonrdzData(data: String) {
        if (cb == null) return
        var d = data
        // looks ugly, but didn't find a easy way to decently parse JSON in Kotlin??
        LOG.d("rdzwx", "data: " + d)
        val latfind = "\"lat\":\\s*([0-9.]+)\\s*,".toRegex().find(data)
        val lat = latfind?.destructured?.component1()
        val lonfind = "\"lon\":\\s*([0-9.]+)\\s*,".toRegex().find(data)
        val lon = lonfind?.destructured?.component1()
        //LOG.d("rdzwx", "found: lat = "+lat+", long = "+lon)
        //LOG.d("rdzwx", "latfind: "+latfind?.value+", lonfind: "+lonfind?.value)
        if (lat != null && lon != null) {
            val w = wgsToEgm.wgsToEgm(lat.toDouble(), lon.toDouble())
            if (!w.isNaN()) {
                d = "{ \"egmdiff\":" + w + ", " + data.substring(1)
            }
        }
        val plugRes = PluginResult(PluginResult.Status.OK, d)
        plugRes.setKeepCallback(true)
        cb?.sendPluginResult(plugRes)
    }

    fun handleTtgoStatus(ip: String?) {
        // ip==null: disconnected; else: connected
        if (cb == null) return
        val status: String
        if (ip == null) status = " { \"msgtype\": \"ttgostatus\", \"state\": \"offline\", \"ip\": \"\" } "
        else status = " { \"msgtype\": \"ttgostatus\", \"state\": \"online\", \"ip\": \"" + ip + "\" } "
        val plugRes = PluginResult(PluginResult.Status.OK, status)
        plugRes.setKeepCallback(true)
        cb?.sendPluginResult(plugRes)
    }

    fun updateGps(latitude: Double, longitude: Double, altitude: Double, bearing: Float, accuracy: Float) {
        jsonrdzHandler.postGpsPosition(latitude, longitude, altitude, bearing, accuracy)
        if (cb == null) return
        val status = "{ \"msgtype\": \"gps\", \"lat\": " + latitude + ", \"lon\": " + longitude +
                ", \"alt\": " + altitude + ", \"dir\": " + bearing + ", \"hdop\": " + accuracy + "}"
        val plugRes = PluginResult(PluginResult.Status.OK, status)
        plugRes.setKeepCallback(true)
        cb?.sendPluginResult(plugRes)
    }

    override fun pluginInitialize() {
        super.pluginInitialize()

        //val context = this.cordova.getActivity().getApplicationContext()
	val sharedPref = this.cordova.getActivity().getPreferences(Context.MODE_PRIVATE) ?: return
	var offlineMapFile = sharedPref.getString("offlineMap", "")
	var offlineMapTheme = sharedPref.getString("offlineTheme", "")
	offlineMap = Uri.parse(offlineMapFile)
	offlineTheme = Uri.parse(offlineMapTheme)
	try {
            offlineTileCache = OfflineTileCache(this.cordova.getActivity(), this, offlineMap, offlineTheme!!)
	} catch(e: Exception) {
	    LOG.e(LOG_TAG, "Cannot create OfflineTileCache: "+e)
	}
	LOG.d(LOG_TAG, "Offline map: "+offlineMapFile+", offline theme: "+offlineMapTheme)
    }

    fun mdnsUpdateDiscovery(mode: String, addr: String?) {
        mdnsHandler.updateDiscovery(mode, addr)
    }

    fun pluginStart() {
        if (running) {
            LOG.d(LOG_TAG, "pluginStart(): already running")
            return
        }
        running = true
        gpsHandler.initialize(this)
        mdnsHandler.initialize(this)
        jsonrdzHandler.initialize(this)
        handler.postDelayed(runnable, 5000)
        //predictHandler.initialize(this)
        wgsToEgm.initialize(this)
        //predictHandler.performPrediction(10.0,10.9)

        // testing
        val data = "{\"res\":1,\"type\":\"RS41\",\"active\":1,\"freq\":402.7,\"id\":\"\",\"ser\":\"\",\"validId\":0,\"launchsite\":\"HH-Sasel        \",\"lat\":12.6,\"lon\":13.5,\"alt\":0,\"vs\":0,\"hs\":0,\"dir\":0,\"sats\":0,\"validPos\":0,\"time\":0,\"sec\":0,\"frame\":0,\"validTime\":0,\"rssi\":246,\"afc\":0,\"launchKT\":0,\"burstKT\":0,\"countKT\":0,\"crefKT\":0}\""
        val latfind = "\"lat\":([0-9.]+),".toRegex().find(data)
        val lat = latfind?.destructured?.component1()
        val lonfind = "\"lon\":([0-9.]+),".toRegex().find(data)
        val lon = lonfind?.destructured?.component1()
        LOG.d("rdzwx", "test: found: lat = " + lat + ", long = " + lon)
    }

    fun pluginStop() {
        if (!running) {
            LOG.d(LOG_TAG, "pluginStop(): already stopped")
            return
        }
        jsonrdzHandler.stop()
        gpsHandler.stop()
        mdnsHandler.stop()
        //predictHandler.stop()
        wgsToEgm.stop()
        running = false
    }

    override fun onStop() {
        LOG.e(LOG_TAG, "onStop")
    }

    override fun onMessage(id: String?, data: Any?): Any? {
        return null
    }

    override fun onRequestPermissionResult(requestCode: Int, permissions: Array<String>, grantResults: IntArray) {
        LOG.d(LOG_TAG, "onRequestPermissionResult called")
        // TODO: Check if this is "GPS permission granted" or something else...
        gpsHandler.setupLocationManager(this)
    }


    override fun execute(action: String, args: CordovaArgs, callbackContext: CallbackContext): Boolean {
        when (action) {
            "start" -> {
                LOG.d(LOG_TAG, "execute: start")
                cb = callbackContext
                pluginStart()
                val plugRes = PluginResult(PluginResult.Status.OK, "{ \"msgtype\": \"pluginstatus\", \"status\": \"OK\"}")
                plugRes.setKeepCallback(true)
                cb?.sendPluginResult(plugRes)
                return true
            }
            "stop" -> {
                LOG.d(LOG_TAG, "execute: stop")
                pluginStop()
                callbackContext.success()
                return true
            }
            "closeconn" -> {
                jsonrdzHandler.closeConnection()
                callbackContext.success()
                return true
            }
            "showmap" -> {
                val intent = Intent(Intent.ACTION_VIEW, Uri.parse(args.getString(0)))
                this.cordova.getActivity().startActivity(intent)
                callbackContext.success()
                return true
            }
	    "mdnsUpdateDiscovery" -> {
                val mode = args.getString(0)
                val addr = args.getString(1)
                mdnsHandler.updateDiscovery(mode, addr)
                callbackContext.success()
                return true
            }
            "wgstoegm" -> {
                val lat = args.getDouble(0)
                val lon = args.getDouble(1)
                val res = wgsToEgm.wgsToEgm(lat, lon)
                callbackContext.success((res * 100).toInt())
                return true
            }
	    "gettile" -> {
		val x = args.getInt(0)
		val y = args.getInt(1)
		val z = args.getInt(2)
		LOG.d(LOG_TAG, "Scheduling offline tile generation on cordova thread pool")
		cordova.getThreadPool().execute( object : Runnable {
		    override fun run() {
			LOG.d(LOG_TAG, "Running runnable for tile generation at "+z+"/"+x+"/"+y)
			val result = JSONObject()
			if ( offlineTileCache == null) {
			    result.put("error", "error")
			} else {
			    val bitmap = offlineTileCache!!.get(x, y, z)
			    LOG.d(LOG_TAG, "Getting offline tile done, bitmap is " + bitmap)
			    result.put("tile", bitmap)
			}
		        callbackContext.success( result )
		    }
		})
		return true
	    }
	    "selstorage" -> {
		LOG.d(LOG_TAG, "calling selstorage")
		val type = args.getString(0)
	 	var itype = 0
		if( type == "theme" ) { itype = 1 }	
		selstorage(itype, callbackContext)
		return true
	    }
            else -> {
                LOG.d(LOG_TAG, "unknown action: " + action)
                return false
            }
        }
    }

    var cbc: CallbackContext? = null
    // select a file (map or theme) (whichfile: 0=map, 1=theme)
    fun selstorage(whichfile: Int, callbackContext: CallbackContext) {
	cbc = callbackContext

	// current approach: select the file for map and theme, not a folder
	// This is old code to select a folder
	//var pickerInitialUri = "file:///sdcard/Android/data/de.dl9rdz/files/"
	//LOG.d(LOG_TAG, "Setting up intent for document tree selection")
	//val intent = Intent(Intent.ACTION_OPEN_DOCUMENT_TREE).apply {
        //    // Optionally, specify a URI for the directory that should be opened in
        //    // the system file picker when it loads.
        //    putExtra(DocumentsContract.EXTRA_INITIAL_URI, pickerInitialUri)
        // }

	LOG.d(LOG_TAG, "Setting up intent for map file selection")
	//val intent = Intent(Intent.ACTION_GET_CONTENT)
	val intent = Intent(Intent.ACTION_OPEN_DOCUMENT)
	intent.addCategory(Intent.CATEGORY_OPENABLE)
	intent.addFlags(Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION)
	intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
	// to allow mulitple files to be selected:
	// intenet.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true)
	intent.setType("*/*")
        cordova.startActivityForResult(this, intent, 12345+whichfile)
    }

    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent) {
	LOG.d(LOG_TAG, "onActivityResult " + requestCode + " / " + resultCode)
	if(requestCode == 12345) {
	    val dir = data.data
	    LOG.d(LOG_TAG, "selected map is "+dir)
            val activity = this.cordova.getActivity()
	    offlineMap = dir
	    if(dir != null) {
	        activity.getContentResolver().takePersistableUriPermission(dir, Intent.FLAG_GRANT_READ_URI_PERMISSION)
                offlineTileCache = OfflineTileCache(activity, this, offlineMap, offlineTheme)
	        cbc!!.success(dir.toString())
	        // Save choice
	        val sharedPref = this.cordova.getActivity().getPreferences(Context.MODE_PRIVATE) ?: return
	        with(sharedPref.edit()) {
		    putString("offlineMap", dir.toString())
		    apply()
	        }
	    }
	} else if (requestCode == 12346) {
	    val themefile = data.data
	    LOG.d(LOG_TAG, "selected theme file is "+themefile)
            val activity = this.cordova.getActivity() // .getApplicationContext()
	    offlineTheme = themefile!!
	    activity.getContentResolver().takePersistableUriPermission(offlineTheme!!, Intent.FLAG_GRANT_READ_URI_PERMISSION)
            offlineTileCache = OfflineTileCache(activity, this, offlineMap, offlineTheme!!)
	    cbc!!.success(themefile.toString())
	    // Save choice
	    val sharedPref = this.cordova.getActivity().getPreferences(Context.MODE_PRIVATE) ?: return
	    with(sharedPref.edit()) {
		putString("offlineTheme", offlineTheme.toString())
		apply()
	    }
	}
    }
}
