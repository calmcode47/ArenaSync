import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyBUeLEKLC-3ltVxcJQJHAmlF6X3VKFcOec",
  authDomain: "flowarena-694a7.firebaseapp.com",
  databaseURL: "https://flowarena-694a7-default-rtdb.firebaseio.com",
  projectId: "flowarena-694a7",
  storageBucket: "flowarena-694a7.firebasestorage.app",
  messagingSenderId: "1083152733683",
  appId: "1:1083152733683:web:2bea2da349c19c29002e86",
  measurementId: "G-HSC6KSYQVH"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const analytics = getAnalytics(app);
export default app;
