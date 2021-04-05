import jwt from 'jsonwebtoken'
import dotenv from 'dotenv'

dotenv.config()

export const generateAccessToken = (username)=>{
    return jwt.sign(username, process.env.TOKEN_SECRET, {expiresIn: "7d"})
}

export const authenticateTokenAccessControl = (req, res, next)=>{
    // Gather the jwt access token from the request header
    const authHeader = req.headers['authorization']
    const token = authHeader && authHeader.split(' ')[1]
    if (token == null){
        return res.sendStatus(401)
    } // if there isn't any token

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
        console.error(err)
        if (err){
            return res.sendStatus(403)
        }

        req.user = user
        next() // pass the execution off to whatever request the client intended
    })
}
