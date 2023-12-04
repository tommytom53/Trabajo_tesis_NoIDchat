import './style.css';
import firebase from 'firebase/app';
import 'firebase/firestore';
import 'firebase/auth'; 
import 'firebase/database';

const firebaseConfig = {
  apiKey: "AIzaSyCibDz4E5DNe2OeGGs6JGi4cu_-AG_qC2s",
  authDomain: "tesis-ea84f.firebaseapp.com",
  projectId: "tesis-ea84f",
  storageBucket: "tesis-ea84f.appspot.com",
  messagingSenderId: "649216652710",
  appId: "1:649216652710:web:9db86a29c798f557658b67"
};
let unsubscribeMessages = null;
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const firestore = firebase.firestore();
const displayedMessages = new Set();
const servers = {
  iceServers: [
    {
      urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'],
    },
  ],
  iceCandidatePoolSize: 10,
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true
  }
};

const pc = new RTCPeerConnection(servers);
let localStream = null;
let remoteStream = null;
let currentUser = null;

function getCurrentUser() {
  return new Promise((resolve, reject) => {
    const unsubscribe = firebase.auth().onAuthStateChanged((user) => {
      unsubscribe();
      if (user) {
        resolve(user.displayName);
      } else {
        reject('No hay usuario autenticado');
      }
    });
  });
}

async function loadCurrentUser() {
  await firebase.auth().onAuthStateChanged(async (user) => {
    if (!user) {
      window.location.href = 'register.html';
    } else {
      const userRef = firebase.database().ref('users/' + user.uid);
      userRef.once('value', (snapshot) => {
        const userData = snapshot.val();
        currentUser = userData ? userData.full_name : null;
        console.log("Current user:", currentUser); // Verifiquemos el valor del nombre del usuario en la consola
        const selectedCountry = localStorage.getItem('selectedCountry');
      const selectedFlag = localStorage.getItem('selectedFlag');
      if (selectedCountry && selectedFlag) {
        // Restaurar la selección anterior si existe
        seleccionarPais(selectedCountry, selectedFlag);
      }
        });
    }
  });
}
let lang = 'es-ES';
let lang2 = 'es';

window.toggleMenu=function() {
  var menuContainer = document.getElementById('menuContainer');
  menuContainer.classList.toggle('open');
}


window.seleccionarPais= function(pais, bandera) {
  var selectedFlagEmoji = document.getElementById('selectedFlagEmoji');
  selectedFlagEmoji.innerHTML = `<img src="${bandera}" alt="${pais}" style="max-width: 50px; max-height: 50px;">`;
      
  var menuContainer = document.getElementById('menuContainer');
  menuContainer.classList.remove('open');
  // Aquí puedes hacer lo que desees con la selección del país
  // Por ejemplo, puedes llamar a una función específica para cada país
  switch (pais) {
    case 'espana':
      lang = 'es-ES';
      lang2 = 'es';
      break;
    case 'italia':
      lang = 'it-IT';
      lang2 = 'it';
      break;
    case 'estados-unidos':
      lang = 'en-US';
      lang2 = 'en';
      break;
    case 'portugal':
      lang = 'pt-PT';
      lang2 = 'pt';
      break;
    default:
      lang = 'es-ES';
      lang2 = 'es'; // Establecer un idioma por defecto
      break;
  }
  localStorage.setItem('selectedCountry', pais);
  localStorage.setItem('selectedFlag', bandera);
}
function subToggleMenu() {
  var subMenuContainer = document.getElementById('subMenuContainer');
  subMenuContainer.classList.toggle('open');
}


document.addEventListener('DOMContentLoaded', async () => {
  await loadCurrentUser();


  const webcamButton = document.getElementById('webcamButton');
  const webcamVideo = document.getElementById('webcamVideo');
  const callButton = document.getElementById('callButton');
  const callInput = document.getElementById('callInput');
  const answerButton = document.getElementById('answerButton');
  const remoteVideo = document.getElementById('remoteVideo');
  const hangupButton = document.getElementById('hangupButton');
  const messageForm = document.getElementById('messageForm');
  const messageInput = document.getElementById('messageInput');
  const messageArea = document.getElementById('messageArea');
  
  function generateRandomRoomId() {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const roomIdLength = 10;
  
    let roomId = '';
    for (let i = 0; i < roomIdLength; i++) {
      roomId += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    
    return roomId;
  }
  
  let roomId = generateRandomRoomId();
  webcamButton.onclick = async () => {
    roomId = callInput.value || roomId || generateRandomRoomId();
    
    const callDoc = firestore.collection('calls').doc(roomId);
    const messagesCollection = firestore.collection('messages').doc(roomId).collection('roomMessages');
  
    try {
      localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      const audioTrack = localStream.getAudioTracks()[0];
      remoteStream = new MediaStream();
      
      // Añadir las pistas de video y audio al RTCPeerConnection
      localStream.getTracks().forEach((track) => {
        pc.addTrack(track, localStream);
        if (track.kind === 'audio') {
          track.enabled = true; // Asegurar que la pista de audio está habilitada para la transmisión
        }
      });
  
      pc.ontrack = (event) => {
        event.streams[0].getTracks().forEach((track) => {
          remoteStream.addTrack(track);
          if (track.kind === 'audio') {
            track.enabled = true; // Activar la transmisión de audio remota
          }
        });
      };
  
      // Mostrar solo la webcam local
      webcamVideo.srcObject = new MediaStream([localStream.getVideoTracks()[0]]);
  
      remoteVideo.srcObject = remoteStream;
  
      callButton.disabled = false;
      answerButton.disabled = false;
      webcamButton.disabled = true;
  
      // Iniciar la transcripción y traducción del audio del micrófono
      transcribeAndTranslateAudio(localStream);
    } catch (error) {
      console.error('Error al obtener la transmisión de la cámara:', error);
    }
  };
  
  
  
  
  callButton.onclick = async () => {
    const callId = callInput.value;
    roomId = callId || roomId || generateRandomRoomId();
  
    if (!roomId) {
      console.error('No se ha establecido el roomId.');
      return;
    }
  
    const callDoc = firestore.collection('calls').doc(roomId);
    const answerCandidates = callDoc.collection('answerCandidates');
    const offerCandidates = callDoc.collection('offerCandidates');
  
    callInput.value = roomId;
  
    pc.onicecandidate = (event) => {
      event.candidate && offerCandidates.add(event.candidate.toJSON());
    };
  
    const offerDescription = await pc.createOffer();
    await pc.setLocalDescription(offerDescription);
  
    const offer = {
      sdp: offerDescription.sdp,
      type: offerDescription.type,
    };
  
    await callDoc.set({ offer });
  
    callDoc.onSnapshot((snapshot) => {
      const data = snapshot.data();
      if (!pc.currentRemoteDescription && data?.answer) {
        const answerDescription = new RTCSessionDescription(data.answer);
        pc.setRemoteDescription(answerDescription);
      }
    });
  
    answerCandidates.onSnapshot((snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const candidate = new RTCIceCandidate(change.doc.data());
          pc.addIceCandidate(candidate);
        }
      });
    });
  
    hangupButton.disabled = false;
  
    // Obtener los mensajes de la sala correspondiente al ID ingresado
    const otherRoomDoc = firestore.collection('messages').doc(callId).collection('roomMessages');
  
    // Escuchar los cambios en la otra sala
    otherRoomDoc.orderBy('timestamp').onSnapshot((snapshot) => {
      displayMessages(snapshot);
    });

    
  };
  
  function displayMessages(snapshot) {
    snapshot.docChanges().forEach(async (change) => {
      if (change.type === 'added') {
        const messageId = change.doc.id;
        if (!displayedMessages.has(messageId)) {
          displayedMessages.add(messageId);
  
          const messageData = change.doc.data();
          const translatedText = await translateText(messageData.text, lang2);
          const messageElement = document.createElement('div');
          messageElement.textContent = `${messageData.sender}: ${translatedText}`;
          messageArea.appendChild(messageElement);
  
          console.log(`Message added: ${messageId}`);
          console.log(displayedMessages);
        }
      }
    });
  }
  answerButton.onclick = async () => {
    const callId = callInput.value;
    roomId = callId || roomId || generateRandomRoomId();
  
    if (!roomId) {
      console.error('No se ha establecido el roomId.');
      return;
    }
    hangupButton.disabled = false;
    const callDoc = firestore.collection('calls').doc(callId);
    const answerCandidates = callDoc.collection('answerCandidates');
    const offerCandidates = callDoc.collection('offerCandidates');
  
    pc.onicecandidate = (event) => {
      event.candidate && answerCandidates.add(event.candidate.toJSON());
    };
  
    const callData = (await callDoc.get()).data();
  
    const offerDescription = callData.offer;
    await pc.setRemoteDescription(new RTCSessionDescription(offerDescription));
  
    const answerDescription = await pc.createAnswer();
    await pc.setLocalDescription(answerDescription);
  
    const answer = {
      type: answerDescription.type,
      sdp: answerDescription.sdp,
    };
  
    await callDoc.update({ answer });
  
    offerCandidates.onSnapshot((snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          let data = change.doc.data();
          pc.addIceCandidate(new RTCIceCandidate(data));
        }
      });
    });
  
    // Manejo de mensajes
    const otherRoomDoc = firestore.collection('messages').doc(callId).collection('roomMessages');
  
    // Escuchar los cambios en la otra sala y mostrar los mensajes
    otherRoomDoc.orderBy('timestamp').onSnapshot((snapshot) => {
      displayMessages(snapshot); // Mostrar los mensajes en el área correspondiente
    });
  };
  hangupButton.onclick = async () => {
    // Detener los streams de video y audio
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      webcamVideo.srcObject = null;
    }
    if (remoteStream) {
      remoteStream.getTracks().forEach(track => track.stop());
      remoteVideo.srcObject = null;
    }
  
    // Cerrar la conexión RTCPeerConnection
    if (pc) {
      pc.close();
    }
  
    // Limpiar los mensajes en el área del chat
    messageArea.innerHTML = '';
  
    // Desactivar los botones y resetear el estado de la llamada
    hangupButton.disabled = true;
    callButton.disabled = false;
    answerButton.disabled = false;
    webcamButton.disabled = false;
    
    // Realizar otras operaciones de limpieza o desconexión que sean necesarias
    // Por ejemplo, puedes dejar la sala, cerrar conexiones adicionales, etc.
    // También podrías añadir lógica adicional según tus necesidades específicas.
  };
  messageForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const messageText = messageInput.value;
    const sender = currentUser;
    const messageData = {
      text: messageText,
      timestamp: firebase.firestore.FieldValue.serverTimestamp(),
      sender: sender,
    };
  
    try {
      await firestore.collection('messages').doc(roomId).collection('roomMessages').add(messageData);
      messageInput.value = '';
  
      // Agregar el mensaje recién enviado al área de mensajes
      const messageElement = document.createElement('div');
      
      // Alternativamente, podrías usar innerHTML para agregar el mensaje
      // messageArea.innerHTML += `<div>${sender}: ${messageText}</div>`;
    } catch (error) {
      console.error('Error al enviar el mensaje:', error);
    }
  });
  
  firestore.collection('messages').doc(roomId).collection('roomMessages')
  .orderBy('timestamp')
  .onSnapshot(async (snapshot) => {
    snapshot.docChanges().forEach(async (change) => {
      if (change.type === 'added') {
        const messageId = change.doc.id;
        if (!displayedMessages.has(messageId)) {
          displayedMessages.add(messageId);

          const messageData = change.doc.data();
          const messageElement = document.createElement('div');
          const translatedText = await translateText(messageData.text, lang2);
          messageElement.textContent = `${messageData.sender}: ${translatedText}`;
          messageArea.appendChild(messageElement);
        }
      }
    });
  });
  
    function transcribeAndTranslateAudio(stream) {
        const recognition = new webkitSpeechRecognition();
        recognition.lang = 'es-ES'; // Establecer el idioma de entrada (puede variar según el idioma de los participantes)
        recognition.continuous = true;
    
        recognition.onresult = async (event) => {
          const transcript = event.results[event.results.length - 1][0].transcript;
    
          try {
            // Llamada a la función de traducción
            const translatedText = await translateText(transcript, 'en'); // Reemplaza 'en' con el idioma al que deseas traducir
    
            // Enviar el texto traducido al chat
            sendMessage(translatedText);
          } catch (error) {
            console.error('Error al transcribir y traducir audio:', error);
          }
        };
    
        recognition.onerror = (event) => {
          console.error('Error en la transcripción:', event.error);
        };
    
        recognition.start();
        console.error('El reconocimiento de voz no está disponible en este navegador.');
        recognition.onerror = (event) => {
          console.error('Error en la transcripción:', event.error);
          // Vuelve a iniciar el reconocimiento en caso de error
          restartRecognition();
        };
        // Lógica alternativa o mensaje para el usuario sobre la falta de compatibilidad
        // Por ejemplo: Mostrar un mensaje indicando que la función de reconocimiento de voz no está disponible

    }
    function restartRecognition() {
      if (recognition) {
        recognition.stop();
        recognition = null;
      }
      
      // Vuelve a iniciar el reconocimiento después de un tiempo determinado (por ejemplo, cada 5 minutos)
      setInterval(() => {
        startRecognition();
      }, 5 * 60 * 1000); // 5 minutos en milisegundos
    }
    
    async function translateText(text, targetLanguage) {
      const apiKey = 'AIzaSyAnzOQD0CKfrWmvdmK1v-Za_FQpyBWVOGg'; // Reemplaza 'TU_API_KEY' con tu clave de API de Google Cloud
    
      const apiUrl = `https://translation.googleapis.com/language/translate/v2?key=${apiKey}`;
      const requestBody = {
        q: text,
        target: targetLanguage,
      };
    
      try {
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        });
    
        if (response.ok) {
          const data = await response.json();
          const translatedText = data.data.translations[0].translatedText;
          return translatedText;
        } else {
          throw new Error('Error en la solicitud de traducción');
        }
      } catch (error) {
        console.error('Error al traducir texto:', error);
        throw error;
      }
    }
    // Esta función enviará el mensaje traducido al chat
  
    async function sendMessage(text) {
      try {
        const messageData = {
          text,
          timestamp: firebase.firestore.FieldValue.serverTimestamp(),
          sender: currentUser,
        };
    
        await firestore.collection('messages').doc(roomId).collection('roomMessages').add(messageData);
      } catch (error) {
        console.error('Error al enviar el mensaje:', error);
      }
    }
    unsubscribeMessages = firestore.collection('messages').doc(roomId).collection('roomMessages')
  .orderBy('timestamp')
  .onSnapshot(async (snapshot) => {
    snapshot.docChanges().forEach(async (change) => {
      if (change.type === 'added') {
        const messageId = change.doc.id;
        if (!displayedMessages.has(messageId)) {
          displayedMessages.add(messageId);

          const messageData = change.doc.data();
          const messageElement = document.createElement('div');
          const translatedText = await translateText(messageData.text, lang2);
          messageElement.textContent = `${messageData.sender}: ${translatedText}`;
          messageArea.appendChild(messageElement);
        }
      }
    });
  });
  });