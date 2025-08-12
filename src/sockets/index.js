import jwt from "jsonwebtoken";
import prisma from "../lib/prisma.js";

// src/sockets/index.js
export default function registerSocketHandlers(io) {
  const ns = io.of(/^\/server\/\w+$/);

  ns.use(async (socket, next) => {
    try {
      const token = socket.handshake?.auth?.token;
      socket.userId = jwt.verify(token, process.env.JWT_SECRET)?.id;
      if (!socket.userId) next(new Error("Authentication error"));
      socket.serverId = socket.nsp.name.split("/")[2];
      // console.log({ userId: socket.userId, serverId: socket.serverId });
      const membership = await prisma.membership.findUnique({
        where: {
          userId_serverId: {
            userId: socket.userId,
            serverId: socket.serverId,
          },
        },
      });
      if (!membership) next(new Error("Authentication error"));
      next();
    } catch (error) {
      next(error);
    }
  });

  ns.on("connection", (socket) => {
    // console.log(`🟢 ${socket.userId} connected to ${socket.serverId}`);

    /* ----------  channel‑level logic  ---------- */

    socket.on("joinChannel", (channelName) => {
      socket.join(channelName);
      // console.log(`🔗 ${socket.id} joined ${socket.serverId}:${channelName}`);
    });

    socket.on("leaveChannel", (channelName) => {
      socket.leave(channelName);
      // console.log(`⤴️  ${socket.id} left  ${socket.serverId}:${channelName}`);
    });

    socket.on("sendMessage", (channelName, message, cb) => {
      // console.log("received message");

      // Broadcast to everyone in that channel (room) of this namespace
      socket.nsp.to(channelName).emit("newMessage", message);

      cb();
    });

    socket.on("like", (channelName, messageId) => {
      // console.log(`${messageId} liked by ${socket.userId}`);
      socket.nsp.to(channelName).emit("like", messageId, socket.userId);
    });

    socket.on("dislike", (channelName, messageId) => {
      // console.log(`${messageId} disliked by ${socket.userId}`);
      socket.nsp.to(channelName).emit("dislike", messageId, socket.userId);
    });

    socket.on("disconnect", () => {
      // console.log(`🔴 ${socket.id} disconnected from ${socket.serverId}`);
    });
  });
}
