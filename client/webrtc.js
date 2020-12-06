
'use strict';
var localVideo;
var remoteVideo;
var uuid;
var serverConnection;

let localPeerConnection;
let remotePeerConnection;
let localStream;
let bytesPrev;
let jitterPrev;
let timestampPrev;

const getUserMediaConstraintsDiv = document.querySelector('div#getUserMediaConstraints');

const bitrateDiv = document.querySelector('div#bitrate');
const jitterDiv = document.querySelector('div#jitter');

const peerDiv = document.querySelector('div#peer');
const senderStatsDiv = document.querySelector('div#senderStats');
const receiverStatsDiv = document.querySelector('div#receiverStats');

const getMediaButton = document.querySelector('button#getMedia');
const connectButton = document.querySelector('button#connect');
const hangupButton = document.querySelector('button#hangup');

getMediaButton.onclick = getMedia;
connectButton.onclick = createPeerConnection;
hangupButton.onclick = hangup;

var peerConnectionConfig = {
  'iceServers': [
    {'urls': 'stun:stun.stunprotocol.org:3478'},
    {'urls': 'stun:stun.l.google.com:19302'},
  ]
};

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

  localStream.getTracks().forEach(track => track.stop());
  localStream = null;

  hangupButton.disabled = true;
  getMediaButton.disabled = false;
}

function getUserMediaSuccess(stream) {
  connectButton.disabled = false;
  console.log('GetUserMedia succeeded');
  localStream = stream;
  localVideo.srcObject = stream;
}

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
      audio: true,
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
    localStream.getTracks().forEach(track => localPeerConnection.addTrack(track, localStream));
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

function onAddIceCandidateSuccess() {
  console.log('AddIceCandidate success.');
}

function onAddIceCandidateError(error) {
  console.log(`Failed to add Ice Candidate: ${error.toString()}`);
}

// Ice Canidate Success
function onAddIceCandidateSuccess() {
  console.log('AddIceCandidate success.');
}

// Ice Canidate Failure
function onAddIceCandidateError(error) {
  console.log(`Failed to add Ice Candidate: ${error.toString()}`);
}

// Calculate Video Bitrate
function calcStats(results){
  results.forEach(report => {
    const now = report.timestamp;

    let bitrate;
    let jitter;

    if (report.type === 'inbound-rtp' && report.mediaType === 'video') {
      const bytes = report.bytesReceived;
    
      if (timestampPrev) {
        bitrate = 8 * (bytes - bytesPrev) / (now - timestampPrev);
        bitrate = Math.floor(bitrate);
      }
      bytesPrev = bytes;
      timestampPrev = now;
    }
    if (report.type === 'inbound-rtp') {
      jitter = report.jitter;
    }
    if (bitrate) {
      bitrate += ' kbits/sec';
      bitrateDiv.innerHTML = `<strong>Bitrate:</strong>${bitrate}`;
    }
    if (jitter) {
      jitter += ' milliseconds';
      jitterDiv.innerHTML = `<strong>Jitter:</strong>${jitter}`;
    }
  });
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
