# bigtable Life Tracker

A real-time multiplayer life tracking app for Magic: The Gathering, built with React Native and WebSockets. Track life totals, commander damage, and turn order across multiple devices without reaching across the table!

![bigtable Life Tracker Demo](https://img.shields.io/badge/Players-Up%20to%206-green)
![Platform](https://img.shields.io/badge/Platform-iOS%20%7C%20Android-blue)
![Real-time](https://img.shields.io/badge/Sync-Real--time-orange)

## Features

### Core Features
- **Local Multiplayer** - Up to 6 players per room
- **Real-time Sync** - All changes instantly reflected on all devices
- **Room Codes** - Simple 6-character codes for easy joining
- **Life Tracking** - Simple +/- buttons for life changes
- **Commander Damage** - Track this damage from each opponent (automatically reduces life total)
- **Game History** - Complete log of all game actions
- **Player Customization** - Custom names with preset colors

### User Experience
- Clean, intuitive interface
- Large touch targets for easy interaction
- Simple and straightforward design

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Expo Go app on your phone ([iOS](https://apps.apple.com/app/expo-go/id982107779) / [Android](https://play.google.com/store/apps/details?id=host.exp.exponent))
- Devices on the same WiFi network

## Installation

### 1. Clone the Repository
```bash
git clone https://github.com/agoater/bigtable-life-tracker.git
cd bigtable-life-tracker
```

### 2. Set Up Backend Server

```bash
# Navigate to backend directory
cd backend

# Install dependencies (simpler method)
npm install express ws

# Start the server
node server.js
```

The server will run on port 3000.

### 3. Set Up Mobile App

In a new terminal:

```bash
# Navigate to app directory
cd app

# Install dependencies
npm install

# Get your computer's IP address
# macOS/Linux:
ifconfig | grep "inet " | grep -v 127.0.0.1
# Windows:
ipconfig

# Update App.js with your IP address
# Change line 13: const WS_URL = 'ws://YOUR_IP_HERE:3000';
# Example: const WS_URL = 'ws://192.168.1.100:3000';

# Start the app
npx expo start
```

### 4. Connect Your Phone

1. Ensure your phone and computer are on the same WiFi network
2. Open Expo Go app on your phone
3. Scan the QR code shown in the terminal
4. The app will load on your device

## Usage

### Creating a Game
1. Tap "Create New Game"
2. Share the 6-character room code with other players
3. Start tracking life totals!

### Joining a Game
1. Enter the room code
2. Tap "Join Game"
3. You're connected!

### Game Controls
- **Life Total** - Tap +/- buttons to adjust life
- **Change Name** - Tap your player name
- **Commander Damage** - Tap opponent's card to track damage (automatically reduces their life)
- **📜** - View game log history
- **🔄** - Reset all life totals

## Project Structure
```
bigtable-life-tracker/
├── backend/
│   ├── server.js        # WebSocket server
│   └── package.json     # Backend dependencies
└── app/
    ├── App.js           # Main React Native app
    └── package.json     # App dependencies
```

## Technical Details

### Backend
- **Node.js** with Express
- **WebSocket** (ws) for real-time communication
- Simple player ID generation
- Rooms persist until all players leave

### Frontend
- **React Native** with JavaScript
- **Expo** for easy development and deployment
- **WebSocket** client for real-time updates
- Responsive design for various screen sizes

## Customization

### Changing Starting Life
In `backend/server.js`, modify the player creation sections:
```javascript
life: 40,  // Change to 20 for standard games
```

### Modifying Player Colors
In `backend/server.js`, modify the `playerColors` array at the top:
```javascript
const playerColors = [
  '#FF6B6B', // Add your custom colors here
  // ...
];
```

## Troubleshooting

### Connection Issues
- Ensure your phone and computer are on the same WiFi network
- Check that your IP address in `WS_URL` is correct
- Try restarting the server if players can't connect
- Visit `http://YOUR_IP:3000` in a browser to verify server is running

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## Acknowledgments

- Built for the MTG community and my friends with big tables
- Inspired by the need for better life tracking at said BIG tables

## Support

If you encounter any issues or have questions:
1. Check the [Issues](https://github.com/agoater/bigtable-life-tracker/issues) page
2. Create a new issue with details about your problem
3. Include your device type and OS version

---