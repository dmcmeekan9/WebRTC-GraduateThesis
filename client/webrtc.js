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
var received;
const dataChannelSend = document.querySelector('textarea#dataChannelSend');
const dataChannelReceive = document.querySelector('textarea#dataChannelReceive');

/**************************************************************** !!!!!!!!!!!!!!!! */
let inputBuffer = new Array(5);
let outputBuffer = new Array(inputBuffer.length);
var x = 0; // inputBuffer
var y = 0; // outputBuffer
var n = 0; // We know one bit has been sent
var e = 0; // errorRate
var c = 0; // loop for errorRate
var inputRate = 5000; //input
var outputRate = inputRate + (inputRate / 2); //output
var t = inputRate;
var d = outputRate;
var statRate = 1500;
var multiplyRate = 1;

var i;
for (i = 0; i < inputBuffer.length; i++){
   var random = Math.random();
   if(random > 0.5){
      inputBuffer[i] = 1;
   }
   else if(random < 0.5){
      inputBuffer[i] = 0;
   }
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

// Display Bitrate, Jitter, RTT, and BitPattern
const bitrateDiv = document.querySelector('div#bitrate');
const jitterDiv = document.querySelector('div#jitter');
const rttDiv = document.querySelector('div#RTT');
const frameDiv = document.querySelector('div#frames');
const errorRateDiv = document.querySelector('div#errorRate');

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

/******************************************************
// Implement Delay on Client Side
// Sense Input based on Bit Rate
function sendData() {
   data = dataChannelSend.value;
}

//sendChannel.send(data);
// Using Data Channels to Send Data
function receiveChannelCallback(event) {
   console.log('Receive Channel Callback');
   receiveChannel = event.channel;
   receiveChannel.onmessage = onReceiveMessageCallback;
}
function onReceiveMessageCallback(event) {
   dataChannelReceive.value = event.data;
   console.log('Received Message: ' + dataChannelReceive.value);
}
function onSendChannelStateChange() {
   const readyState = sendChannel.readyState;
   console.log('Send channel state is: ' + readyState);
   if (readyState === 'open') {
      dataChannelSend.disabled = false;
      dataChannelSend.focus();
      sendButton.disabled = false;
   } else {
      dataChannelSend.disabled = true;
      sendButton.disabled = true;
   }
}
function onReceiveChannelStateChange() {
   const readyState = receiveChannel.readyState;
   console.log(`Receive channel state is: ${readyState}`);
}

Acquiring Pixel Data from Input Canvas
var pixelData = inputCanvas.getImageData( 0, 0, width, height );
var data = pixelData.data;
var i;
// Data Transformation - Grey
for( i = 0; i < data.length; i += 4 ) {
   var transform = (data[i] + data[i + 1] + data[i + 2]) * random;

   data[ i ] = transform;
   data[ i + 1 ] = transform;
   data[ i + 2 ] = transform;
}
// Output data to Output Canvas
outputCanvas.putImageData( pixelData, 0, 0 );
**********************************************************/

// Draw to Canvas (Possible Pixel Manipulation)
function drawToCanvas() {
   // Draw Video from Input Canvas
   inputCanvas.drawImage( localVideo, 0, 0, width, height );

   /**************************************************************** !!!!!!!!!!!!!!!! */
   //setTimeout(input, 50);

   /**************************************************************** !!!!!!!!!!!!!!!! */
   data = dataChannelSend.value;
   //console.log('Sent Data: ' + data);

   if (data == 1){
      delayTime = 100;
      //data = 100;
      setTimeout(pause, 3000);
   }
   else if (data == 0){
      delayTime = 5;
      //data = 100;
      setTimeout(pause, 3000);
   }
   else{
      clearTimeout(fx);
   }

   // Prevention Method    ********************************** One Area to Try for Testing 
   // Simulates a Consistent Delay on the Sending Side of each Client
   //setTimeout(pause, 500);

   /***************************************************************** !!!!!!!!!!!!!!!! */
   //setTimeout(output, 25);

   delay = setTimeout(fx, delayTime);
   //requestAnimationFrame( drawToCanvas );
}

function fx(){
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
   console.log("inputBuffer: " + inputBuffer[x]);
   x++;
}

function output(){
   outputBuffer[y] = dataChannelReceive.value;
   if (y == inputBuffer.length){
      return;
   }
   console.log("outputBuffer: " + outputBuffer[y]);
   y++;
}

function calcError(){
   let errorRate;
   for (c; c < inputBuffer.length; c++){
      console.log("in loop input: " + inputBuffer[c]);
      console.log("in loop output: " + outputBuffer[c]);
      if (inputBuffer[c] != outputBuffer[c]){
         e++;
         console.log("e: " + e);
      }
   }
   errorRate = e / inputBuffer.length;
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

      let bitrate;
      let jitter;
      let RTT;
      let framesPer;

      // Bitrate caluclated by using Incoming RTP Connection
      if (report.type === 'inbound-rtp' && report.mediaType === 'video') {
         const bytes = report.bytesReceived;

      if (timestampPrev) {
         bitrate = 8 * (bytes - bytesPrev) / (now - timestampPrev);
         bitrate = Math.floor(bitrate);
      }
      //if (bitrate > 1000 && bitrate < 2000){
      //   received = false;
      //}
      if (bitrate < 600){ // && received == false){
         //received = true;
         dataChannelReceive.value = 1;
         console.log('Received Bit: 1');
      }
      else if (bitrate > 1450){ // && received == false){
         //received = true;
         dataChannelReceive.value = 0;
         console.log('Received Bit: 0');
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
         bitrate += ' kbits/sec';
         bitrateDiv.innerHTML = `<strong>Bitrate: </strong>${bitrate}`;
      }
      if (framesPer) {
         framesPer += ' frames/sec';
         frameDiv.innerHTML = `<strong>Framerate: </strong>${framesPer}`;
      }
      if (jitter) {
         jitter += ' milliseconds';
         jitterDiv.innerHTML = `<strong>Jitter: </strong>${jitter}`;
      }
      if (RTT) {
         RTT += ' milliseconds';
         rttDiv.innerHTML = `<strong>Total Round Trip Time: </strong>${RTT}`;
      }
   });
}

// Display statistics
setInterval(() => {
   if (n = 0){
      setTimeout(pause, 10000);
   }
   if (localPeerConnection && remotePeerConnection) {
      remotePeerConnection
         .getStats(null)
         .then(calcStats, err => console.log(err));
   } else {
      console.log('Not connected yet');
   }
}, statRate);

setInterval(() => {
   if (outputBuffer[inputBuffer.length] != undefined){
      calcError();
      return;
   }
   if (n = 1){
      multiplyRate++;
   }
   n = 1;
   if (localPeerConnection && remotePeerConnection){
      input();
   }
   console.log("INPUT RATE: " + inputRate);
   setInterval(() => {
      if (outputBuffer[inputBuffer.length] != undefined){
         return;
      }
      if (localPeerConnection && remotePeerConnection){
         output();
      }
      console.log("OUTPUT RATE: " + outputRate);
      outputRate += t;
   }, outputRate);
   inputRate = multiplyRate * t;
}, inputRate)

/*
setInterval(() => {
   if (outputBuffer[inputBuffer.length] != undefined){
      return;
   }
   if (localPeerConnection && remotePeerConnection){
      output();
   }
   console.log("OUTPUT RATE: " + outputRate);
   outputRate += t;
}, outputRate);
*/