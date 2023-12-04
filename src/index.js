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

// Set up our register function
function register () {
  // Get all our input fields
  email = document.getElementById('email').value
  password = document.getElementById('password').value
  full_name = document.getElementById('full_name').value
  favourite_song = document.getElementById('favourite_song').value
  milk_before_cereal = document.getElementById('milk_before_cereal').value

  // Validate input fields
  if (validate_email(email) == false || validate_password(password) == false) {
    alert('Email or Password is Outta Line!!')
    return
    // Don't continue running the code
  }
  if (validate_field(full_name) == false || validate_field(favourite_song) == false || validate_field(milk_before_cereal) == false) {
    alert('One or More Extra Fields is Outta Line!!')
    return
  }
 
  // Move on with Auth
  auth.createUserWithEmailAndPassword(email, password)
  .then(function() {
    // Declare user variable
    var user = auth.currentUser

    // Add this user to Firebase Database
    var database_ref = database.ref()

    // Create User data
    var user_data = {
      email : email,
      full_name : full_name,
      favourite_song : favourite_song,
      milk_before_cereal : milk_before_cereal,
      last_login : Date.now()
    }

    // Push to Firebase Database
    database_ref.child('users/' + user.uid).set(user_data)
    .then(function() {
      alert('User Created!!');
      window.location.href = 'login.html'; // Redirección aquí
    })
    // DOne
  })
  .catch(function(error) {
    // Firebase will use this to alert of its errors
    var error_code = error.code
    var error_message = error.message

    alert(error_message)
  })
}

// Set up our login function
function login() {
  // Obtener valores de los campos de entrada
  let email = document.getElementById('email').value;
  let password = document.getElementById('password').value;

  // Validar campos de entrada
  if (validate_email(email) == false || validate_password(password) == false) {
      alert('Email o Contraseña incorrectos.');
      return;
  }

  auth.signInWithEmailAndPassword(email, password)
    .then(function () {
      console.log('Inicio de sesión exitoso');
      // Obtener información del usuario actual
      var user = auth.currentUser;
      var userRef = database.ref('users/' + user.uid);

      // Obtener datos del usuario desde Firebase
      userRef.once('value', function (snapshot) {
          var userData = snapshot.val();
          if (userData) {
            // Almacenar datos del usuario en localStorage
            localStorage.setItem('userEmail', userData.email);
            localStorage.setItem('userName', userData.full_name);
          }

      // Redireccionar después del inicio de sesión y obtención de datos del usuario
      window.location.href = 'index.html';
    });
  })
  .catch(function (error) {
    var errorCode = error.code;
    var errorMessage = error.message;
    console.error('Error al iniciar sesión:', errorMessage);
    alert(errorMessage);
  });
}





// Validate Functions
function validate_email(email) {
  expression = /^[^@]+@\w+(\.\w+)+\w$/
  if (expression.test(email) == true) {
    // Email is good
    return true
  } else {
    // Email is not good
    return false
  }
}

function validate_password(password) {
  // Firebase only accepts lengths greater than 6
  if (password < 6) {
    return false
  } else {
    return true
  }
}

function validate_field(field) {
  if (field == null) {
    return false
  }

  if (field.length <= 0) {
    return false
  } else {
    return true
  }
}

function logout(){
  firebase.auth().signOut();
}

function forgotPassword() {
  let email = document.getElementById('email').value;

  if (validate_email(email)) {
    auth.sendPasswordResetEmail(email)
      .then(function() {
        alert('Se ha enviado un correo para restablecer tu contraseña. Por favor, revisa tu bandeja de entrada.');
        // Redirigir a la página de inicio de sesión o a otra página relevante después del envío del correo
        window.location.href = 'login.html';
      })
      .catch(function(error) {
        var errorMessage = error.message;
        console.error('Error al enviar el correo de restablecimiento de contraseña:', errorMessage);
        alert(errorMessage);
      });
  } else {
    alert('Ingrese un correo electrónico válido.');
  }
}