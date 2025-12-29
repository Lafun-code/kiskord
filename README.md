# Kiskord Voice

A lightweight, open-source, web-based voice chat application built with React, Vite, Tailwind CSS, and Firebase.

## Features

- **User Identity**: Anonymous login with a display name.
- **Room Management**: Create and join rooms with unique IDs.
- **Real-time Voice**: Peer-to-Peer (P2P) audio streaming using WebRTC.
- **Signaling**: Firebase Firestore used for SDP and ICE candidate exchange.
- **Minimalist UI**: Clean, dark-themed interface with visual feedback.
- **Microphone Control**: Mute/Unmute functionality.

## Prerequisites

- Node.js (v14 or higher)
- A Firebase Project

## Setup

1.  **Clone the repository** (if applicable).
2.  **Install dependencies**:
    ```bash
    npm install
    ```
3.  **Configure Firebase**:
    - Go to the [Firebase Console](https://console.firebase.google.com/).
    - Create a new project.
    - Enable **Authentication** and set up **Anonymous** sign-in method.
    - Enable **Firestore Database** (start in Test mode for development).
    - Copy your web app configuration.
    - Open `src/firebase.ts` and replace the placeholder config with your own.

4.  **Run the development server**:
    ```bash
    npm run dev
    ```

## Architecture

- **Frontend**: React + Vite + TypeScript
- **Styling**: Tailwind CSS
- **State Management**: React Context (Auth) + Hooks (WebRTC)
- **Signaling**: Firestore Collections
    - `rooms/{roomId}/participants/{userId}`: User presence
    - `rooms/{roomId}/participants/{userId}/incoming_offers`: Signaling offers
    - `rooms/{roomId}/participants/{userId}/incoming_answers`: Signaling answers
    - `rooms/{roomId}/participants/{userId}/incoming_ice`: ICE candidates

## License

MIT
