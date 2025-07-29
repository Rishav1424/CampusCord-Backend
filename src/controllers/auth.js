import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import prisma from "../lib/prisma.js";
import { sendVerificationEmail } from "../utils/mail.js";
import { getPath, generateUploadUrl } from "../utils/s3.js";

export const login = async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({
        message: "Username and password are required",
      });
    }

    const user = await prisma.user.findUnique({
      where: {
        username: username,
      },
    });

    // Check if user exists
    if (!user?.verified) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if password is valid
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid password" });
    }

    // Generate JWT token
    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
      expiresIn: "24h",
    });

    // send token and user info
    res.status(200).json({
      message: "Login successful",
      token: token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        name: user.name,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Login failed", error: error.message });
  }
};

export const register = async (req, res) => {
  try {
    const { username, email, password, name } = req.body;

    if (!username || !password || !email) {
      return res.status(400).json({
        message: "Username, email, and password are required",
      });
    }

    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ username: username }, { email: email }],
      },
    });

    if (existingUser?.verified) {
      return res.status(409).json({
        message: "Username or email already taken",
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user

    let user;
    if (existingUser) {
      user = await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          username,
          email,
          name,
          password: hashedPassword,
        },
      });
    } else {
      user = await prisma.user.create({
        data: {
          username,
          email,
          name: name,
          password: hashedPassword,
        },
      });
    }

    // Generate verification token
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
      expiresIn: "5m",
    });

    // Send verification email
    await sendVerificationEmail(user, token);

    res.status(201).json({
      message:
        "An email has been sent to you for verification, Please verify within 5 minutes",
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({
      message: "Registration failed",
      error: error.message,
    });
  }
};

export const verifyEmail = async (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({ message: "Token is required" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId;

    // Update user to set verified to true
    await prisma.user.update({
      where: { id: userId },
      data: { verified: true },
    });

    res.status(200).json({ message: "Email verified successfully" });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Email verification failed", error: error.message });
  }
};

export const getMe = async (req, res) => {
  try {
    const userId = req.user.id; // Assuming user ID is set in req.user by authentication middleware

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        email: true,
        name: true,
        verified: true,
      },
    });

    user.avatar = getPath(`user/${userId}`);

    res.status(200).json({ user });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to fetch user", error: error.message });
  }
};

export const changeProfile = async (req, res) => {
  const userId = req.user.id;
  try {
    const { username, name } = req.body;

    const user = await prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        username,
        name,
      },
      select: {
        username: true,
        email: true,
        name: true,
      },
    });

    user.avatar = getPath(`user/${userId}`);

    const uploadUrl = await generateUploadUrl(`user/${userId}`);

    res.status(201).json({
      message: "Profile Updated successfully",
      user,
      uploadUrl,
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({
      message: "Registration failed",
      error: error.message,
    });
  }
};
