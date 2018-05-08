import PiWorker from '@/js/workers/pi.worker.js'

/* global AndroidAPI */
function createPiWebWorker () {
  var worker = new PiWorker()
  worker.timeTaken = []
  worker.getTimes = function () {
    return JSON.stringify(worker.timeTaken)
  }
  return worker
}

function PiTest (component, digits) { // eslint-disable-line no-unused-vars
  var test = {}
  test.cooldownDurationMS = 5 * 60 * 1000
  test.numWebWorkers = navigator.hardwareConcurrency
  test.digits = digits || 15000
  test.workers = []
  test.testTimeMS = 7 * 60 * 1000
  test.zeroTime = Date.now()
  test.isRunning = false
  test.startTime = undefined
  test.done = undefined
  test.valid = true
  test.interrupted = false
  test.started = 0
  test.component = component
  // Create workers equal to number of CPU cores

  test.logParameters = function () {
    console.log(JSON.stringify({
      cooldownDurationMS: test.cooldownDurationMS,
      numWebWorkers: test.numWebWorkers,
      digits: test.digits,
      testTimeMS: test.testTimeMS,
      zeroTime: test.zeroTime,
      done: test.done,
      valid: test.valid,
      interrupted: test.interrupted,
      started: test.started
    }))
  }
  __log('# webworkers = ' + test.numWebWorkers)

  test.getResult = function () {
    return {
      digits: test.digits,
      startTime: test.startTime,
      endTime: test.endTime,
      iterations: test.results,
      testTimeMS: test.testTimeMS,
      cooldownDurationMS: test.cooldownDurationMS,
      numWebWorkers: test.numWebWorkers,
      valid: test.valid
    }
  }

  function __log (str, logToAndroid) {
    logToAndroid = logToAndroid || false
    if (logToAndroid) {
      AndroidAPI.log('smartphones-exposed-pi-test.js', str)
    }
    console.log(str)
  }

  /* Real functions */
  function addRealListener (worker) {
    worker.onmessage = function (e) {
      if (e.data.type === 'log') {
        console.log(`worker posted message: ${JSON.stringify(e.data)}`)
        return
      }
      // One runner finished
      test.started--

      var data = e.data
      test.results.push({
        ft: data.endTime,
        tt: round(data.timeTaken / 1e3, 2)
      })

      if (test.interrupted) {
        for (var idx = 0; idx < test.workers.length; idx++) {
          var w = test.workers[idx]
          w.terminate()
        }
        test.component.$emit('interrupt-finished')
        // Test is interrupted. Just return
        return
      }

      // XXX: Right now, we just run the test for test.realTimeMS duration

      var timeElapsed = Date.now() - test.startTime
      if (!test.done && timeElapsed < test.testTimeMS) {
        test.started++
        // console.log('Starting another iteration');
        worker.postMessage({
          cmd: 'CalculatePi',
          value: data.digits
        })
      }

      // Signal that one real worker is done
      // $(test.workers).trigger('worker-done', [e.data, worker])
    }
    worker.onerror = function (e) {
      alert('Error: Line ' + e.lineno + ' in ' + e.filename + ': ' + e.message)
    }
  }

  function mean (list) { // eslint-disable-line no-unused-vars
    var sum = 0.0
    for (var i = 0; i < list.length; i++) {
      sum += list[i]
    }
    return sum / list.length
  }

  function median (list) { // eslint-disable-line no-unused-vars
    // list.sort((a, b) => a - b);
    list.sort()
    var lowMiddle = Math.floor((list.length - 1) / 2)
    var highMiddle = Math.ceil((list.length - 1) / 2)
    var median = (list[lowMiddle] + list[highMiddle]) / 2
    return median
  }

  function round (value, exp) {
    if (typeof exp === 'undefined' || +exp === 0) { return Math.round(value) }

    value = +value
    exp = +exp

    if (isNaN(value) || !(typeof exp === 'number' && exp % 1 === 0)) { return NaN }

    // Shift
    value = value.toString().split('e')
    value = Math.round(+(value[0] + 'e' + (value[1] ? (+value[1] + exp) : exp)))

    // Shift back
    value = value.toString().split('e')
    return +(value[0] + 'e' + (value[1] ? (+value[1] - exp) : -exp))
  }

  // This is the core function that is exposed externally
  test.run = function () {
    test.isRunning = true
    test.results = []
    test.startTime = Date.now()

    // _run(addRealListener, setupRealEventHandlers, test.digits);
    for (var i = 0; i < test.numWebWorkers; i++) {
      var worker = createPiWebWorker()
      worker.id = `worker-${i}`
      addRealListener(worker)
      test.workers[i] = worker
    }

    __log('Running test')
    test.started = 0
    // Launch number of web workers specified by numWebWorkers
    for (i = 0; i < test.numWebWorkers; i++) {
      // start the worker
      test.started++
      test.workers[i].postMessage({
        cmd: 'CalculatePi',
        value: test.digits
      })
    }

    var interval = setInterval(function () {
      var now = Date.now()
      var timeElapsed = now - test.startTime
      if (timeElapsed > test.testTimeMS) {
        // console.log(`timeElapsed(${timeElapsed}) >  test.testTimeMS(${test.testTimeMS})`)
        test.done = true
        test.endTime = Date.now()
        console.log('Finishing test..remaining: ' + test.started)
        // __log(JSON.stringify(getResult()));
        for (var idx = 0; idx < test.workers.length; idx++) {
          var w = test.workers[idx]
          w.terminate()
        }
        // This is the end of the test
        console.log('Done!')
        test.component.$emit('test-finished')
        clearInterval(interval)
      }
    }, 300)
  }

  test.interrupt = function () {
    if (test.isRunning) {
      test.interrupted = true
    } else {
      // The test isn't running yet. Just fire interrupt-finished
      test.component.$emit('interrupt-finished')
    }
  }

  test.setValid = function (bool) {
    test.valid = bool
  }

  test.getTestObj = function () {
    return test
  }

  return test
}

export default PiTest