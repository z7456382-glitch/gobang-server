const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, {
  cors: {
    origin: "*", // 允許所有來源連線，解決跨域問題
    methods: ["GET", "POST"]
  }
});

let players = {}; 
let gameStarted = false;

// 讓 Render 檢查伺服器是否在線
app.get('/', (req, res) => {
  res.send('<h1>五子棋伺服器運行中</h1><p>Server is Live!</p>');
});

io.on('connection', (socket) => {
  console.log('新玩家連線:', socket.id);

  const occupiedRoles = Object.values(players).map(p => p.role);
  let role = 'spectator';
  let isHost = false;

  // 分配角色邏輯
  if (!occupiedRoles.includes('B')) {
    role = 'B';
    isHost = true;
  } else if (!occupiedRoles.includes('W')) {
    role = 'W';
    isHost = false;
  }

  players[socket.id] = { role, isHost };
  
  // 傳送初始資訊
  socket.emit('player-info', { role, isHost, gameStarted });

  // 房主啟動遊戲
  socket.on('start-game-request', () => {
    if (players[socket.id]?.isHost) {
      gameStarted = true;
      io.emit('game-start-broadcast');
      console.log('遊戲正式開始');
    }
  });

  // 處理落子
  socket.on('send-move', (moveData) => {
    if (gameStarted) {
      io.emit('receive-move', moveData);
    }
  });

  // 房主重置遊戲
  socket.on('reset-game-request', () => {
    if (players[socket.id]?.isHost) {
      gameStarted = false;
      io.emit('game-reset-broadcast');
      console.log('遊戲已重置');
    }
  });

  socket.on('disconnect', () => {
    console.log('玩家斷線:', socket.id);
    if (players[socket.id]?.isHost) {
      gameStarted = false; // 房主斷線則重置
    }
    delete players[socket.id];
  });
});

// 🌟 Render 專用 Port 設定
const PORT = process.env.PORT || 3001;
http.listen(PORT, () => {
  console.log(`🚀 伺服器已啟動於 Port ${PORT}`);
});