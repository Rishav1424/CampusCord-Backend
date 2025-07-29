import prisma from "../lib/prisma.js";
import { generateUploadUrl, getPath } from "../utils/s3.js";

export const listServers = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: {
        id: req.user.id,
      },
    });

    const emailDomain = user.email.split("@")[1];

    const servers = await prisma.server.findMany({
      include: {
        members: {
          where: {
            userId: req.user.id,
          },
        },
      },
    });

    const primaryServer = servers
      .filter((server) => server.isPrimary)
      .find((server) => emailDomain.endsWith(server.domain));

    res.json({
      primaryServer: primaryServer && {
        id: primaryServer.id,
        name: primaryServer.name,
        logo: getPath("server/" + primaryServer.id + "/logo"),
        joined: primaryServer.members.length > 0,
      },
      secondaryServers: servers
        .filter((server) => !server.isPrimary)
        .map((server) => ({
          id: server.id,
          name: server.name,
          logo: getPath("server/" + server.id + "/logo"),
          joined: server.members.length > 0,
        })),
    });
  } catch (error) {
    console.error("Error fetching servers:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getMyServers = async (req, res) => {
  try {
    const servers = await prisma.server.findMany({
      where: {
        members: {
          some: {
            userId: req.user.id,
          },
        },
      },
      select: {
        id: true,
        name: true,
        isPrimary: true,
      },
    });

    const primaryServer = servers.find((server) => server.isPrimary);

    res.json({
      primaryServer: primaryServer && {
        id: primaryServer.id,
        name: primaryServer.name,
        logo: getPath("server/" + primaryServer.id + "/logo"),
      },
      secondaryServers: servers
        .filter((server) => !server.isPrimary)
        .map((server) => ({
          id: server.id,
          name: server.name,
          logo: getPath("server/" + primaryServer.id + "/logo"),
        })),
    });
  } catch (error) {
    console.error("Error fetching user's servers:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const serverDetails = async (req, res) => {
  const { serverId } = req.params;

  try {
    const server = await prisma.server.findUnique({
      where: {
        id: serverId,
      },
      select: {
        id: true,
        name: true,
        description: true,
        isPrimary: true,
        channels: {
          select: {
            name: true,
            topic: true,
            restricted: true,
            call: true,
          },
        },
        members: {
          select: {
            user: {
              select: {
                id: true,
                username: true,
              },
            },
            admin: true,
          },
        },
      },
    });

    if (!server) {
      return res.status(404).json({ message: "Server not found" });
    }

    server.members = server.members.map((member) => ({
      ...member.user,
      avatar: getPath("user/" + member.user.id + "/avatar"),
      admin: member.admin,
    }));

    server.logo = getPath("server/" + server.id + "/logo");
    server.isAdmin = server.members.find(
      (member) => member.id === req.user.id
    )?.admin;

    return res.json({ server });
  } catch (error) {
    console.error("Error fetching server details:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const createServer = async (req, res) => {
  const { name, description } = req.body;

  try {
    const newServer = await prisma.server.create({
      data: {
        name,
        description,
        members: {
          create: {
            userId: req.user.id,
            admin: true,
          },
        },
      },
    });

    res.status(201).json({
      message: "Server created successfully",
      server: { ...newServer, logo: getPath(`server/${newServer.id}/logo`) },
      uploadUrl: await generateUploadUrl(
        `server/${newServer.id}/logo`,
        "image/*"
      ),
    });
  } catch (error) {
    console.error("Error creating server:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const editServer = async (req, res) => {
  const { serverId } = req.params;
  const { name, description } = req.body;

  try {
    const updatedServer = await prisma.server.update({
      where: {
        id: serverId,
      },
      data: {
        name,
        description,
      },
    });

    const uploadUrl = await generateUploadUrl(
      `server/${serverId}/logo`,
      "image/*"
    );

    res.json({
      message: "Server updated successfully",
      server: updatedServer,
      uploadUrl,
    });
  } catch (error) {
    console.error("Error updating server:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const deleteServer = async (req, res) => {
  const { serverId } = req.params;

  try {
    await prisma.server.delete({
      where: {
        id: serverId,
      },
    });

    res.json({ message: "Server deleted successfully" });
  } catch (error) {
    console.error("Error deleting server:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
