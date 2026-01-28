import { Request, Response, NextFunction } from "express";
import * as jwt from "jsonwebtoken";

export const checkJwt = (req: Request, res: Response, next: NextFunction) => {
  const token = <string>req.headers["auth"]; // O "authorization" según uses
  let jwtPayload;

  try {
    jwtPayload = <any>jwt.verify(token, process.env.JWT_SECRET || "@QEGTW");
    res.locals.jwtPayload = jwtPayload;
  } catch (error) {
    return res.status(401).send({ message: "No autorizado" });
  }

  next();
};