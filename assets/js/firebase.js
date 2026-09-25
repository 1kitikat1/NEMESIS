
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyDXS8HUHbBbOL-QYydOwU09Sirq1mWFK1o",
  authDomain: "nemkaclient.firebaseapp.com",
  databaseURL: "https://nemkaclient-default-rtdb.firebaseio.com",
  projectId: "nemkaclient",
  storageBucket: "nemkaclient.firebasestorage.app",
  messagingSenderId: "848342171221",
  appId: "1:848342171221:web:73d31a7481ee2f06755edc",
  measurementId: "G-GWXXKT1V38"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getDatabase(app);
