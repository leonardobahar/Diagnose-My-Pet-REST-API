import fs from 'fs';
import bodyParser from 'body-parser';
import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import path from 'path';
import multer from "multer";
import moment from "moment";
import {Dao} from "./dao";
import {
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
    User
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

app.get("/api/user/retrieve-users", (req, res)=>{
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
        const user=new User(req.query.id,null,null,null,null,null,null,null)

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
        typeof req.body.address === 'undefined' ||
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

app.post("/api/user/reset-user", (req, res)=>{
    if (typeof req.body.email === 'undefined' ||
        typeof req.body.password === 'undefined'){
        res.status(400).send({
            success: false,
            error: WRONG_BODY_FORMAT
        })
        return
    }else{
        const user = new User(null,
            null,
            null,
            req.body.email,
            null,
            null,
            req.body.password,
            null,
            'CUSTOMER')

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
    }
})

app.post("/api/user/register-admin",(req,res)=>{
    if (typeof req.body.user_name === 'undefined' ||
        typeof req.body.mobile === 'undefined' ||
        typeof req.body.email === 'undefined' ||
        typeof req.body.birthdate === 'undefined' ||
        typeof req.body.address === 'undefined' ||
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
            dao.userLastSignIn(LoginResult[0].user_id).then(result=>{
                res.status(200).send({
                    success: true,
                    authentication_approval: true,
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
            if(error===NO_SUCH_CONTENT){
                res.status(200).send({
                    success:false,
                    authentication_approval: false,
                    message:'Invalid User Name/Password'
                })
            }else{
                console.error(error)
                res.status(500).send({
                    success:false,
                    error:SOMETHING_WENT_WRONG
                })
            }
        })
    }else {
        const user = new User(null, req.body.user_name, null, null, null, null, req.body.password, null)
        dao.loginCustomer(user).then(loginResult => {
            dao.userLastSignIn(loginResult[0].user_id).then(result => {
                res.status(200).send({
                    success: true,
                    authentication_approval: true,
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
            if (error === NO_SUCH_CONTENT) {
                res.status(200).send({
                    success: false,
                    authentication_approval: false,
                    message: 'Invalid User Name/Password'
                })
            }
            console.error(error)
            res.status(500).send({
                success: false,
                error: SOMETHING_WENT_WRONG
            })
        })
    }
})

app.post("/api/user/update-user",(req,res)=>{
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

    dao.retrieveOneUser(new User(req.body.id)).then(result=>{
        dao.updateCustomer(user).then(result=>{
            res.status(200).send({
                success:true,
                result:result
            })
        }).catch(err=>{
            console.error(err)
            res.status(500).send({
                success: false,
                result: SOMETHING_WENT_WRONG
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

app.post("/api/user/change-password",(req,res)=>{
    if(typeof req.body.token==='undefined' ||
       typeof req.body.password==='undefined'){
        res.status(400).send({
            success:false,
            error:WRONG_BODY_FORMAT
        })
        return
    }

    dao.retrieveUserIdFromToken(req.body.token).then(userId=>{
        const user = new User(userId,null,null,null,null,null,req.body.password,null)
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
        typeof req.body.password === 'undefined' ||
        typeof req.body.address==='undefined'){
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

app.delete("/api/user/delete-doctor",(req,res)=>{
    if(typeof req.query.id==='undefined'){
        res.status(400).send({
            success:false,
            error:WRONG_BODY_FORMAT
        })
        return
    }

    dao.retrieveOneDoctor(new Doctor(req.query.id)).then(result=>{
        dao.deleteDoctor(new Doctor(req.query.id)).then(result=>{
            dao.deleteCustomer(new User(req.query.id)).then(result=>{
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

        if(typeof req.file==='undefined'){

            let birthDate=new Date()
            birthDate.setFullYear(birthDate.getFullYear()-req.body.age)

            const patient = new Patient(
                null,req.body.patient_name.toUpperCase(),
                req.body.animal_type,req.body.breed.toUpperCase(),req.body.gender.toUpperCase(),
                birthDate,req.body.pet_owner,'No Attachment')

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

        }else{
            if(error instanceof multer.MulterError){
                return res.send(error)
            } else if(error){
                return res.send(error)
            }

            let birthDate=new Date()
            birthDate.setFullYear(birthDate.getFullYear()-req.body.age)

            const patient = new Patient(
                null,req.body.patient_name.toUpperCase(),
                req.body.animal_type,req.body.breed.toUpperCase(),req.body.gender.toUpperCase(),
                birthDate,req.body.pet_owner,req.file.filename)

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

        }
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

        if(typeof req.file==='undefined'){
            let birthDate=new Date()
            birthDate.setFullYear(birthDate.getFullYear()-req.body.age)

            const patient=new Patient(req.body.id,req.body.patient_name.toUpperCase(),req.body.animal_type,
                req.body.breed.toUpperCase(),req.body.gender.toUpperCase(),birthDate,req.body.pet_owner,'No Attachment')

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

                    fs.unlinkSync(UPLOADPATH+pictureResult)
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

        }else{
            if(error instanceof multer.MulterError){
                return res.send(error)
            } else if(error){
                return res.send(error)
            }

            let birthDate=new Date()
            birthDate.setFullYear(birthDate.getFullYear()-req.body.age)

            const patient=new Patient(req.body.id,req.body.patient_name.toUpperCase(),req.body.animal_type,
                req.body.breed.toUpperCase(),req.body.gender.toUpperCase(),birthDate,req.body.pet_owner,req.file.filename)

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

                    fs.unlinkSync(UPLOADPATH+pictureResult)
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
        }
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
    dao.retrieveOnePatient(patient).then(patientResult=>{
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
    if(typeof req.query.patient_id==='undefined'){
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
    }else {
        const record=new MedicalRecords(null,req.query.patient_id,null,null)
        dao.retrieveOneMedicalRecord(record).then(result=>{
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

app.post("/api/user/add-medical-record", (req,res)=>{
    if(typeof req.body.patient_id === 'undefined'){
        res.status(400).send({
            success:false,
            error:WRONG_BODY_FORMAT
        })
        return
    }

    const medical=new MedicalRecords(null,req.body.patient_id, 'NOW','NEW')
    dao.addMedicalRecord(medical).then(result=>{
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
})

app.post("/api/user/update-medical-record",(req,res)=>{
    if( typeof req.body.id === 'undefined' ||
        typeof req.body.patient_id === 'undefined'){
        res.status(400).send({
            success:false,
            error:WRONG_BODY_FORMAT
        })
        return
    }

    const medical=new MedicalRecords(req.body.id,req.body.patient_id,'NOW','UPDATED')
    dao.updateMedicalRecord(medical).then(result=>{
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
})

app.delete("/api/user/delete-medical-record", (req,res)=>{
    if(typeof req.query.id === 'undefined'){
        res.status(400).send({
            success:false,
            error:WRONG_BODY_FORMAT
        })
        return
    }

    const medical=new MedicalRecords(req.query.id, null, null,null)
    dao.deleteMedicalRecord(medical).then(result=>{
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
        }

        else if(err){
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

app.get("/api/user/retrieve-medical-record-symptoms",(req,res)=>{
    if(typeof req.query.medical_record_id==='undefined'){
        dao.retrieveMedicalRecordSymptoms().then(result=>{
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
    }else{
        const record=new MedicalRecordSymptoms(null,req.query.medical_record_id,null)
        dao.retrieveOneMedicalRecordSymptoms(record).then(result=>{
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

app.post("/api/user/add-medical-record-symptoms",(req,res)=>{
    if(typeof req.body.medical_record_id==='undefined' ||
       typeof req.body.symptoms_id==='undefined'){
        res.status(400).send({
            success:false,
            error:WRONG_BODY_FORMAT
        })
        return
    }

    dao.bindMedicalRecordWithSymptoms(new MedicalRecords(req.body.medical_record_id),new Symptoms(req.body.symptoms_id)).then(result=>{
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
})

app.delete("/api/user/delete-medical-record-symptoms",(req,res)=>{
    if(typeof req.query.id==='undefined'){
        res.status(400).send({
            success:false,
            error:WRONG_BODY_FORMAT
        })
        return
    }

    dao.unbindMedicalRecordWithSymptoms(req.query.id).then(result=>{
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
})

app.get("/api/user/retrieve-medical-record-treatment-plan",(req,res)=>{
    if(typeof req.query.medical_record_id==='undefined'){
        dao.retrieveMedicalRecordTreatmentPlan().then(result=>{
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
    }else{
        const record=new MedicalRecordTreatmentPlan(null,req.query.medical_record_id,null)
        dao.retrieveOneMedicalRecordTreatmentPlan(record).then(result=>{
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

app.post("/api/user/add-medical-record-treatment-plan",(req,res)=>{
    if(typeof req.body.medical_record_id==='undefined'||
       typeof req.body.treatment_plan_id==='undefined'){
        res.status(400).send({
            success:false,
            error:WRONG_BODY_FORMAT
        })
        return
    }

    dao.bindMedicalRecordToTreatmentPlan(new MedicalRecords(req.body.medical_record_id),new TreatmentPlan(req.body.treatment_plan_id)).then(result=>{
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
})

app.delete("/api/user/delete-medical-record-treatment-plan", (req,res)=>{
    if(typeof req.query.id==='undefined'){
        res.status(400).send({
            success:false,
            error:WRONG_BODY_FORMAT
        })
        return
    }

    dao.unbindMedicalRecordWithTreatmentPlan(req.query.id).then(result=>{
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

app.post("/api/user/add-appointment", (req,res)=>{
    const upload=multer({storage:storage, fileFilter: medicalRecordFilter}).single('payment_attachment')

    upload(req,res,async(error)=>{
        if(typeof req.body.appointment_name === 'undefined' ||
            typeof req.body.appointment_time === 'undefined' ||
            typeof req.body.is_real_appointment==='undefined' ||
            typeof req.body.doctor_id==='undefined'){
            res.status(400).send({
                success:false,
                error:WRONG_BODY_FORMAT
            })
            return
        }

        if(typeof req.file==='undefined'){
            const appointment=new Appointment(null,
                req.body.appointment_name.toUpperCase(),
                req.body.appointment_time,
                req.body.duration, req.body.user_id,
                req.body.is_real_appointment,
                req.body.patient_id,
                req.body.doctor_id,
                'PENDING',
                req.body.description,
                'No Attachment')

            if(typeof req.body.user_id !== 'undefined' &&
                typeof req.body.patient_id !== 'undefined'){
                dao.retrieveOneUser(new User(req.body.user_id)).then(result=>{
                    dao.retrieveOnePatient(new Patient(req.body.patient_id)).then(result=>{
                        dao.retrieveOneDoctor(new Doctor(req.body.doctor_id)).then(result=>{
                            dao.addAppointment(appointment).then(result=>{
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
                return
            }

            dao.retrieveOneDoctor(new Doctor(req.body.doctor_id)).then(result=>{
                dao.addAppointment(appointment).then(result=>{
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
            return
        }

        if(error instanceof multer.MulterError){
            return res.send(error)
        } else if(error){
            return res.send(error)
        }

        const appointment=new Appointment(null,
            req.body.appointment_name.toUpperCase(),
            req.body.appointment_time,
            req.body.duration, req.body.user_id,
            req.body.is_real_appointment,
            req.body.patient_id,
            req.body.doctor_id,
            'PENDING',
            req.body.description,
            req.file.filename)

        if(typeof req.body.user_id !== 'undefined' &&
            typeof req.body.patient_id !== 'undefined'){
            dao.retrieveOneUser(new User(req.body.user_id)).then(result=>{
                dao.retrieveOnePatient(new Patient(req.body.patient_id)).then(result=>{
                    dao.retrieveOneDoctor(new Doctor(req.body.doctor_id)).then(result=>{
                        dao.addAppointment(appointment).then(result=>{
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
            return
        }

        dao.retrieveOneDoctor(new Doctor(req.body.doctor_id)).then(result=>{
            dao.addAppointment(appointment).then(result=>{
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

app.post("/api/user/add-appointment-description",(req,res)=>{
    if(typeof req.body.id==='undefined' ||
        typeof req.body.description==='undefined'){
        res.status(400).send({
            success:false,
            error:WRONG_BODY_FORMAT
        })
        return
    }

    dao.retrieveOneAppointment(new Appointment(req.body.id)).then(result=>{
        dao.addAppointmentDescription(req.body.id,req.body.description).then(result=>{
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

app.post("/api/user/update-appointment", (req,res)=>{
    const upload=multer({storage:storage, fileFilter: medicalRecordFilter}).single('payment_attachment')

    upload(req,res,async(error)=>{
        if(typeof req.body.id==='undefined' ||
            typeof req.body.appointment_name==='undefined' ||
            typeof req.body.is_real_appointment==='undefined' ||
            typeof req.body.doctor_id==='undefined'){
            res.status(400).send({
                success:false,
                error:WRONG_BODY_FORMAT
            })
            return
        }

        if(typeof req.file==='undefined'){
            if(typeof req.body.user_id !== 'undefined' &&
                typeof req.body.patient_id !== 'undefined'){
                dao.retrieveOneAppointment(new Appointment(req.body.id)).then(appointmentResult=>{
                    dao.retrieveOneUser(new User(req.body.user_id)).then(result=>{
                        dao.retrieveOnePatient(new Patient(req.body.patient_id)).then(result=>{
                            dao.retrieveOneDoctor(new Doctor(req.body.doctor_id)).then(result=>{
                                if(appointmentResult[0].proof_of_payment==='No Attachment' ||
                                    appointmentResult[0].proof_of_payment===''||
                                    appointmentResult[0].proof_of_payment===null){
                                    dao.updateAppointment(new Appointment(req.body.id,
                                        req.body.appointment_name,
                                        appointmentResult.appointment_time,
                                        null,
                                        req.body.user_id,
                                        req.body.is_real_appointment,
                                        req.body.patient_id,
                                        req.body.doctor_id,
                                        'UPDATED',
                                        null,
                                        'No Attachment')).then(result=>{
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
                                    return
                                }

                                fs.unlinkSync(UPLOADPATH+appointmentResult[0].proof_of_payment)
                                dao.updateAppointment(new Appointment(req.body.id,
                                    req.body.appointment_name,
                                    appointmentResult.appointment_time,
                                    null,
                                    req.body.user_id,
                                    req.body.is_real_appointment,
                                    req.body.patient_id,
                                    req.body.doctor_id,
                                    'UPDATED',
                                    null,
                                    'No Attachment')).then(result=>{
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
                return
            }

            if(error instanceof multer.MulterError){
                return res.send(error)
            } else if(error){
                return res.send(error)
            }

            dao.retrieveOneAppointment(new Appointment(req.body.id)).then(appointmentResult=>{
                dao.retrieveOneDoctor(new Doctor(req.body.doctor_id)).then(result=>{
                    if(appointmentResult[0].proof_of_payment==='No Attachment' ||
                        appointmentResult[0].proof_of_payment==='' ||
                        appointmentResult[0].proof_of_payment===null){
                        dao.updateAppointment(new Appointment(req.body.id,
                            req.body.appointment_name,
                            appointmentResult.appointment_time,
                            null,
                            req.body.user_id,
                            req.body.is_real_appointment,
                            req.body.patient_id,
                            req.body.doctor_id,
                            'UPDATED',
                            null,
                            'No Attachment')).then(result=>{
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
                        return
                    }

                    fs.unlinkSync(UPLOADPATH+appointmentResult[0].proof_of_payment)
                    dao.updateAppointment(new Appointment(req.body.id,
                        req.body.appointment_name,
                        appointmentResult.appointment_time,
                        null,
                        req.body.user_id,
                        req.body.is_real_appointment,
                        req.body.patient_id,
                        req.body.doctor_id,
                        'UPDATED',
                        null,
                        'No Attachment')).then(result=>{
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
            return
        }

        if(typeof req.body.user_id !== 'undefined' &&
            typeof req.body.patient_id !== 'undefined'){
            dao.retrieveOneAppointment(new Appointment(req.body.id)).then(appointmentResult=>{
                dao.retrieveOneUser(new User(req.body.user_id)).then(result=>{
                    dao.retrieveOnePatient(new Patient(req.body.patient_id)).then(result=>{
                        dao.retrieveOneDoctor(new Doctor(req.body.doctor_id)).then(result=>{
                            if(appointmentResult[0].proof_of_payment==='No Attachment' ||
                                appointmentResult[0].proof_of_payment==='' ||
                                appointmentResult[0].proof_of_payment===null){
                                dao.updateAppointment(new Appointment(req.body.id,
                                    req.body.appointment_name,
                                    appointmentResult.appointment_time,
                                    null,
                                    req.body.user_id,
                                    req.body.is_real_appointment,
                                    req.body.patient_id,
                                    req.body.doctor_id,
                                    'UPDATED',
                                    null,
                                    req.file.filename)).then(result=>{
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
                                return
                            }

                            fs.unlinkSync(UPLOADPATH+appointmentResult[0].proof_of_payment)
                            dao.updateAppointment(new Appointment(req.body.id,
                                req.body.appointment_name,
                                appointmentResult.appointment_time,
                                null,
                                req.body.user_id,
                                req.body.is_real_appointment,
                                req.body.patient_id,
                                req.body.doctor_id,
                                'UPDATED',
                                null,
                                req.file.filename)).then(result=>{
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
            return
        }

        dao.retrieveOneAppointment(new Appointment(req.body.id)).then(appointmentResult=>{
            dao.retrieveOneDoctor(new Doctor(req.body.doctor_id)).then(result=>{
                if(appointmentResult[0].proof_of_payment==='No Attachment' ||
                    appointmentResult[0].proof_of_payment==='' ||
                    appointmentResult[0].proof_of_payment===null){
                    dao.updateAppointment(new Appointment(req.body.id,
                        req.body.appointment_name,
                        appointmentResult.appointment_time,
                        null,
                        req.body.user_id,
                        req.body.is_real_appointment,
                        req.body.patient_id,
                        req.body.doctor_id,
                        'UPDATED',
                        null,
                        req.file.filename)).then(result=>{
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
                    return
                }

                fs.unlinkSync(UPLOADPATH+appointmentResult[0].proof_of_payment)
                dao.updateAppointment(new Appointment(req.body.id,
                    req.body.appointment_name,
                    appointmentResult.appointment_time,
                    null,
                    req.body.user_id,
                    req.body.is_real_appointment,
                    req.body.patient_id,
                    req.body.doctor_id,
                    'UPDATED',
                    null,
                    req.file.filename)).then(result=>{
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

app.post("/api/user/reschedule-appointment",(req,res)=>{
    if(typeof req.body.id==='undefined' ||
       typeof req.body.appointment_time==='undefined' ||
       typeof req.body.duration==='undefined'){
        res.status(400).send({
            success:false,
            error:WRONG_BODY_FORMAT
        })
        return
    }

    const appointment=new Appointment(req.body.id,null,req.body.appointment_time,req.body.duration,null,
        null,null,null,'RESCHEDULED')
    dao.getAppointmentId(new Appointment(req.body.id)).then(result=>{
        dao.rescheduleAppointment(appointment).then(result=>{
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

app.post("/api/user/approve-appointment",(req,res)=>{
    if(typeof req.body.id==='undefined' ||
       typeof req.body.appointment_time==='undefined' ||
       typeof req.body.duration==='undefined'){
        res.status(400).send({
            success:false,
            error:WRONG_BODY_FORMAT
        })
        return
    }

    const appointment=new Appointment(req.body.id,null,req.body.appointment_time,req.body.duration,null,null)
    dao.retrieveOneAppointment(new Appointment(req.body.id)).then(appointmentResult=>{
        if(appointmentResult[0].appointment_status !== 'APPROVED' &&
           appointmentResult[0].appointment_status !== 'DECLINED' &&
            appointmentResult[0].appointment_status !== 'FINISHED' &&
            appointmentResult[0].appointment_status !== 'DELETED'){
            dao.approveAppointment(appointment).then(result=>{
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
        res.status(204).send({
            success:false,
            error:NO_SUCH_CONTENT
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

app.post("/api/user/decline-appointment",(req,res)=>{
    if(typeof req.body.id==='undefined'){
        res.status(400).send({
            success:false,
            error:WRONG_BODY_FORMAT
        })
        return
    }
    const appointment=new Appointment(req.body.id,null,null,null,null,null)
    dao.retrieveOneAppointment(appointment).then(appointmentResult=>{
        if(appointmentResult[0].appointment_status !== 'APPROVED' &&
            appointmentResult[0].appointment_status !== 'DECLINED' &&
            appointmentResult[0].appointment_status !== 'FINISHED'){
            dao.declineAppointment(appointment).then(result=>{
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
        res.status(204).send({
            success:false,
            error:NO_SUCH_CONTENT
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

app.post("/api/user/finish-appointment",(req,res)=>{
    if(typeof req.body.id==='undefined'){
        res.status(400).send({
            success:false,
            error:WRONG_BODY_FORMAT
        })
        return
    }

    const appointment=new Appointment(req.body.id,null,null,null,null,null)
    dao.retrieveOneAppointment(appointment).then(appointmentResult=>{
        if(appointmentResult[0].appointment_status === 'APPROVED'){
            dao.finishAppointment(appointment).then(result=>{
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
        res.status(204).send({
            success:false,
            error:NO_SUCH_CONTENT
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

app.post("/api/user/cancel-appointment", (req,res)=>{
    if(typeof req.body.id==='undefined'){
        res.status(400).send({
            success:false,
            error:WRONG_BODY_FORMAT
        })
        return
    }

    dao.retrieveOneAppointment(new Appointment(req.body.id)).then(appointmentResult=>{
        if(appointmentResult[0].appointment_status !== 'APPROVED' &&
            appointmentResult[0].appointment_status !== 'DECLINED' &&
            appointmentResult[0].appointment_status !== 'FINISHED'){
            dao.cancelAppointment(new Appointment(req.body.id)).then(result=>{
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
        res.status(204).send({
            success:false,
            error:NO_SUCH_CONTENT
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

app.delete("/api/user/delete-appointment", (req,res)=>{
    if(typeof req.query.id==='undefined'){
        res.status(400).send({
            success:false,
            error:WRONG_BODY_FORMAT
        })
        return
    }

    const appointment=new Appointment(req.query.id,null,null,null,null)
    dao.retrieveOneAppointment(appointment).then(appointmentResult=>{
        if(appointmentResult[0].proof_of_payment==='No Attachment' ||
            appointmentResult[0].proof_of_payment==='' ||
            appointmentResult[0].proof_of_payment===null){
            dao.deleteAppointment(appointment).then(result=>{
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
            return
        }

        fs.unlinkSync(UPLOADPATH+appointmentResult[0].proof_of_payment)
        dao.deleteAppointment(appointment).then(result=>{
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

    dao.retrieveOneParticipant(new Participant(req.body.id)).then(result=>{
        dao.updateParticipant(participant).then(result=>{
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

app.delete("/api/user/delete-participant",(req,res)=>{
    if(typeof req.query.id==='undefined'){
        res.status(400).send({
            success:false,
            error:WRONG_BODY_FORMAT
        })
        return
    }

    dao.retrieveOneParticipant(new Participant(req.query.id)).then(result=>{
        dao.deleteParticipant(new Participant(req.query.id)).then(result=>{
            res.status(200).send({
                success:true,
                result:result
            })
        }).catch(error=>{
            console.error(error)
            res.status(500).send({
                success:flase,
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

/*
 / RETRIEVE MEDICAL RECORD
 / RETURN MEDICAL_RECORD_ITSELF + FILENAMES
 / { medical_record_id : x, case_open_time: x, attachments: [{filename: x1}, {filename:x2}] }
 */

/*
DIAGNOSA-SENDIRI/SELF-DIAGNOSE, TERJADWAL DENGAN KLINIK/SCHEDULED WITH CLINIC, TELAH DI-DIAGNOSA DOKTER/DIAGNOSED BY THE DOCTOR, RAWAT INAP/INPATIENT, SELESAI/DONE
 */


// Start of v2 Development
app.post("/api/user/add-booking-type", (req, res)=>{
    if(typeof req.body.booking_type_name==='undefined' ||
        typeof req.body.duration==='undefined'){
        res.status(400).send({
            success:false,
            error:WRONG_BODY_FORMAT
        })
        return
    }


    dao.addBookingType(req.body.booking_type_name.toUpperCase(), req.body.duration).then(result=>{
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

    dao.retrieveOneBookingType(req.body.booking_type_name.toUpperCase()).then(result=>{
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
            error:NO_SUCH_CONTENT
        })
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

    dao.retrieveOneBookingType(req.body.booking_type_name.toUpperCase()).then(result=>{
        dao.deleteBookingType(req.body.booking_type_name.toUpperCase()).then(result=>{
            res.status(200).send({
                success: true
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
            error:NO_SUCH_CONTENT
        })
    })
})

app.post("/api/user/bind-doctor-to-booking-type", (req, res)=>{
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
    if(typeof req.query.booking_type_name==='undefined'){
        res.status(400).send({
            success:false,
            error:WRONG_BODY_FORMAT
        })
        return
    }

    dao.retrieveDoctorsBasedOnBookingType(req.query.booking_type_name).then(result=>{
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
       typeof req.query.patient_id==='undefined'){
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
        typeof req.query.patient_id==='undefined'){
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
        typeof req.query.patient_id!=='undefined'){
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
    } else{
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

app.post("/api/user/add-appointment-slot", (req, res)=>{
    const upload=multer({storage:storage, fileFilter: medicalRecordFilter}).single('payment_attachment')

    upload(req,res,async (error)=>{
        if (typeof req.body.start_time === 'undefined' ||
            typeof req.body.end_time === 'undefined' ||
            typeof req.body.description === 'undefined' ||
            typeof req.body.additional_storage === 'undefined' ||
            typeof req.body.status === 'undefined' ||
            typeof req.body.doctor_id === 'undefined' ||
            typeof req.body.booking_type_name === 'undefined'){
            res.status(400).send({
                success:false,
                error:WRONG_BODY_FORMAT
            })
            return
        }

        req.body.description = req.body.description ? req.body.description : null
        req.body.additional_storage = req.body.additional_storage ? req.body.additional_storage : null
        req.body.status = req.body.status  ? req.body.status : "ADMIN CREATED"
        req.body.booking_type_name = req.body.booking_type_name ? req.body.booking_type_name : null

        if(typeof req.body.patient_id!=='undefined' && req.file!=='undefined'){
            if(error instanceof multer.MulterError){
                return res.send(error)
            } else if(error){
                return res.send(error)
            }

            dao.addAppointmentSlot(req.body.start_time, req.body.end_time, req.file.filename, req.body.description, req.body.additional_storage, req.body.status.toUpperCase(), req.body.doctor_id, req.body.booking_type_name.toUpperCase()).then(appointmentResult=>{
                // res.status(200).send({
                //     success: true,
                //     result: appointmentResult
                // })
                dao.useAppointmentSlot(appointmentResult,req.body.patient_id).then(result=>{
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
                res.status(400).send({
                    success:false,
                    error:err
                })
            })
            return
        }

        dao.addAppointmentSlot(req.body.start_time, req.body.end_time, 'No Attachment', req.body.description, req.body.additional_storage, req.body.status.toUpperCase(), req.body.doctor_id, req.body.booking_type_name.toUpperCase()).then(appointmentResult=>{
            res.status(200).send({
                success: true
            })
        }).catch(err=>{
            console.error(err)
            res.status(400).send({
                success:false,
                error:err
            })
        })
    })
})

app.post("/api/user/use-appointment-slot", (req, res)=>{
    if (typeof req.body.appointment_id === 'undefined' ||
        typeof req.body.patient_id === 'undefined'
       ){
        res.status(400).send({
            success:false,
            error:WRONG_BODY_FORMAT
        })
        return
    }

    dao.useAppointmentSlot(req.body.appointment_id, req.body.patient_id).then(result=>{
        if (result.affectedRows === 0){
            res.status(404).send({
                success: false,
                message: ERROR_FOREIGN_KEY
            })
        }else{
            res.status(200).send({
                success: true
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
