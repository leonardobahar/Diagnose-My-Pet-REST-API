import fs from 'fs';
import bodyParser from 'body-parser';
import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import path from 'path';
import jsonwebtoken from 'jsonwebtoken';
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
    MedicalRecords, MedicalRecordSymptoms, MedicalRecordTreatmentPlan,
    Patient,
    Symptoms, TreatmentPlan,
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
        typeof req.body.phone_number === 'undefined' ||
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

app.post("/api/user/user-login",(req,res)=>{
    if(typeof req.body.user_name==='undefined' ||
       typeof req.body.password==='undefined'){
        res.status(400).send({
            success:false,
            error:WRONG_BODY_FORMAT
        })
        return
    }

    const user=new User(null,req.body.user_name,null,null,null,null,req.body.password,null)
    dao.loginCustomer(user).then(result=> {
        res.status(200).send({
            success: true,
            authentication_approval: true,
            message: 'Log in Successful'
        })
    }).catch(error=>{
        if(error===NO_SUCH_CONTENT){
            res.status(200).send({
                success:false,
                authentication_approval: false,
                message:'Invalid User Name/Password'
            })
        }
        console.error(error)
        res.status(500).send({
            success:false,
            error:SOMETHING_WENT_WRONG
        })
    })
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
})

app.post("/api/user/change-password",(req,res)=>{
    if(typeof req.body.user_name==='undefined' ||
       typeof req.body.password==='undefined'){
        res.status(400).send({
            success:false,
            error:WRONG_BODY_FORMAT
        })
        return
    }

    const user = new User(null,req.body.user_name,null,null,null,req.body.password,null,null)
    dao.changeCustomerPassword(user).then(result=>{
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
            success:true
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

app.get("/api/user/retrieve-patient",(req,res)=>{
    if(typeof req.query.id==='undefined'){
        dao.retrievePatient().then(result=>{
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
        const patient=new Patient(req.query.id,null,null,null)

        dao.retrieveOnePatient(patient).then(result=>{
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

app.post("/api/user/add-patient",(req,res)=>{
    if (typeof req.body.patient_name === 'undefined' ||
        typeof req.body.animal_type === 'undefined' ||
        typeof req.body.birthdate === 'undefined' ||
        typeof req.body.pet_owner === 'undefined'){
        res.status(400).send({
            success: false,
            error: WRONG_BODY_FORMAT
        })
        return
    }

    const patient = new Patient(null,req.body.patient_name.toUpperCase(),req.body.animal_type,req.body.birthdate,req.body.pet_owner)

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
})

app.post("/api/user/update-patient",(req,res)=>{
    if(typeof req.body.id ==='undefined' ||
        typeof req.body.patient_name === 'undefined' ||
        typeof req.body.animal_type === 'undefined' ||
        typeof req.body.birthdate === 'undefined' ||
        typeof req.body.pet_owner === 'undefined'){
        res.status(400).send({
            success: false,
            error: WRONG_BODY_FORMAT
        })
        return
    }

    const patient=new Patient(req.body.id,req.body.patient_name.toUpperCase(),req.body.animal_type,req.body.birthdate,req.body.pet_owner)

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

app.post("/api/user/add-appointment", (req,res)=>{
    if(typeof req.body.appointment_name === 'undefined' ||
        typeof req.body.appointment_time === 'undefined' ||
        typeof req.body.user_id === 'undefined' ||
        typeof req.body.is_real_appointment==='undefined' ||
        typeof req.body.patient_id === 'undefined' ||
        typeof req.body.doctor_id==='undefined'){
        res.status(400).send({
            success:false,
            error:WRONG_BODY_FORMAT
        })
        return
    }

    const appointment=new Appointment(null, req.body.appointment_name.toUpperCase(), req.body.appointment_time, req.body.duration, req.body.user_id,req.body.is_real_appointment, req.body.patient_id, req.body.doctor_id,'PENDING')

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
    if(typeof req.body.id==='undefined' ||
        typeof req.body.appointment_name==='undefined' ||
        typeof req.body.appointment_time==='undefined' ||
        typeof req.body.duration==='undefined' ||
        typeof req.body.user_id==='undefined' ||
        typeof req.body.is_real_appointment==='undefined' ||
        typeof req.body.patient_id==='undefined' ||
        typeof req.body.doctor_id==='undefined'){
        res.status(400).send({
            success:false,
            error:WRONG_BODY_FORMAT
        })
        return
    }

    const appointment=new Appointment(req.body.id,req.body.appointment_name,req.body.appointment_time, req.body.duration, req.body.user_id,req.body.is_real_appointment,req.body.patient_id, req.body.doctor_id,'UPDATED')

    dao.getAppointmentId(new Appointment(req.body.id)).then(result=>{
        dao.retrieveOneUser(new User(req.body.user_id)).then(result=>{
            dao.retrieveOnePatient(new Patient(req.body.patient_id)).then(result=>{
                dao.retrieveOneDoctor(new Doctor(req.body.doctor_id)).then(result=>{
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

        console.error(err)
        res.status(500).send({
            success:false,
            error:SOMETHING_WENT_WRONG
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
    if(typeof req.body.id==='undefined'){
        res.status(400).send({
            success:false,
            error:WRONG_BODY_FORMAT
        })
        return
    }

    const appointment=new Appointment(req.body.id,null,null,null,null,null)
    dao.getAppointmentId(appointment).then(result=>{
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
    dao.getAppointmentId(appointment).then(result=>{
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
    dao.getAppointmentId(appointment).then(result=>{
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
