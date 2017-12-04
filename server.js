const neataptic = require("neataptic");
var network = new neataptic.architect.LSTM(27,10,27);

const record = require('node-record-lpcm16');
const speech = require('@google-cloud/speech');
const client = new speech.SpeechClient();

let sentence = '';
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
  interimResults: false,
};

let prepare = function (f) {
  let arr = [];

  for (let c = 0; c < alphabet.length; c++) {
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

    sentence += e;

    for(let i = 0; i <e.length-1; i++) {
      trainingData.push({ input: prepare(e[i]), output: prepare(e[i+1]) });
    }
    trainingData.push({ input: prepare(e[e.length-1]), output: prepare(' ') });

    console.log(trainingData);

    for(let i = 0; i < sentence.length-1; i++) {
      let dump = network.activate(prepare(sentence[i]));
    }

    prediction.push(network.activate(prepare(sentence[sentence.length-1])));

    for(let i = 0; i < 4; i++) {
      prediction.push(network.activate(prediction[prediction.length-1]));
    }

    round(prediction);

    for (let i = 0; i < prediction.length; i++) {
    toSen(prediction[i]);
    }
    console.log(e);
    console.log(predictionString);
    if (predictionString === " duck") {
      console.log("BEEP!");
    }

      lastFour = '';
      for(let i = 4; i > 0; i--) {
      lastFour += e[(e.length-i)];
    }
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
      sentence = '';
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
    verbose: false,
    recordProgram: 'sox',
    silence: '10.0',
  })
  .on('error', console.error)
  .pipe(recognizeStream);

console.log('Listening...');
