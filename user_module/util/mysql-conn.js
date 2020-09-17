import mysql from 'mysql'

export default (host, user, password, dbName)=>{
	return mysql.createConnection({
		host: host,
		user: user,
		password: password,
		database: dbName,
		multipleStatements: true
	});
}