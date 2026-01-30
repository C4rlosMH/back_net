import { registerUserService, loginService, changePasswordService } from "../services/auth.service.js";

// POST Register
export const register = async (req, res) => {
    try {
        const user = await registerUserService(req.body);
        res.status(201).json({ message: "Usuario creado", user: user.username });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// POST Login
export const login = async (req, res) => {
    try {
        const data = await loginService(req.body);
        res.json(data);
    } catch (error) {
        res.status(401).json({ message: error.message });
    }
};

// POST Change Password
export const changePassword = async (req, res) => {
    try {
        // req.user viene del middleware checkAuth (Token decodificado)
        const { id } = req.user; 
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ message: "Debes enviar la contraseña actual y la nueva." });
        }

        const result = await changePasswordService(id, currentPassword, newPassword);
        res.json(result);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};