// src/middlewares/auth.middleware.ts
import { Request, Response, NextFunction } from "express";
import * as jwt from "jsonwebtoken";

export const checkJwt = (req: Request, res: Response, next: NextFunction) => {
  // 1. Buscamos el header estándar "authorization"
  const authHeader = <string>req.headers["authorization"]; 
  let token = "";

  // 2. Limpiamos el prefijo "Bearer " si viene incluido (estándar en axios)
  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.slice(7, authHeader.length);
  } else {
    // Si no tiene Bearer, intentamos leerlo directo (por compatibilidad)
    token = authHeader;
  }

  // Si no hay token, rechazamos de inmediato
  if (!token) {
    return res.status(401).send({ message: "No autorizado: Token faltante" });
  }

  let jwtPayload;

  try {
    // 3. Verificamos el token limpio
    jwtPayload = <any>jwt.verify(token, process.env.JWT_SECRET || "@QEGTW");
    res.locals.jwtPayload = jwtPayload;
  } catch (error) {
    return res.status(401).send({ message: "No autorizado: Token inválido" });
  }

  next();
};