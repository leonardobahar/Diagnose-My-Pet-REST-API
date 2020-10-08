import fs from 'fs';
import bodyParser from 'body-parser';
import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import {Dao} from "./dao";
import {
    ERROR_DUPLICATE_ENTRY, ERROR_FOREIGN_KEY,
    SOMETHING_WENT_WRONG,
    WRONG_BODY_FORMAT
} from "../strings";
import {AnimalCategory, AnimalType, Disease, Patient, Symptoms, User} from "../model";

dotenv.config();

const app = express()
app.use(bodyParser.urlencoded({extended: true}))
app.use(express.json())

// ALLOW ACCESS CONTROL ORIGIN
app.use(cors())
app.use((err, req, res, next)=>{
    if (err){
        if (err.type === 'entity.parse.failed') {
            res.status(406).send({
                success: false,
                message: 'WRONG-JSON-FORMAT'
            })
        }else{
            res.status(400).send({
                success: false,
                message: 'CHECK-SERVER-LOG'
            })
            console.error(err)
        }
    }
});

const PORT = process.env.USER_PORT
const host = process.env.MY_SQL_HOST
const user = process.env.MY_SQL_USER
const password = typeof process.env.MY_SQL_PASSWORD === 'undefined' ? '' : process.env.MY_SQL_PASSWORD
const dbname = process.env.MY_SQL_DBNAME
const dao = new Dao(host, user, password, dbname)

app.get("/api/user/retrieve-users", (req, res)=>{
    if (typeof req.query.id === 'undefined'){
        // RETRIEVE ALL
        dao.retrieveUsers().then(result=>{
            res.status(200).send({
                success: true,
                result: result
            })
        }).catch(err=>{
            console.log(err)
            res.status(500).send({
                success: false,
                result: SOMETHING_WENT_WRONG
            })
        })
    }else{
        // RETRIEVE WITH ID
    }
})

app.post("/api/user/register-user", (req, res)=>{
    if (typeof req.body.fullname === 'undefined' ||
        typeof req.body.mobile === 'undefined' ||
        typeof req.body.email === 'undefiend' ||
        typeof req.body.birthdate === 'undefined' ||
        typeof req.body.password === 'undefined'){
        res.status(400).send({
            success: false,
            error: WRONG_BODY_FORMAT
        })
        return
    }else{
        const user = new User(null,
            req.body.fullname,
            req.body.mobile,
            req.body.email,
            req.body.birthdate,
            req.body.password,
            "CUSTOMER")

        dao.registerCustomer(user).then(result=>{
            res.status(200).send({
                success: true,
                result: result
            })
        }).catch(err=>{
            if (err.code === 'ER_DUP_ENTRY') {
                res.status(500).send({
                    success: false,
                    message: 'DUPLICATE-ENTRY'
                })
                res.end()
            }else{
                console.log(err)
                res.status(500).send({
                    success: false,
                    result: SOMETHING_WENT_WRONG
                })
            }
        })
    }
})

app.post("/api/user/update-user",(req,res)=>{
    if(typeof req.body.id==='undefined') {
        res.status(400).send({
            success: false,
            error: SOMETHING_WENT_WRONG
        })
    }

    if(typeof req.body.id ==='undefined' ||
        typeof req.body.fullname === 'undefined' ||
        typeof req.body.mobile === 'undefined' ||
        typeof req.body.email === 'undefined' ||
        typeof req.body.birthdate === 'undefined' ||
        typeof req.body.password === 'undefined' ||
        typeof req.body.salt === 'undefined' ||
        typeof req.body.role === 'undefined'){
        res.status(400).send({
            success: false,
            error: WRONG_BODY_FORMAT
        })
    }

    else{
        const user=new User(req.body.id,
            req.body.fullname,
            req.body.mobile,
            req.body.email,
            req.body.birthdate,
            req.body.password,
            req.body.salt,
            req.body.role)

        dao.updateCustomer(user).then(result=>{
            res.status(200).send({
                success:true
            })
        }).catch(err=>{
            console.log(err)
            res.status(400).send({
                success: false,
                result: SOMETHING_WENT_WRONG
            })
        })
    }
})

app.delete("/api/user/delete-user",(req,res)=>{
    if(typeof req.body.id==='undefined'){
        res.status(400).send({
            success:false,
            result:SOMETHING_WENT_WRONG
        })
    }
    else{
        const user=new User(req.body.id,null,null,null,null,null,null,null)
        dao.deleteCustomer(user).then(result=>{
            res.status(200).send({
                success:true
            })
        }).catch(err=>{
            console.log(err)
            res.status(500).send({
                success: false,
                result: SOMETHING_WENT_WRONG
            })
        })
    }
})

app.post("/api/diagnosis/bind-user-to-pet", (req,res)=>{
    if(typeof req.body.user_id === 'undefined' ||
        typeof req.body.patient_id === 'undefined'){
        res.status(400).send({
            success:false,
            error:WRONG_BODY_FORMAT
        })
        return
    }

    dao.bindUserToPet(new User(req.body.user_id), new Patient(req.body.patient_id)).then(result=>{
        res.status(200).send({
            success: true,
            result: result
        })
    }).catch(err=>{
        if (err.code === 'ER_DUP_ENTRY' || err === ERROR_DUPLICATE_ENTRY) {
            res.status(500).send({
                success: false,
                message: 'DUPLICATE-ENTRY'
            })
            res.end()
        }else if(err.code === 'ER_NO_REFERENCED_ROW_2') {
            res.status(500).send({
                success: false,
                result: ERROR_FOREIGN_KEY
            })
        }else{
            console.log(err)
            res.status(500).send({
                success: false,
                result: SOMETHING_WENT_WRONG
            })
        }
    })
})
// LISTEN SERVER | PRODUCTION DEPRECATION AFTER 9TH MARCH 2020, USE ONLY FOR DEVELOPMENT
app.listen(PORT, ()=>{
    console.info(`Server serving port ${PORT}`)
})