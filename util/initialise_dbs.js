import {KunyahAccessObj} from "../dao";
import dotenv from "dotenv";

dotenv.config()
const host = process.env.MY_SQL_HOST
const user = process.env.MY_SQL_USER
const password = typeof process.env.MY_SQL_PASSWORD === 'undefined' ? '' : process.env.MY_SQL_PASSWORD
const dbname = process.env.MY_SQL_DBNAME
const kunyahAccessObject = new KunyahAccessObj(host, user, password, dbname)

setTimeout(()=>{
    console.log("Success")
}, 5000)
