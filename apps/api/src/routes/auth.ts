import bcrypt from "bcryptjs";
import { Router } from "express";
import { z } from "zod";
import { HttpError } from "../lib/http-error.js";
import { prisma } from "../lib/prisma.js";
import { requireAuth, signToken } from "../middleware/auth.js";

const router = Router();

const registerSchema = z.object({
  name: z.string().min(2).max(80),
  email: z.string().email().toLowerCase(),
  password: z.string().min(8).max(128)
});

const loginSchema = z.object({
  email: z.string().email().toLowerCase(),
  password: z.string().min(8).max(128)
});

router.post("/register", async (req, res, next) => {
  try {
    const input = registerSchema.parse(req.body);
    const existing = await prisma.user.findUnique({ where: { email: input.email } });
    if (existing) {
      throw new HttpError(409, "An account already exists for this email");
    }

    const passwordHash = await bcrypt.hash(input.password, 12);
    const user = await prisma.user.create({
      data: { name: input.name, email: input.email, passwordHash },
      select: { id: true, name: true, email: true }
    });

    res.status(201).json({ user, token: signToken({ id: user.id, email: user.email }) });
  } catch (error) {
    next(error);
  }
});

router.post("/login", async (req, res, next) => {
  try {
    const input = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email: input.email } });
    if (!user) {
      throw new HttpError(401, "Invalid email or password");
    }

    const valid = await bcrypt.compare(input.password, user.passwordHash);
    if (!valid) {
      throw new HttpError(401, "Invalid email or password");
    }

    res.json({
      user: { id: user.id, name: user.name, email: user.email },
      token: signToken({ id: user.id, email: user.email })
    });
  } catch (error) {
    next(error);
  }
});

router.get("/me", requireAuth, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { id: true, name: true, email: true, createdAt: true }
    });
    if (!user) {
      throw new HttpError(404, "User not found");
    }
    res.json({ user });
  } catch (error) {
    next(error);
  }
});

export { router as authRouter };
