/**
 * Firebase Configuration for Dots and Lines
 * Project: dots-and-lines-game
 */

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDqd1RIthPq9fa3MuVrNc4Iu5jOL5wLLrs",
  authDomain: "dots-and-lines-game.firebaseapp.com",
  databaseURL: "https://dots-and-lines-game-default-rtdb.firebaseio.com",
  projectId: "dots-and-lines-game",
  storageBucket: "dots-and-lines-game.firebasestorage.app",
  messagingSenderId: "176209635268",
  appId: "1:176209635268:web:26648016869663f4a8e691"
};

// Initialize Firebase
let app, database, auth;

function initializeFirebase() {
  try {
    app = firebase.initializeApp(firebaseConfig);
    database = firebase.database();
    auth = firebase.auth();
    console.log('Firebase initialized successfully');
    return true;
  } catch (error) {
    console.error('Firebase initialization error:', error);
    return false;
  }
}

// Sign in anonymously
async function signInAnonymously() {
  try {
    const userCredential = await auth.signInAnonymously();
    console.log('Signed in anonymously:', userCredential.user.uid);
    return userCredential.user;
  } catch (error) {
    console.error('Anonymous sign-in error:', error);
    throw error;
  }
}

// Get current user
function getCurrentUser() {
  return auth.currentUser;
}

// Database helpers
function getGameRef(gameId) {
  return database.ref(`games/${gameId}`);
}

function generateGameCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed confusing chars (0,O,1,I)
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Export for use in other modules
window.FirebaseService = {
  init: initializeFirebase,
  signIn: signInAnonymously,
  getUser: getCurrentUser,
  getGameRef: getGameRef,
  generateCode: generateGameCode,
  database: () => database,
  auth: () => auth
};
