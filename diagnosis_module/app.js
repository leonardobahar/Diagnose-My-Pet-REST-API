import fs from 'fs';
import bodyParser from 'body-parser';
import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import {Dao} from "./dao";
import {
    ERROR_DUPLICATE_ENTRY,
    ERROR_FOREIGN_KEY,
    SOMETHING_WENT_WRONG,
    WRONG_BODY_FORMAT
} from "../strings";
import {
    Anatomy,
    AnimalCategory,
    AnimalType,
    Disease,
    MedicalRecords,
    Medicine,
    Patient,
    Symptoms,
    User
} from "../model";
import * as swaggerUi from "swagger-ui-express";

require('dotenv').config()

const app=express()
app.use(bodyParser.urlencoded({extended: true}))
app.use(express.json())

/*const fileUpload=require('express-fileupload')
app.use(fileUpload)*/

const multer=require('multer')
const path=require('path')

const storage=multer.diskStorage({
    destination: './Uploads/',
    filename: function (req,file,cb){
        cb(null,file.fieldname + '-' + Date.now() + path.extname(file.originalname))
    }
})

/*const fileFilter=(req,file,cb)=>{
    if(file.mimetype)
}*/

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

const PORT = process.env.DIAGNOSIS_PORT
const host = process.env.MY_SQL_HOST
const user = process.env.MY_SQL_USER
const password = typeof process.env.MY_SQL_PASSWORD === 'undefined' ? '' : process.env.MY_SQL_PASSWORD
const dbname = process.env.MY_SQL_DBNAME
const dao = new Dao(host, user, password, dbname)
const swaggerJsDoc=require('swagger-jsdoc')
const swaggerUI=require('swagger-ui-express')
const ejs=require('ejs')

//EJS
app.set('view engine', 'ejs')
app.use(express.static('./Uploads'))
app.get("/",(req,res) => res.render('diagnose'))

//Extended: https://swagger.io/specification/#infoObject
const swaggerOptions={
    swaggerDefinition: {
        info:{
            title:'Diagnosis Module',
            description:"Diagnosis API Information",
            contact:{
              Team: "BaharTech CodeDoc"
            },
            servers:["http://localhost:8086"]
        }
    },
    //[`.routes/*.js`]
    apis:["/diagnosis_module/app.js"]
};

const swaggerDocs=swaggerJsDoc(swaggerOptions);
app.use('/api-docs/',swaggerUI.serve, swaggerUI.setup(swaggerDocs));

/**
 * @swagger
 * /diagnosis:
 * get:
 *   description: Use to get all animal categories
 *   responses:
 *   '200':
 *     description: A successful response
 */

app.get("/api/diagnosis/retrieve-animal-category", (req, res)=>{
    if (typeof req.query.id === 'undefined'){
        // RETRIEVE ALL
        dao.retrieveAnimalCategory().then(result=>{
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
        const animal=new AnimalCategory(req.query.id,null)

        dao.retrieveOneAnimalCategory(animal).then(result=> {
            res.status(200).send({
                success: true,
                result: result
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

///**
// * @swagger
// * /diagnosis:
// * get:
// *   description: Use to get one animal category by ID
// *   responses:
// *   '200':
// *     description: A successful response
// */

/*app.get("/api/diagnosis/retrieve-one-animal-category", (req,res)=>{
    if(typeof req.query.id === 'undefined'){
        res.status(400).send({
            success:false,
            error:WRONG_BODY_FORMAT
        })
        return
    }

    const animal=new AnimalCategory(req.body.id,null)

    dao.retrieveOneAnimalCategory(animal).then(result=>{
        res.status(200).send({
            success:true,
            result:result
        }).catch(err=>{
            console.log(err)
            res.status(500).send({
                success:false,
                error:SOMETHING_WENT_WRONG
            })
        })
    })
})*/

/**
 * @swagger
 * / Diagnosis:
 * post:
 *   description: Use to add animal categories
 *   responses:
 *   '200':
 *     description: A successful response
 */

app.post("/api/diagnosis/add-animal-category", (req, res)=>{
    if (typeof req.body.category_name === 'undefined'){
        res.status(400).send({
            success: false,
            error: WRONG_BODY_FORMAT
        })
        return
    }

    const category = new AnimalCategory(null, req.body.category_name.toUpperCase())

    dao.registerAnimalCategory(category).then(result=>{
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
})

/**
 * @swagger
 * /Diagnosis:
 * post:
 *   description: Use to update animal category by ID
 *   responses:
 *   '200':
 *     description: A successful response
 */

app.post("/api/diagnosis/update-animal-category",(req,res)=>{
    if(typeof req.body.id==='undefined' ||
       typeof req.body.category_name==='undefined'){
        res.status(400).send({
            success:false,
            error: WRONG_BODY_FORMAT
        })
    }
    const category=new AnimalCategory(req.body.id,req.body.category_name.toUpperCase())

    dao.updateAnimalCategory(category).then(result=>{
        res.status(200).send({
            success:true,
            result: result
        })
    }).catch(err=>{
        if(err.code==='ER_DUP_ENTRY'){
            res.status(500).send({
                success:false,
                error:'DUPLICATE-ENTRY'
            })
            res.end()
        }else{
            console.error(err)
            res.status(500).send({
                success:false,
                error: SOMETHING_WENT_WRONG
            })
            res.end()
        }
    })
})

/**
 * @swagger
 * /Diagnosis:
 * delete:
 *   description: Use to delete animal category by ID
 *   responses:
 *   '200':
 *     description: A successful response
 */

app.delete("/api/diagnosis/delete-animal-category", (req,res)=>{
    if(typeof req.query.id === 'undefined'){
        res.status(400).send({
            success:false,
            error:WRONG_BODY_FORMAT
        })
    }
    else {
        const category=new AnimalCategory(req.query.id,null)

        dao.deleteAnimalCategory(category).then(result=>{
            res.status(200).send({
                success:true
            })
        }).catch(err=>{
            console.log(err)
            res.status(500).send({
                success: false,
                error: SOMETHING_WENT_WRONG
            })
        })
    }
})

/**
 * @swagger
 * /Diagnosis:
 * get:
 *   description: Use to get all animal types
 *   responses:
 *   '200':
 *     description: A successful response
 */

app.get("/api/diagnosis/retrieve-animal-type", (req, res)=>{
    if(typeof req.query.id==='undefined'){
        dao.retrieveAnimalType().then(result=>{
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
        const animal=new AnimalType(req.query.id,null,null)

        dao.retrieveOneAnimalType(animal).then(result=>{
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

///**
// * @swagger
// * /Diagnosis:
// * get:
// *   description: Use to get one animal type by ID
// *   responses:
// *   '200':
// *     description: A successful response
// */

/*app.get("/api/diagnosis/retrieve-one-animal-type", (req,res)=>{
    if(typeof req.body.id === 'undefined'){
        res.status(400).send({
            success:false,
            error:WRONG_BODY_FORMAT
        })
        return
    }

    const animal=new AnimalType(req.body.id,null,null)

    dao.retrieveOneAnimalType(animal).then(result=>{
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
})*/

/**
 * @swagger
 * /Diagnosis:
 * post:
 *   description: Use to add animal types
 *   responses:
 *   '200':
 *     description: A successful response
 */

app.post("/api/diagnosis/add-animal-type", (req, res)=>{
    if (typeof req.body.animal_name === 'undefined' ||
        typeof req.body.animal_category === 'undefined') {
        res.status(400).send({
            success: false,
            error: WRONG_BODY_FORMAT
        })
        return
    }
    const animal = new AnimalType(null,
        req.body.animal_name.toUpperCase(),
        req.body.animal_category)

    dao.registerAnimalType(animal).then(result=>{
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
})

/**
 * @swagger
 * /Diagnosis:
 * post:
 *   description: Use to update animal type by ID
 *   responses:
 *   '200':
 *     description: A successful response
 */

app.post("/api/diagnosis/update-animal-type",(req,res)=>{
    if(typeof req.body.id==='undefined' ||
       typeof req.body.animal_name==='undefined' ||
       typeof req.body.animal_category==='undefined'){
        res.status(400).send({
            success:false,
            error:WRONG_BODY_FORMAT
        })
        return
    }

    const animal=new AnimalType(req.body.id,req.body.animal_name.toUpperCase(),req.body.animal_category)

    dao.updateAnimalType(animal).then(result=>{
        res.status(200).send({
            success:true,
            result:result
        })
    }).catch(err=>{
        if(err.code==='ER_DUP_ENTRY'){
            res.status(200).send({
                success:false,
                error:'DUPLICATE-ENTRY'
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

/**
 * @swagger
 * /Diagnosis:
 * delete:
 *   description: Use to delete animal type by ID
 *   responses:
 *   '200':
 *     description: A successful response
 */

app.delete("/api/diagnosis/delete-animal-type", (req,res)=>{
    if(typeof req.query.id === 'undefined'){
        res.status(400).send({
            success:false,
            error:SOMETHING_WENT_WRONG
        })
        return
    }

    const animalType=new AnimalType(req.query.id,null,null)
    dao.deleteAnimalType(animalType).then(result=>{
        res.status(200).send({
            success:true,
            result:result
        })
    }).catch(err=>{
        console.log(err)
        res.status(500).send({
            success: false,
            error: SOMETHING_WENT_WRONG
        })
    })

})

/**
 * @swagger
 * /Diagnosis:
 * get:
 *   description: Use to get all disease
 *   responses:
 *   '200':
 *     description: A successful response
 */

app.get("/api/diagnosis/retrieve-disease", (req, res)=>{
    if (typeof req.query.disease_id==='undefined'){
        dao.retrieveDisease().then(result=>{
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
    } else{
        dao.retrieveSymptomsForDisease(new Disease(req.query.disease_id)).then(result=>{
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
    }

    /*else{
        const disease=new Disease(req.query.id,null,null,null)

        dao.retrieveOneDisease(disease).then(result=>{
            res.status(200).send({
                success:true,
                result:result
            }).catch(err=>{
                console.error(err)
                res.status(500).send({
                    success:false,
                    error:SOMETHING_WENT_WRONG
                })
            })
        })
        Delete in one week. (Only if there are no issues related to this code)
    }*/
})

// /**
//  * @swagger
//  * /Diagnosis:
//  * get:
//  *   description: Use to get one disease by ID
//  *   responses:
//  *   '200':
//  *     description: A successful response
//  */
//
// app.get("/api/diagnosis/retrieve-one-disease", (req,res)=>{
//     if(typeof req.query.id==='undefined'){
//         res.status(400).send({
//             success:false,
//             error:WRONG_BODY_FORMAT
//         })
//         return
//     }
//
//     const disease=new Disease(req.body.id,null,null,null)
//
//     dao.retrieveOneDisease(disease).then(result=>{
//         res.status(200).send({
//             success:true,
//             result:result
//         }).catch(err=>{
//             console.error(err)
//             res.status(500).send({
//                 success:false,
//                 error:SOMETHING_WENT_WRONG
//             })
//         })
//     })
// })

/**
 * @swagger
 * /Diagnosis:
 * post:
 *   description: Use to add disease
 *   responses:
 *   '200':
 *     description: A successful response
 */

app.post("/api/diagnosis/add-disease", (req, res)=>{
    if (typeof req.body.disease_name === 'undefined'){
        res.status(400).send({
            success: false,
            error: WRONG_BODY_FORMAT
        })
        return
    }

    const disease = new Disease(null,
        req.body.disease_name.toUpperCase())

    dao.registerDisease(disease).then(result=>{
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
            res.end()
        }
    })
})

/**
 * @swagger
 * /Diagnosis:

 * post:
 *   description: Use to update disease by ID
 *   responses:
 *   '200':
 *     description: A successful response
 */

app.post("/api/diagnosis/update-disease",(req,res)=>{

    if(typeof req.body.id==='undefined' ||
        typeof req.body.disease_name === 'undefined'){
            res.status(400).send({
                success:false,
                error:WRONG_BODY_FORMAT
            })
            return
    }

    const disease=new Disease(req.body.id,req.body.disease_name.toUpperCase())

    dao.updateDisease(disease).then(result=>{
        res.status(200).send({
            success:true,
            result:result
        })
    }).catch(err=>{
        if(err.code==='ER_DUP_ENTRY'){
            res.status(200).send({
                success:false,
                error:'DUPLICATE-ENTRY'
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
})

/**
 * @swagger
 * /Diagnosis:
 * delete:
 *   description: Use to delete disease by ID
 *   responses:
 *   '200':
 *     description: A successful response
 */

app.delete("/api/diagnosis/delete-disease", (req,res)=>{
    if(typeof req.query.id==='undefined'){
        res.status(400).send({
                success: false,
                error: WRONG_BODY_FORMAT
            }
        )
        return
    }

    const disease=new Disease(req.query.id,null,null,null)
    dao.deleteDisease(disease).then(result=>{
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
})

/**
 * @swagger
 * /Diagnosis:
 * get:
 *   description: Use to get all symptom
 *   responses:
 *   '200':
 *     description: A successful response
 */

app.get("/api/diagnosis/retrieve-symptom", (req, res)=>{
    if(typeof req.query.id==='undefined'){
        dao.retrieveSymptom().then(result=>{
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
        const symptom=new Symptoms(req.query.id,null)

        dao.retrieveOneSymptom(symptom).then(result=>{
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

///**
// * @swagger
// * /Diagnosis:
// * get:
// *   description: Use to get one symptom by ID
// *   responses:
//*   '200':
// *     description: A successful response
// */

/*app.get("/api/diagnosis/retrieve-one-symptom", (req,res)=>{
    if(typeof req.query.id==='undefined'){
        res.status(400).send({
            success:false,
            error:WRONG_BODY_FORMAT
        })
        return
    }

    const symptom=new Symptoms(req.body.id,null)

    dao.retrieveOneSymptom(symptom).then(result=>{
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

/**
 * @swagger
 * /Diagnosis:
 * post:
 *   description: Use to add symptom
 *   responses:
 *   '200':
 *     description: A successful response
 */

app.post("/api/diagnosis/add-symptom", (req, res)=>{
    if (typeof req.body.symptom_name === 'undefined') {
        res.status(400).send({
            success: false,
            error: WRONG_BODY_FORMAT
        })
        return
    }

    const symptom = new Symptoms(null,
        req.body.symptom_name.toUpperCase())

    dao.registerSymptom(symptom).then(result=>{
        res.status(200).send({
            success: true,
            result: result
        })
    }).catch(err=>{
        
        if(err.code==='WR_DUPLICATE_ENTRY'){
            res.status(500).send({
                success:false,
                error:'DUPLICATE-ENTRY'
            })
        }else {
            console.log(err)
            res.status(500).send({
                success:false,
                error:SOMETHING_WENT_WRONG
            })
            res.end()
        }
    })

})

/**
 * @swagger
 * /Diagnosis:
 * post:
 *   description: Use to update symptom by ID
 *   responses:
 *   '200':
 *     description: A successful response
 */

app.post("/api/diagnosis/update-symptom",(req,res)=>{
    if(typeof req.body.id ==='undefined' ||
        typeof req.body.symptom_name === "undefined"){
        res.status(400).send({
            success: false,
            error: WRONG_BODY_FORMAT
        })
        return
    }

    const symptom=new Symptoms(req.body.id,req.body.symptom_name.toUpperCase())

    dao.updateSymptom(symptom).then(result=>{
        res.status(200).send({
            success:true,
            result:result
        })
    }).catch(err=>{
        console.log(err)
        res.status(500).send({
            success: false,
            error: SOMETHING_WENT_WRONG
        })
    })
})

/**
 * @swagger
 * /Diagnosis:
 * delete:
 *   description: Use to delete symptom by ID
 *   responses:
 *   '200':
 *     description: A successful response
 */

app.delete("/api/diagnosis/delete-symptom",(req,res)=>{
    if(typeof req.query.id==='undefined'){
        res.status(400).send({
            success:false,
            error: WRONG_BODY_FORMAT
        })
        return
    }

    const symptom=new Symptoms(req.query.id,null)
    dao.deleteSymptom(symptom).then(result=>{
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

/**
 * @swagger
 * /Diagnosis:
 * get:
 *   description: Use to get all medicine
 *   responses:
 *   '200':
 *     description: A successful response
 */

app.get("/api/diagnosis/retrieve-medicine", (req,res)=>{
    if(typeof req.query.id==='undefined'){
        dao.retrieveMedicine().then(result=>{
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
        const medicine=new Medicine(req.query.id,null,null,null)

        dao.retrieveOneMedicine(medicine).then(result=>{
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

///**
// * @swagger
// * /Diagnosis:
// * get:
// *   description: Use to get one medicine by ID
// *   responses:
// *   '200':
//*     description: A successful response
// */

/*app.get("/api/diagnosis/retrieve-one-medicine", (req,res)=>{
    if(typeof req.query.id==="undefined"){
        res.status(400).send({
            success:false,
            error:WRONG_BODY_FORMAT
        })
        return
    }

    const medicine=new Medicine(req.body.id,null,null,null)

    dao.retrieveOneMedicine(medicine).then(result=>{
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
})*/

/**
 * @swagger
 * /Diagnosis:
 * post:
 *   description: Use to add medicine
 *   responses:
 *   '200':
 *     description: A successful response
 */

app.post("/api/diagnosis/add-medicine",(req,res)=>{
    if(typeof req.body.medicine_name === 'undefined' ||
        typeof req.body.side_effect === 'undefined'||
        typeof req.body.dosage_info === 'undefined'){
        res.status(400).send({
            success:false,
            error: WRONG_BODY_FORMAT
        })
        return
    }

    const medicine=new Medicine(null, req.body.medicine_name.toUpperCase(),
        req.body.side_effect.toUpperCase(), req.body.dosage_info.toUpperCase())

    dao.registerMedicine(medicine).then(result=>{
        res.status(200).send({
            success:true,
            result:result
        })
    }).catch(err=>{
        if(err.code==='ER_DUP_ENTRY'){
            res.status(500).send({
                success:false,
                error:'DUPLICATE_ENTRY'
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

/**
 * @swagger
 * /Diagnosis:
 * post:
 *   description: Use to update medicine by ID
 *   responses:
 *   '200':
 *     description: A successful response
 */

app.post("/api/diagnosis/update-medicine",(req,res)=>{
    if(typeof req.body.id==='undefined' ||
        typeof req.body.medicine_name==='undefined' ||
        typeof req.body.side_effect==='undefined' ||
        typeof req.body.dosage_info==='undefined'){
        res.status(400).send({
            success:false,
            error:WRONG_BODY_FORMAT
        })
        return
    }

    const medicine=new Medicine(req.body.id,req.body.medicine_name.toUpperCase(),req.body.side_effect.toUpperCase(),req.body.dosage_info.toUpperCase())

    dao.updateMedicine(medicine).then(result=>{
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

/**
 * @swagger
 * /Diagnosis:
 * delete:
 *   description: Use to delete medicine by ID
 *   responses:
 *   '200':
 *     description: A successful response
 */

app.delete("/api/diagnosis/delete-medicine",(req,res)=>{
    if(typeof req.query.id==='undefined'){
        res.status(500).send({
            success:false,
            error:SOMETHING_WENT_WRONG
        })
        return
    }

    const medicine=new Medicine(req.query.id,null,null)

    dao.deleteMedicine(medicine).then(result=>{
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

/**
 * @swagger
 * /Diagnosis:
 * get:
 *   description: Use to get all patient
 *   responses:
 *   '200':
 *     description: A successful response
 */

app.get("/api/diagnosis/retrieve-patient",(req,res)=>{
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

///**
// * @swagger
// * /Diagnosis:
// * get:
// *   description: Use to get one patient by ID
// *   responses:
// *   '200':
// *     description: A successful response
// */

/*app.get("/api/diagnosis/retrieve-one-patient", (req,res)=>{
    if(typeof req.query.id==='undefined'){
        res.status(400).send({
            success:false,
            error:WRONG_BODY_FORMAT
        })
        return
    }

    const patient=new Patient(req.body.id,null,null,null)

    dao.retrieveOnePatient(patient).then(result=>{
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

/**
 * @swagger
 * /Diagnosis:
 * post:
 *   description: Use to add patient
 *   responses:
 *   '200':
 *     description: A successful response
 */

app.post("/api/diagnosis/add-patient",(req,res)=>{
    if (typeof req.body.fullname === 'undefined' ||
        typeof req.body.animal_type === 'undefined' ||
        typeof req.body.birthdate === 'undefined' ||
        typeof req.body.pet_owner === 'undefined'){
        res.status(400).send({
            success: false,
            error: WRONG_BODY_FORMAT
        })
        return
    }

    const patient = new Patient(null,req.body.fullname.toUpperCase(),req.body.animal_type,req.body.birthdate,req.body.pet_owner)

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

/**
 * @swagger
 * /Diagnosis:
 * post:
 *   description: Use to update patient by ID
 *   responses:
 *   '200':
 *     description: A successful response
 */

app.post("/api/diagnosis/update-patient",(req,res)=>{
    if(typeof req.body.id ==='undefined' ||
        typeof req.body.fullname === 'undefined' ||
        typeof req.body.animal_type === 'undefined' ||
        typeof req.body.birthdate === 'undefined' ||
        typeof req.body.pet_owner === 'undefined'){
        res.status(400).send({
            success: false,
            error: WRONG_BODY_FORMAT
        })
        return
    }

    const patient=new Patient(req.body.id,req.body.fullname.toUpperCase(),req.body.animal_type,req.body.birthdate,req.body.pet_owner)

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

/**
 * @swagger
 * /Diagnosis:
 * delete:
 *   description: Use to delete patient by ID
 *   responses:
 *   '200':
 *     description: A successful response
 */

app.delete("/api/diagnosis/delete-patient",(req,res)=>{
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
            result:result
        })
    }).catch(err=>{
        console.log(err)
        res.status(500).send({
            success: false,
            error: SOMETHING_WENT_WRONG
        })
    })
})

app.get("/api/diagnosis/retrieve-anatomy",(req,res)=>{
    if(typeof req.query.id === 'undefined'){
        dao.retrieveAnatomy().then(result=>{
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
    } else{
        const anatomy=new Anatomy(req.query.id,null,null)
        dao.retrieveOneAnatomy(anatomy).then(result=> {
            res.status(200).send({
                success: true,
                result: result
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

app.post("/api/diagnosis/register-anatomy",(req,res)=>{
    if(typeof req.body.part_name ==='undefined' ||
       typeof req.body.animal_type_id === 'undefined'){
        res.status(400).send({
            success:false,
            error:WRONG_BODY_FORMAT
        })
        return
    }

    const anatomy=new Anatomy(null,req.body.part_name.toUpperCase(),req.body.animal_type_id)
    dao.registerAnatomy(anatomy).then(result=>{
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

app.post("/api/diagnosis/update-anatomy", (req,res)=>{
    if(typeof req.body.id ==='undefined' ||
        typeof req.body.part_name === 'undefined' ||
        typeof req.body.animal_type_id === 'undefined'){
        res.status(400).send({
            success: false,
            error: WRONG_BODY_FORMAT
        })
        return
    }

    const anatomy= new Anatomy(req.body.id, req.body.part_name.toUpperCase(), req.body.animal_type_id)

    dao.updateAnatomy(anatomy).then(result=>{
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

app.delete("/api/diagnosis/delete-anatomy",(req,res)=>{
    if(typeof req.query.id==='undefined'){
        res.status(500).send({
            success:false,
            error:SOMETHING_WENT_WRONG
        })
        return
    }

    const anatomy=new Anatomy(req.query.id,null,null)
    dao.deleteAnatomy(anatomy).then(result=>{
        res.status(200).send({
            success:true,
            result:result
        })
    }).catch(err=>{
        console.log(err)
        res.status(500).send({
            success: false,
            error: SOMETHING_WENT_WRONG
        })
    })
})

app.post("/api/diagnosis/bind-medicine-to-symptom", (req,res)=>{
    if(typeof req.body.medicine_id === 'undefined' ||
       typeof req.body.symptom_id === 'undefined'){
        res.status(400).send({
            success:false,
            error:WRONG_BODY_FORMAT
        })
        return
    }

    dao.bindMedicineToSymptom(new Medicine(req.body.medicine_id),new Symptoms(req.body.symptom_id)).then(result=>{
        res.status(200).send({
            success: true,
            result: result
        })
    }).catch(err=>{
        if(err.code === 'ER_DUP_ENTRY' || err === ERROR_DUPLICATE_ENTRY){
            res.status(500).send({
                success:false,
                error: 'DUPLICATE-ENTRY'
            })
            res.end()
        }else if(err.code === 'ER_NO_REFERENCED_ROW_2'){
            res.status(500).send({
                success:false,
                error:ERROR_FOREIGN_KEY
            })
        }else{
            console.log(err)
            res.status(500).send({
                success:false,
                error:SOMETHING_WENT_WRONG
            })
        }
    })
})

app.delete("/api/diagnosis/delete-bind-medicine-to-symptom", (req, res)=>{
    if (typeof req.query.bind_id === 'undefined' ){
        res.status(400).send({
            success: false,
            error: WRONG_BODY_FORMAT
        })
        return
    }

    dao.unbindMedicineSymptoms(req.query.bind_id).then(result=>{
        res.status(200).send({
            success: true,
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

app.get("/api/diagnosis/retrieve-medicine-of-symptoms",(req,res)=>{
    if(typeof req.query.symptom_id === 'undefined'){
        res.status(400).send({
            success:false,
            error:WRONG_BODY_FORMAT
        })
        return
    }

    dao.retrieveMedicineForSymptom(new Symptoms(req.query.symptom_id)).then(result=>{
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

app.post("/api/diagnosis/bind-medicine-to-disease", (req,res)=>{
    if(typeof req.body.medicine_id === 'undefined' ||
        typeof req.body.disease_id === 'undefined'){
        res.status(400).send({
            success:false,
            error:WRONG_BODY_FORMAT
        })
        return
    }

    dao.bindMedicineToDisease(new Medicine(req.body.medicine_id),new Disease(req.body.disease_id)).then(result=>{
        res.status(200).send({
            success: true,
            result: result
        })
    }).catch(err=>{
        if(err.code === 'ER_DUP_ENTRY' || err === ERROR_DUPLICATE_ENTRY){
            res.status(500).send({
                success:false,
                error: 'DUPLICATE-ENTRY'
            })
            res.end()
        }else if(err.code === 'ER_NO_REFERENCED_ROW_2'){
            res.status(500).send({
                success:false,
                error:ERROR_FOREIGN_KEY
            })
        }else{
            console.log(err)
            res.status(500).send({
                success:false,
                error:SOMETHING_WENT_WRONG
            })
        }
    })
})

app.delete("/api/diagnosis/delete-bind-medicine-to-disease", (req, res)=>{
    if (typeof req.query.bind_id === 'undefined' ){
        res.status(400).send({
            success: false,
            error: WRONG_BODY_FORMAT
        })
        return
    }

    dao.unbindMedicineDisease(req.query.bind_id).then(result=>{
        res.status(200).send({
            success: true,
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

app.get("/api/diagnosis/retrieve-medicine-of-disease",(req,res)=>{
    if(typeof req.query.disease_id === 'undefined'){
        res.status(400).send({
            success:false,
            error:WRONG_BODY_FORMAT
        })
        return
    }

    dao.retrieveMedicineForDisease(new Disease(req.query.disease_id)).then(result=>{
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

/**
 * @swagger
 * /Diagnosis:
 * post:
 *   description: Use to bind symptom to disease
 *   responses:
 *   '200':
 *     description: A successful response
 */

app.post("/api/diagnosis/bind-symptom-to-disease", (req, res)=>{
    if (typeof req.body.symptom_id === 'undefined' ||
        typeof req.body.disease_id === 'undefined' ||
        typeof req.body.animal_id === 'undefined'  ||
        typeof req.body.anatomy_id === 'undefined'){
        res.status(400).send({
            success: false,
            error: WRONG_BODY_FORMAT
        })
        return
    }

    dao.bindSymptomToDisease(new Symptoms(req.body.symptom_id), new Disease(req.body.disease_id), new AnimalType(req.body.animal_id), new Anatomy(req.body.anatomy_id)).then(result=>{
        res.status(200).send({
            success: true,
            result: result
        })
    }).catch(err=>{
        if(err.code === 'ER_DUP_ENTRY' || err === ERROR_DUPLICATE_ENTRY){
            res.status(500).send({
                success:false,
                error: 'DUPLICATE-ENTRY'
            })
            res.end()
        }else if(err.code === 'ER_NO_REFERENCED_ROW_2'){
            res.status(500).send({
                success:false,
                error:ERROR_FOREIGN_KEY
            })
        }else{
            console.log(err)
            res.status(500).send({
                success:false,
                error:SOMETHING_WENT_WRONG
            })
        }
    })
})

/**
 * @swagger
 * /Diagnosis:
 * get:
 *   description: Use to delete bind symptom to disease
 *   responses:
 *   '200':
 *     description: A successful response
 */

app.delete("/api/diagnosis/delete-bind-symptom-to-disease", (req, res)=>{
    if (typeof req.query.bind_id === 'undefined' ){
        res.status(400).send({
            success: false,
            error: WRONG_BODY_FORMAT
        })
        return
    }

    dao.unbindDiseaseSymptoms(req.query.bind_id).then(result=>{
        res.status(200).send({
            success: true
        })
    }).catch(err=>{
        console.error(err)
        res.status(500).send({
            success: false,
            error: SOMETHING_WENT_WRONG
        })
    })
})

//Routes
/**
 * @swagger
 * /Diagnosis:
 * get:
 *   description: Use to get symptoms of disease
 *   responses:
 *   '200':
 *     description: A successful response
 */

app.get("/api/diagnosis/retrieve-symptoms-of-disease", (req, res)=>{
    if (typeof req.query.disease_id === 'undefined'){
        res.status(400).send({
            success: false,
            error: WRONG_BODY_FORMAT
        })
        return
    }

    dao.retrieveSymptomsForDisease(new Disease(req.query.disease_id)).then(result=>{
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

app.post("/api/diagnosis/diagnose-this", (req, res)=>{
    if (typeof req.body.symptoms === 'undefined'){
        res.status(400).send({
            success: false,
            error: WRONG_BODY_FORMAT
        })
        return
    }

    dao.diagnoseSymptoms(req.body.symptoms).then(result=>{
        res.status(200).send({
            success: true,
            result: result
        })
    }).catch(err=>{
        if(err.code === 'ER_DUP_ENTRY' || err === ERROR_DUPLICATE_ENTRY) {
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

const upload=multer({storage:storage})

app.post("/api/diagnosis/add-medical-records", upload.single('file_name'), async(req,res)=>{

    const patient=req.body.patient_id
    console.log(patient)

    if(typeof patient === 'undefined'){
        res.status(400).send({
            success:false,
            error:WRONG_BODY_FORMAT
        })
        return
    }

    upload(req,res, async(err)=>{

        if(err instanceof multer.MulterError){
            return res.send(err)
        }

        else if(err){
            return res.send(err)
        }

        console.log(req.file)

        const medical = new MedicalRecords(null,patient, ' NOW() ', 'NEW', req.file.filename)
        dao.addMedicalRecord(medical).then(result=>{
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

/*app.post("/api/diagnosis/add-medical-records", (req,res)=>{

    const patient=req.body.patient_id
    console.log(patient)

    if(typeof patient === 'undefined'){
        res.status(400).send({
            success:false,
            error:WRONG_BODY_FORMAT
        })
        return
    }

    const file=req.files

    file.mv('./Uploads/' + file.file_name, function (err,result){
        const medical = new MedicalRecords(null,patient, ' NOW() ', 'NEW', req.file.filename)
        dao.addMedicalRecord(medical).then(result=>{
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
})*/

/*
DIAGNOSA-SENDIRI/SELF-DIAGNOSE, TERJADWAL DENGAN KLINIK/SCHEDULED WITH CLINIC, TELAH DI-DIAGNOSA DOKTER/DIAGNOSED BY THE DOCTOR, RAWAT INAP/INPATIENT, SELESAI/DONE
 */

// LISTEN SERVER | PRODUCTION DEPRECATION AFTER 9TH MARCH 2020, USE ONLY FOR DEVELOPMENT
app.listen(PORT, ()=>{
    console.info(`Server serving port ${PORT}`)
})
