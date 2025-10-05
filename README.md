# LockedIn - AI-Powered Focus Assistant

**LockedIn** is an intelligent desktop application designed to help you maintain focus and productivity during study or work sessions, with particular benefits for individuals with ADHD. The app uses AI-powered computer vision to monitor your attention and automatically redirects you back to your work when you get distracted.

## 🎯 Purpose

LockedIn helps you "lock in" to your work by:

- **Real-time Focus Monitoring**: Continuously captures your webcam feed to detect when you're looking away, checking your phone, or getting distracted
- **Smart Notifications**: Provides gentle reminders and motivational messages to bring your attention back to your task
- **Session Tracking**: Tracks your focused time and shows your progress, encouraging you to maintain concentration
- **Customizable Sessions**: Set your own study intentions and session durations (up to 60 minutes)
- **ADHD Support**: Particularly helpful for individuals with ADHD by providing external accountability and gentle redirection when attention wanders

## 🔧 Tech Stack

### Frontend
- **Electron** - Cross-platform desktop app framework
- **React 19** - Modern UI library with hooks
- **TypeScript** - Type-safe JavaScript development
- **Vite** - Fast build tool and development server
- **Framer Motion** - Smooth animations and transitions

### AI & Vision
- **Google Gemini 2.5 Flash** - Multimodal AI for image analysis and focus detection
- **Computer Vision** - Real-time webcam analysis for attention tracking
- **Screenshot Analysis** - Desktop screen monitoring for context-aware notifications

### Backend & Services
- **Node.js** - Runtime environment
- **IPC Communication** - Secure communication between main and renderer processes
- **Electron Store** - Persistent data storage
- **Dotenv** - Environment variable management

### Development Tools
- **ESLint** - Code linting and formatting
- **Prettier** - Code formatting
- **Electron Builder** - Application packaging and distribution

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn
- A Google Gemini API key

### Setup Instructions

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd lockedin
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   Create a `.env` file in the root directory:
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   ```

4. **Run the application**
   
   For development:
   ```bash
   npm run dev
   ```
   
   For production build:
   ```bash
   npm run build
   npm start
   ```

## 📱 How It Works

1. **Session Setup**: Enter your study intention and set a session duration
2. **Focus Monitoring**: The app starts monitoring your webcam and desktop
3. **AI Analysis**: Google Gemini analyzes your behavior in real-time
4. **Smart Alerts**: When distraction is detected, you receive gentle notifications
5. **Progress Tracking**: Your focused time is tracked and displayed
6. **Session Completion**: View your achievements and focused time when done

## 🎮 Features

- **Vision-Based Focus Detection**: Uses AI to determine if you're focused or distracted
- **Real-Time Feedback**: Immediate notifications when attention drifts
- **Session Management**: Customizable study sessions with progress tracking
- **Minimizable Interface**: Hide the app while maintaining focus monitoring
- **Duration Display**: Shows how much focused time you've accumulated
- **Cross-Platform**: Works on Windows, macOS, and Linux

## 🏗️ Build Commands

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run build:win` - Build Windows executable
- `npm run build:mac` - Build macOS application
- `npm run build:linux` - Build Linux executable

## 🔒 Privacy & Security

- All image processing is done locally or through secure API calls
- No personal data is stored permanently
- Webcam access is only used for focus detection
- Screenshots are processed in real-time and not saved

---
