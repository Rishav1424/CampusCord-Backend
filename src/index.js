import { createServer } from 'http';
import { Server } from 'socket.io';
import app from './app.js';
import registerSocketHandlers from './sockets/index.js';
import dotenv from 'dotenv';

dotenv.config();

const PORT = process.env.PORT || 5000;
const server = createServer(app);

const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

registerSocketHandlers(io);

server.listen(PORT);
