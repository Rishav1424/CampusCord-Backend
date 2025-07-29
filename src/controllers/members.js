import prisma from "../lib/prisma.js";

export const getMembers = async (req, res) => {
  const { serverId } = req.params;

  try {
    const members = await prisma.membership.findMany({
      where: { serverId: serverId },
      select: {
        admin: true,
        user: {
          select: {
            id: true,
            username: true,
            name: true,
          },
        },
      },
    });

    res.json({
      members: members.map((member) => {
        const user = member.user;
        delete member.user;
        return { ...member, ...user };
      }),
    });
  } catch (error) {
    console.error("Error fetching members:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const joinServer = async (req, res) => {
  const { serverId } = req.params;
  const userId = req.user.id;

  try {
    // Check if the user is already a member
    const existingMembership = await prisma.membership.findUnique({
      where: {
        userId_serverId: {
          userId: userId,
          serverId: serverId,
        },
      },
    });

    if (existingMembership) {
      return res
        .status(400)
        .json({ message: "Already a member of this server" });
    }

    const server = await prisma.server.findUnique({
      where: { id: serverId },
      select: {
        name: true,
        domain: true,
        isPrimary: true,
      },
    });

    if (!server) {
      return res.status(404).json({ message: "Server not found" });
    }

    if (server.isPrimary) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true },
      });

      if (!user.email.endsWith(server.domain)) {
        return res
          .status(403)
          .json({ message: "Cannot join primary server directly" });
      }
    }

    // Create a new membership
    await prisma.membership.create({
      data: {
        userId: userId,
        serverId: serverId,
      },
    });

    res.status(201).json({
      message: "Joined server successfully",
    });
  } catch (error) {
    console.error("Error joining server:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const leaveServer = async (req, res) => {
  const { serverId } = req.params;
  const userId = req.user.id;

  try {
    // Check if the user is a member of the server
    const membership = await prisma.membership.findUnique({
      where: {
        userId_serverId: {
          userId,
          serverId
        },
      },
    });

    if (!membership) {
      return res.status(404).json({ message: "Not a member of this server" });
    }

    // Delete the membership
    await prisma.membership.delete({
      where: {
        userId_serverId: {
          userId,
          serverId
        },
      },
    });

    return res.json({ message: "Left server successfully" });
  } catch (error) {
    console.error("Error leaving server:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const promoteMember = async (req, res) => {
  const { serverId, userId } = req.params;

  try {
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
        .status(404)
        .json({ message: "User not a member of this server" });
    }

    await prisma.membership.update({
      where: {
        userId_serverId: {
          userId: userId,
          serverId: serverId,
        },
      },
      data: {
        admin: true,
      },
    });

    res.json({
      message: "Member promoted successfully",
    });
  } catch (error) {
    console.error("Error promoting member:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const demoteMember = async (req, res) => {1
  const { serverId, userId } = req.params;

  try {
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
        .status(404)
        .json({ message: "User not a member of this server" });
    }

    // Ensure the member being demoted is an admin
    if (!membership.admin) {
      return res.status(400).json({ message: "User is not an admin" });
    }

    await prisma.membership.update({
      where: {
        userId_serverId: {
          userId: userId,
          serverId: serverId,
        },
      },
      data: {
        admin: false,
      },
    });

    res.json({
      message: "Member demoted successfully",
    });
  } catch (error) {
    console.error("Error demoting member:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
