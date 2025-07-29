import prisma from "../lib/prisma.js";
import { generateUploadUrl, getPath } from "../utils/s3.js";
import { AccessToken } from "livekit-server-sdk";

export const getChannelsList = async (req, res) => {
  const { serverId } = req.params;

  try {
    const channels = await prisma.channel.findMany({
      where: { serverId },
      select: {
        name: true,
        topic: true,
        restricted: true,
        call: true,
      },
    });
    res.json({ channels });
  } catch (error) {
    console.error("Error fetching channels:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getChannelDetails = async (req, res) => {
  const { serverId, channelName } = req.params;

  try {
    const channel = await prisma.channel.findUnique({
      where: {
        serverId_name: {
          serverId,
          name: channelName,
        },
      },
      select: {
        name: true,
        topic: true,
        restricted: true,
        call: true,
        messages: {
          select: {
            id: true,
            content: true,
            media: {
              select: {
                name: true,
                type: true,
              },
            },
            createdAt: true,
            createdBy: {
              select: {
                id: true,
                username: true,
                name: true,
              },
            },
            _count: {
              select: { likes: true },
            },
            likes: { where: { userId: req.user.id } },
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!channel) {
      return res.status(404).json({ message: "Channel not found" });
    }

    channel.messages.forEach((message) => {
      message.media.forEach(
        (media) =>
          (media.path = getPath(
            `${serverId}/${channelName}/${message.id}/${media.name}`
          ))
      );
      message.createdBy.avatar = getPath(`user/${message.createdBy.id}`);
      message.self = message.createdBy.id == req.user.id;
      message.liked = message.likes.length > 0;
      message.likes = message._count.likes;
      delete message._count;
    });

    res.json({ channel });
  } catch (error) {
    console.error("Error fetching channel details:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const createChannel = async (req, res) => {
  try {
    const { serverId } = req.params;
    const { name, topic, restricted, call } = req.body;

    const existingChannel = await prisma.channel.findUnique({
      where: { serverId_name: { serverId, name } },
    });

    if (existingChannel) {
      return res.status(400).json({ message: "Channel already exists" });
    }

    const channel = await prisma.channel.create({
      data: {
        name,
        topic,
        restricted,
        call,
        serverId,
      },
      select: {
        name: true,
        topic: true,
        restricted: true,
        call: true,
      },
    });

    res.status(201).json({ channel });
  } catch (error) {
    console.error("Error creating channel:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const editChannel = async (req, res) => {
  try {
    const { serverId, channelName } = req.params;
    const { name, topic, restricted, call } = req.body;

    const existingChannel = await prisma.channel.findUnique({
      where: {
        serverId_name: {
          serverId,
          name: channelName,
        },
      },
    });

    if (!existingChannel)
      return res.status(404).json({ message: "Channel doesn't exist" });

    const channel = await prisma.channel.update({
      where: {
        serverId_name: {
          serverId,
          name: channelName,
        },
      },
      data: { name, topic, restricted, call },
      select: {
        name: true,
        topic: true,
        restricted: true,
        call: true,
      },
    });

    res.json({ channel });
  } catch (error) {
    console.error("Error editing channel:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const deleteChannel = async (req, res) => {
  try {
    const { serverId, channelName } = req.params;

    const existingChannel = await prisma.channel.findUnique({
      where: {
        serverId_name: {
          serverId,
          name: channelName,
        },
      },
    });

    if (!existingChannel)
      return res.status(404).json({ message: "Channel doesn't exist" });

    const channel = await prisma.channel.delete({
      where: {
        serverId_name: {
          serverId,
          name: channelName,
        },
      },
    });

    res.json({ message: "Channel deleted successfully", channel });
  } catch (error) {
    console.error("Error deleting channel:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const joinRoom = async (req, res) => {
  try {
    const userId = req.user.id;
    const { serverId, channelName } = req.params;

    const channel = prisma.channel.findUnique({
      where: {
        serverId_name: {
          serverId,
          name: channelName,
        },
        call: true,
      },
    });

    if (!channel) res.status(404).json({ message: "No room found" });

    const at = new AccessToken(
      process.env.LIVEKIT_API_KEY,
      process.env.LIVEKIT_API_SECRET,
      {
        identity: userId,
      }
    );

    at.addGrant({ room: `${serverId}/${channelName}`, roomJoin: true });

    const token = await at.toJwt();
    console.log(token);

    res.json({
      url: process.env.LIVEKIT_URL,
      token,
    });
  } catch (error) {
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const createMessage = async (req, res) => {
  try {
    const userId = req.user.id;
    const { serverId, channelName } = req.params;

    const message = await prisma.message.create({
      data: {
        userId,
        serverId,
        channelName,
        content: req.body.content,
        media: {
          create: req.body.media.map((media) => ({
            name: media.name,
            type: media.type,
          })),
        },
      },
      select: {
        id: true,
        content: true,
        media: true,
        createdAt: true,
        createdBy: {
          select: {
            id: true,
            username: true,
            name: true,
          },
        },
      },
    });

    const uploadUrls = await Promise.all(
      message.media?.map((media) =>
        generateUploadUrl(
          `${serverId}/${channelName}/${message.id}/${media.name}`
        )
      )
    );

    message.media?.forEach(
      (media) =>
        (media.path = getPath(
          `${serverId}/${channelName}/${message.id}/${media.name}`
        ))
    );
    message.createdBy.avatar = getPath(`user/${message.createdBy.id}`);
    message.likes = 0;
    message.liked = false;

    res.json({ message, uploadUrls });
  } catch (error) {
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const deleteMessage = async (req, res) => {
  try {
    const messageId = req.params.messageId;
    const userId = req.user.id;
    await prisma.message.delete({
      where: {
        id: messageId,
        userId,
      },
    });

    res.json({ success: "true" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const likeMessage = async (req, res) => {
  try {
    await prisma.like.create({
      data: {
        userId: req.user.id,
        messageId: req.params.messageId,
      },
    });
    res.json({ success: "true" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: error.message });
  }
};

export const disLikeMessage = async (req, res) => {
  try {
    await prisma.like.delete({
      where: {
        userId_messageId: {
          userId: req.user.id,
          messageId: req.params.messageId,
        },
      },
    });
    res.json({ success: "true" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: error.message });
  }
};
