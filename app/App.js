import React, { useState, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  SafeAreaView,
  StatusBar,
  Modal,
  FlatList,
} from 'react-native';

// CHANGE THIS TO YOUR SERVER IP!
// Find your IP using: ifconfig | grep "inet " | grep -v 127.0.0.1
// Example: const WS_URL = 'ws://192.168.1.100:3000';
const WS_URL = 'ws://localhost:3000';

export default function App() {
  // State variables to manage the app
  const [connected, setConnected] = useState(false); // WebSocket connection status
  const [roomCode, setRoomCode] = useState(''); // Current room code
  const [inputRoomCode, setInputRoomCode] = useState(''); // User input for joining room
  const [gameState, setGameState] = useState(null); // Complete game state from server
  const [myPlayerId, setMyPlayerId] = useState(''); // This player's ID
  const [showLog, setShowLog] = useState(false); // Show/hide game log modal
  const [showCommanderDamage, setShowCommanderDamage] = useState(false); // Show/hide commander damage modal
  const [selectedPlayer, setSelectedPlayer] = useState(null); // Player selected for commander damage

  // useRef to persist WebSocket connection across re-renders
  const ws = useRef(null);

  // Function to establish WebSocket connection to the backend server
  const connectToServer = () => {
    // Create new WebSocket connection
    ws.current = new WebSocket(WS_URL);

    // When connection opens successfully
    ws.current.onopen = () => {
      console.log('Connected to server');
      setConnected(true);
    };

    // Handle incoming messages from server
    ws.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log('Received:', data.type);

      // Process different message types from server
      switch (data.type) {
        case 'ROOM_CREATED':
          // Room was successfully created
          setRoomCode(data.roomCode);
          setMyPlayerId(data.playerId);
          setGameState(data.gameState);
          break;

        case 'ROOM_JOINED':
          // Successfully joined an existing room
          setMyPlayerId(data.playerId);
          setGameState(data.gameState);
          break;

        case 'GAME_UPDATE':
          // Game state has changed (life, names, etc.)
          setGameState(data.gameState);
          break;

        case 'ERROR':
          // Server sent an error message
          Alert.alert('Error', data.message);
          break;
      }
    };

    // Handle connection errors
    ws.current.onerror = (error) => {
      console.error('WebSocket error:', error);
      Alert.alert('Connection Error', 'Could not connect to server');
    };

    // Handle connection closing
    ws.current.onclose = () => {
      console.log('Disconnected from server');
      setConnected(false);
      setGameState(null);
      setRoomCode('');
    };
  };

  // Create a new game room
  const createRoom = () => {
    if (!connected) {
      // Not connected yet, so connect first
      connectToServer();
      // Wait a bit for connection to establish
      setTimeout(() => {
        if (ws.current && ws.current.readyState === WebSocket.OPEN) {
          ws.current.send(JSON.stringify({ type: 'CREATE_ROOM' }));
        }
      }, 500);
    } else {
      // Already connected, just create room
      ws.current.send(JSON.stringify({ type: 'CREATE_ROOM' }));
    }
  };

  // Join an existing game room
  const joinRoom = () => {
    // Validate room code input
    if (!inputRoomCode) {
      Alert.alert('Error', 'Please enter a room code');
      return;
    }

    if (!connected) {
      // Not connected yet, so connect first
      connectToServer();
      setTimeout(() => {
        if (ws.current && ws.current.readyState === WebSocket.OPEN) {
          ws.current.send(JSON.stringify({
            type: 'JOIN_ROOM',
            roomCode: inputRoomCode.toUpperCase()
          }));
          setRoomCode(inputRoomCode.toUpperCase());
        }
      }, 500);
    } else {
      // Already connected, just join room
      ws.current.send(JSON.stringify({
        type: 'JOIN_ROOM',
        roomCode: inputRoomCode.toUpperCase()
      }));
      setRoomCode(inputRoomCode.toUpperCase());
    }
  };

  // Update a player's life total
  const updateLife = (playerId, change) => {
    // Find the player to get their current life
    const player = gameState.players.find(p => p.id === playerId);
    if (!player) return;

    // Calculate new life total (minimum 0)
    const newLife = Math.max(0, player.life + change);

    // Send update to server
    ws.current.send(JSON.stringify({
      type: 'UPDATE_LIFE',
      playerId: playerId,
      life: newLife
    }));
  };

  // Update commander damage between two players
  const updateCommanderDamage = (sourceId, targetId, damage) => {
    ws.current.send(JSON.stringify({
      type: 'UPDATE_COMMANDER_DAMAGE',
      sourcePlayerId: sourceId,
      targetPlayerId: targetId,
      damage: damage
    }));
  };

  // Change a player's name
  const changePlayerName = (playerId) => {
    const player = gameState.players.find(p => p.id === playerId);

    // Show native prompt for name input
    Alert.prompt(
      'Change Name',
      'Enter new name:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'OK',
          onPress: (name) => {
            // Only send if name is not empty
            if (name && name.trim()) {
              ws.current.send(JSON.stringify({
                type: 'UPDATE_NAME',
                playerId: playerId,
                name: name.trim()
              }));
            }
          }
        }
      ],
      'plain-text',
      player.name // Pre-fill with current name
    );
  };

  // Reset all players' life totals to 40
  const resetGame = () => {
    Alert.alert(
      'Reset Game',
      'Reset all life totals to 40?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            ws.current.send(JSON.stringify({ type: 'RESET_GAME' }));
          }
        }
      ]
    );
  };

  // Find the current player's data from the game state
  const myPlayer = gameState ? gameState.players.find(p => p.id === myPlayerId) : null;

  // MAIN MENU SCREEN - Shows when not in a game
  if (!gameState) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />
        <View style={styles.menuContainer}>
          <Text style={styles.title}>bigtable Life Tracker</Text>

          {/* Create new game button */}
          <TouchableOpacity style={styles.button} onPress={createRoom}>
            <Text style={styles.buttonText}>Create New Game</Text>
          </TouchableOpacity>

          <Text style={styles.orText}>OR</Text>

          {/* Room code input field */}
          <TextInput
            style={styles.input}
            value={inputRoomCode}
            onChangeText={setInputRoomCode}
            placeholder="Enter Room Code"
            placeholderTextColor="#666"
            autoCapitalize="characters"
            maxLength={6}
          />

          {/* Join game button */}
          <TouchableOpacity style={styles.button} onPress={joinRoom}>
            <Text style={styles.buttonText}>Join Game</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // GAME SCREEN - Shows when in a game
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Header with room code and action buttons */}
      <View style={styles.header}>
        <Text style={styles.roomCodeText}>Room: {roomCode}</Text>
        <View style={styles.headerButtons}>
          {/* Game log button */}
          <TouchableOpacity onPress={() => setShowLog(true)} style={styles.headerButton}>
            <Text style={styles.headerButtonText}>📜 Log</Text>
          </TouchableOpacity>
          {/* Reset game button */}
          <TouchableOpacity onPress={resetGame} style={styles.headerButton}>
            <Text style={styles.headerButtonText}>🔄 Reset</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Current player's life display */}
      {myPlayer && (
        <View style={[styles.myPlayerCard, { backgroundColor: myPlayer.color }]}>
          {/* Tap name to change it */}
          <TouchableOpacity onPress={() => changePlayerName(myPlayer.id)}>
            <Text style={styles.myPlayerName}>{myPlayer.name} (You)</Text>
          </TouchableOpacity>

          {/* Life counter controls */}
          <View style={styles.lifeContainer}>
            {/* Decrease life button */}
            <TouchableOpacity
              style={styles.lifeButton}
              onPress={() => updateLife(myPlayer.id, -1)}
            >
              <Text style={styles.lifeButtonText}>-</Text>
            </TouchableOpacity>

            {/* Life total display */}
            <Text style={styles.lifeText}>{myPlayer.life}</Text>

            {/* Increase life button */}
            <TouchableOpacity
              style={styles.lifeButton}
              onPress={() => updateLife(myPlayer.id, 1)}
            >
              <Text style={styles.lifeButtonText}>+</Text>
            </TouchableOpacity>
          </View>

          {/* Display commander damage taken (if any) */}
          {Object.keys(myPlayer.commanderDamage).length > 0 && (
            <View style={styles.damageInfo}>
              <Text style={styles.damageTitle}>Commander Damage:</Text>
              {Object.entries(myPlayer.commanderDamage).map(([sourceId, damage]) => {
                // Find the player who dealt this damage
                const source = gameState.players.find(p => p.id === sourceId);
                return (
                  <Text key={sourceId} style={styles.damageText}>
                    {source?.name}: {damage}
                  </Text>
                );
              })}
            </View>
          )}
        </View>
      )}

      {/* List of other players */}
      <ScrollView style={styles.playersContainer}>
        {gameState.players
          .filter(p => p.id !== myPlayerId) // Don't show current player in list
          .map(player => (
            <TouchableOpacity
              key={player.id}
              style={[styles.playerCard, { backgroundColor: player.color }]}
              onPress={() => {
                // Tap player to track commander damage to them
                setSelectedPlayer(player);
                setShowCommanderDamage(true);
              }}
            >
              <Text style={styles.playerName}>{player.name}</Text>
              <Text style={styles.playerLife}>{player.life}</Text>
            </TouchableOpacity>
          ))}
      </ScrollView>

      {/* GAME LOG MODAL - Shows history of all game actions */}
      <Modal visible={showLog} transparent animationType="slide">
        <View style={styles.modalBackground}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Game Log</Text>

            {/* List of log entries, newest first */}
            <FlatList
              data={gameState.gameLog.slice().reverse()} // Reverse to show newest first
              keyExtractor={(item, index) => index.toString()}
              renderItem={({ item }) => (
                <View style={styles.logItem}>
                  <Text style={styles.logTime}>{item.time}</Text>
                  <Text style={styles.logMessage}>{item.message}</Text>
                </View>
              )}
              style={styles.logList}
            />

            {/* Close button */}
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => setShowLog(false)}
            >
              <Text style={styles.buttonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* COMMANDER DAMAGE MODAL - Track damage dealt to selected player */}
      <Modal visible={showCommanderDamage} transparent animationType="slide">
        <View style={styles.modalBackground}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              Commander Damage to {selectedPlayer?.name}
            </Text>

            {myPlayer && selectedPlayer && (
              <View style={styles.damageControl}>
                <Text style={styles.damageLabel}>From {myPlayer.name}:</Text>

                {/* Commander damage adjustment controls */}
                <View style={styles.damageButtons}>
                  {/* Decrease damage button */}
                  <TouchableOpacity
                    style={styles.damageButton}
                    onPress={() => {
                      const current = selectedPlayer.commanderDamage[myPlayer.id] || 0;
                      if (current > 0) {
                        updateCommanderDamage(myPlayer.id, selectedPlayer.id, current - 1);
                      }
                    }}
                  >
                    <Text style={styles.damageButtonText}>-</Text>
                  </TouchableOpacity>

                  {/* Current damage amount */}
                  <Text style={styles.damageAmount}>
                    {selectedPlayer?.commanderDamage[myPlayer.id] || 0}
                  </Text>

                  {/* Increase damage button */}
                  <TouchableOpacity
                    style={styles.damageButton}
                    onPress={() => {
                      const current = selectedPlayer.commanderDamage[myPlayer.id] || 0;
                      updateCommanderDamage(myPlayer.id, selectedPlayer.id, current + 1);
                    }}
                  >
                    <Text style={styles.damageButtonText}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Close button */}
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => setShowCommanderDamage(false)}
            >
              <Text style={styles.buttonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// Styles for all components
const styles = StyleSheet.create({
  // Main container - dark background
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  // Menu screen styles
  menuContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 50,
  },
  // Button styles used throughout app
  button: {
    backgroundColor: '#4ECDC4',
    padding: 15,
    borderRadius: 10,
    marginVertical: 10,
    minWidth: 200,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  orText: {
    color: '#666',
    fontSize: 16,
    marginVertical: 20,
  },
  // Room code input field
  input: {
    backgroundColor: '#2a2a2a',
    color: '#fff',
    padding: 15,
    borderRadius: 10,
    fontSize: 18,
    width: 200,
    textAlign: 'center',
  },
  // Game screen header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#2a2a2a',
  },
  roomCodeText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerButtons: {
    flexDirection: 'row',
  },
  headerButton: {
    marginLeft: 15,
  },
  headerButtonText: {
    color: '#4ECDC4',
    fontSize: 16,
  },
  // Current player's card styles
  myPlayerCard: {
    margin: 15,
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
  },
  myPlayerName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 20,
  },
  // Life counter styles
  lifeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  lifeButton: {
    width: 60,
    height: 60,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 20,
  },
  lifeButtonText: {
    fontSize: 32,
    color: '#fff',
    fontWeight: 'bold',
  },
  lifeText: {
    fontSize: 64,
    fontWeight: 'bold',
    color: '#fff',
    minWidth: 100,
    textAlign: 'center',
  },
  // Commander damage display
  damageInfo: {
    marginTop: 15,
    backgroundColor: 'rgba(0,0,0,0.2)',
    padding: 10,
    borderRadius: 8,
  },
  damageTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  damageText: {
    color: '#fff',
    fontSize: 12,
  },
  // Other players list
  playersContainer: {
    flex: 1,
    padding: 15,
  },
  playerCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderRadius: 10,
    marginBottom: 10,
  },
  playerName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  playerLife: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
  },
  // Modal styles (used for log and commander damage)
  modalBackground: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#2a2a2a',
    borderRadius: 10,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 20,
  },
  modalButton: {
    backgroundColor: '#FF6B6B',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  // Game log styles
  logList: {
    maxHeight: 300,
  },
  logItem: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#3a3a3a',
  },
  logTime: {
    color: '#888',
    fontSize: 12,
  },
  logMessage: {
    color: '#fff',
    fontSize: 14,
    marginTop: 2,
  },
  // Commander damage modal styles
  damageControl: {
    alignItems: 'center',
    marginVertical: 20,
  },
  damageLabel: {
    color: '#fff',
    fontSize: 16,
    marginBottom: 10,
  },
  damageButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  damageButton: {
    width: 50,
    height: 50,
    backgroundColor: '#3a3a3a',
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 20,
  },
  damageButtonText: {
    fontSize: 24,
    color: '#fff',
    fontWeight: 'bold',
  },
  damageAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    minWidth: 60,
    textAlign: 'center',
  },
});