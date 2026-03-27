import { initializeApp } from "firebase/app"
import { getAuth, setPersistence, browserLocalPersistence } from "firebase/auth"
import { getAnalytics } from "firebase/analytics"
import { getFirestore } from "firebase/firestore"

const firebaseConfig = {
  apiKey: "AIzaSyB9Hivu5Ivk0Mejxlp82O7UzYXVI6MSNQ4",
  authDomain: "vibeflow-bc788.firebaseapp.com",
  projectId: "vibeflow-bc788",
  storageBucket: "vibeflow-bc788.firebasestorage.app",
  messagingSenderId: "764593296690",
  appId: "1:764593296690:web:15178a200ccd6d371a732b",
  measurementId: "G-WQ0WN84FCZ"
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)

// Initialize Firebase Authentication with persistence
export const auth = getAuth(app)

// Initialize Firestore Database
export const db = getFirestore(app)

// Set persistence to LOCAL so users stay logged in after refresh
setPersistence(auth, browserLocalPersistence).catch((error) => {
  console.error("Error setting auth persistence:", error)
})

// Initialize Analytics (only in browser)
export const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null

export default app