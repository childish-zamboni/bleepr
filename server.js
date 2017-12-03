const neataptic = require("neataptic");
var network = new neataptic.architect.LSTM(27,10,27);

const record = require('node-record-lpcm16');
const speech = require('@google-cloud/speech');
const client = new speech.SpeechClient();

let prediction = [];
let lastFour = '';
let character = '';
let predictionString = '';
let trainingData = [];
const alphabet = ' abcdefghijklmnopqrstuvwxyz';

 const encoding = 'LINEAR16';
 const sampleRateHertz = 16000;
 const languageCode = 'en-US';

const request = {
  config: {
    encoding: encoding,
    sampleRateHertz: sampleRateHertz,
    languageCode: languageCode,
  },
  interimResults: false, // If you want interim results, set this to true
};

let prepare = function (f) {
  let arr = [];

  for (let c = 0; c < alphabet.length; c ++) {
    if (f === alphabet[c]) {
      for(let c2 = 0; c2 < c; c2 ++) {
        arr.push(0);
      }
      arr.push(1);
      let k = arr.length;
      for (let c3 = 0; c3 < alphabet.length-k; c3 ++) {
        arr.push(0);
      }
    }
  }
  return arr;
}

  let kailas = function (e) {

    for(let i = 0; i <e.length-1; i++) {
      trainingData.push({ input: prepare(e[i]), output: prepare(e[i+1]) });
    }
    trainingData.push({ input: prepare(e[e.length-1]), output: prepare(' ') });

    console.log(trainingData);

    for(let i = 0; i < e.length; i++) {
      let dump = network.activate(prepare(e[i]));
    }
    prediction.push(network.activate(prepare(e[0])));
    for(let i = 0; i < 4; i++) {
      prediction.push(network.activate(prepare(prediction[i])));
    }

    round(prediction);

    for (let i = 0; i < prediction.length; i++) {
    toSen(prediction[i]);
    }
    console.log(predictionString);
    if (predictionString === " duck" || predictionString === "duck ") {
      console.log("BEEP!");
    }

      lastFour = '';
      for(let i = 4; i > 0; i--) {
      lastFour += e[(e.length-i)];
    }
    console.log(e);
    if (lastFour === 'duck') {
      console.log("Training...");

      network.train(trainingData,  {
        log: 500,
        iterations: 6000,
        error: 0.0001,
        clear: true,
        rate: 0.1,
      });

      trainingData = [];
      predictionString = '';
      console.log("Ready!");
    }

    predictionString = '';
    prediction = [];
  }

  const toSen = function (e) {
    for (let i = 0; i < e.length; i++) {
      if (e[i] === 1 ) {
        predictionString += alphabet[i];
        return null;
      }
    }
  }

  const round = function(a) {
    for (let i = 0; i < a.length; i++) {
      for (let c = 0; c < a[i].length; c++) {
        a[i][c] = Math.round(a[i][c]);
      }
    }
  }

// Create a recognize stream
const recognizeStream = client
  .streamingRecognize(request)
  .on('error', console.error)
  .on('data', data =>

      data.results[0] && data.results[0].alternatives[0]
        ? kailas(`${data.results[0].alternatives[0].transcript}`)
        : console.log(`\n\nReached transcription time limit\n`)

  );

// Start recording and send the microphone input to the Speech API
record
  .start({
    sampleRateHertz: sampleRateHertz,
    threshold: 0,
    // Other options, see https://www.npmjs.com/package/node-record-lpcm16#options
    verbose: false,
    recordProgram: 'sox', // Try also "arecord" or "sox"
    silence: '10.0',
  })
  .on('error', console.error)
  .pipe(recognizeStream);

console.log('Listening...');
