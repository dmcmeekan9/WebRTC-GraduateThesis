'use strict';
// Global/Function Scoped
var localVideo;
var remoteVideo;
var uuid;
var serverConnection;

let sendChannel;
let receiveChannel;

// Implementing Delay Variables
var delayTime;
var delay;
var data;
var received = false;
const dataChannelSend = document.querySelector('textarea#dataChannelSend');
const dataChannelReceive = document.querySelector('textarea#dataChannelReceive');

var randomDelay;                                         //Prevention Method

let bitrate;
let jitter;
let RTT;
let framesPer;

/*****************************************************************/
let inputBuffer = new Array(5);                          // Size of Input Buffer
let outputBuffer = new Array(inputBuffer.length);        // Output Match Input

var x = 0;                                               // inputBuffer
var y = 0;                                               // outputBuffer
var firstSet = 0;                                        // firstSet of Input & Output Rates
var e = 0;                                               // error Count
var c = 0;                                               // Count when Calculating Error

var inputRate = 4000;                                    // Beginning Input Rate

var outputRate = inputRate + (inputRate / 2);            // Beginning Output Rate
var t = inputRate;                                       // Input Rate Variable
var statRate = 850;                                      // statRate
let multiplyRate = 1;                                    // Increment Rate
var prevIn;                                              // Previous Input Rate
var currIn;                                              // Current Input Rate 
var current = 0;                                         // Determing Current Input Rate
var online;                                              // Connection is Online/Offline
var inputOccured;                                        // Input Has Begun

var ccBandwidth = (1/t) * 1000;                          // Covert Channel Bandwidth
// The number of bits the covert channel can send per second

var i;
for (i = 0; i < inputBuffer.length; i++){
   //inputBuffer[i] = 1;
   //*/
   var random = Math.random();
   if(random > 0.5){
      inputBuffer[i] = 1;
   }
   else if(random < 0.5){
      inputBuffer[i] = 0;
   }
   //*/
}

/****************************************************************/

// Image Filtering
var inputCanvas = document.getElementById('inputCanvas').getContext( '2d' );
const outputStream = document.getElementById('inputCanvas').captureStream();
var width = 640;
var height = 360;

// Block Scoped
let localPeerConnection;
let remotePeerConnection;
let localStream;
let bytesPrev;
let jitterPrev;
let timestampPrev;

// Format Get User Media
const getUserMediaConstraintsDiv = document.querySelector('div#getUserMediaConstraints');

// Display Bitrate, Jitter, RTT, BitPattern, Error Rate, inputBuffer length, and //////////////COVERT CHANNEL BANDWITH???
const bitrateDiv = document.querySelector('div#bitrate');
const jitterDiv = document.querySelector('div#jitter');
const rttDiv = document.querySelector('div#RTT');
const frameDiv = document.querySelector('div#frames');
const errorRateDiv = document.querySelector('div#errorRate');
const inputBufferDiv = document.querySelector('div#inputBuffer');
const ccBandwidthDiv = document.querySelector('div#ccBandwidth');
ccBandwidthDiv.innerHTML = `<strong>Covert Channel Bandwidth: </strong>${ccBandwidth}`;
inputBufferDiv.innerHTML = `Sending/Receiving <strong>${inputBuffer.length}</strong> bits`;
                                                         // Sending X Number of Bits

// Formatting Statistics 
const peerDiv = document.querySelector('div#peer');
const senderStatsDiv = document.querySelector('div#senderStats');
const receiverStatsDiv = document.querySelector('div#receiverStats');

// Formatting Buttons
const getMediaButton = document.querySelector('button#getMedia');
const connectButton = document.querySelector('button#connect');
const hangupButton = document.querySelector('button#hangup');

// Buttons to Get Media, Connect, and Hangup, and Send Data
getMediaButton.onclick = getMedia;
connectButton.onclick = createPeerConnection;
hangupButton.onclick = hangup;

// Establish Peer Connection
var peerConnectionConfig = {
   'iceServers': [
      {'urls': 'stun:stun.stunprotocol.org:3478'},
      {'urls': 'stun:stun.l.google.com:19302'},
   ]
};

// Stop Peer Connection (Hangup)
function hangup() {
   console.log('Ending call');
   localPeerConnection.close();
   remotePeerConnection.close();

   // Query stats One Last Time.
   Promise
      .all([
         remotePeerConnection
            .getStats(null)
            .then(calcStats, err => console.log(err))
      ])
      .then(() => {
         localPeerConnection = null;
         remotePeerConnection = null;
       });

   // Receive all Tracks
   localStream.getTracks().forEach(track => track.stop());
   localStream = null;

   // Disable Buttons
   hangupButton.disabled = true;
   getMediaButton.disabled = false;
}

// On Media Success, Create Stream
function getUserMediaSuccess(stream) {
   connectButton.disabled = false;
   console.log('GetUserMedia succeeded');
   
   localStream = stream;
   localVideo.srcObject = stream;

   drawToCanvas();
}

// Acquire Media from Client
function getMedia() {
   getMediaButton.disabled = true;
   localVideo = document.getElementById('localVideo');
   remoteVideo = document.getElementById('remoteVideo');

   if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      const videoTracks = localStream.getVideoTracks();
      for (let i = 0; i !== videoTracks.length; ++i) {
         videoTracks[i].stop();
      }
   }
   
   var constraints = {
      video: true,
      audio: true
   }
   
   navigator.mediaDevices.getUserMedia(constraints)
      .then(getUserMediaSuccess)
      .catch(e => {
         const message = `getUserMedia error: ${e.name}\nPermissionDeniedError may mean invalid constraints.`;
         alert(message);
         console.log(message);
         getMediaButton.disabled = false;
      });
}

// Create Peer Connection
function createPeerConnection() {
   connectButton.disabled = true;
   hangupButton.disabled = false;

   bytesPrev = 0;
   timestampPrev = 0;
   localPeerConnection = new RTCPeerConnection(null);
   remotePeerConnection = new RTCPeerConnection(null);


   // Acquire the outputCanvas's Video Stream, which will then be brought into the Remote Stream
   localStream = outputStream; 
   localStream.getTracks().forEach(track => localPeerConnection.addTrack(track, localStream));

   // Prevention Method       ********************************** One Area to Try for Testing
   // Simulates a Consistent Delay on the Server Side
   //setTimeout(pause, 500);

   console.log('localPeerConnection creating offer');
   localPeerConnection.onnegotiationeeded = () => console.log('Negotiation needed - localPeerConnection');
   remotePeerConnection.onnegotiationeeded = () => console.log('Negotiation needed - remotePeerConnection');
   localPeerConnection.onicecandidate = e => {
      console.log('Candidate localPeerConnection');
   remotePeerConnection
      .addIceCandidate(e.candidate)
      .then(onAddIceCandidateSuccess, onAddIceCandidateError);
   };

   remotePeerConnection.onicecandidate = e => {
      console.log('Candidate remotePeerConnection');
      localPeerConnection
         .addIceCandidate(e.candidate)
         .then(onAddIceCandidateSuccess, onAddIceCandidateError);
   };

   remotePeerConnection.ontrack = e => {
      if (remoteVideo.srcObject !== e.streams[0]) {
         console.log('remotePeerConnection got stream');
         remoteVideo.srcObject = e.streams[0];
      }
   };
    
   localPeerConnection.createOffer().then(
      desc => {
         console.log('localPeerConnection offering');
         localPeerConnection.setLocalDescription(desc);
         remotePeerConnection.setRemoteDescription(desc);
         remotePeerConnection.createAnswer().then(
            desc2 => {
               console.log('remotePeerConnection answering');
               remotePeerConnection.setLocalDescription(desc2);
               localPeerConnection.setRemoteDescription(desc2);
            },
               err => console.log(err)
         );
      },
         err => console.log(err)
   );
}

function preventionMethod(){
   //if (bitrate > 1000){
      // Works to prevent 0's
      //randomDelay = Math.floor(Math.random() * 15000000) + 7500000;   
   //}
   //else {
      // Works to prevent 1's
      randomDelay = Math.floor(Math.random() * 10000) + 1000;
   //}
   //console.log(randomDelay);
   //setTimeout(randomDelay);
}

// Draw to Canvas (Possible Pixel Manipulation)
function drawToCanvas() {
   // Draw Video from Input Canvas
   inputCanvas.drawImage( localVideo, 0, 0, width, height );

   data = dataChannelSend.value;
   //console.log('Sent Data: ' + data);

   if (data == 1){
      delayTime = 100;
      setTimeout(pause, 3000);
   }
   else if (data == 0){
      delayTime = 5;
      setTimeout(pause, 3000);
   }
   else{
      clearTimeout(fx);
   }

   // Prevention Method    **********************************
   // Simulates a Consistent Delay on the Sending Side of each Client
   //setTimeout(pause, randomDelay);

   delay = setTimeout(drawDelay, delayTime);
}

function drawDelay(){
   requestAnimationFrame( drawToCanvas );
}

function pause(){
   //console.log("Paused");
}

function input(){
   if (x == inputBuffer.length){
      return;
   }
   dataChannelSend.value = inputBuffer[x];
   console.log(randomDelay);
   console.log("inputBuffer: " + inputBuffer[x]);
   x++;
}

function output(){
   outputBuffer[y] = dataChannelReceive.value;
   if (y == inputBuffer.length){
      return;
   }
   console.log(randomDelay);
   console.log("outputBuffer: " + outputBuffer[y]);
   y++;
}

// Calc Error when Output Buffer is Full
function calcError(){
   let errorRate;
   for (c; c < inputBuffer.length; c++){
      console.log("in loop input: " + inputBuffer[c]);
      console.log("in loop output: " + outputBuffer[c]);
      if (inputBuffer[c] != outputBuffer[c]){
         e++;
         console.log("Error Count: " + e);
      }
      else if (outputBuffer[c] == null || outputBuffer[c] == ""){
         e++;
         console.log("Error Count: " + e);
      }
   }
   errorRate = (e / inputBuffer.length) * 100;
   //error.toFixed(2) below for 2 decimal places
   errorRateDiv.innerHTML = `<strong>Error Rate: </strong>${errorRate}%`;
}

// Mozilla API Calls
function getRandomInt(max) {
   return Math.floor(Math.random() * Math.floor(max));
}

// Ice Canidate Success
function onAddIceCandidateSuccess() {
   console.log('AddIceCandidate success.');
}

// Ice Canidate Failure
function onAddIceCandidateError(error) {
   console.log(`Failed to add Ice Candidate: ${error.toString()}`);
}

// Calculate Video Bitrate, Jitter, and Network Latency (RTT)
function calcStats(results){
   results.forEach(report => {
      const now = report.timestamp;

      // Bitrate caluclated by using Incoming RTP Connection
      if (report.type === 'inbound-rtp' && report.mediaType === 'video') {
         const bytes = report.bytesReceived;

      if (timestampPrev) {
         bitrate = 8 * (bytes - bytesPrev) / (now - timestampPrev);
         bitrate = Math.floor(bitrate);
      }
      if (bitrate < 500){
         if (received == false){
            received = true;
            return;
         }
         dataChannelReceive.value = 1;
         //console.log('Received Bit: 1');
      }
      else if (bitrate > 1600){ 
         if (received == false){
            received = true;
            return;
         }
         dataChannelReceive.value = 0;
         //console.log('Received Bit: 0');
      }
      bytesPrev = bytes;
      timestampPrev = now;
      }
      // Jitter calculated by using Incoming RTP Connection
      // Delay in Data Transfer
      if (report.type === 'inbound-rtp') {
         jitter = report.jitter;
      }
      // Frames per Second
      if (report.type === 'inbound-rtp') {
         framesPer = report.framesPerSecond;
      }

      // Total Round Trip Time by using Candidate Pair Connection
      // Amount of time it takes a packet to get from client to server and back
      if (report.type === 'candidate-pair') {
         RTT = report.totalRoundTripTime;
      }

      if (bitrate) {
         //bitrate += ' kbits/sec';
         bitrateDiv.innerHTML = `<strong>Bitrate: </strong>${bitrate} kbits/sec`;
      }
      if (framesPer) {
         //framesPer += ' frames/sec';
         frameDiv.innerHTML = `<strong>Framerate: </strong>${framesPer} frames/sec`;
      }
      if (jitter) {
         //jitter += ' milliseconds';
         jitterDiv.innerHTML = `<strong>Jitter: </strong>${jitter} milliseconds`;
      }
      if (RTT) {
         //RTT += ' milliseconds';
         rttDiv.innerHTML = `<strong>Total Round Trip Time: </strong>${RTT} milliseconds`;
      }
   });
}

// Display statistics
setInterval(() => {
   if (localPeerConnection && remotePeerConnection) {
      remotePeerConnection
         .getStats(null)
         .then(calcStats, err => console.log(err));
      online = true;
   } else {
      console.log('Not connected yet');
   }
}, statRate);


setInterval(() => {
   if (online == true && inputOccured == true){
      //online and input has occured
   }
   else{
      return;
   }
   if (outputBuffer[inputBuffer.length] != undefined){
      return;
   }
   if (localPeerConnection && remotePeerConnection){
      output();
   }
   if (firstSet == 0){
      setTimeout(pause, 0);
      multiplyRate++;
      prevIn = inputRate;
      inputRate = multiplyRate * t;
      currIn = inputRate;
      firstSet++;
   }
   else {
      multiplyRate++;
      outputRate += t;
      
   }
   clearInterval();
   //console.log("OUTPUT RATE: " + outputRate);
}, outputRate);

setInterval(() => {
   if (online == true){
      inputOccured = true;
   }
   else{
      return;
   }
   prevIn = inputRate;
   //console.log("PREV: " + prevIn);
   inputRate = multiplyRate * t;
   currIn = inputRate;
   //console.log("CURR: " + currIn);
   if (current == 0){
      current++;
   }
   else if (currIn == prevIn){
      if (current == 1){
         current++;
      }
      else{
         //console.log("SKIPPED");
         return;
      }
   }
   if (outputBuffer[inputBuffer.length] != undefined){
      calcError();
      return;
   }
   if (localPeerConnection && remotePeerConnection){
      input();
   }
   //console.log("INPUT RATE: " + inputRate);
   clearInterval();
}, inputRate)

/*
setInterval(() => {
   preventionMethod();
}, 10)
*/