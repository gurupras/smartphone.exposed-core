/* global moment */
import axios from 'axios'
import fakeDevices from '@/js/fake-devices'

(function () {
  function concat () { // eslint-disable-line no-unused-vars
    var args = Array.prototype.slice.call(arguments)
    for (var idx = 0; idx < args.length; idx++) {
      if (args[idx] !== null && typeof args[idx] === 'object') {
        args[idx] = JSON.stringify(args[idx])
      }
    }
    return args.join(' ')
  }

  var old = console.log
  console.log = function () {
    // var str = concat.apply(this, arguments)
    // AndroidAPI.log('chromium', `[INFO:CONSOLE(43)] "${str}", source: undefined (43)`)
    old.apply(this, arguments)
  }

  const extraFakeDevices = JSON.parse(localStorage.getItem('fakeDeviceIDs') || '{}')

  window.addFakeDevice = (deviceID, key) => {
    const extraFakeDevices = JSON.parse(localStorage.getItem('fakeDeviceIDs') || '{}')
    key = key || `${deviceID['Build>MANUFACTURER'] || deviceID['Build.MANUFACTURER']} ${deviceID.DeviceName.marketName}-${deviceID.IMEI.slice(-5)}`
    const fixedDeviceID = {}
    Object.keys(deviceID).forEach(key => {
      const fixedKey = key.replace('>', '.')
      fixedDeviceID[fixedKey] = deviceID[key]
    })
    fakeDevices[key] = fixedDeviceID
    extraFakeDevices[key] = fixedDeviceID
    localStorage.setItem('fakeDeviceIDs', JSON.stringify(extraFakeDevices))
    return key
  }
  Object.entries(extraFakeDevices).forEach(([key, deviceID]) => window.addFakeDevice(deviceID, key))
})()

function generateTemperatureData () {
  var hours = 1 + Math.floor((Math.random() * 0))
  var startTime = moment(Date.now() - (hours * 60 * 60 * 1000))
  var now = startTime
  var endTime = moment()

  var results = []
  while (endTime.diff(now, 'milliseconds') > 0) {
    now.add(100 + ((250 - 100) * Math.random()), 'ms')
    var temp = 30 + (30 * Math.random())

    results.push({
      timestamp: Number(now.format('x')),
      temperature: temp
    })
  }
  return results
}

var currentExperimentID
// This variable is used by AndroidAPI.*[uU]pload* functions
const uploadData = {}

const AndroidAPI = {
  isFake: localStorage.getItem('isFake') === 'true',
  stockResponse: function () {
    return new Error('Please install the smartphone.exposed app from the PlayStore')
  },
  getFakeDevice () {
    return localStorage.fakeDevice
  },
  getDeviceID: function (callback) {
    const fakeDeviceID = localStorage.getItem('fakeDeviceID')
    var deviceID
    if (fakeDeviceID) {
      deviceID = JSON.parse(fakeDeviceID)
    } else {
      const device = localStorage.getItem('fakeDevice')
      deviceID = fakeDevices[device]
      if (!deviceID) {
        deviceID = {
          'Build.MANUFACTURER': '',
          'Build.DeviceName': {
            deviceName: ''
          }
        }
      }
    }
    callback = callback.replace('{{data}}', JSON.stringify(deviceID))
    eval(callback) // eslint-disable-line no-eval
  },
  getDeviceInfo: function () {
    return JSON.stringify({
      cpus: navigator.hardwareConcurrency
    })
  },
  getCPUBin: function (callback) {
    eval(callback.replace('{{data}}', '{}')) // eslint-disable-line no-eval
  },
  getTemperatureData: function () {
    // return '[]';
    return JSON.stringify(generateTemperatureData())
  },
  toast: function (msg) {
    console.log('TOAST: ' + msg)
  },
  isRootAvailable: function () {
    return false
  },
  isPluggedIn: function () {
    // return false;
    return Math.random() > 0.2
  },
  getBatteryLevel: function () {
    // return 1.0;
    return Math.min(1, 0.7 + Math.random())
  },
  getTemperature: function () {
    return JSON.stringify({
      temperature: 25.0,
      timestamp: Date.now()
    })
  },
  clearLogcat: function () {

  },
  log: function (msg) {
    console.log('AndroidAPI: ' + msg)
  },
  systemTime: function () {
    return Date.now()
  },
  upTime: function () {
    return 1000.0
  },
  sleepForDuration: function (duration) {
    return JSON.stringify({
      last: {
        tempafterSleep: -1
      }
    })
  },
  addChargeStateCallback: function (content) {
    window.csc = setInterval(function () {
      eval(content) // eslint-disable-line no-eval
    }, 1000)
  },
  removeChargeStateCallback: function () {
    if (window.csc) {
      clearInterval(window.csc)
    };
  },
  addScreenStateCallback (content) {
    window.ssc = setInterval(() => {
      eval(content) // eslint-disable-line no-eval
    }, 1000)
  },
  removeScreenStateCallback () {
    clearInterval(window.ssc)
  },
  isScreenOn () {
    return Math.random() > 0.5
  },
  waitUntilAmbientTemperature: function () {
  },
  startMonsoon: function () {
  },

  startExperiment: function () {
    const uuid = ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c =>
      (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16))
    currentExperimentID = uuid
    return uuid
  },
  getStartTemp: function () {
    return 20
  },
  getEndTemp: function () {
    return 32
  },
  getStep: function () {
    return 2
  },
  getNumIterations: function () {
    return 3
  },
  stopMonsoon: function () {
  },
  setURL: function (url) {
    // window.location.href = url
  },
  startUploadData: function () {
    uploadData[currentExperimentID] = ''
    return currentExperimentID
  },
  upload: function (key, chunk) {
    uploadData[key] += chunk
  },
  finishUploadData: function (key) {
  },
  uploadExperimentData: function (origin, endpoint, key) {
    const exptData = JSON.parse(uploadData[key])
    delete uploadData[key]
    exptData.experimentID = currentExperimentID
    exptData.temperatureData = []
    // From DataTrackerService.submit()
    exptData.type = 'expt-data'
    exptData.deviceID = this.getDeviceID()
    axios.post('https://smartphone.exposed/api/upload', JSON.stringify(exptData), {
      headers: {
        'Content-Type': 'application/json'
      }
    }).then(() => {
      console.log(`Upload complete`)
    })
  },
  warmup: function () {
  },
  warmupAsync: function (duration, code) {
    setTimeout(() => {
      eval(code) // eslint-disable-line no-eval
    }, duration)
  },
  isDozeDisabled: function () {
    return true
  },
  showDozeDialog: function () {
  },
  setupTestProgress () {},
  updateTestProgress () {},
  teardownTestProgress () {},
  getBuildVersion () {
    return 0
  },
  mapClocks () { return '{}' },
  updateBackgroundCgroupCPUs () {},
  beforeWarmup () {},
  afterWarmup () {},
  beforeCooldown () {},
  afterCooldown () {},
  beforeWorkload () {},
  afterWorkload () {}
}

export default AndroidAPI
