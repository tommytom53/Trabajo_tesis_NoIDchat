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
let lang4 = ''; 
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
let recognition;
let uidsala = "";
let lang = 'es-ES';
let lang2 = 'es';
let currentRoomId = ""

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
      lang4 = userData ? userData.country : null;
      cargarTraducciones();
        });
    }
  });
}

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
function cargarTraducciones() {
  fetch(`/${lang4}.json`)
    .then(response => response.json())
    .then(data => aplicarTraducciones(data))
    .catch(error => console.error('Error al cargar las traducciones', error));
}

// Función para aplicar las traducciones en la página
function aplicarTraducciones(traducciones) {
  // Reemplaza el contenido de los elementos HTML con las traducciones correspondientes
  document.getElementById('webcamButton').innerText = traducciones.boton_webcam;
  document.getElementById('callButton').innerText = traducciones.crear_codigo;
  document.getElementById('callInput').setAttribute('placeholder', traducciones.placeholder_codigo);
  document.getElementById('answerButton').innerText = traducciones.ingresar_llamada;
  document.getElementById('hangupButton').innerText = traducciones.salir_sala;
  document.getElementById('messageInput').setAttribute('placeholder', traducciones.escribir_mensaje);
  document.getElementById('sendMessageButton').innerText = traducciones.enviar;
  // Actualiza más elementos de la página con sus traducciones correspondientes
}


document.addEventListener('DOMContentLoaded', async () => {
  await loadCurrentUser();
  console.log(lang4);


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
  const emparejarLlamada = document.getElementById('emparejarLlamada');
  
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
    console.log(roomId);
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
    console.log(roomId);
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
    const otherRoomDoc = firestore.collection('messages').doc(roomId).collection('roomMessages');
  
    // Escuchar los cambios en la otra sala
    otherRoomDoc.orderBy('timestamp').onSnapshot((snapshot) => {
      displayMessages(snapshot);
    });

    
  };
  
  
  answerButton.onclick = async () => {
    const callId = callInput.value;
    roomId = callId || roomId || generateRandomRoomId();
    console.log(roomId);
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
  emparejarLlamada.onclick = async () => {
    const userLang2 = lang2; // Idioma objetivo del usuario
    const userLang4 = lang4; // Idioma hablante del usuario
  
    // Acceder a la colección 'createdRooms' en Firestore
    const createdRoomsRef = firestore.collection('createdRooms');
  
    // Consulta para buscar salas donde coincidan ambos idiomas
    const matchingRoom = await createdRoomsRef
      .where('idiomaHablante', '==', userLang4)
      .where('idiomaObjetivo', '==', userLang2)
      .where('participantes', '==', '1')
      .get();
  
    // Si hay una sala que coincida con ambos idiomas, tomar el roomId y responder la llamada
    if (!matchingRoom.empty) {
      const roomId = matchingRoom.docs[0].data().roomId;
      currentRoomId = roomId;
      try {
        const querySnapshot = await createdRoomsRef.where('roomId', '==', currentRoomId).get();
        querySnapshot.forEach(async (doc) => {
          try {
            // Obtener el ID del documento actual
            const roomId = doc.id;
      
            // Actualizar el campo específico dentro del documento
            await firestore.collection('createdRooms').doc(roomId).update({
              participantes: "2" // Reemplaza campoAActualizar y nuevoValor con los nombres correctos
            });
          } catch (error) {
            console.error('Error al actualizar:', error);
          }
          });
        } catch (error) {
          console.error('Error al obtener el documento:', error);
        }
      document.getElementById('callInput').value = roomId;
      document.getElementById('answerButton').click();
      return;
    }
  
    // Si no hay coincidencia, buscar una sala donde coincida cualquier idioma
    const anyMatchingRoom = await createdRoomsRef
      .where('idiomaHablante', '==', userLang4)
      .where('participantes', '==', '1')
      .get();
  
    // Si hay una sala que coincida con lang4, tomar el roomId y responder la llamada
    if (!anyMatchingRoom.empty) {
      const anyRoomId = anyMatchingRoom.docs[0].data().roomId;
      currentRoomId = anyRoomId;
      try {
        const querySnapshot = await createdRoomsRef.where('roomId', '==', currentRoomId).get();
        querySnapshot.forEach(async (doc) => {
          try {
            // Obtener el ID del documento actual
            const roomId = doc.id;
      
            // Actualizar el campo específico dentro del documento
            await firestore.collection('createdRooms').doc(roomId).update({
              participantes: "2" // Reemplaza campoAActualizar y nuevoValor con los nombres correctos
            });
          } catch (error) {
            console.error('Error al actualizar:', error);
          }
          });
        } catch (error) {
          console.error('Error al obtener el documento:', error);
        }
      document.getElementById('callInput').value = anyRoomId;
      document.getElementById('answerButton').click();
      return;
    }
  
    // Si no hay coincidencia aún, buscar una sala con cualquier idioma
    const anyRoom = await createdRoomsRef
    .where('participantes', '==', '1')
    .get();
  
    // Si hay alguna sala, tomar el roomId y responder la llamada
    if (!anyRoom.empty) {
      const randomRoomId = anyRoom.docs[0].data().roomId;
      currentRoomId = randomRoomId;
      try {
        const querySnapshot = await createdRoomsRef.where('roomId', '==', currentRoomId).get();
        querySnapshot.forEach(async (doc) => {
          try {
            // Obtener el ID del documento actual
            const roomId = doc.id;
      
            // Actualizar el campo específico dentro del documento
            await firestore.collection('createdRooms').doc(roomId).update({
              participantes: "2" // Reemplaza campoAActualizar y nuevoValor con los nombres correctos
            });
          } catch (error) {
            console.error('Error al actualizar:', error);
          }
          });
        } catch (error) {
          console.error('Error al obtener el documento:', error);
        }
          
      document.getElementById('callInput').value = randomRoomId;
      document.getElementById('answerButton').click();
      return;
    }
  
    // Si no hay ninguna sala, crear una nueva con los idiomas del usuario
    const newRoomId = generateRandomRoomId(); // Generar roomId aleatorio
    document.getElementById('callInput').value = newRoomId;
    currentRoomId = newRoomId;
    console.log(currentRoomId);
  
    // Agregar nueva sala a la base de datos
    await createdRoomsRef.add({
      idiomaHablante: userLang4,
      idiomaObjetivo: userLang2,
      roomId: newRoomId,
      participantes: '1',
    });
    
    // Llamar a la sala recién creada
    document.getElementById('callButton').click();
  }
  async function eliminarSala() {
    if (!currentRoomId) {
      console.error('No se ha especificado el ID de la sala');
      return;
    }
  
    const roomsRef = firestore.collection('createdRooms');
    try {
      const querySnapshot = await roomsRef.where('roomId', '==', currentRoomId).get();
  
      querySnapshot.forEach(async (doc) => {
        // Eliminar cada documento que coincida con el currentRoomId
        await doc.ref.delete();
        console.log('Sala eliminada exitosamente');
      });
    } catch (error) {
      console.error('Error al eliminar la sala:', error);
      // Manejar el error apropiadamente (mostrar un mensaje al usuario, intentar nuevamente, etc.)
    }
  }
  if (hangupButton) {
    hangupButton.onclick = async () => {
      console.log(uidsala);
      await eliminarSala();
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
        
        setTimeout(() => {
          location.reload(); // Recargar la página
        }, 1000); // Puedes ajustar el tiempo de retraso si es necesario
      
        // Activar automáticamente la función asociada al botón "startwebcam" después de recargar la página
        window.onload = () => {
          const startWebcamButton = document.getElementById('webcamButton');
          if (startWebcamButton) {
            startWebcamButton.click(); // Simular un clic en el botón "startwebcam" después de cargar la página
          }
        };
      };
  }

  
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
          if (messageData.sender === currentUser) {
            // Mostrar el mensaje local sin traducir
            messageElement.textContent = `${messageData.sender}: ${messageData.text}`;
          } else if (!messageData.isLocal) {
            // Traducir y mostrar el mensaje remoto
            messageElement.textContent = `${messageData.sender}: ${translatedText}`;
          }
          messageArea.insertBefore(messageElement, messageArea.firstChild);
        }
      }
    });
  });
  
    function transcribeAndTranslateAudio(stream) {
        const recognition = new webkitSpeechRecognition();
        recognition.lang = lang; // Establecer el idioma de entrada (puede variar según el idioma de los participantes)
        recognition.continuous = true;
    
        recognition.onresult = async (event) => {
          const transcript = event.results[event.results.length - 1][0].transcript;
    
          try {
            // Llamada a la función de traducción
            const translatedText = transcript; // Reemplaza 'en' con el idioma al que deseas traducir
    
            // Enviar el texto traducido al chat
            sendMessage(translatedText);
            resetRecognitionTimer();
          } catch (error) {
            console.error('Error al transcribir y traducir audio:', error);
          }
        };
    
        recognition.onerror = (event) => {
          console.error('Error en la transcripción:', event.error);
          restartRecognition();
        };
    
        recognition.start();
        startRecognitionTimer();
        console.error('El reconocimiento de voz no está disponible en este navegador.');
        recognition.onerror = (event) => {
          console.error('Error en la transcripción:', event.error);
          // Vuelve a iniciar el reconocimiento en caso de error
          transcribeAndTranslateAudio();
        };
        // Lógica alternativa o mensaje para el usuario sobre la falta de compatibilidad
        // Por ejemplo: Mostrar un mensaje indicando que la función de reconocimiento de voz no está disponible

    }
    function restartRecognition() {
      // Detener y limpiar el reconocimiento existente
      if (recognition) {
        recognition.stop();
        recognition = null;
      }
    
      // Iniciar un nuevo reconocimiento después de un breve intervalo
      setTimeout(() => {
        transcribeAndTranslateAudio();
      }, 1000); // Reiniciar después de 1 segundo
    }
    
    let recognitionTimer;
    
    function startRecognitionTimer() {
      // Establecer un temporizador para reiniciar el reconocimiento si no hay actividad después de un tiempo
      recognitionTimer = setTimeout(() => {
        console.log('Reconocimiento de voz inactivo. Reiniciando...');
        restartRecognition();
      }, 60000); // Reiniciar después de 1 minuto de inactividad (ajusta el tiempo según sea necesario)
    }
    
    function resetRecognitionTimer() {
      // Reiniciar el temporizador si hay actividad de voz
      clearTimeout(recognitionTimer);
      startRecognitionTimer();
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
    function displayMessages(snapshot) {
      snapshot.docChanges().forEach(async (change) => {
        if (change.type === 'added') {
          const messageId = change.doc.id;
          if (!displayedMessages.has(messageId)) {
            displayedMessages.add(messageId);
    
            const messageData = change.doc.data();
            const messageElement = document.createElement('div');
            
            // Verificar si el mensaje es del usuario local o remoto antes de mostrarlo
            if (messageData.sender === currentUser) {
              // Mostrar el mensaje local sin traducir
              messageElement.textContent = `${messageData.sender}: ${messageData.text}`;
            } else if (!messageData.isLocal) {
              // Traducir y mostrar el mensaje remoto
              const translatedText = await translateText(messageData.text, lang2);
              messageElement.textContent = `${messageData.sender}: ${translatedText}`;
            } else {
              // Mostrar el mensaje del usuario que inicia la llamada sin traducir
              messageElement.textContent = `${messageData.sender}: ${messageData.text}`;
            }
    
            messageArea.insertBefore(messageElement, messageArea.firstChild);
    
            console.log(`Message added: ${messageId}`);
            console.log(displayedMessages);
          }
        }
      });
    }
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
          messageArea.insertBefore(messageElement, messageArea.firstChild);
        }
      }
    });
  });
  });
