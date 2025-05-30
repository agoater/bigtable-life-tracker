// Import required packages
const express = require('express');      // Web framework for HTTP server
const http = require('http');           // HTTP server functionality
const WebSocket = require('ws');        // WebSocket for real-time communication

// Initialize Express app and create HTTP server
const app = express();
const server = http.createServer(app);

// Create WebSocket server attached to HTTP server
const wss = new WebSocket.Server({ server });

// Store active game rooms
// Structure: { roomCode: { players: [], gameLog: [] } }
const rooms = {};

// Predefined colors for players (up to 6 players)
// Each player gets a different color based on join order
const playerColors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57', '#DDA0DD'];

// Generate a random 6-character room code
// Uses uppercase letters and numbers for easy sharing
function generateRoomCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

// Generate simple player ID
// Uses a counter to create unique IDs like player1, player2, etc.
let playerIdCounter = 1;
function generatePlayerId() {
    return `player${playerIdCounter++}`;
}

// Handle new WebSocket connections
// This runs every time a player connects to the server
wss.on('connection', (ws) => {
    // Assign unique ID to this player
    let playerId = generatePlayerId();

    // Track which room this player is in (null until they join/create)
    let currentRoomCode = null;

    // Handle messages from this player
    ws.on('message', (message) => {
        // Parse the JSON message from client
        const data = JSON.parse(message);

        // Handle different message types
        switch (data.type) {
            case 'CREATE_ROOM':
                // Generate new unique room code
                const roomCode = generateRoomCode();

                // Create new room object with empty players and log
                rooms[roomCode] = {
                    players: [],
                    gameLog: []
                };

                // Create the first player (room creator)
                const creator = {
                    id: playerId,
                    name: 'Player 1',           // Default name
                    life: 40,                   // Starting life for commander
                    color: playerColors[0],     // First color (red)
                    commanderDamage: {},        // Track damage from each opponent
                    ws: ws                      // WebSocket connection for sending messages
                };

                // Add creator to room
                rooms[roomCode].players.push(creator);
                currentRoomCode = roomCode;

                // Send room creation confirmation to creator
                ws.send(JSON.stringify({
                    type: 'ROOM_CREATED',
                    roomCode: roomCode,
                    playerId: playerId,
                    gameState: getGameState(roomCode)
                }));

                // Log room creation
                addToLog(roomCode, `${creator.name} created the game`);
                break;

            case 'JOIN_ROOM':
                const joinCode = data.roomCode;

                // Validate room exists
                if (!rooms[joinCode]) {
                    ws.send(JSON.stringify({
                        type: 'ERROR',
                        message: 'Room not found'
                    }));
                    return;
                }

                // Check room capacity (max 6 players)
                if (rooms[joinCode].players.length >= 6) {
                    ws.send(JSON.stringify({
                        type: 'ERROR',
                        message: 'Room is full'
                    }));
                    return;
                }

                // Create new player object
                const newPlayer = {
                    id: playerId,
                    // Name based on join order (Player 2, Player 3, etc.)
                    name: `Player ${rooms[joinCode].players.length + 1}`,
                    life: 40,
                    // Assign next available color
                    color: playerColors[rooms[joinCode].players.length],
                    commanderDamage: {},
                    ws: ws
                };

                // Add player to room
                rooms[joinCode].players.push(newPlayer);
                currentRoomCode = joinCode;

                // Send join confirmation with current game state
                ws.send(JSON.stringify({
                    type: 'ROOM_JOINED',
                    playerId: playerId,
                    gameState: getGameState(joinCode)
                }));

                // Log join and update all other players
                addToLog(joinCode, `${newPlayer.name} joined the game`);
                broadcastGameState(joinCode);
                break;

            case 'UPDATE_LIFE':
                // Validate player is in a room
                if (!currentRoomCode || !rooms[currentRoomCode]) return;

                // Find the player whose life is changing
                const player = rooms[currentRoomCode].players.find(p => p.id === data.playerId);
                if (player) {
                    // Track old life for logging
                    const oldLife = player.life;
                    // Update to new life total
                    player.life = data.life;
                    // Calculate change for log message
                    const change = data.life - oldLife;
                    const changeStr = change > 0 ? `+${change}` : `${change}`;

                    // Log the life change
                    addToLog(currentRoomCode, `${player.name}: ${oldLife} → ${data.life} (${changeStr})`);
                    // Update all players with new game state
                    broadcastGameState(currentRoomCode);
                }
                break;

            case 'UPDATE_COMMANDER_DAMAGE':
                if (!currentRoomCode || !rooms[currentRoomCode]) return;

                // Find both players involved in commander damage
                const targetPlayer = rooms[currentRoomCode].players.find(p => p.id === data.targetPlayerId);
                const sourcePlayer = rooms[currentRoomCode].players.find(p => p.id === data.sourcePlayerId);

                if (targetPlayer && sourcePlayer) {
                    // Update commander damage tracking
                    // targetPlayer.commanderDamage[sourceId] = amount
                    targetPlayer.commanderDamage[data.sourcePlayerId] = data.damage;

                    // Log the damage update
                    addToLog(currentRoomCode, `${sourcePlayer.name} dealt ${data.damage} commander damage to ${targetPlayer.name}`);
                    // Update all players
                    broadcastGameState(currentRoomCode);
                }
                break;

            case 'UPDATE_NAME':
                if (!currentRoomCode || !rooms[currentRoomCode]) return;

                // Find player to rename
                const playerToRename = rooms[currentRoomCode].players.find(p => p.id === data.playerId);
                if (playerToRename) {
                    // Store old name for log
                    const oldName = playerToRename.name;
                    // Update to new name
                    playerToRename.name = data.name;

                    // Log name change
                    addToLog(currentRoomCode, `${oldName} changed name to ${data.name}`);
                    // Update all players
                    broadcastGameState(currentRoomCode);
                }
                break;

            case 'RESET_GAME':
                if (!currentRoomCode || !rooms[currentRoomCode]) return;

                // Reset all players to starting state
                rooms[currentRoomCode].players.forEach(player => {
                    player.life = 40;               // Reset to starting life
                    player.commanderDamage = {};    // Clear all commander damage
                });

                // Clear game log and add reset message
                rooms[currentRoomCode].gameLog = [];
                addToLog(currentRoomCode, 'Game reset');

                // Update all players with reset state
                broadcastGameState(currentRoomCode);
                break;
        }
    });

    // Handle player disconnection
    ws.on('close', () => {
        if (currentRoomCode && rooms[currentRoomCode]) {
            // Remove disconnected player from room
            rooms[currentRoomCode].players = rooms[currentRoomCode].players.filter(p => p.id !== playerId);

            // Clean up empty rooms
            if (rooms[currentRoomCode].players.length === 0) {
                delete rooms[currentRoomCode];
            } else {
                // Update remaining players that someone left
                broadcastGameState(currentRoomCode);
            }
        }
    });
});

// Helper function to get clean game state (without WebSocket references)
// This creates a safe version of game state to send to clients
function getGameState(roomCode) {
    if (!rooms[roomCode]) return null;

    return {
        // Map players to remove WebSocket connection (can't serialize ws)
        players: rooms[roomCode].players.map(p => ({
            id: p.id,
            name: p.name,
            life: p.life,
            color: p.color,
            commanderDamage: p.commanderDamage
            // Note: ws is intentionally excluded
        })),
        gameLog: rooms[roomCode].gameLog
    };
}

// Helper function to send updated game state to all players in a room
function broadcastGameState(roomCode) {
    if (!rooms[roomCode]) return;

    // Get clean game state
    const gameState = getGameState(roomCode);

    // Send to each connected player in the room
    rooms[roomCode].players.forEach(player => {
        // Check if player's WebSocket is still open
        if (player.ws.readyState === WebSocket.OPEN) {
            player.ws.send(JSON.stringify({
                type: 'GAME_UPDATE',
                gameState: gameState
            }));
        }
    });
}

// Helper function to add entries to game log
function addToLog(roomCode, message) {
    if (!rooms[roomCode]) return;

    // Add new log entry with timestamp
    rooms[roomCode].gameLog.push({
        time: new Date().toLocaleTimeString(),  // Format: "1:23:45 PM"
        message: message
    });

    // Limit log size to prevent memory issues
    // Remove oldest entry if over 50 messages
    if (rooms[roomCode].gameLog.length > 50) {
        rooms[roomCode].gameLog.shift();  // Remove first (oldest) entry
    }
}

// Basic HTTP endpoint for health checks
// Visit http://localhost:3000 to see server status
app.get('/', (req, res) => {
    res.json({
        status: 'bigtable Life Tracker Server Running',
        activeRooms: Object.keys(rooms).length  // Show number of active games
    });
});

// Start the server
const PORT = process.env.PORT || 3000;  // Use environment port or default to 3000
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});