# 🎙️ Kiskord Voice

> A lightweight, privacy-focused, P2P voice chat application with professional audio processing

[![React](https://img.shields.io/badge/React-18-blue.svg)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
[![WebRTC](https://img.shields.io/badge/WebRTC-P2P-green.svg)](https://webrtc.org/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Netlify Status](https://api.netlify.com/api/v1/badges/YOUR_SITE_ID/deploy-status)](https://app.netlify.com/sites/kiskord/deploys)

**Kiskord** is a modern, browser-based voice chat application that enables crystal-clear P2P audio communication without requiring account registration. Built with cutting-edge web technologies, it offers Discord-quality audio processing directly in your browser.

## 🌐 Live Demo

**Try it now:** [https://kiskord.netlify.app/](https://kiskord.netlify.app/)

No installation required - just open the link and start chatting!

## ✨ Features

### 🔒 Privacy First
- **No Sign-up Required**: Anonymous login with just a display name
- **Peer-to-Peer**: Direct audio streams between users, no server intermediary
- **No Data Storage**: Audio streams are never recorded or stored

### 🎵 Professional Audio Quality
- **RNNoise Integration**: AI-powered noise suppression
- **Advanced Audio Chain**: High-pass filter, noise gate, EQ, de-esser, and limiter
- **Multiple Quality Modes**: Basic, Balanced, Professional, and Ultra (Discord-level)
- **Voice Activity Detection**: Automatic silence detection and gating
- **Echo Cancellation**: Built-in acoustic echo cancellation

### 💬 Real-time Features
- **Instant Room Creation**: Generate and share unique room IDs
- **Visual Feedback**: Speaking indicators and voice level meters
- **Connection Monitoring**: Real-time connection status display
- **Self-Monitoring**: Optional audio loopback for mic monitoring

### 🎨 Modern UI/UX
- **Dark Theme**: Eye-friendly interface with smooth animations
- **Responsive Design**: Works on desktop and mobile devices
- **Real-time Updates**: Live participant list and status updates
- **Accessible**: Keyboard navigation and screen reader support

## 🚀 Quick Start

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- A Firebase Project (free tier works fine)

### Installation

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/Lafun-code/kiskord.git
    cd kiskord
    ```

2.  **Install dependencies**:
    ```bash
    npm install
    ```

3.  **Configure Firebase**:
    - Go to the [Firebase Console](https://console.firebase.google.com/)
    - Create a new project
    - Enable **Authentication** → Set up **Anonymous** sign-in method
    - Enable **Firestore Database** (start in Test mode for development)
    - Copy your web app configuration
    - Create `.env` file in the root directory:
      ```env
      VITE_FIREBASE_API_KEY=your_api_key
      VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
      VITE_FIREBASE_PROJECT_ID=your_project_id
      VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
      VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
      VITE_FIREBASE_APP_ID=your_app_id
      ```
    - Or update `src/firebase.ts` directly with your config

4.  **Run the development server**:
    ```bash
    npm run dev
    ```

5.  **Open your browser**:
    ```
    http://localhost:5173
    ```

### Production Build

```bash
npm run build
npm run preview
```

## 🏗️ Tech Stack

| Technology | Purpose |
|------------|---------|
| **React 18** | UI Framework |
| **TypeScript** | Type Safety |
| **Vite** | Build Tool & Dev Server |
| **Tailwind CSS** | Styling |
| **WebRTC** | Peer-to-Peer Audio |
| **Firebase** | Authentication & Signaling |
| **RNNoise** | AI Noise Suppression |
| **Web Audio API** | Audio Processing |

## 📁 Project Structure

```
kiskord/
├── public/
│   └── rnnoise/          # RNNoise WASM and AudioWorklet
├── src/
│   ├── components/       # React components
│   │   ├── ui/          # Reusable UI components
│   │   └── chat/        # Chat features
│   ├── context/         # React Context providers
│   ├── hooks/           # Custom React hooks
│   │   └── useWebRTC.ts # Main WebRTC logic
│   ├── pages/           # Page components
│   ├── utils/           # Utility functions
│   │   └── audioProcessor.ts # Audio processing chain
│   └── types.ts         # TypeScript definitions
└── ...
```

## 🎯 How It Works

### Audio Processing Pipeline

```
Microphone Input
    ↓
DC Blocker (removes DC offset)
    ↓
Aggressive High-Pass Filter (removes low-frequency noise)
    ↓
Spectral Gate (ultra mode only - removes background noise)
    ↓
High-Pass Filter (fan/AC noise removal)
    ↓
Noise Gate (silence detection)
    ↓
RNNoise (AI-powered noise suppression)
    ↓
Voice EQ (clarity enhancement)
    ↓
De-Esser (sibilance reduction)
    ↓
Compressor (dynamic range control)
    ↓
Limiter (peak protection)
    ↓
Output Gain
    ↓
WebRTC → Peer Connection
```

### Signaling Architecture

- **Frontend**: React + Vite + TypeScript
- **Styling**: Tailwind CSS
- **State Management**: React Context (Auth) + Hooks (WebRTC)
- **Signaling**: Firestore Collections
    - `rooms/{roomId}/participants/{userId}`: User presence
    - `rooms/{roomId}/participants/{userId}/incoming_offers`: Signaling offers
    - `rooms/{roomId}/participants/{userId}/incoming_answers`: Signaling answers
    - `rooms/{roomId}/participants/{userId}/incoming_ice`: ICE candidates

## 🎮 Usage

1. **Create a Room**: Enter your name and click "Create New Room"
2. **Share the Room ID**: Copy the URL or room ID and share with others
3. **Join the Room**: Others can join by entering the room ID
4. **Start Talking**: Grant microphone permission and start chatting!

## 🔧 Configuration

### Audio Quality Modes

You can configure audio quality in `src/pages/Room.tsx`:

- **Basic**: Standard browser audio processing
- **Balanced**: RNNoise + basic processing (recommended)
- **Professional**: Full audio chain with EQ and compression
- **Ultra**: Discord-level quality with aggressive noise reduction

### Environment Variables

```env
VITE_DEBUG=false              # Enable debug logging
VITE_FIREBASE_API_KEY=...     # Firebase config
# ... other Firebase settings
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [RNNoise](https://github.com/xiph/rnnoise) - Deep learning-based noise suppression
- [WebRTC](https://webrtc.org/) - Real-time communication APIs
- [Firebase](https://firebase.google.com/) - Backend infrastructure
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS framework

## 📧 Contact

Project Link: [https://github.com/Lafun-code/kiskord](https://github.com/Lafun-code/kiskord)

## 🌟 Star History

If you find this project useful, please consider giving it a star! ⭐

---

**Made with ❤️ by the Kiskord Team**
