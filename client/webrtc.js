'use strict';
// Global/Function Scoped
var localVideo;
var remoteVideo;
var uuid;
var serverConnection;
var bitPattern;

/*****************************************************************************************************************************************************************************************************/
//var testVideo;
var inputCanvas = document.getElementById('inputCanvas').getContext( '2d' );
var outputCanvas = document.getElementById('outputCanvas').getContext( '2d' );
var reverseCanvas = document.getElementById('reverseCanvas').getContext( '2d' );
const outputStream = document.getElementById('reverseCanvas').captureStream();
// above was outputCanvas
var width = 640;
var height = 360;
/*****************************************************************************************************************************************************************************************************/

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
const patternDiv = document.querySelector('div#bitPattern');

// Formatting Statistics 
const peerDiv = document.querySelector('div#peer');
const senderStatsDiv = document.querySelector('div#senderStats');
const receiverStatsDiv = document.querySelector('div#receiverStats');

// Formatting Buttons
const getMediaButton = document.querySelector('button#getMedia');
const connectButton = document.querySelector('button#connect');
const hangupButton = document.querySelector('button#hangup');

// Buttons to Get Media, Connect, and Hangup
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


   //testVideo.srcObject = stream;
   drawToCanvas();
   /*****************************************************************************************************************************************************************************************************/
}

// Acquire Media from Client
function getMedia() {
   getMediaButton.disabled = true;
   localVideo = document.getElementById('localVideo');
   remoteVideo = document.getElementById('remoteVideo');
   //testVideo = document.getElementById('testVideo');    /******************************************************************************************************************************************************************/

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

/************************************************************************************************************************************************************/
// Create Peer Connection
function createPeerConnection() {
   connectButton.disabled = true;
   hangupButton.disabled = false;

   bytesPrev = 0;
   timestampPrev = 0;
   localPeerConnection = new RTCPeerConnection(null);
   remotePeerConnection = new RTCPeerConnection(null);


   // Reverse the Data Transformation
   reverseData();

   // Acquire the outputCanvas's Video Stream, which will then be brought into the Remote Stream
   localStream = outputStream;


   localStream.getTracks().forEach(track => localPeerConnection.addTrack(track, localStream));
   //testStream.getTracks().forEach(track => localPeerConnection.addTrack(track, testStream));
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
         remoteVideo.srcObject = e.streams[0]; /************************************************************************************************************************************************************/
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

// ADDED FUNCTION *********************************************************************************************************************************************************/

function drawToCanvas() {
   // Draw Video from Input Canvas
   inputCanvas.drawImage( localVideo, 0, 0, width, height );

   // Acquiring Pixel Data from Input Canvas
   var pixelData = inputCanvas.getImageData( 0, 0, width, height );

   var grey, i;

   // Greyscale Transformation
   for( i = 0; i < pixelData.data.length; i += 4 ) {
      grey = 0.21 * pixelData.data[i] + 0.72 * pixelData.data[i + 1] + 0.07 * pixelData.data[i + 2];
      pixelData.data[ i ] = grey;
      pixelData.data[ i + 1 ] = grey;
      pixelData.data[ i + 2 ] = grey;
   }

   // Output data to Output Canvas
   outputCanvas.putImageData( pixelData, 0, 0 );
   requestAnimationFrame( drawToCanvas );
}

function reverseData() {
   // Acquiring Pixel Data from output Canvas
   var pixelData = outputCanvas.getImageData( 0, 0, width, height );

   var i;

   // Reverse Greyscale Transformation
   for( i = 0; i < pixelData.data.length; i += 4 ) {
      pixelData.data[ i ] /= 0.21;
      pixelData.data[ i + 1 ] /= 0.72;
      pixelData.data[ i + 2 ] /= 0.07;
   }

   // Output data to Output Canvas
   reverseCanvas.putImageData( pixelData, 0, 0 );
   requestAnimationFrame( reverseData );
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

      // Bitrate caluclated by using Incoming RTP Connection
      if (report.type === 'inbound-rtp' && report.mediaType === 'video') {
         const bytes = report.bytesReceived;
    
      if (timestampPrev) {
         bitrate = 8 * (bytes - bytesPrev) / (now - timestampPrev);
         bitrate = Math.floor(bitrate);
      }
      bytesPrev = bytes;
      timestampPrev = now;
      }

      // Jitter calculated by using Incoming RTP Connection
      // Delay in Data Transfer
      if (report.type === 'inbound-rtp') {
         jitter = report.jitter;
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
      if (jitter) {
         jitter += ' milliseconds';
         jitterDiv.innerHTML = `<strong>Jitter: </strong>${jitter}`;
      }
      if (RTT) {
         RTT += ' milliseconds';
         rttDiv.innerHTML = `<strong>Total Round Trip Time: </strong>${RTT}`;
      }
   });
  // Get Bit Pattern
  bitPattern = document.getElementById('bitInput');
  patternDiv.innerHTML = `<strong>Bit Pattern: </strong>${bitPattern.value}`;
}
// Display statistics
setInterval(() => {
   if (localPeerConnection && remotePeerConnection) {
      remotePeerConnection
         .getStats(null)
        .then(calcStats, err => console.log(err));
   } else {
      console.log('Not connected yet');
   }
}, 1000);