import fs from 'fs';
import bodyParser from 'body-parser';
import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import {Dao} from "./dao";
import {
    SOMETHING_WENT_WRONG,
    WRONG_BODY_FORMAT
} from "./strings";

dotenv.config();

const app = express()
app.use(bodyParser.urlencoded({extended: true}))
app.use(express.json())

// ALLOW ACCESS CONTROL ORIGIN
app.use(cors())
// app.use((err, req, res, next)=>{
//     if (err){
//         if (err.type === 'entity.parse.failed') {
//             res.status(406).send({
//                 success: false,
//                 message: 'WRONG-JSON-FORMAT'
//             })
//         }else{
//             res.status(400).send({
//                 success: false,
//                 message: 'CHECK-SERVER-LOG'
//             })
//             console.error(err)
//         }
//     }
// });

const PORT = process.env.USER_PORT
const host = process.env.MY_SQL_HOST
const user = process.env.MY_SQL_USER
const password = typeof process.env.MY_SQL_PASSWORD === 'undefined' ? '' : process.env.MY_SQL_PASSWORD
const dbname = process.env.MY_SQL_DBNAME
const dao = new Dao(host, user, password, dbname)

app.get("/api/user/retrieve-customers", (req, res)=>{
    if (typeof req.query.id === 'undefined'){
        // RETRIEVE ALL
        dao.retrieveUsers().then(result=>{
            console.log(result)
            res.status(200).send({
                success: true,
                result: result
            })
        }).catch(err=>{
            console.log(err)
            res.status(400).send({
                success: false,
                result: SOMETHING_WENT_WRONG
            })
        })
    }else{
        // RETRIEVE WITH ID
    }
})

app.post("/api/user/register-user", (req, res)=>{

})

// LISTEN SERVER | PRODUCTION DEPRECATION AFTER 9TH MARCH 2020, USE ONLY FOR DEVELOPMENT
app.listen(PORT, ()=>{
    console.info(`Server serving port ${PORT}`)
})
