var tabId = null;
var contentScriptConnection = null;
var webpageConnection = null;
var statusDisplay = null;
var answer = null;
var channel = null;

const servers = {
  iceServers: [
    {
      urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'],
    },
  ],
  iceCandidatePoolSize: 10,
};
var pc = null;

chrome.runtime.onConnect.addListener(function (port) {
  contentScriptConnection = port
  port.onMessage.addListener(function (msg) {
    console.log('Content-Script: ', msg);
  });
});

chrome.runtime.onConnectExternal.addListener(function (port) {
  webpageConnection = port
  port.onMessage.addListener(function (msg) {
    console.log('Webpage: ', msg);
    statusDisplay.innerHTML = `Status: ${msg.status ? "Paused" : "Playing"}`
  });
});

document.addEventListener("DOMContentLoaded", async () => {
  const button = document.getElementById("testButton");
  statusDisplay = document.getElementById("status")
  if (button) {
    button.addEventListener("click", () => {
      console.log("Button Clicked 1", contentScriptConnection, statusDisplay);
      contentScriptConnection.postMessage("play/pause");
    });
  } else {
    console.error("Button with ID 'testButton' not found.");
  }

  document.getElementById('create-offer-button').addEventListener('click', createOffer);
  document.getElementById('respond-offer-button').addEventListener('click', respondToOffer);
});



async function createOffer() {
  if (!pc) {
    pc = new RTCPeerConnection(servers);
  }
  makeDataChannel();
  const offerDescription = await pc.createOffer();
  await pc.setLocalDescription(offerDescription);
  console.log(pc);
  pc.onicecandidate = function (candidate) {
    if (candidate.candidate == null) {
      console.log("Your offer is:", JSON.stringify(pc.localDescription));
      document.getElementById('local-description').value = JSON.stringify(pc.localDescription)
    }
  }
}

async function respondToOffer() {
  if (!pc) {
    pc = new RTCPeerConnection(servers);
  }
  data = JSON.parse(document.getElementById('remote-description').value);
  sessionDescription = new RTCSessionDescription(data);
  handleDataChannel();
  pc.setRemoteDescription(sessionDescription);
  if (pc.localDescription) {
    return
  }
  const answerDescription = await pc.createAnswer();
  await pc.setLocalDescription(answerDescription);
  pc.onicecandidate = function (candidate) {
    if (candidate.candidate == null) {
      console.log("answer: ", JSON.stringify(pc.localDescription));
      document.getElementById('local-description').value = JSON.stringify(pc.localDescription)
    }
  }
}

function makeDataChannel() {
  // If you don't make a datachannel *before* making your offer (such
  // that it's included in the offer), then when you try to make one
  // afterwards it just stays in "connecting" state forever.  This is
  // my least favorite thing about the datachannel API.
  channel = pc.createDataChannel('test', { reliable: true });
  channel.onopen = function () {
    console.log("Channel Created!");
  };
  channel.onmessage = function (evt) {
    data = JSON.parse(evt.data);
    console.log('Message recieved: ', data);
  };
  channel.onerror = (error) => console.log(error);
}

function handleDataChannel() {
  pc.ondatachannel = function (evt) {
    channel = evt.channel;
    console.log('Channel found: ', channel);
    // var label = channel.label;
    //channel.binaryType = 'arraybuffer';
    channel.onopen = function () {
      console.log('Channel found: ', channel);
    };
    channel.onmessage = function (evt) {
      data = JSON.parse(evt.data);
      console.log('Message recieved: ', data);
    };
    channel.onerror = (error) => console.log(error);
  };
}