var firebaseConfig = {
    apiKey: "AIzaSyCibDz4E5DNe2OeGGs6JGi4cu_-AG_qC2s",
    authDomain: "tesis-ea84f.firebaseapp.com",
    projectId: "tesis-ea84f",
    storageBucket: "tesis-ea84f.appspot.com",
    messagingSenderId: "649216652710",
    appId: "1:649216652710:web:9db86a29c798f557658b67"
  };
  // Initialize Firebase
  firebase.initializeApp(firebaseConfig);
  // Initialize variables
  const auth = firebase.auth()
  const database = firebase.database()
const languages = {
    espanol: {
        welcome: 'Bienvenido',
        logout: 'Cerrar sesión',
        profile: 'Perfil',
        // Textos para la página de perfil
        profileHeader: 'PERFIL',
        newEmailPlaceholder: 'Nuevo Email',
        newUsernamePlaceholder: 'Nuevo Nombre de Usuario',
        newPasswordPlaceholder: 'Nueva Contraseña',
        saveChanges: 'Guardar Cambios',
        startWebcam: 'Iniciar cámara web',
        sendMessagePlaceholder: 'Escribe un mensaje...',
        registerHeader: 'Registro',
        fullNamePlaceholder: 'Nombre de usuario',
        emailPlaceholder: 'Email',
        passwordPlaceholder: 'Nueva contraseña',
        registerButton: 'Registrarse',
        loginHeader: 'Iniciar Sesión',
        emailPlaceholder: 'Email',
        passwordPlaceholder: 'Contraseña',
        loginButton: 'Iniciar Sesión',
      // Agregar otros textos en español si es necesario
    },
    english: {
        welcome: 'Welcome',
        logout: 'Logout',
        profile: 'Profile',
        // Texts for the profile page
        profileHeader: 'PROFILE',
        newEmailPlaceholder: 'New Email',
        newUsernamePlaceholder: 'New Username',
        newPasswordPlaceholder: 'New Password',
        saveChanges: 'Save Changes',
        startWebcam: 'Start webcam',
        sendMessagePlaceholder: 'Write a message...',
        registerHeader: 'Register',
        fullNamePlaceholder: 'Full Name',
        emailPlaceholder: 'Email',
        passwordPlaceholder: 'New Password',
        registerButton: 'Register',
        loginHeader: 'Login',
        emailPlaceholder: 'Email',
        passwordPlaceholder: 'Password',
        loginButton: 'Login',
      // Add other texts in English if needed
    },
    // Add more languages if needed
  };
  
  let currentLanguage = languages.english; // Por defecto, inglés
  firebase.auth().onAuthStateChanged(function(user) {
    if (user) {
      // Usuario autenticado, obtener el idioma del usuario desde la base de datos
      const userId = user.uid;
  
      // Referencia a la base de datos donde se almacena el idioma del usuario
      const languageRef = firebase.database().ref('users/' + userId + '/country');
  
      // Obtener el idioma del usuario desde la base de datos
      languageRef.once('value', function(snapshot) {
        const userLanguage = snapshot.val();
  
        // Cambiar el idioma de la interfaz utilizando el idioma obtenido
        changeLanguage(userLanguage); // Ajusta la función changeLanguage() para cambiar según el idioma proporcionado
      });
    } else {
      // No hay usuario autenticado, redirigir o realizar acciones apropiadas
    }
  });
  function changeLanguage(language) {
    if (languages[language]) {
      currentLanguage = languages[language];
  
      // Cambiar textos específicos en la página de perfil
      const profileHeader = document.getElementById('form_header');
      if (profileHeader) {
        profileHeader.textContent = currentLanguage.profileHeader;
      }
  
      const emailInput = document.getElementById('email');
      if (emailInput) {
        emailInput.placeholder = currentLanguage.newEmailPlaceholder;
      }
  
      const usernameInput = document.getElementById('nombre');
      if (usernameInput) {
        usernameInput.placeholder = currentLanguage.newUsernamePlaceholder;
      }
  
      const NewpasswordInput = document.getElementById('new-password');
      if (NewpasswordInput) {
        NewpasswordInput.placeholder = currentLanguage.newPasswordPlaceholder;
      }
  
      const saveButton = document.querySelector('#edit-user-form button[type="submit"]');
      if (saveButton) {
        saveButton.textContent = currentLanguage.saveChanges;
      }

      const webcamButton = document.getElementById('webcamButton');
      if (webcamButton) {
        webcamButton.textContent = currentLanguage.startWebcam;
      }
      const messageInput = document.getElementById('messageInput');
    if (messageInput) {
      messageInput.placeholder = currentLanguage.sendMessagePlaceholder;
    }
    const registerHeader = document.getElementById('form_header');
    if (registerHeader) {
      registerHeader.textContent = currentLanguage.registerHeader;
    }

    const fullNameInput = document.getElementById('full_name');
    if (fullNameInput) {
      fullNameInput.placeholder = currentLanguage.fullNamePlaceholder;
    }
    
    const registerButton = document.querySelector('#button_container button');
    if (registerButton) {
      registerButton.textContent = currentLanguage.registerButton;
    }

    const passwordInput = document.getElementById('password');
    if (passwordInput) {
      passwordInput.placeholder = currentLanguage.passwordPlaceholder;
    }
      // Puedes agregar más cambios específicos para esta página si es necesario
    } else {
      console.error('El idioma seleccionado no está disponible');
    }
  }