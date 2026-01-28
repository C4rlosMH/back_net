import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export const checkJwt = (req: Request, res: Response, next: NextFunction) => {
  // 1. Buscamos el token en el header "Authorization"
  const token = req.headers["authorization"];
  let jwtPayload;

  // 2. Si no hay token, error 401 (No autorizado)
  if (!token) {
    res.status(401).json({ message: "No autorizado, falta token" });
    return;
  }

  // 3. Intentamos validar el token
  try {
    // Quitamos la palabra "Bearer " si viene en el header
    const bearer = token.startsWith("Bearer ") ? token.slice(7) : token;
    
    jwtPayload = jwt.verify(bearer, process.env.JWT_SECRET || "secreto");
    
    // Guardamos los datos del usuario en res.locals para usarlos luego si queremos
    res.locals.jwtPayload = jwtPayload;
  } catch (error) {
    // Si el token es falso o expiró
    res.status(401).json({ message: "No autorizado, token inválido" });
    return;
  }

  // 4. Si todo sale bien, dejamos pasar la petición
  next();
};