import bcrypt from "bcryptjs";

export const encrypt = async (textPlain) => {
    // Genera un hash seguro de la contraseña
    const hash = await bcrypt.hash(textPlain, 10);
    return hash;
};

export const compare = async (passwordPlain, hashPassword) => {
    // Compara la contraseña que escribe el usuario con la encriptada en BD
    return await bcrypt.compare(passwordPlain, hashPassword);
};