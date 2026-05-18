import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config.js";
import { HttpError } from "../lib/http-error.js";

export type AuthUser = {
  id: string;
  email: string;
};

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export function signToken(user: AuthUser) {
  return jwt.sign(user, config.JWT_SECRET, { expiresIn: "7d" });
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return next(new HttpError(401, "Authentication required"));
  }

  try {
    req.user = jwt.verify(header.slice(7), config.JWT_SECRET) as AuthUser;
    next();
  } catch {
    next(new HttpError(401, "Invalid or expired token"));
  }
}

export function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return next();
  }

  try {
    req.user = jwt.verify(header.slice(7), config.JWT_SECRET) as AuthUser;
  } catch {
    req.user = undefined;
  }

  next();
}
