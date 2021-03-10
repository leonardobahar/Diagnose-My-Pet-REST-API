import jwt from "jsonwebtoken";

export const generateAccessToken = (userInfo, token_secret)=>{
    return jwt.sign(userInfo, token_secret, {expiresIn: 86400});
}