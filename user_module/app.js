require("../util/logger")();
import fs from 'fs';
import bodyParser from 'body-parser';
import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import path from 'path';
import multer from "multer";
import nodecron from 'node-cron';
import jwt from 'jsonwebtoken';
import moment from 'moment';
import {generateAccessToken} from "../util/util";
import {Dao} from "./dao";
import {
    AUTH_ERROR_LOGIN,
    ERROR_DUPLICATE_ENTRY, ERROR_FOREIGN_KEY, NO_SUCH_CONTENT,
    SOMETHING_WENT_WRONG, SUCCESS,
    WRONG_BODY_FORMAT
} from "../strings";
import {
    AnimalCategory,
    AnimalType, Appointment,
    Disease, Doctor,
    MedicalRecordAttachment,
    MedicalRecords, MedicalRecordSymptoms, MedicalRecordTreatmentPlan, Participant,
    Patient,
    Symptoms, TreatmentPlan,
    User, VisitReminder
} from "../model";
import {sendResetPasswordMail} from "../util/mailjet";

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
                error: 'WRONG-JSON-FORMAT'
            })
        }else{
            res.status(400).send({
                success: false,
                error: 'CHECK-SERVER-LOG'
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
const UPLOADPATH = process.env.UPLOAD_PATH
const dao = new Dao(host, user, password, dbname)

const storage=multer.diskStorage({
    destination: './Uploads/',
    filename: function (req,file,cb){
        cb(null,file.fieldname + '-' + Date.now() + path.extname(file.originalname))
    }
})

const medicalRecordFilter = (req, file, cb)=>{
    // Accept images only
    if (!file.originalname.match(/\.(jpg|JPG|jpeg|JPEG|png|PNG|gif|GIF|doc|docx|pdf|txt|xls|csv|xlsx)$/)) {
        req.fileValidationError = 'Only jpg, png, gif, doc, pdf, txt, xls, csv files are allowed!';
        return cb(new Error('Only jpg, png, gif, doc, pdf, txt, xls, csv files are allowed!'), false);
    }
    cb(null, true);
}

const authenticateToken = (req, res, next)=>{
    // Gather the jwt access token from the request header
    const authHeader = req.headers['authorization']
    const token = authHeader && authHeader.split(' ')[1]
    if (token == null) return res.sendStatus(401) // if there isn't any token

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, async(err , userInfo) => {
        if (err) {
            if (err.name === "TokenExpiredError"){
                return res.status(403).send({
                    message: "Token Expired"
                })
            }else{
                console.error(err)
                return res.sendStatus(403)
            }
        }

        req.user = userInfo
        next() // pass the execution off to whatever request the client intended
    })
}

app.get("/api/user/retrieve-customers", (req, res)=>{
    if (typeof req.query.id === 'undefined'){
        // RETRIEVE ALL
        dao.retrieveCustomers().then(result=>{
            res.status(200).send({
                success: true,
                result: result
            })
        }).catch(err=>{
            console.error(err)
            res.status(500).send({
                success: false,
                error: SOMETHING_WENT_WRONG
            })
        })
    }else{
        // RETRIEVE WITH ID
        const user=new User(req.query.id,null,null,null,null,null,null,null)

        dao.retrieveOneCustomer(user).then(result=>{
            res.status(200).send({
                success:true,
                result:result
            })
        }).catch(err=>{
            if(err===NO_SUCH_CONTENT){
                res.status(204).send({
                    success:false,
                    error:NO_SUCH_CONTENT
                })
                return
            }
            console.error(err)
            res.status(500).send({
                success:false,
                error:SOMETHING_WENT_WRONG
            })
        })
    }
})

app.get("/api/user/retrieve-users",(req,res)=>{
    if (typeof req.query.id === 'undefined'){
        // RETRIEVE ALL
        dao.retrieveUsers().then(result=>{
            res.status(200).send({
                success: true,
                result: result
            })
        }).catch(err=>{
            console.error(err)
            res.status(500).send({
                success: false,
                error: SOMETHING_WENT_WRONG
            })
        })
    }else{
        // RETRIEVE WITH ID
        const user=new User(req.query.id)

        dao.retrieveOneUser(user).then(result=>{
            res.status(200).send({
                success:true,
                result:result
            })
        }).catch(err=>{
            console.error(err)
            res.status(500).send({
                success:false,
                error:SOMETHING_WENT_WRONG
            })
        })
    }
})

app.post("/api/user/register-user", (req, res)=>{
    if (typeof req.body.user_name === 'undefined' ||
        typeof req.body.mobile === 'undefined' ||
        typeof req.body.email === 'undefined' ||
        typeof req.body.birthdate === 'undefined' ||
        typeof req.body.password === 'undefined'){
        res.status(400).send({
            success: false,
            error: WRONG_BODY_FORMAT
        })
        return
    }else{
        const user = new User(null,
            req.body.user_name,
            req.body.mobile,
            req.body.email,
            req.body.birthdate,
            req.body.address,
            req.body.password,
            null,
            'CUSTOMER')

        dao.registerUser(user).then(result=>{
            res.status(200).send({
                success: true,
                result: result
            })
        }).catch(err=>{
            if (err.code === 'ER_DUP_ENTRY') {
                res.status(500).send({
                    success: false,
                    error: 'DUPLICATE-ENTRY'
                })
                res.end()
            }else{
                console.error(err)
                res.status(500).send({
                    success: false,
                    error: SOMETHING_WENT_WRONG
                })
            }
        })
    }
})

app.post("/api/user/reset-user", authenticateToken, (req, res)=>{
    if (typeof req.body.id==='undefined' &&
        typeof req.body.email === 'undefined' &&
        typeof req.body.password === 'undefined'){
        res.status(400).send({
            success: false,
            error: WRONG_BODY_FORMAT
        })
        return
    }

    if(typeof req.body.id==='undefined' && typeof req.body.email!=='undefined'){
        const user = new User(null,
            null,
            null,
            req.body.email,
            null,
            null,
            req.body.password,
            null,
            null)

        dao.resetPassword(user).then(result=>{
            res.status(200).send({
                success: true,
                result: result
            })
        }).catch(err=>{
            if (err.code === 'ER_DUP_ENTRY') {
                res.status(500).send({
                    success: false,
                    error: 'DUPLICATE-ENTRY'
                })
                res.end()
            }else{
                console.error(err)
                res.status(500).send({
                    success: false,
                    error: SOMETHING_WENT_WRONG
                })
            }
        })
    }else if(typeof req.body.email==='undefined' && typeof req.body.id!=='undefined'){
        const user = new User(req.body.id,
            null,
            null,
            null,
            null,
            null,
            req.body.password,
            null,
            null)

        dao.resetPasswordById(user).then(result=>{
            res.status(200).send({
                success:true,
                result:result
            })
        }).catch(error=>{
            console.error(error)
            res.status(500).send({
                success:false,
                error:SOMETHING_WENT_WRONG
            })
        })
    }else{
        const user = new User(req.body.id,
            null,
            null,
            null,
            null,
            null,
            req.body.password,
            null,
            null)

        dao.resetPasswordById(user).then(result=>{
            res.status(200).send({
                success:true,
                result:result
            })
        }).catch(error=>{
            console.error(error)
            res.status(500).send({
                success:false,
                error:SOMETHING_WENT_WRONG
            })
        })
    }
})

app.post("/api/user/register-admin",(req,res)=>{
    if (typeof req.body.user_name === 'undefined' ||
        typeof req.body.mobile === 'undefined' ||
        typeof req.body.email === 'undefined' ||
        typeof req.body.birthdate === 'undefined' ||
        typeof req.body.password === 'undefined'){
        res.status(400).send({
            success: false,
            error: WRONG_BODY_FORMAT
        })
        return
    }else{
        const user = new User(null,
            req.body.user_name,
            req.body.mobile,
            req.body.email,
            req.body.birthdate,
            req.body.address,
            req.body.password,
            null,
            'ADMIN')

        dao.registerUser(user).then(result=>{
            res.status(200).send({
                success: true,
                result: result
            })
        }).catch(err=>{
            if (err.code === 'ER_DUP_ENTRY') {
                res.status(500).send({
                    success: false,
                    error: 'DUPLICATE-ENTRY'
                })
                res.end()
            }else{
                console.error(err)
                res.status(500).send({
                    success: false,
                    error: SOMETHING_WENT_WRONG
                })
            }
        })
    }
})

app.post("/api/user/edit-user", (req,res)=>{
    if (typeof req.body.mobile === "undefined" ||
        typeof req.body.email === "undefined" ||
        typeof req.body.birthdate === "undefined" ||
        typeof req.body.address === "undefined" ||
        typeof req.body.user_name === "undefined" ){
        res.status(400).send({
            success:false,
            error:WRONG_BODY_FORMAT
        })
        return
    }

    dao.updateUserInfo(new User(
        null,
        req.body.user_name,
        req.body.mobile,
        req.body.email,
        req.body.birthdate,
        req.body.address,
        null,
        null,
        null
    )).then(result=>{
        res.status(200).send({
            success: true
        })
    }).catch(err=>{
        console.error(err)
        res.status(400).send({
            success: false
        })
    })
})

app.post("/api/user/confirm-user-email",(req,res)=>{
    if(typeof req.body.id==='undefined'){
        res.status(400).send({
            success:false,
            error:WRONG_BODY_FORMAT
        })
        return
    }

    dao.retrieveUserId(new User(req.body.id)).then(result=>{
        dao.confirmUserEmail(new User(req.body.id)).then(result=>{
            res.status(200).send({
                success:true,
                result:result
            })
        }).catch(error=>{
            console.error(error)
            res.status(500).send({
                success:false,
                error:SOMETHING_WENT_WRONG
            })
        })
    }).catch(error=>{
        if(error===NO_SUCH_CONTENT){
            res.status(204).send({
                success:false,
                error:NO_SUCH_CONTENT
            })
            return
        }
        console.error(error)
        res.status(500).send({
            success:false,
            error:SOMETHING_WENT_WRONG
        })
    })
})

app.post("/api/user/user-login",(req,res)=>{
    // if(typeof req.body.user_name==='undefined' &&
    //    typeof req.body.password==='undefined' ||
    //     typeof req.body.email==='undefined'){
    //     res.status(400).send({
    //         success:false,
    //         error:WRONG_BODY_FORMAT
    //     })
    //     return
    // }

    if(typeof req.body.email!=='undefined'){
        const user=new User(null,null,null,req.body.email,null,null,req.body.password,null)
        dao.loginWithEmail(user).then(LoginResult=>{
            const token = generateAccessToken({
                user_id:LoginResult[0].id,
                user_email: LoginResult[0].email,
                role: LoginResult[0].role
            }, process.env.ACCESS_TOKEN_SECRET)
            dao.userLastSignIn(LoginResult[0].user_id).then(result=>{
                res.status(200).send({
                    success: true,
                    authentication_approval: true,
                    token:token,
                    message: 'Log in Successful',
                    result:LoginResult
                })
            }).catch(error=>{
                console.error(error)
                res.status(500).send({
                    success:false,
                    error:SOMETHING_WENT_WRONG
                })
            })
        }).catch(error=>{
            if(error===AUTH_ERROR_LOGIN){
                res.status(200).send({
                    success:false,
                    authentication_approval: false,
                    message:'Invalid User Name/Password'
                })
            }else if(error===NO_SUCH_CONTENT) {
                res.status(200).send({
                    success:false,
                    authentication_approval: false,
                    message:'Invalid User Name/Password'
                })
            } else{
                console.error(error)
                res.status(500).send({
                    success:false,
                    error:SOMETHING_WENT_WRONG
                })
            }
        })
    }else {
        const user = new User(null, req.body.user_name, null, null, null, null, req.body.password, null)
        dao.loginWithUsername(user).then(loginResult => {
            const token = generateAccessToken({
                user_id: loginResult[0].user_id,
                user_email: loginResult[0].email,
                role: loginResult[0].role
            }, process.env.ACCESS_TOKEN_SECRET)
            dao.userLastSignIn(loginResult[0].user_id).then(result => {
                res.status(200).send({
                    success: true,
                    authentication_approval: true,
                    token:token,
                    message: 'Log in Successful',
                    result: loginResult
                })
            }).catch(error => {
                console.error(error)
                res.status(500).send({
                    success: false,
                    error: SOMETHING_WENT_WRONG
                })
            })
        }).catch(error => {
            if (error === AUTH_ERROR_LOGIN) {
                res.status(200).send({
                    success: false,
                    authentication_approval: false,
                    message: 'Invalid User Name/Password'
                })
            }else if(error===NO_SUCH_CONTENT) {
                res.status(200).send({
                    success:false,
                    authentication_approval: false,
                    message:'Invalid User Name/Password'
                })
            } else{
                console.error(error)
                res.status(500).send({
                    success: false,
                    error: SOMETHING_WENT_WRONG
                })
            }
        })
    }
})

app.post("/api/user/update-user", authenticateToken,(req,res)=>{
    if(typeof req.body.id ==='undefined' ||
        typeof req.body.user_name === 'undefined' ||
        typeof req.body.mobile === 'undefined' ||
        typeof req.body.email === 'undefined' ||
        typeof req.body.birthdate === 'undefined' ||
        typeof req.body.address === 'undefined'){
        res.status(400).send({
            success: false,
            error: WRONG_BODY_FORMAT
        })
        return
    }

    const user=new User(req.body.id,
        req.body.user_name,
        req.body.mobile,
        req.body.email,
        req.body.birthdate,
        req.body.address)

    dao.updateCustomer(user).then(result=>{
        res.status(200).send({
            success:true,
            result:result
        })
    }).catch(err=>{
        if(err===NO_SUCH_CONTENT){
            res.status(204).send({
                success:false,
                error:NO_SUCH_CONTENT
            })
            return
        }
        console.error(err)
        res.status(500).send({
            success: false,
            result: SOMETHING_WENT_WRONG
        })
    })
})

app.post("/api/user/request-password-reset", (req, res)=>{
    if (typeof req.body.email === 'undefined'){
        res.status(400).send({
            success:false,
            error:WRONG_BODY_FORMAT
        })
        return
    }

    const user = new User(null,null,null,req.body.email,null,null,null,null)
    dao.retrieveOneUser(user).then(result=>{
        const user_id = result[0].id
        const user_name = result[0].user_name
        const email = result[0].email
        const token = Math.random().toString(36).substr(2)
        dao.addResetPasswordToken(token, user_id).then(result=>{
            sendResetPasswordMail(user_name, email, token).then(result=>{
                res.status(200).send({
                    success: true
                })
            }).catch(err=>{
                console.error(err)
                res.status(500).send({
                    success:false,
                    error:SOMETHING_WENT_WRONG
                })
            })
        }).catch(err=>{
            console.error(err)
            res.status(500).send({
                success:false,
                error:SOMETHING_WENT_WRONG
            })
        })
    }).catch(err=>{
        console.error(err)
        res.status(204).send()
    })
})

app.post("/api/user/change-password",authenticateToken, (req,res)=>{
    if(typeof req.body.token==='undefined' ||
       typeof req.body.password==='undefined'){
        res.status(400).send({
            success:false,
            error:WRONG_BODY_FORMAT
        })
        return
    }

    dao.retrieveUserIdFromToken(req.body.token).then(userId=>{
        const user = new User(userId,null,null,null,null,null,req.body.password,null, null)
        dao.changeCustomerPassword(user).then(result=>{
            dao.removeToken(req.body.token)
            res.status(200).send({
                success:true,
                result:result
            })
        }).catch(error=>{
            console.error(error)
            res.status(500).send({
                success:false,
                error:SOMETHING_WENT_WRONG
            })
        })
    }).catch(err=>{
        console.error(err)
        res.status(204).send()
    })
})

app.delete("/api/user/delete-user",(req,res)=>{
    if(typeof req.body.id==='undefined'){
        res.status(400).send({
            success:false,
            result:SOMETHING_WENT_WRONG
        })
        return
    }
    const user=new User(req.body.id,null,null,null,null,null,null,null)
    dao.deleteCustomer(user).then(result=>{
        res.status(200).send({
            success:true,
            result:result
        })
    }).catch(err=>{
        if(err===NO_SUCH_CONTENT){
            res.status(204).send({
                success:false,
                error:NO_SUCH_CONTENT
            })
            return
        }
        console.error(err)
        res.status(500).send({
            success: false,
            result: SOMETHING_WENT_WRONG
        })
    })
})

app.get("/api/user/retrieve-doctor",(req,res)=>{
    if(typeof req.query.id==='undefined'){
        dao.retrieveDoctor().then(result=>{
            res.status(200).send({
                success:true,
                result:result
            })
        }).catch(error=>{
            console.error(error)
            res.status(500).send({
                success:false,
                error:SOMETHING_WENT_WRONG
            })
        })
        return
    }

    dao.retrieveOneDoctor(new Doctor(req.query.id)).then(result=>{
        res.status(200).send({
            success:true,
            result:result
        })
    }).catch(error=>{
        if(error===NO_SUCH_CONTENT){
            res.status(204).send({
                success:false,
                error:NO_SUCH_CONTENT
            })
            return
        }
        console.error(error)
        res.status(500).send({
            success:false,
            error:SOMETHING_WENT_WRONG
        })
    })
})

app.post("/api/user/register-doctor",(req,res)=>{
    if (typeof req.body.user_name === 'undefined' ||
        typeof req.body.mobile === 'undefined' ||
        typeof req.body.email === 'undefined' ||
        typeof req.body.birthdate === 'undefined' ||
        typeof req.body.password === 'undefined'){
        res.status(400).send({
            success: false,
            error: WRONG_BODY_FORMAT
        })
        return
    }else{
        const user = new User(null,
            req.body.user_name,
            req.body.mobile,
            req.body.email,
            req.body.birthdate,
            req.body.address,
            req.body.password,
            null,
            'DOCTOR')

        dao.registerUser(user).then(customerResult=>{
            dao.registerDoctor(new Doctor(null,req.body.user_name,customerResult.id)).then(result=>{
                res.status(200).send({
                    success:true,
                    result:result
                })
            }).catch(error=>{
                console.error(error)
                res.status(500).send({
                    success:false,
                    error:SOMETHING_WENT_WRONG
                })
            })
        }).catch(err=>{
            if (err.code === 'ER_DUP_ENTRY') {
                res.status(500).send({
                    success: false,
                    error: 'DUPLICATE-ENTRY'
                })
                res.end()
            }else{
                console.error(err)
                res.status(500).send({
                    success: false,
                    error: SOMETHING_WENT_WRONG
                })
            }
        })
    }
})

app.post("/api/user/update-doctor",(req,res)=>{
    if(typeof req.body.mobile==='undefined' ||
       typeof req.body.email==='undefined' ||
       typeof req.body.birthdate==='undefined' ||
       typeof req.body.id==='undefined'){
        res.status(400).send({
            success:false,
            error:WRONG_BODY_FORMAT
        })
        return
    }

    dao.updateDoctor(new User(req.body.id,req.body.user_name,req.body.mobile,req.body.email,req.body.birthdate)).then(result=>{
        res.status(200).send({
            success:true,
            result:result
        })
    }).catch(error=>{
        if(error===NO_SUCH_CONTENT){
            res.status(204).send({
                success:false,
                error:NO_SUCH_CONTENT
            })
            return
        }
        console.error(error)
        res.status(500).send({
            success:false,
            error:SOMETHING_WENT_WRONG
        })
    })
})

app.delete("/api/user/delete-doctor",(req,res)=>{
    if(typeof req.query.id==='undefined'){
        res.status(400).send({
            success:false,
            error:WRONG_BODY_FORMAT
        })
        return
    }

    dao.deleteDoctor(new Doctor(req.query.id)).then(result=>{
        res.status(200).send({
            success:true,
            result:result
        })
    }).catch(error=>{
        if(error===NO_SUCH_CONTENT){
            res.status(204).send({
                success:false,
                error:NO_SUCH_CONTENT
            })
            return
        }
        console.error(error)
        res.status(500).send({
            success:false,
            error:SOMETHING_WENT_WRONG
        })
    })
})

app.get("/api/user/retrieve-patient",(req,res)=>{
    if(typeof req.query.id==='undefined' &&
       typeof req.query.owner_id==='undefined'&&
        typeof req.query.age==='undefined'){
        dao.retrievePatient().then(result=>{
            res.status(200).send({
                success: true,
                result: result
            })
            //res.sendFile(__dirname+result.picture)
        }).catch(err=>{
            console.error(err)
            res.status(500).send({
                success: false,
                error: SOMETHING_WENT_WRONG
            })
        })
    }else if(typeof req.query.id==='undefined' &&
             typeof req.query.owner_id!=='undefined'&&
             typeof req.query.age==='undefined'){
        dao.retrievePatientsByOwnerId(req.query.owner_id).then(result=>{
            res.status(200).send({
                success:true,
                result:result
            })
        }).catch(error=>{
            if(error===NO_SUCH_CONTENT){
                res.status(204).send({
                    success:false,
                    error:NO_SUCH_CONTENT
                })
                return
            }
            console.error(error)
            res.status(500).send({
                success:false,
                error:SOMETHING_WENT_WRONG
            })
        })
    } else{
        const patient=new Patient(req.query.id,null,null,null)

        dao.retrieveOnePatient(patient).then(result=>{
            res.status(200).send({
                success:true,
                result:result
            })
        }).catch(err=>{
            if(err===NO_SUCH_CONTENT){
                res.status(204).send({
                    success:false,
                    error:NO_SUCH_CONTENT
                })
                return
            }
            console.error(err)
            res.status(500).send({
                success:false,
                error:SOMETHING_WENT_WRONG
            })
        })
    }
})

app.get("/api/user/retrieve-patient-picture",(req,res)=>{
    if(typeof req.query.id==='undefined'){
        res.status(404).send({
            success:false,
            error:WRONG_BODY_FORMAT
        })
        return
    }

    dao.retrievePatientPicture(new Patient(req.query.id)).then(result=>{
        if(result==='No Attachment'){
            res.status(204).send('No Attachment')
            return
        }
        //res.status(200).sendFile('C:/xampp/htdocs/BaharTech/Diagnose-My-Pet-REST-API/'+'/Uploads/'+result)
        res.status(200).sendFile(UPLOADPATH+result)
    }).catch(error=>{
        if(error===NO_SUCH_CONTENT){
            res.status(204).send({
                success:false,
                error:NO_SUCH_CONTENT
            })
            return
        }
        console.error(error)
        res.status(500).send({
            success:false,
            error:SOMETHING_WENT_WRONG
        })
    })
})

app.post("/api/user/add-patient",async (req,res)=>{
    const upload=multer({storage:storage, fileFilter: medicalRecordFilter}).single('patient_attachment')

    upload(req,res, async(error)=>{
        if (typeof req.body.patient_name === 'undefined' ||
            typeof req.body.animal_type === 'undefined' ||
            typeof req.body.age==='undefined' ||
            typeof req.body.gender==='undefined' ||
            typeof req.body.pet_owner === 'undefined'){
            res.status(400).send({
                success: false,
                error: WRONG_BODY_FORMAT
            })
            return
        }

        if (!req.body.age.toString().includes(".")){
            req.body.age = `${req.body.age}.0`
        }
        const splittedAge = (req.body.age.toString()).split(".") // Array 0 -> year Array 1 -> month

        let birthDate=new Date()
        birthDate.setFullYear(birthDate.getFullYear()-splittedAge[0])
        birthDate.setMonth(birthDate.getMonth()-splittedAge[1])

        let patient;
        if(typeof req.file==='undefined'){
            patient = new Patient(
                null,req.body.patient_name.toUpperCase(),
                req.body.animal_type,req.body.breed.toUpperCase(),req.body.gender.toUpperCase(),
                birthDate,req.body.pet_owner,'No Attachment')
        }else{
            if(error instanceof multer.MulterError || error){
                res.send(error)
                return
            }

            patient = new Patient(
                null,req.body.patient_name.toUpperCase(),
                req.body.animal_type,req.body.breed.toUpperCase(),req.body.gender.toUpperCase(),
                birthDate,req.body.pet_owner,req.file.filename)

        }

        // Check if user id exists
        dao.retrieveUserId(new User(req.body.pet_owner)).then(result=>{
            dao.registerPatient(patient).then(result=>{
                res.status(200).send({
                    success: true,
                    result: result
                })
            }).catch(err=>{
                if (err.code === 'ER_DUP_ENTRY') {
                    res.status(500).send({
                        success: false,
                        error: 'DUPLICATE-ENTRY'
                    })
                    res.end()
                }else{
                    console.error(err)
                    res.status(500).send({
                        success: false,
                        error: SOMETHING_WENT_WRONG
                    })
                }
            })
        }).catch(error=>{
            if(error===NO_SUCH_CONTENT){
                res.status(204).send({
                    success:false,
                    error:NO_SUCH_CONTENT
                })
                return
            }
            console.error(error)
            res.status(500).send({
                success:false,
                error:SOMETHING_WENT_WRONG
            })
        })
    })
})

app.post("/api/user/update-patient",async (req,res)=>{
    const upload=multer({storage:storage, fileFilter: medicalRecordFilter}).single('patient_attachment')

    upload(req,res, async(error)=>{
        if(typeof req.body.id ==='undefined' ||
            typeof req.body.patient_name === 'undefined' ||
            typeof req.body.animal_type === 'undefined' ||
            typeof req.body.age=== 'undefined' ||
            typeof req.body.gender==='undefined' ||
            typeof req.body.pet_owner === 'undefined'){
            res.status(400).send({
                success: false,
                error: WRONG_BODY_FORMAT
            })
            return
        }

        if (!req.body.age.toString().includes(".")){
            req.body.age = `${req.body.age}.0`
        }
        const splittedAge = (req.body.age.toString()).split(".")

        let birthDate=new Date()
        birthDate.setFullYear(birthDate.getFullYear()-splittedAge[0])
        birthDate.setMonth(birthDate.getMonth()-splittedAge[1])

        let patient;
        if(typeof req.file==='undefined'){
            patient=new Patient(req.body.id,req.body.patient_name.toUpperCase(),req.body.animal_type,
                req.body.breed.toUpperCase(),req.body.gender.toUpperCase(),birthDate,req.body.pet_owner,'No Attachment')

        }else{
            if(error instanceof multer.MulterError || error){
                return res.send(error)
            }

            patient=new Patient(req.body.id,req.body.patient_name.toUpperCase(),req.body.animal_type,
                req.body.breed.toUpperCase(),req.body.gender.toUpperCase(),birthDate,req.body.pet_owner,req.file.filename)
        }

        dao.retrieveOnePatient(new Patient(req.body.id)).then(patientResult=>{
            dao.retrievePatientPicture(new Patient(req.body.id)).then(pictureResult=>{
                if(pictureResult==='No Attachment'){
                    dao.updatePatient(patient).then(result=>{
                        res.status(200).send({
                            success:true,
                            result:result
                        })
                    }).catch(err=>{
                        console.error(err)
                        res.status(500).send({
                            success: false,
                            error: SOMETHING_WENT_WRONG
                        })
                    })
                    return
                }

                if(patient.picture!=='No Attachment'){
                    fs.unlinkSync(UPLOADPATH+pictureResult)
                }

                dao.updatePatient(patient).then(result=>{
                    res.status(200).send({
                        success:true,
                        result:result
                    })
                }).catch(err=>{
                    console.error(err)
                    res.status(500).send({
                        success: false,
                        error: SOMETHING_WENT_WRONG
                    })
                })
            }).catch(error=>{
                if(error===NO_SUCH_CONTENT){
                    res.status(204).send({
                        success:false,
                        error:NO_SUCH_CONTENT
                    })
                    return
                }
                console.error(error)
                res.status(500).send({
                    success:false,
                    error:SOMETHING_WENT_WRONG
                })
            })
        }).catch(error=>{
            if(error===NO_SUCH_CONTENT){
                res.status(204).send({
                    success:false,
                    error:NO_SUCH_CONTENT
                })
                return
            }
            console.error(error)
            res.status(500).send({
                success:false,
                error:SOMETHING_WENT_WRONG
            })
        })
    })
})

app.delete("/api/user/delete-patient",(req,res)=>{
    if(typeof req.query.id==='undefined'){
        res.status(500).send({
            success:false,
            error:SOMETHING_WENT_WRONG
        })
        return
    }

    const patient=new Patient(req.query.id,null,null,null,null)
    dao.retrievePatientPicture(patient).then(pictureResult=>{
        if(pictureResult==='No Attachment'){
            dao.deletePatient(patient).then(result=>{
                res.status(200).send({
                    success:true,
                    result:SUCCESS
                })
            }).catch(err=>{
                console.error(err)
                res.status(500).send({
                    success: false,
                    error: SOMETHING_WENT_WRONG
                })
            })
            return
        }
        fs.unlinkSync(UPLOADPATH+pictureResult)
        dao.deletePatient(patient).then(result=>{
            res.status(200).send({
                success:true,
                result:SUCCESS
            })
        }).catch(err=>{
            console.error(err)
            res.status(500).send({
                success: false,
                error: SOMETHING_WENT_WRONG
            })
        })
    }).catch(error=>{
        if(error===NO_SUCH_CONTENT){
            res.status(204).send({
                success:false,
                error:NO_SUCH_CONTENT
            })
            return
        }
        console.error(error)
        res.status(500).send({
            success:false,
            error:SOMETHING_WENT_WRONG
        })
    })
})

app.post("/api/user/bind-user-to-pet", (req,res)=>{
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
                error: 'DUPLICATE-ENTRY'
            })
            res.end()
        }else if(err.code === 'ER_NO_REFERENCED_ROW_2') {
            res.status(500).send({
                success: false,
                error: ERROR_FOREIGN_KEY
            })
        }else{
            console.error(err)
            res.status(500).send({
                success: false,
                error: SOMETHING_WENT_WRONG
            })
        }
    })
})

app.get("/api/user/retrieve-medical-record",(req,res)=>{
    if(typeof req.query.id==='undefined' &&
       typeof req.query.patient_id==='undefined' &&
       typeof req.query.appointment_id==='undefined'){
        dao.retrieveMedicalRecord().then(result=>{
            res.status(200).send({
                success:true,
                result:result
            })
        }).catch(err=>{
            console.error(err)
            res.status(500).send({
                success:false,
                error:SOMETHING_WENT_WRONG
            })
        })
    }else if(typeof req.query.patient_id!=='undefined'){
        dao.retrieveMedicalRecordByPatientId(req.query.patient_id).then(result=>{
            res.status(200).send({
                success:true,
                result:result
            })
        }).catch(error=>{
            if(error===NO_SUCH_CONTENT){
                res.status(204).send({
                    success:false,
                    error:NO_SUCH_CONTENT
                })
                return
            }
            console.error(error)
            res.status(500).send({
                success:false,
                error:SOMETHING_WENT_WRONG
            })
        })
    } else if (typeof req.query.appointment_id !=='undefined'){
        dao.retrieveMedicalRecordByAppointmentId(req.query.appointment_id).then(result=>{
            res.status(200).send({
                success:true,
                result:result
            })
        }).catch(error=>{
            if(error===NO_SUCH_CONTENT){
                res.status(204).send({
                    success:false,
                    error:NO_SUCH_CONTENT
                })
                return
            }
            console.error(error)
            res.status(500).send({
                success:false,
                error:SOMETHING_WENT_WRONG
            })
        })
    }else {
        const record=new MedicalRecords(req.query.id)
        dao.retrieveOneMedicalRecord(record).then(result=>{
            res.status(200).send({
                success:true,
                result:result
            })
        }).catch(err=>{
            if(err===NO_SUCH_CONTENT){
                res.status(204).send({
                    success:false,
                    error:NO_SUCH_CONTENT
                })
                return
            }
            console.error(err)
            res.status(500).send({
                success:false,
                error:SOMETHING_WENT_WRONG
            })
        })
    }
})

app.post("/api/user/add-medical-record", (req,res)=>{
    const upload=multer({storage:storage, fileFilter: medicalRecordFilter}).single('mc_attachment')

    upload(req,res,async(error)=>{
        if(typeof req.body.appointment_id ==='undefined'){
            res.status(400).send({
                success:false,
                error:WRONG_BODY_FORMAT
            })
            return
        }

        let medical;
        if(typeof req.file==='undefined'){
           medical=new MedicalRecords(null,req.body.description,req.body.medication,'NOW()', req.body.appointment_id,'No Attachment')
            dao.addMedicalRecord(medical).then(result=>{
                dao.finishAppointmentSchedule(req.body.appointment_id).then(result=>{
                    res.status(200).send({
                        success:true,
                        result:result
                    })
                }).catch(error=>{
                    console.error(error)
                    res.status(500).send({
                        success:false,
                        error:SOMETHING_WENT_WRONG
                    })
                })
            }).catch(err=>{
                if(err.code==='ER_DUP_ENTRY'){
                    res.status(500).send({
                        success:false,
                        error:ERROR_DUPLICATE_ENTRY
                    })
                }else{
                    console.error(err)
                    res.status(500).send({
                        success:false,
                        error:SOMETHING_WENT_WRONG
                    })
                }
            })
            return
        }else if(typeof req.body.description==='undefined' &&
                 typeof req.body.medication==='undefined' &&
                 req.file==='undefined'){
            dao.finishAppointmentSchedule(req.body.appointment_id).then(result=>{
                res.status(200).send({
                    success:true,
                    result:result
                })
            }).catch(error=>{
                console.error(error)
                res.status(500).send({
                    success:false,
                    error:SOMETHING_WENT_WRONG
                })
            })
        }else{
            if(error instanceof multer.MulterError || error){
                return res.send(error)
            }

            medical=new MedicalRecords(null,req.body.description,req.body.medication,'NOW()', req.body.appointment_id,req.file.filename)
            dao.addMedicalRecord(medical).then(result=>{
                dao.finishAppointmentSchedule(req.body.appointment_id).then(result=>{
                    res.status(200).send({
                        success:true,
                        result:result
                    })
                }).catch(error=>{
                    console.error(error)
                    res.status(500).send({
                        success:false,
                        error:SOMETHING_WENT_WRONG
                    })
                })
            }).catch(err=>{
                if(err.code==='ER_DUP_ENTRY'){
                    res.status(500).send({
                        success:false,
                        error:ERROR_DUPLICATE_ENTRY
                    })
                }else{
                    console.error(err)
                    res.status(500).send({
                        success:false,
                        error:SOMETHING_WENT_WRONG
                    })
                }
            })
        }
    })
})

app.post("/api/user/update-medical-record",(req,res)=>{
    const upload=multer({storage:storage, fileFilter: medicalRecordFilter}).single('mc_attachment')

    upload(req,res,async(error)=>{
        if( typeof req.body.id === 'undefined' ||
            typeof req.body.appointment_id === 'undefined'){
            res.status(400).send({
                success:false,
                error:WRONG_BODY_FORMAT
            })
            return
        }

        dao.retrieveOneMedicalRecord(new MedicalRecords(req.body.id)).then(medResult=>{
            if(medResult[0].file_attachment===null || medResult[0].file_attachment==='No Attachment'){
                let medic;
                if(typeof req.file==='undefined'){
                    medic=new MedicalRecords(req.body.id,req.body.description,req.body.medication,'NOW()', req.body.appointment_id,'No Attachment')
                }else{
                    if(error instanceof multer.MulterError || error){
                        return res.send(error)
                    }

                    medic=new MedicalRecords(req.body.id,req.body.description,req.body.medication,'NOW()', req.body.appointment_id,req.file.filename)
                }

                dao.updateMedicalRecord(medic).then(result=>{
                    res.status(200).send({
                        success:true,
                        result:result
                    })
                }).catch(err=>{
                    if(err.code==='ER_DUP_ENTRY'){
                        res.status(500).send({
                            success:false,
                            error:ERROR_DUPLICATE_ENTRY
                        })
                    }else{
                        console.error(err)
                        res.status(500).send({
                            success:false,
                            error:SOMETHING_WENT_WRONG
                        })
                    }
                })
            }else{
                let medic;
                if(typeof req.file==='undefined'){
                    medic=new MedicalRecords(req.body.id,req.body.description,req.body.medication,'NOW()', req.body.appointment_id, 'No Attachment')
                }else{
                    if(error instanceof multer.MulterError || error){
                        return res.send(error)
                    }

                    medic=new MedicalRecords(req.body.id,req.body.description,req.body.medication,'NOW()', req.body.appointment_id,req.file.filename)
                    fs.unlinkSync('./Uploads/'+medResult[0].file_attachment)
                }

                dao.updateMedicalRecord(medic).then(result=>{
                    res.status(200).send({
                        success:true,
                        result:result
                    })
                }).catch(err=>{
                    if(err.code==='ER_DUP_ENTRY'){
                        res.status(500).send({
                            success:false,
                            error:ERROR_DUPLICATE_ENTRY
                        })
                    }else{
                        console.error(err)
                        res.status(500).send({
                            success:false,
                            error:SOMETHING_WENT_WRONG
                        })
                    }
                })
            }
        }).catch(error=>{
            if(error===NO_SUCH_CONTENT){
                res.status(204).send({
                    success:false,
                    error:NO_SUCH_CONTENT
                })
                return
            }
            console.error(error)
            res.status(500).send({
                success:false,
                error:SOMETHING_WENT_WRONG
            })
        })
    })
})

app.delete("/api/user/delete-medical-record", (req,res)=>{
    if(typeof req.query.id === 'undefined'){
        res.status(400).send({
            success:false,
            error:WRONG_BODY_FORMAT
        })
        return
    }

    const medical=new MedicalRecords(req.query.id)
    dao.retrieveOneMedicalRecord(medical).then(reportResult=>{
        if(reportResult[0].file_attachment===null ||
            reportResult[0].file_attachment==='No Attachment'){
            dao.deleteMedicalRecord(medical).then(result=>{
                res.status(200).send({
                    success:true,
                    result:result
                })
            }).catch(error=>{
                console.error(error)
                res.status(500).send({
                    success:false,
                    error:SOMETHING_WENT_WRONG
                })
            })
            return
        }

        dao.deleteMedicalRecord(medical).then(result=>{
            fs.unlinkSync('./Uploads/'+reportResult[0].file_attachment)
            res.status(200).send({
                success:true,
                result:result
            })
        }).catch(err=>{
            if(err.code==='ER_DUP_ENTRY'){
                res.status(500).send({
                    success:false,
                    error:ERROR_DUPLICATE_ENTRY
                })
            }else{
                console.error(err)
                res.status(500).send({
                    success:false,
                    error:SOMETHING_WENT_WRONG
                })
            }
        })
    }).catch(error=>{
        if(error===NO_SUCH_CONTENT){
            res.status(204).send({
                success:false,
                error:NO_SUCH_CONTENT
            })
            return
        }
        console.error(error)
        res.status(500).send({
            success:false,
            error:SOMETHING_WENT_WRONG
        })
    })
})

// STARTING FROM THIS LINE COMES ENDPOINTS WHICH HANDLES FILE

/* MAKE /api/diagnosis/attach-medical-records
 / Pass query medical_record_id, filename
 */

app.get("/api/user/retrieve-medical-attachment", (req,res)=>{
    if(typeof req.query.file_name==='undefined'){
        dao.retrieveMedicalRecordAttachment().then(result=>{
            res.status(200).send({
                success:true,
                result:result
            })
        }).catch(err=>{
            if(err.code==='ER_DUP_ENTRY'){
                res.status(500).send({
                    success:false,
                    error:ERROR_DUPLICATE_ENTRY
                })
            }else{
                res.status(500).send({
                    success:false,
                    error:SOMETHING_WENT_WRONG
                })
            }
        })
    }else{
        const record=new MedicalRecordAttachment(null,null,req.query.file_name)
        dao.retrieveOneMedicalRecordAttachment(record).then(result=>{
            res.status(200).send({
                success:true,
                result:result
            })
        }).catch(err=>{
            if(err.code==='ER_DUP_ENTRY'){
                res.status(500).send({
                    success:false,
                    error:ERROR_DUPLICATE_ENTRY
                })
            }else{
                res.status(500).send({
                    success:false,
                    error:SOMETHING_WENT_WRONG
                })
            }
        })
    }
})

app.post("/api/user/attach-medical-records", async(req,res)=>{
    const upload=multer({storage:storage, fileFilter: medicalRecordFilter}).single('mc_attachment')

    upload(req,res, async(err)=>{

        if(typeof req.query.medical_record_id === 'undefined' ||
            typeof req.file.filename === 'undefined'){
            res.status(400).send({
                success:false,
                error:WRONG_BODY_FORMAT
            })
            return
        }

        if(err instanceof multer.MulterError){
            return res.send(err)
        }

        else if(err){
            return res.send(err)
        }

        console.log(req.file.filename)

        const attachment = new MedicalRecordAttachment(null,req.query.medical_record_id, req.file.filename)
        dao.addMedicalRecordAttachment(attachment).then(result=>{
            res.status(200).send({
                success:true,
                result:result
            })
        }).catch(err=>{
            if (err.code === 'ER_DUP_ENTRY') {
                res.status(500).send({
                    success: false,
                    error: 'DUPLICATE-ENTRY'
                })
                res.end()
            }else{
                console.error(err)
                res.status(500).send({
                    success: false,
                    error: SOMETHING_WENT_WRONG
                })
            }
        })
    })
})

app.post("/api/user/update-medical-attachment",async(req,res)=>{
    const upload=multer({storage:storage, fileFilter:medicalRecordFilter}).single('mc_attachment')

    upload(req,res, async(err)=>{

        console.log(req.query.medical_record_id)
        console.log(req.file.filename)

        if(typeof req.query.medical_record_id === 'undefined' ||
            typeof req.file.filename === 'undefined'){
            res.status(400).send({
                success:false,
                error:WRONG_BODY_FORMAT
            })
            return
        }

        if(err instanceof multer.MulterError){
            return res.send(err)
        } else if(err){
            return res.send(err)
        }

        console.log(req.file.filename)

        const attachment=new MedicalRecordAttachment(req.query.id,req.query.medical_record_id,req.file.filename)
        dao.updateMedicalRecordAttachment(attachment).then(result=>{
            res.status(200).send({
                success:true,
                result:result
            })
        }).catch(err=>{
            if(err.code==='ER_DUP_ENTRY'){
                res.status(500).send({
                    success:false,
                    error:ERROR_DUPLICATE_ENTRY
                })
                res.end()
            }else{
                console.error(err)
                res.status(500).send({
                    success:false,
                    error:SOMETHING_WENT_WRONG
                })
            }
        })
    })
})

app.delete("/api/user/delete-medical-attachment",(req,res)=>{
    if(typeof req.query.id==='undefined'){
        res.status(400).send({
            success:false,
            error:WRONG_BODY_FORMAT
        })
        return
    }

    const attachment=new MedicalRecordAttachment(req.query.id,null,null)

    dao.getAttachmentFileName(attachment).then(result=>{

        fs.unlinkSync('./Uploads/'+result.toString())

        dao.deleteMedicalRecordAttachment(attachment).then(result=>{
            res.status(200).send({
                success:true,
                result:SUCCESS
            })
        }).catch(err=>{
            console.error(err)
            res.status(500).send({
                success:false,
                error:SOMETHING_WENT_WRONG
            })
        })
    }).catch(err=>{
        if(err===NO_SUCH_CONTENT){
            res.status(204).send({
                success:false,
                error:NO_SUCH_CONTENT
            })
        }
        else{
            console.error(err)
            res.status(500).send({
                success:false,
                error:SOMETHING_WENT_WRONG
            })
        }
    })
})

app.get("/api/user/retrieve-appointment", (req,res)=>{
    if(typeof req.query.id==='undefined' &&
       typeof req.query.doctor_id==='undefined' &&
        typeof req.query.date1 ==='undefined' &&
        typeof req.query.date2 ==='undefined' &&
        typeof req.query.doctor_name==='undefined' &&
        typeof req.query.customer_id==='undefined'){
        dao.retrieveAppointment().then(result=>{
            res.status(200).send({
                success:true,
                result:result
            })
        }).catch(err=>{
            console.error(err)
            res.status(500).send({
                success:false,
                error:SOMETHING_WENT_WRONG
            })
        })
    }else if(typeof req.query.doctor_id !== 'undefined'){
        dao.retrieveOneAppointmentByDoctorId(new Doctor(req.query.doctor_id)).then(result=>{
            res.status(200).send({
                success:true,
                result:result
            })
        }).catch(err=>{
            if(err===NO_SUCH_CONTENT){
                res.status(204).send({
                    success:false,
                    error:NO_SUCH_CONTENT
                })
                return
            }
            console.error(err)
            res.status(500).send({
                success:false,
                error:SOMETHING_WENT_WRONG
            })
        })
    }else if(typeof req.query.date1 !=='undefined' &&
             typeof req.query.date2 !=='undefined'){
        dao.retrieveAppointmentsBetweenDates(req.query.date1,req.query.date2).then(result=>{
            res.status(200).send({
                success:true,
                result:result
            })
        }).catch(err=>{
            if(err===NO_SUCH_CONTENT){
                res.status(204).send({
                    success:false,
                    error:NO_SUCH_CONTENT
                })
                return
            }
            console.error(err)
            res.status(500).send({
                success:false,
                error:SOMETHING_WENT_WRONG
            })
        })
    }else if(typeof req.query.doctor_id !== 'undefined' &&
             typeof req.query.date1 !== 'undefined' &&
             typeof req.query.date2 !== 'undefined'){
        dao.retrieveAppointmentByDoctorAndBetweenDates(req.query.doctor_id,req.query.date1,req.query.date2).then(result=>{
            res.status(200).send({
                success:true,
                result:result
            })
        }).catch(err=>{
            if(err===NO_SUCH_CONTENT){
                res.status(204).send({
                    success:false,
                    error:NO_SUCH_CONTENT
                })
                return
            }
            console.error(err)
            res.status(500).send({
                success:false,
                error:SOMETHING_WENT_WRONG
            })
        })
    }else if(typeof req.query.doctor_name!=='undefined'){
        const doctor=new Doctor(null,req.query.doctor_name)
        dao.retrieveAppointmentByDoctorName(doctor).then(result=>{
            res.status(200).send({
                success:true,
                result:result
            })
        }).catch(error=>{
            if(error===NO_SUCH_CONTENT){
                res.status(204).send({
                    success:false,
                    error:NO_SUCH_CONTENT
                })
                return
            }
            console.error(error)
            res.status(500).send({
                success:false,
                error:SOMETHING_WENT_WRONG
            })
        })
    }else if(typeof req.query.customer_id !=='undefined'){
        dao.retrieveAppointmentByCustomerId(new User(req.query.customer_id)).then(result=>{
            res.status(200).send({
                success:true,
                result:result
            })
        }).catch(error=>{
            if(error===NO_SUCH_CONTENT){
                res.status(204).send({
                    success:false,
                    error:NO_SUCH_CONTENT
                })
                return
            }
            console.error(error)
            res.status(500).send({
                success:false,
                error:SOMETHING_WENT_WRONG
            })
        })
    } else{
        const appointment=new Appointment(req.query.id,null,null,null,null)
        dao.retrieveOneAppointment(appointment).then(result=>{
            res.status(200).send({
                success:true,
                result:result
            })
        }).catch(err=>{
            if(err===NO_SUCH_CONTENT){
                res.status(204).send({
                    success:false,
                    error:NO_SUCH_CONTENT
                })
                return
            }
            console.error(err)
            res.status(500).send({
                success:false,
                error:SOMETHING_WENT_WRONG
            })
        })
    }
})

app.get("/api/image",(req,res)=>{
    if(typeof req.query.image_name==='undefined'){
        res.status(400).send({
            success:false,
            error:WRONG_BODY_FORMAT
        })
        return
    }

    // fs.readdirSync(Buffer.from(UPLOADPATH+req.query.payment_attachment_name),(error,result)=>{
    //     if(error){
    //         res.status(500).send({
    //             success:false,
    //             error:SOMETHING_WENT_WRONG
    //         })
    //         return
    //     }
    // })

    //res.status(200).sendFile('C:/xampp/htdocs/BaharTech/Diagnose-My-Pet-REST-API/'+'/Uploads/'+req.query.image_name)
     res.status(200).sendFile(UPLOADPATH+req.query.image_name)
})

app.get("/api/user/retrieve-participants",(req,res)=>{
    if(typeof req.query.id==='undefined'){
        dao.retrieveParticipants().then(result=>{
            res.status(200).send({
                success:true,
                result:result
            })
        }).catch(error=>{
            console.error(error)
            res.status(500).send({
                success:false,
                error:SOMETHING_WENT_WRONG
            })
        })
    }else{
        dao.retrieveOneParticipant(new Participant(req.query.id)).then(result=>{
            res.status(200).send({
                success:true,
                result:result
            })
        }).catch(error=>{
            if(error===NO_SUCH_CONTENT){
                res.status(204).send({
                    success:false,
                    error:NO_SUCH_CONTENT
                })
                return
            }
            console.error(error)
            res.status(500).send({
                success:false,
                error:SOMETHING_WENT_WRONG
            })
        })
    }
})

app.post("/api/user/register-participant",(req,res)=>{
    if(typeof req.body.youtube_name==='undefined' ||
       typeof req.body.youtube_email==='undefined' ||
       typeof req.body.phone_number==='undefined' ||
       typeof req.body.full_name==='undefined'){
        res.status(400).send({
            success:false,
            error:WRONG_BODY_FORMAT
        })
        return
    }
    const participant=new Participant(null,req.body.full_name,req.body.youtube_name,req.body.youtube_email,req.body.phone_number)

    dao.registerParticipant(participant).then(result=>{
        res.status(200).send({
            success:true,
            result:result
        })
    }).catch(error=>{
        console.error(error)
        res.status(500).send({
            success:false,
            error:SOMETHING_WENT_WRONG
        })
    })
})

app.post("/api/user/update-participant",(req,res)=>{
    if(typeof req.body.youtube_name==='undefined' ||
        typeof req.body.youtube_email==='undefined' ||
        typeof req.body.phone_number==='undefined' ||
        typeof req.body.full_name==='undefined' ||
        typeof req.body.id==='undefined'){
        res.status(400).send({
            success:false,
            error:WRONG_BODY_FORMAT
        })
        return
    }
    const participant=new Participant(req.body.id,req.body.full_name,req.body.youtube_name,req.body.youtube_email,req.body.phone_number)

    dao.updateParticipant(participant).then(result=>{
        res.status(200).send({
            success:true,
            result:result
        })
    }).catch(error=>{
        if(error===NO_SUCH_CONTENT){
            res.status(204).send({
                success:false,
                error:NO_SUCH_CONTENT
            })
            return
        }
        console.error(error)
        res.status(500).send({
            success:false,
            error:SOMETHING_WENT_WRONG
        })
    })
})

app.delete("/api/user/delete-participant",(req,res)=>{
    if(typeof req.query.id==='undefined'){
        res.status(400).send({
            success:false,
            error:WRONG_BODY_FORMAT
        })
        return
    }

    dao.deleteParticipant(new Participant(req.query.id)).then(result=>{
        res.status(200).send({
            success:true,
            result:result
        })
    }).catch(error=>{
        if(error===NO_SUCH_CONTENT){
            res.status(204).send({
                success:false,
                error:NO_SUCH_CONTENT
            })
            return
        }
        console.error(error)
        res.status(500).send({
            success:false,
            error:SOMETHING_WENT_WRONG
        })
    })
})

// Start of v2 Development
app.post("/api/user/add-booking-type", (req, res)=>{
    if(typeof req.body.booking_type_name==='undefined' ||
        typeof req.body.duration==='undefined' ){
        res.status(400).send({
            success:false,
            error:WRONG_BODY_FORMAT
        })
        return
    }

    const paymentProofRequired = req.body.payment_proof_required === true ? true : false;

    dao.addBookingType(req.body.booking_type_name.toUpperCase(), req.body.duration, paymentProofRequired).then(result=>{
        res.status(200).send({
            success: true,
            result : result
        })
    }).catch(err=>{
        if (err.code === 'ER_DUP_ENTRY') {
            res.status(500).send({
                success: false,
                error: ERROR_DUPLICATE_ENTRY
            })
        }else {
            console.error(err)
            res.status(500).send({
                success: false,
                error: SOMETHING_WENT_WRONG
            })
        }
    })
})

app.post("/api/user/edit-booking-type", (req, res)=>{
    if(typeof req.body.booking_type_name==='undefined' ||
        typeof req.body.duration==='undefined' ){
        res.status(400).send({
            success:false,
            error:WRONG_BODY_FORMAT
        })
        return
    }

    dao.editBookingType(req.body.booking_type_name.toUpperCase(), req.body.duration).then(result=>{
        res.status(200).send({
            success: true,
            result : result
        })
    }).catch(err=>{
        if (err.code === 'ER_DUP_ENTRY') {
            res.status(500).send({
                success: false,
                error: ERROR_DUPLICATE_ENTRY
            })
        }else {
            if(err===NO_SUCH_CONTENT){
                res.status(204).send({
                    success:false,
                    error:NO_SUCH_CONTENT
                })
                return
            }
            console.error(err)
            res.status(500).send({
                success: false,
                error: SOMETHING_WENT_WRONG
            })
        }
    })
})

app.get("/api/user/retrieve-booking-types", (req, res)=>{
    dao.retrieveBookingTypes().then(result=>{
        res.status(200).send({
            success: true,
            result: result
        })
    }).catch(err=>{
        console.error(err)
        res.status(500).send({
            success: false,
            error: SOMETHING_WENT_WRONG
        })
    })
})

app.get("/api/user/retrieve-duration-of-booking-type", (req, res)=>{
    if (typeof req.query.booking_type_name === "undefined"){
        res.status(400).send({
            success: false,
            error: WRONG_BODY_FORMAT
        })
        return
    }
    dao.retrieveBookingTypeDuration(req.query.booking_type_name).then(result=>{
        res.status(200).send({
            success: true,
            result: result
        })
    }).catch(err=>{
        console.error(err)
        res.status(500).send({
            success: false,
            error: SOMETHING_WENT_WRONG
        })
    })
})

app.get("/api/user/retrieve-booking-type-by-doctor-id",(req,res)=>{
    if(typeof req.query.doctor_id==='undefined'){
        res.status(400).send({
            success:false,
            error:WRONG_BODY_FORMAT
        })
        return
    }
    dao.retrieveBookingTypeBasedOnDoctorId(req.query.doctor_id).then(result=>{
        res.status(200).send({
            success:true,
            result:result
        })
    }).catch(error=>{
        if(error===NO_SUCH_CONTENT){
            res.status(204).send({
                success:false,
                error:NO_SUCH_CONTENT
            })
            return
        }
        console.error(error)
        res.status(500).send({
            success:false,
            error:SOMETHING_WENT_WRONG
        })
    })
})

app.post("/api/user/delete-booking-type", (req, res)=>{
    if(typeof req.body.booking_type_name==='undefined' ){
        res.status(400).send({
            success:false,
            error:WRONG_BODY_FORMAT
        })
        return
    }

    dao.deleteBookingType(req.body.booking_type_name.toUpperCase()).then(result=>{
        res.status(200).send({
            success: true,
            result:result
        })
    }).catch(err=>{
        if (err.code === 'ER_DUP_ENTRY') {
            res.status(500).send({
                success: false,
                error: ERROR_DUPLICATE_ENTRY
            })
        }else if(err===NO_SUCH_CONTENT){
            res.status(204).send({
                success:false,
                error:NO_SUCH_CONTENT
            })
        } else {
            console.error(err)
            res.status(500).send({
                success: false,
                error: SOMETHING_WENT_WRONG
            })
        }
    })
})

app.post("/api/user/bind-doctor-to-booking-type", (req, res)=>{
    if (typeof req.body.booking_type_name === 'undefined' ||
        typeof req.body.doctor_id === 'undefined'){
        res.status(400).send({
            success:false,
            error:WRONG_BODY_FORMAT
        })
        return
    }

    dao.bindDoctorToBookingType(req.body.booking_type_name.toUpperCase(), req.body.doctor_id).then(result=>{
        res.status(200).send({
            success: true,
            result: result
        })
    }).catch(err=>{
        if (err===ERROR_DUPLICATE_ENTRY){
            res.status(500).send({
                success: false,
                error: ERROR_DUPLICATE_ENTRY
            })
        }else {
            console.error(err)
            res.status(500).send({
                success: false,
                error: SOMETHING_WENT_WRONG
            })
        }
    })
})

app.post("/api/user/bind-and-rebind-doctor-to-booking-type", (req, res)=>{
    if (typeof req.body.booking_type_name_array === 'undefined' ||
        typeof req.body.doctor_id === 'undefined'){
        res.status(400).send({
            success:false,
            error:WRONG_BODY_FORMAT
        })
        return
    }

    dao.bindAndRebind(JSON.parse(req.body.booking_type_name_array), req.body.doctor_id).then(result=>{
        res.status(200).send({
            success: true,
            result: result
        })
    }).catch(err=>{
        if (err===ERROR_DUPLICATE_ENTRY){
            res.status(500).send({
                success: false,
                error: ERROR_DUPLICATE_ENTRY
            })
        }else {
            console.error(err)
            res.status(500).send({
                success: false,
                error: SOMETHING_WENT_WRONG
            })
        }
    })
})

app.post("/api/user/unbind-doctor-to-booking-type", (req, res)=>{
    if(typeof req.body.booking_type_name==='undefined' ||
       typeof req.body.doctor_id==='undefined'){
        res.status(400).send({
            success:false,
            error:WRONG_BODY_FORMAT
        })
        return
    }
    dao.unbindDoctorToBookingType(req.body.booking_type_name.toUpperCase(), req.body.doctor_id).then(result=>{
        res.status(200).send({
            success: true,
            result: result
        })
    }).catch(err=>{
        if (err===ERROR_DUPLICATE_ENTRY){
            res.status(500).send({
                success: false,
                error: ERROR_DUPLICATE_ENTRY
            })
        }else if(err===NO_SUCH_CONTENT){
            res.status(204).send({
                success:false,
                error:NO_SUCH_CONTENT
            })
        } else {
            console.error(err)
            res.status(500).send({
                success: false,
                error: SOMETHING_WENT_WRONG
            })
        }
    })
})

app.get("/api/user/retrieve-doctor-by-booking-type",(req,res)=>{
    if(typeof req.query.booking_type_name==='undefined' &&
       typeof req.query.booking_type_id==='undefined'){
        res.status(400).send({
            success:false,
            error:WRONG_BODY_FORMAT
        })
        return
    }

    if(typeof req.query.booking_type_id !=='undefined' &&
       typeof req.query.booking_type_name==='undefined'){
        dao.retrieveDoctorsByBookingTypeId(req.query.booking_type_id).then(result=>{
            res.status(200).send({
                success:true,
                result:result
            })
        }).catch(error=>{
            if (err===ERROR_DUPLICATE_ENTRY){
                res.status(500).send({
                    success: false,
                    error: ERROR_DUPLICATE_ENTRY
                })
            }else if(err===NO_SUCH_CONTENT){
                res.status(204).send({
                    success:false,
                    error:NO_SUCH_CONTENT
                })
            } else {
                console.error(err)
                res.status(500).send({
                    success: false,
                    error: SOMETHING_WENT_WRONG
                })
            }
        })
        return
    }
    dao.retrieveDoctorsBasedOnBookingType(req.query.booking_type_name.toUpperCase()).then(result=>{
        res.status(200).send({
            success:true,
            result:result
        })
    }).catch(error=>{
        if(error===NO_SUCH_CONTENT){
            res.status(204).send({
                success:false,
                error:NO_SUCH_CONTENT
            })
            return
        }
        console.error(error)
        res.status(500).send({
            success:false,
            error:SOMETHING_WENT_WRONG
        })
    })
})

app.get("/api/user/retrieve-booked-appointment-schedule",(req,res)=>{
    if(typeof req.query.id==='undefined' &&
       typeof req.query.doctor_id==='undefined' &&
       typeof req.query.patient_id==='undefined' &&
       typeof req.query.user_id==='undefined' &&
       typeof req.query.start_time==='undefined' &&
       typeof req.query.end_time==='undefined'){
        dao.retrieveBookedAppointmentSchedule().then(result=>{
            res.status(200).send({
                success:true,
                result:result
            })
        }).catch(error=>{
            if(error===NO_SUCH_CONTENT){
                res.status(204).send({
                    success:false,
                    error:NO_SUCH_CONTENT
                })
                return
            }
            console.error(error)
            res.status(500).send({
                success:false,
                error:SOMETHING_WENT_WRONG
            })
        })
    }else if(typeof req.query.id==='undefined' &&
        typeof req.query.doctor_id!=='undefined' &&
        typeof req.query.patient_id==='undefined'&&
        typeof req.query.user_id==='undefined' &&
        typeof req.query.start_time==='undefined' &&
        typeof req.query.end_time==='undefined'){
        dao.retrieveBookedAppointmentScheduleByDoctorId(req.query.doctor_id).then(result=>{
            res.status(200).send({
                success:true,
                result:result
            })
        }).catch(error=>{
            if(error===NO_SUCH_CONTENT){
                res.status(204).send({
                    success:false,
                    error:NO_SUCH_CONTENT
                })
                return
            }
            console.error(error)
            res.status(500).send({
                success:false,
                error:SOMETHING_WENT_WRONG
            })
        })
    }else if(typeof req.query.id==='undefined' &&
        typeof req.query.doctor_id==='undefined' &&
        typeof req.query.patient_id!=='undefined'&&
        typeof req.query.user_id==='undefined' &&
        typeof req.query.start_time==='undefined' &&
        typeof req.query.end_time==='undefined'){
        dao.retrieveAppointmentScheduleByPatientId(req.query.patient_id).then(result=>{
            res.status(200).send({
                success:true,
                result:result
            })
        }).catch(error=>{
            if(error===NO_SUCH_CONTENT){
                res.status(204).send({
                    success:false,
                    error:NO_SUCH_CONTENT
                })
                return
            }
            console.error(error)
            res.status(500).send({
                success:false,
                error:SOMETHING_WENT_WRONG
            })
        })
    }else if(typeof req.query.id==='undefined' &&
        typeof req.query.doctor_id==='undefined' &&
        typeof req.query.patient_id==='undefined'&&
        typeof req.query.user_id!=='undefined' &&
        typeof req.query.start_time==='undefined' &&
        typeof req.query.end_time==='undefined'){
        dao.retrieveAppointmentScheduleByUserId(req.query.user_id).then(result=>{
            res.status(200).send({
                success:true,
                result:result
            })
        }).catch(error=>{
            if(error===NO_SUCH_CONTENT){
                res.status(204).send({
                    success:false,
                    error:NO_SUCH_CONTENT
                })
                return
            }
            console.error(error)
            res.status(500).send({
                success:false,
                error:SOMETHING_WENT_WRONG
            })
        })
    } else if(typeof req.query.id==='undefined' &&
        typeof req.query.doctor_id!=='undefined' &&
        typeof req.query.patient_id==='undefined'&&
        typeof req.query.user_id==='undefined' &&
        typeof req.query.start_time!=='undefined' &&
        typeof req.query.end_time!=='undefined'){
        dao.retrieveAppointmentScheduleByStartTimeEndTimeDoctorId(req.query.start_time,req.query.end_time,req.query.doctor_id).then(result=>{
            res.status(200).send({
                success:true,
                result:result
            })
        }).catch(error=>{
            if(error===NO_SUCH_CONTENT){
                res.status(204).send({
                    success:false,
                    error:NO_SUCH_CONTENT
                })
                return
            }
            console.error(error)
            res.status(500).send({
                success:false,
                error:SOMETHING_WENT_WRONG
            })
        })
    }else if(typeof req.query.id==='undefined' &&
        typeof req.query.doctor_id==='undefined' &&
        typeof req.query.patient_id==='undefined'&&
        typeof req.query.user_id==='undefined' &&
        typeof req.query.start_time!=='undefined' &&
        typeof req.query.end_time!=='undefined'){
        dao.retrieveAppointmentScheduleByStartTimeEndTime(req.query.start_time,req.query.end_time).then(result=>{
            res.status(200).send({
                success:true,
                result:result
            })
        }).catch(error=>{
            if(error===NO_SUCH_CONTENT){
                res.status(204).send({
                    success:false,
                    error:NO_SUCH_CONTENT
                })
                return
            }
            console.error(error)
            res.status(500).send({
                success:false,
                error:SOMETHING_WENT_WRONG
            })
        })
    }
    else{
        dao.retrieveOneAppointmentSchedule(req.query.id).then(result=>{
            res.status(200).send({
                success:true,
                result:result
            })
        }).catch(error=>{
            if(error===NO_SUCH_CONTENT){
                res.status(204).send({
                    success:false,
                    error:NO_SUCH_CONTENT
                })
                return
            }
            console.error(error)
            res.status(500).send({
                success:false,
                error:SOMETHING_WENT_WRONG
            })
        })
    }
})

app.get("/api/user/retrieve-available-slot-for-frontend",(req,res)=>{
    if(typeof req.query.start_time==='undefined' ||
       typeof req.query.end_time==='undefined' ||
       typeof req.query.doctor_id==='undefined' ||
       typeof req.query.booking_type_name==='undefined'){
        res.status(400).send({
            success:false,
            false:WRONG_BODY_FORMAT
        })
        return
    }

    dao.retrieveAvailableAppointmentScheduleFrontend(req.query.start_time,req.query.end_time,req.query.doctor_id,req.query.booking_type_name).then(result=>{
        res.status(200).send({
            success:true,
            result:result
        })
    }).catch(error=>{
        if(error===NO_SUCH_CONTENT){
            res.status(204).send({
                success:false,
                error:NO_SUCH_CONTENT
            })
            return
        }
        console.error(error)
        res.status(500).send({
            success:false,
            error:SOMETHING_WENT_WRONG
        })
    })
})

app.get("/api/user/retrieve-available-slot-for-doctor",(req,res)=>{
    if(typeof req.query.start_time==='undefined' ||
        typeof req.query.end_time==='undefined' ||
        typeof req.query.doctor_id==='undefined'){
        res.status(400).send({
            success:false,
            false:WRONG_BODY_FORMAT
        })
        return
    }

    dao.retrieveAvailableAppointmentScheduleForDoctorDay(req.query.start_time,req.query.end_time,req.query.doctor_id).then(result=>{
        res.status(200).send({
            success:true,
            result:result
        })
    }).catch(error=>{
        if(error===NO_SUCH_CONTENT){
            res.status(204).send({
                success:false,
                error:NO_SUCH_CONTENT
            })
            return
        }
        console.error(error)
        res.status(500).send({
            success:false,
            error:SOMETHING_WENT_WRONG
        })
    })
})

app.post("/api/user/add-appointment-slot", (req, res)=>{
    if(typeof req.body.start_time==='undefined' ||
       typeof req.body.end_time==='undefined' ||
       typeof req.body.status==='undefined' ||
       typeof req.body.doctor_id==='undefined' ||
       typeof req.body.booking_type_name==='undefined'){
        res.status(400).send({
            success:false,
            error:WRONG_BODY_FORMAT
        })
        return
    }

    dao.addAppointmentSlot(req.body.start_time, req.body.end_time, req.body.description, req.body.additional_storage, req.body.status.toUpperCase(), req.body.doctor_id, req.body.booking_type_name.toUpperCase()).then(appointmentResult=>{
        res.status(200).send({
            success: true
        })
    }).catch(err=>{
        console.error(err)
        res.status(500).send({
            success:false,
            error:err
        })
    })
})

app.post("/api/user/use-appointment-slot",(req, res)=>{
    const upload=multer({storage:storage, fileFilter: medicalRecordFilter}).single('payment_attachment')

    upload(req,res,async(error)=>{
        if (typeof req.body.appointment_id === 'undefined' ||
            typeof req.body.patient_id === 'undefined'
        ){
            res.status(400).send({
                success:false,
                error:WRONG_BODY_FORMAT
            })
            return
        }

        dao.retrieveOneAppointmentSchedule(req.body.appointment_id).then(appointmentResult=>{
            dao.retrieveBookingTypeByName(appointmentResult[0].booking_type_name).then(bookingResult=>{
                if(bookingResult[0].payment_proof_required ===1){
                    // if(typeof req.file==='undefined'){
                    //     res.status(400).send({
                    //         success:false,
                    //         error:'Proof of payment is required for this booking type'
                    //     })
                    //     return
                    // }
                    if(error instanceof multer.MulterError){
                        return res.send(error)
                    } else if(error){
                        return res.send(error)
                    }
                    let filename;
                    if  (typeof req.file === 'undefined'){
                        filename = null
                    }else{
                        filename = req.file.filename
                    }
                    dao.useAppointmentSlot(req.body.appointment_id, req.body.patient_id, filename, req.body.description, req.body.additional_question).then(result=>{
                        if (result.affectedRows === 0){
                            res.status(404).send({
                                success: false,
                                message: ERROR_FOREIGN_KEY
                            })
                        }else{
                            dao.addAppointmentLog(req.body.patient_id,appointmentResult[0].booking_type_name,appointmentResult[0].start_time,req.body.notes).then(result=>{
                                res.status(200).send({
                                    success: true
                                })
                            }).catch(error=>{
                                console.error(error)
                                res.status(500).send({
                                    success:false,
                                    error:SOMETHING_WENT_WRONG
                                })
                            })
                        }
                    }).catch(err=>{
                        if (err.code==="ER_NO_REFERENCED_ROW_2"){
                            res.status(404).send({
                                success: false,
                                message: ERROR_FOREIGN_KEY
                            })
                        }else{
                            console.error(err)
                            res.status(500).send({
                                success: false,
                                error: SOMETHING_WENT_WRONG
                            })
                        }
                    })
                }else{
                    if(typeof req.file==='undefined'){
                        dao.useAppointmentSlot(req.body.appointment_id, req.body.patient_id, null, req.body.description, req.body.additional_question).then(result=>{
                            if (result.affectedRows === 0){
                                res.status(404).send({
                                    success: false,
                                    message: ERROR_FOREIGN_KEY
                                })
                            }else{
                                dao.addAppointmentLog(req.body.patient_id,appointmentResult[0].booking_type_name,appointmentResult[0].start_time,req.body.notes).then(result=>{
                                    res.status(200).send({
                                        success: true
                                    })
                                }).catch(error=>{
                                    console.error(error)
                                    res.status(500).send({
                                        success:false,
                                        error:SOMETHING_WENT_WRONG
                                    })
                                })
                            }
                        }).catch(err=>{
                            if (err.code==="ER_NO_REFERENCED_ROW_2"){
                                res.status(404).send({
                                    success: false,
                                    message: ERROR_FOREIGN_KEY
                                })
                            }else{
                                console.error(err)
                                res.status(500).send({
                                    success: false,
                                    error: SOMETHING_WENT_WRONG
                                })
                            }
                        })
                        return
                    }

                    dao.useAppointmentSlot(req.body.appointment_id, req.body.patient_id, req.file.filename, req.body.description, req.body.additional_question).then(result=>{
                        if (result.affectedRows === 0){
                            res.status(404).send({
                                success: false,
                                message: ERROR_FOREIGN_KEY
                            })
                        }else{
                            dao.addAppointmentLog(req.body.patient_id,appointmentResult[0].booking_type_name,appointmentResult[0].start_time,req.body.notes).then(result=>{
                                res.status(200).send({
                                    success: true
                                })
                            }).catch(error=>{
                                console.error(error)
                                res.status(500).send({
                                    success:false,
                                    error:SOMETHING_WENT_WRONG
                                })
                            })
                        }
                    }).catch(err=>{
                        if (err.code==="ER_NO_REFERENCED_ROW_2"){
                            res.status(404).send({
                                success: false,
                                message: ERROR_FOREIGN_KEY
                            })
                        }else{
                            console.error(err)
                            res.status(500).send({
                                success: false,
                                error: SOMETHING_WENT_WRONG
                            })
                        }
                    })
                 }
            }).catch(error=>{
                if(error===NO_SUCH_CONTENT){
                    res.status(204).send({
                        success:false,
                        error:NO_SUCH_CONTENT
                    })
                }
                console.error(error)
                res.status(500).send({
                    success:false,
                    error:SOMETHING_WENT_WRONG
                })
            })
        }).catch(error=>{
            if(error===NO_SUCH_CONTENT){
                res.status(204).send({
                    success:false,
                    error:NO_SUCH_CONTENT
                })
                return
            }
            console.error(error)
            res.status(500).send({
                success:false,
                error:SOMETHING_WENT_WRONG
            })
        })
    })
})

app.post("/api/user/switch-appointment-slot", (req,res)=>{
    if(typeof req.body.previous_appointment_id==='undefined' ||
        typeof req.body.appointment_id==='undefined' ||
        typeof req.body.patient_id==='undefined'){
        res.status(400).send({
            success:false,
            error:WRONG_BODY_FORMAT
        })
        return
    }

    dao.retrieveOneAppointmentSchedule(req.body.previous_appointment_id).then(appointmentResult=>{
        dao.useAppointmentSlot(req.body.appointment_id, req.body.patient_id, appointmentResult[0].proof_of_payment).then(result=>{
            if (result.affectedRows === 0){
                res.status(404).send({
                    success: false,
                    message: ERROR_FOREIGN_KEY
                })
            }else{
                dao.freeAppointmentSlot(req.body.previous_appointment_id).then(result=>{
                    dao.addAppointmentLog(req.body.patient_id,appointmentResult[0].booking_type_name,appointmentResult[0].start_time,req.body.notes).then(result=>{
                        res.status(200).send({
                            success: true,
                            result:result
                        })
                    }).catch(error=>{
                        if(error===NO_SUCH_CONTENT){
                            res.status(204).send({
                                success:false,
                                error:NO_SUCH_CONTENT
                            })
                            return
                        }
                        console.error(error)
                        res.status(500).send({
                            success:false,
                            error:SOMETHING_WENT_WRONG
                        })
                    })
                }).catch(error=>{
                    console.error(error)
                    res.status(500).send({
                        success:false,
                        error:SOMETHING_WENT_WRONG
                    })
                })
            }
        }).catch(err=>{
            if (err.code==="ER_NO_REFERENCED_ROW_2"){
                res.status(404).send({
                    success: false,
                    message: ERROR_FOREIGN_KEY
                })
            }else{
                console.error(err)
                res.status(500).send({
                    success: false,
                    error: SOMETHING_WENT_WRONG
                })
            }
        })
    }).catch(error=>{
        if(error===NO_SUCH_CONTENT){
            res.status(204).send({
                success:false,
                error:NO_SUCH_CONTENT
            })
            return
        }
        console.error(error)
        res.status(500).send({
            success:false,
            error:SOMETHING_WENT_WRONG
        })
    })
})

app.post("/api/user/approve-appointment-schedule",(req,res)=>{
    if(typeof req.body.appointment_id==='undefined'){
        res.status(400).send({
            success:false,
            error:WRONG_BODY_FORMAT
        })
        return
    }

    dao.retrieveOneAppointmentSchedule(req.body.appointment_id).then(appointmentResult=>{
        dao.approveAppointmentSlot(req.body.appointment_id).then(result=>{
            res.status(200).send({
                success:true,
                result:result
            })
        }).catch(error=>{
            console.error(error)
            res.status(500).send({
                success:false,
                error:SOMETHING_WENT_WRONG
            })
        })
    }).catch(error=>{
        if(error===NO_SUCH_CONTENT){
            res.status(204).send({
                success:false,
                error:NO_SUCH_CONTENT
            })
            return
        }
        console.error(error)
        res.status(500).send({
            success:false,
            error:SOMETHING_WENT_WRONG
        })
    })
})

app.post("/api/user/cancel-appointment-slot",(req,res)=>{
    if(typeof req.body.appointment_id==='undefined'){
        res.status(400).send({
            success:false,
            error:WRONG_BODY_FORMAT
        })
        return
    }

    dao.retrieveOneAppointmentSchedule(req.body.appointment_id).then(appointmentResult=> {
        if (appointmentResult[0].patient_id === null) {
            dao.deleteAppointmentSlot(req.body.appointment_id).then(deleteResult => {
                res.status(200).send({
                    success: true
                })
            }).catch(error => {
                console.error(error)
                res.status(500).send({
                    success: false,
                    error: SOMETHING_WENT_WRONG
                })
            })
        } else {
            res.status(500).send({
                success: false,
                error: "APPOINTMENT SLOT HAS BEEN BOOKED BY A PATIENT"
            })
        }
    })
})

app.post("/api/user/cancel-appointment",(req,res)=>{
    if(typeof req.body.id==='undefined'){
        res.status(400).send({
            success:false,
            error:WRONG_BODY_FORMAT
        })
        return
    }

    dao.retrieveOneAppointmentSchedule(req.body.id).then(appointmentResult=>{
        if(appointmentResult[0].proof_of_payment===null){
            dao.unbindAppointment(req.body.id).then(result=>{
                dao.addAppointmentLog(appointmentResult[0].patient_id,appointmentResult[0].booking_type_name,appointmentResult[0].start_time,req.body.notes).then(result=>{
                    res.status(200).send({
                        success:true,
                        result:result
                    })
                }).catch(error=>{
                    console.error(error)
                    res.status(500).send({
                        success:false,
                        error:SOMETHING_WENT_WRONG
                    })
                })
            }).catch(error=>{
                console.error(error)
                res.status(500).send({
                    success:false,
                    error:SOMETHING_WENT_WRONG
                })
            })
            return
        }

        fs.unlinkSync(UPLOADPATH+appointmentResult[0].proof_of_payment)
        dao.unbindAppointment(req.body.id).then(result=>{
            dao.addAppointmentLog(appointmentResult[0].patient_id,appointmentResult[0].booking_type_name,appointmentResult[0].start_time,req.body.notes).then(result=>{
                res.status(200).send({
                    success:true,
                    result:result
                })
            }).catch(error=>{
                console.error(error)
                res.status(500).send({
                    success:false,
                    error:SOMETHING_WENT_WRONG
                })
            })
        }).catch(error=>{
            console.error(error)
            res.status(500).send({
                success:false,
                error:SOMETHING_WENT_WRONG
            })
        })
    }).catch(error=>{
        if(error===NO_SUCH_CONTENT){
            res.status(204).send({
                success:false,
                error:NO_SUCH_CONTENT
            })
            return
        }
        console.error(error)
        res.status(500).send({
            success:false,
            error:SOMETHING_WENT_WRONG
        })
    })
})

app.get("/api/user/retrieve-visit-reminder",(req,res)=>{
    if(typeof req.query.id!=='undefined'){
        dao.retrieveOneVisitReminder(req.query.id).then(result=>{
            res.status(200).send({
                success:true,
                result:result
            })
        }).catch(error=>{
            console.error(error)
            res.status(500).send({
                success:false,
                error:SOMETHING_WENT_WRONG
            })
        })
    }else{
        dao.retrieveVisitReminder().then(result=>{
            res.status(200).send({
                success:true,
                result:result
            })
        }).catch(error=>{
            console.error(error)
            res.status(500).send({
                success:false,
                error:SOMETHING_WENT_WRONG
            })
        })
    }
})

app.post("/api/user/add-visit-reminder",(req,res)=>{
    if(typeof req.body.booking_type_name==='undefined' ||
       typeof req.body.target_send_date==='undefined' ||
        typeof req.body.description==='undefined' ||
        typeof req.body.patient_id==='undefined'){
        res.status(400).send({
            success:false,
            error:WRONG_BODY_FORMAT
        })
        return
    }

    if (req.body.description === ""){
        req.body.description = null
    }
    dao.addVisitReminder(new VisitReminder(null,req.body.booking_type_name,req.body.description,null,req.body.target_send_date,req.body.patient_id)).then(result=>{
        res.status(200).send({
            success:true,
            result:result
        })
    }).catch(error=>{
        console.error(error)
        res.status(500).send({
            success:false,
            error:SOMETHING_WENT_WRONG
        })
    })

})

app.delete("/api/user/delete-visit-reminder",(req,res)=>{
    if(typeof req.query.id==='undefined'){
        res.status(400).send({
            success:false,
            error:WRONG_BODY_FORMAT
        })
        return
    }

    dao.deleteVisitReminder(req.query.id).then(result=>{
        res.status(200).send({
            success:true,
            result:result
        })
    }).catch(err=>{
        console.error(err)
        res.status(400).send({
            success: false,
            error: SOMETHING_WENT_WRONG
        })
    })
})

nodecron.schedule("30 9 * * *", async()=>{
    console.info("Cron job running")
    dao.retrieveVisitReminderByDate(moment(new Date()).format("YYYY-MM-DD")).then(result=>{
        console.log(result.length+" reminders found today")
    }).catch(err=>{
        console.error(err)
    })
})
// End of v2 Development

// LISTEN SERVER | PRODUCTION DEPRECATION AFTER 9TH MARCH 2020, USE ONLY FOR DEVELOPMENT
app.listen(PORT, ()=>{
    console.info(`Server serving port ${PORT}`)
})

// SSL Certs for codedoc.xyz
var privateKey  = fs.readFileSync('sslcerts/privkey.pem', 'utf8');
var certificate = fs.readFileSync('sslcerts/fullchain.pem', 'utf8');
var credentials = {key: privateKey, cert: certificate};
const https = require('https')
const httpsServer = https.createServer(credentials, app);
httpsServer.listen(8485)
