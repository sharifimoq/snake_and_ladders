'use strict';

const express  = require('express');
const http     = require('http');
const { Server } = require('socket.io');
const path     = require('path');

const app    = express();
const server = http.createServer(app);
const io     = new Server(server, { cors: { origin: '*' } });

app.use(express.static(path.join(__dirname, 'public')));

// ══════════════════════════════════════════════════════════════
//  پیکربندی بازی
//  کاربر: این دو بخش را پس از دریافت مقامات پر کنید
// ══════════════════════════════════════════════════════════════

// مارها:  { خانه‌ی سر: { to: خانه‌ی دم, name: 'نام رذیله', msg: 'توضیح' } }
const SNAKES = {
  // مثال — پس از دریافت مقامات پر کنید:
  // 141: { to: 7,  name: 'غرور',    msg: 'غرور در آستانهٔ وصال سالک را بازمی‌گرداند' },
  // 126: { to: 15, name: 'ریا',     msg: 'ریاکاری همهٔ اعمال را باطل می‌کند' },
  // 108: { to: 44, name: 'کبر',     msg: 'تکبر آفت همهٔ مقامات است' },
  //  92: { to: 55, name: 'حسد',     msg: 'حسد دل را تاریک می‌سازد' },
  //  79: { to: 40, name: 'عجب',     msg: 'خودپسندی سالک را از راه بازمی‌دارد' },
  //  65: { to: 28, name: 'غفلت',    msg: 'غفلت از یاد حق سالک را به خواب می‌برد' },
  //  50: { to: 22, name: 'شهوت',    msg: 'شهوت نفسانی قلب را می‌پوشاند' },
  //  37: { to: 13, name: 'بخل',     msg: 'بخل مانع جریان رحمت است' },
  //  20: { to:  6, name: 'حب دنیا', msg: 'دل‌بستگی به دنیا سالک را بازمی‌گرداند' },
};

// نردبان‌ها:  { خانه‌ی پایین: { to: خانه‌ی بالا, name: 'نام فضیلت', msg: 'توضیح' } }
const LADDERS = {
  // مثال — پس از دریافت مقامات پر کنید:
  //   3: { to:  19, name: 'توبهٔ خالص', msg: 'توبهٔ راستین قلب را روشن می‌کند' },
  //   9: { to:  47, name: 'جذبهٔ الهی', msg: 'جذبهٔ ربانی سالک را یک‌باره بالا می‌برد' },
  //  24: { to:  63, name: 'ذکر دائم',   msg: 'ذکر پیوسته درهای معرفت می‌گشاید' },
  //  32: { to:  68, name: 'محبت حق',    msg: 'عشق الهی موانع طریق را می‌سوزاند' },
  //  45: { to:  81, name: 'کشف باطن',   msg: 'مکاشفه درهای معرفت را می‌گشاید' },
  //  58: { to:  94, name: 'معرفت حق',   msg: 'معرفت حقیقی فنا را نزدیک می‌کند' },
  //  72: { to: 110, name: 'ولایت',      msg: 'نیل به ولایت وصال را آشکار می‌سازد' },
  //  87: { to: 120, name: 'فتح مبین',   msg: 'فتح الهی دری به عالم شهود می‌گشاید' },
  // 100: { to: 135, name: 'وصال قریب',  msg: 'نزدیکی وصال بالاترین لطف ربانی‌ست' },
};

const TOTAL_CELLS = 144;

// ══════════════════════════════════════════════════════════════
//  مدیریت اتاق‌ها
// ══════════════════════════════════════════════════════════════

const rooms = {};

const COLORS = ['#e94560', '#3ecf8e', '#4da6ff', '#ffb347'];
const EMOJIS = ['🔴', '🟢', '🔵', '🟡'];

function makeCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let c = '';
  for (let i = 0; i < 6; i++) c += chars[Math.floor(Math.random() * chars.length)];
  return c;
}

function applyMove(pos, roll) {
  const np = pos + roll;
  if (np > TOTAL_CELLS) return { pos, event: 'overshoot' };

  if (SNAKES[np]) {
    const s = SNAKES[np];
    return { pos: s.to, event: 'snake', from: np, name: s.name, msg: s.msg };
  }
  if (LADDERS[np]) {
    const l = LADDERS[np];
    return { pos: l.to, event: 'ladder', from: np, name: l.name, msg: l.msg };
  }
  return { pos: np, event: null };
}

// ══════════════════════════════════════════════════════════════
//  رویدادهای Socket.io
// ══════════════════════════════════════════════════════════════

io.on('connection', (socket) => {

  // ── ایجاد اتاق ──
  socket.on('createRoom', ({ playerName, maxPlayers = 4 }) => {
    let code;
    do { code = makeCode(); } while (rooms[code]);

    rooms[code] = {
      code,
      maxPlayers: Math.min(4, Math.max(2, maxPlayers)),
      started: false,
      currentPlayer: 0,
      players: [{
        id:      socket.id,
        name:    (playerName || 'سالک').slice(0, 20),
        pos:     1,
        color:   COLORS[0],
        emoji:   EMOJIS[0],
        isOwner: true,
      }],
    };

    socket.join(code);
    socket.roomCode = code;
    socket.emit('yourIndex', 0);
    socket.emit('roomCreated', { code, room: sanitize(rooms[code]) });
    console.log(`[${code}] created by ${playerName}`);
  });

  // ── پیوستن به اتاق ──
  socket.on('joinRoom', ({ roomCode, playerName }) => {
    const code = (roomCode || '').toUpperCase().trim();
    const room = rooms[code];

    if (!room)            return socket.emit('joinError', 'کد اتاق اشتباه است');
    if (room.started)     return socket.emit('joinError', 'بازی شروع شده است');
    if (room.players.length >= room.maxPlayers)
                          return socket.emit('joinError', 'اتاق پر است');

    const idx = room.players.length;
    room.players.push({
      id:      socket.id,
      name:    (playerName || `سالک ${idx + 1}`).slice(0, 20),
      pos:     1,
      color:   COLORS[idx],
      emoji:   EMOJIS[idx],
      isOwner: false,
    });

    socket.join(code);
    socket.roomCode = code;
    socket.emit('yourIndex', idx);

    io.to(code).emit('roomUpdated', { room: sanitize(room) });
    console.log(`[${code}] joined by ${playerName}`);

    if (room.players.length >= room.maxPlayers) {
      startGame(code);
    }
  });

  // ── شروع بازی (فقط مالک) ──
  socket.on('startGame', () => {
    const room = rooms[socket.roomCode];
    if (!room || room.started) return;
    const me = room.players.find(p => p.id === socket.id);
    if (!me?.isOwner) return;
    if (room.players.length < 2) return socket.emit('joinError', 'حداقل ۲ سالک لازم است');

    room.started = true;
    room.currentPlayer = 0;
    io.to(room.code).emit('gameStarted', { room: sanitize(room) });
    console.log(`[${room.code}] game started`);
  });

  // ── انداختن تاس (فقط نوبت دارنده) ──
  socket.on('rollDice', () => {
    const room = rooms[socket.roomCode];
    if (!room?.started) return;

    const cur = room.players[room.currentPlayer];
    if (cur.id !== socket.id) return;

    const roll   = Math.floor(Math.random() * 6) + 1;
    const result = applyMove(cur.pos, roll);
    cur.pos      = result.pos;

    const won = cur.pos === TOTAL_CELLS;

    io.to(room.code).emit('moveMade', {
      playerIdx: room.currentPlayer,
      roll,
      result,
      room: sanitize(room),
      won,
    });

    if (won) {
      console.log(`[${room.code}] won by ${cur.name}`);
      delete rooms[room.code];
    } else {
      room.currentPlayer = (room.currentPlayer + 1) % room.players.length;
    }
  });

  // ── قطع اتصال ──
  socket.on('disconnect', () => {
    const code = socket.roomCode;
    const room = rooms[code];
    if (!room) return;

    const idx = room.players.findIndex(p => p.id === socket.id);
    if (idx === -1) return;

    const leaving = room.players[idx];
    room.players.splice(idx, 1);

    if (room.players.length === 0) {
      delete rooms[code];
      return;
    }
    // اگر مالک رفت، بعدی مالک می‌شه
    if (leaving.isOwner) room.players[0].isOwner = true;
    // تصحیح نوبت
    if (room.currentPlayer >= room.players.length) room.currentPlayer = 0;

    io.to(code).emit('playerLeft', {
      name: leaving.name,
      room: sanitize(room),
    });
    console.log(`[${code}] ${leaving.name} disconnected`);
  });
});

// حذف id خصوصی از داده‌ای که به کلاینت می‌رود
function sanitize(room) {
  return {
    ...room,
    players: room.players.map(({ id, ...rest }) => rest),
  };
}

// ══════════════════════════════════════════════════════════════
const PORT = process.env.PORT || 3000;
server.listen(PORT, () =>
  console.log(`شطرنج العارفین — سرور فعال: http://localhost:${PORT}`)
);
