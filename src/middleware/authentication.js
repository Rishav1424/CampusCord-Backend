import jwt from "jsonwebtoken";
import prisma from "../lib/prisma.js";

export const authenticate = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid token" });
  }
};

export const authorizeMember = async (req, res, next) => {
  try {
    const serverId = req.params.serverId;
    const userId = req.user.id;

    // Check if the user is a member of the server
    const membership = await prisma.membership.findUnique({
      where: {
        userId_serverId: {
          userId: userId,
          serverId: serverId,
        },
      },
    });

    if (!membership) {
      return res
        .status(403)
        .json({ message: "Forbidden: You are not a member of this server" });
    }

    console.log("authorized member");
    next();

  } catch (error) {
    console.error("Authorization error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const authorizeAdmin = async (req, res, next) => {
  try {
    const serverId = req.params.serverId;
    const userId = req.user.id;

    // Check if the user is an admin of the server
    const membership = await prisma.membership.findUnique({
      where: {
        userId_serverId: {
          userId: userId,
          serverId: serverId,
        },
      },
    });

    if (!membership?.admin) {
      return res.status(403).json({
        message: "Forbidden: You are not an admin of this server",
      });
    }

    next();
  } catch (error) {
    console.error("Authorization error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
