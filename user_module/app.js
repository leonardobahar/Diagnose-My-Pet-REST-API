import fs from 'fs';
import bodyParser from 'body-parser';
import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import path from 'path';
import {Dao} from "./dao";
import {
    ERROR_DUPLICATE_ENTRY, ERROR_FOREIGN_KEY,
    SOMETHING_WENT_WRONG,
    WRONG_BODY_FORMAT
} from "../strings";
import {
    AnimalCategory,
    AnimalType, Appointment,
    Disease,
    MedicalRecordAttachment,
    MedicalRecords,
    Patient,
    Symptoms,
    User
} from "../model";
import multer from "multer";

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
const dao = new Dao(host, user, password, dbname)

const swaggerJsDoc=require('swagger-jsdoc')
const swaggerUI=require('swagger-ui-express')

//Extended: https://swagger.io/specification/#infoObject
const swaggerOptions={
    swaggerDefinition: {
        info:{
            title:'User Module',
            description:"User API Information",
            contact:{
              team:"BaharTech CodeDoc"
            },
            servers:["http://localhost:8085"]
        }
    },
    apis:["app.js"]
};

const swaggerDocs=swaggerJsDoc(swaggerOptions);
app.use('/api-docs/',swaggerUI.serve, swaggerUI.setup(swaggerDocs));

//Routes
/**
 * @swagger
 * /User:
 * get:
 *   description: Use to get all users
 *   responses:
 *   '200':
 *     description: A successful response
 */

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
            console.log(err)
            res.status(500).send({
                success:false,
                error:SOMETHING_WENT_WRONG
            })
        })
    }
})

/*app.get("/api/user-retrieve-one-user", (req,res)=>{
    if(typeof req.query.id === 'undefined'){
        res.status(400).send({
            success:false,
            error:WRONG_BODY_FORMAT
        })
        return
    }

    const user=new User(req.body.id,null,null,null,null,null,null,null)

    dao.retrieveOneUser(user).then(result=>{
        res.status(200).send({
            success:true,
            result:result
        })
    }).catch(err=>{
        console.log(err)
        res.status(500).send({
            success:false,
            error:SOMETHING_WENT_WRONG
        })
    })
})*/

//Routes
/**
 * @swagger
 * /User:
 * post:
 *   description: Use to register user
 *   responses:
 *   '200':
 *     description: A successful response
 */

app.post("/api/user/register-user", (req, res)=>{
    if (typeof req.body.user_name === 'undefined' ||
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
            req.body.user_name,
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
                    error: 'DUPLICATE-ENTRY'
                })
                res.end()
            }else{
                console.log(err)
                res.status(500).send({
                    success: false,
                    error: SOMETHING_WENT_WRONG
                })
            }
        })
    }
})

//Routes
/**
 * @swagger
 * /User:
 * post:
 *   description: Use to update user by ID
 *   responses:
 *   '200':
 *     description: A successful response
 */

app.post("/api/user/update-user",(req,res)=>{
    if(typeof req.body.id ==='undefined' ||
        typeof req.body.user_name === 'undefined' ||
        typeof req.body.mobile === 'undefined' ||
        typeof req.body.email === 'undefined' ||
        typeof req.body.birthdate === 'undefined' ||
        typeof req.body.password === 'undefined' ||
        typeof req.body.role === 'undefined'){
        res.status(400).send({
            success: false,
            error: WRONG_BODY_FORMAT
        })
    }

    else{
        const salt = "GAREM"
        const user=new User(req.body.id,
            req.body.user_name,
            req.body.mobile,
            req.body.email,
            req.body.birthdate,
            req.body.password,
            salt,
            req.body.role)

        dao.updateCustomer(user).then(result=>{
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

//Routes
/**
 * @swagger
 * /User:
 * delete:
 *   description: Use to delete user by ID
 *   responses:
 *   '200':
 *     description: A successful response
 */

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

//Routes
/**
 * @swagger
 * /User:
 * post:
 *   description: Use to bind user to pet
 *   responses:
 *   '200':
 *     description: A successful response
 */

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
            console.log(err)
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
const storage=multer.diskStorage({
    destination: './Uploads/',
    filename: function (req,file,cb){
        cb(null,file.fieldname + '-' + Date.now() + path.extname(file.originalname))
        //cb(null,file.fieldname + '-' + Date.now() + path.extname(file.originalname))
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

    dao.deleteMedicalRecordAttachment(attachment).then(result=>{
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

    fs.unlink('./Uploads/'+
        dao.getAttachmentFileName(attachment).then(result=>{
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
    }),(err)=>{
        if(err){
            console.error(err)
            return
        }
        console.log('File Deleted')
    })
})

app.get("/api/user/retrieve-appointment", (req,res)=>{
    if(typeof req.query.id==='undefined'){
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
    }else{
        const appointment=new Appointment(req.query.id,null,null,null,null)
        dao.retrieveOneAppointment(appointment).then(result=>{
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

app.post("/api/user/add-appointment", (req,res)=>{
    if(typeof req.body.appointment_name === 'undefined' ||
        typeof req.body.appointment_time === 'undefined' ||
        typeof req.body.user_id === 'undefined' ||
        typeof  req.body.patient_id === 'undefined'){
        res.status(400).send({
            success:false,
            error:WRONG_BODY_FORMAT
        })
        return
    }

    const appointment=new Appointment(null, req.body.appointment_name.toUpperCase(), req.body.appointment_time, req.body.user_id, req.body.patient_id)
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
})

app.post("/api/user/update-appointment", (req,res)=>{
    if(typeof req.body.id==='undefined' ||
        typeof req.body.appointment_name==='undefined' ||
        typeof req.body.appointment_time==='undefined' ||
        typeof req.body.user_id==='undefined' ||
        typeof req.body.patient_id==='undefined'){
        res.status(400).send({
            success:false,
            error:WRONG_BODY_FORMAT
        })
        return
    }

    const appointment=new Appointment(req.body.id,req.body.appointment_name,req.body.appointment_time,req.body.user_id,req.body.patient_id)
    dao.updateAppointment(appointment).then(result=>{
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

app.delete("/api/user/delete-appointment", (req,res)=>{
    if(typeof req.query.id==='undefined'){
        res.status(400).send({
            success:false,
            error:WRONG_BODY_FORMAT
        })
        return
    }

    const appointment=new Appointment(req.query.id,null,null,null,null)
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
})

/*
 / RETRIEVE MEDICAL RECORD
 / RETURN MEDICAL_RECORD_ITSELF + FILENAMES
 / { medical_record_id : x, case_open_time: x, attachments: [{filename: x1}, {filename:x2}] }
 */

/*
DIAGNOSA-SENDIRI/SELF-DIAGNOSE, TERJADWAL DENGAN KLINIK/SCHEDULED WITH CLINIC, TELAH DI-DIAGNOSA DOKTER/DIAGNOSED BY THE DOCTOR, RAWAT INAP/INPATIENT, SELESAI/DONE
 */

// LISTEN SERVER | PRODUCTION DEPRECATION AFTER 9TH MARCH 2020, USE ONLY FOR DEVELOPMENT
app.listen(PORT, ()=>{
    console.info(`Server serving port ${PORT}`)
})