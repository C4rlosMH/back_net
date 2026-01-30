import jwt from "jsonwebtoken";

export const checkAuth = (req, res, next) => {
    try {
        // El token viene en el header: "Authorization: Bearer eyJhbGci..."
        const tokenHeader = req.headers.authorization;

        if (!tokenHeader) {
            return res.status(401).json({ message: "No autorizado. Falta el token." });
        }

        const token = tokenHeader.split(" ").pop(); // Quitamos la palabra "Bearer"

        // Verificamos el token con la clave secreta del .env
        const tokenData = jwt.verify(token, process.env.JWT_SECRET);
        
        // Si es válido, inyectamos los datos del usuario en la petición
        req.user = tokenData;
        
        next(); // Dejamos pasar a la siguiente función
    } catch (error) {
        res.status(401).json({ message: "Token inválido o expirado." });
    }
};

// Middleware para verificar roles (Ej: Solo ADMIN)
export const checkRole = (rolesPermitidos) => (req, res, next) => {
    if (rolesPermitidos.includes(req.user.rol)) {
        next();
    } else {
        res.status(403).json({ message: "Acceso denegado. No tienes permisos suficientes." });
    }
};