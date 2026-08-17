import { Router } from "express";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma";
import { signToken } from "../middleware/auth";

export const authRouter = Router();

authRouter.post("/login", async (req, res) => {
  const email =
    typeof req.body?.email === "string" ? req.body.email.trim() : "";
  const password =
    typeof req.body?.password === "string" ? req.body.password : "";

  if (!email || !password) {
    res.status(400).json({
      error: "Validation failed",
      details: {
        ...(email ? {} : { email: "required" }),
        ...(password ? {} : { password: "required" }),
      },
    });
    return;
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const matches = await bcrypt.compare(password, user.passwordHash);
  if (!matches) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const token = signToken(user.id, user.email);
  res.json({
    token,
    user: { id: user.id, email: user.email, name: user.name },
  });
});
