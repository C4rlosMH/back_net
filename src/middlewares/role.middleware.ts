import { Request, Response, NextFunction } from "express";
import { AppDataSource } from "../data-source";
import { User } from "../entity/Auth";

export const checkRole = (roles: Array<string>) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Obtenemos el ID del usuario desde el Token (puesto por checkJwt antes)
    const id = res.locals.jwtPayload.userId;

    const userRepo = AppDataSource.getRepository(User);
    let user: User | null;

    try {
      user = await userRepo.findOneBy({ id });
    } catch (id) {
      res.status(401).json({ message: "No autorizado" });
      return; 
    }

    // Verificamos si el rol del usuario está en la lista permitida
    if (user && roles.includes(user.role)) {
      next(); // Tiene permiso, pase.
    } else {
      res.status(403).json({ message: "No tienes permisos suficientes (Requiere ADMIN)" });
    }
  };
};