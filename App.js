const express = require("express");
const app = express();
const mysql = require("mysql");
const flash = require('connect-flash');

// mysql database connection
const con = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "root123",
    database: "nodejsAssignment",
});

con.connect(function (err) {
    if (err) throw err;
    console.log("Connected!");

    // SQL query to create the table if it doesn't exist
    var createTableSQL = `
      CREATE TABLE IF NOT EXISTS student (
      rollno INT NOT NULL PRIMARY KEY, 
      name VARCHAR(255),
      dob DATE,
      score INT 
      ) 
    `;

    con.query(createTableSQL, function (err, result) {
        if (err) {
            if (err.code === 'ER_TABLE_EXISTS_ERROR') {
                console.log("Table already exists");
            } else {
                throw err;
            }
        }
    });
});

//middlewares
var connection = require('request');
const port = 4000;
var bodyParser = require("body-parser");
var session = require("express-session");

app.use(session({
    secret: 'webslesson',
    resave: true,
    saveUnintialized: true
}))

app.use(flash());

app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json());

// view engine configuration
app.set("view engine", "ejs");
app.set("views", "./views")


app.use((req, res, next) => {
    // Disable caching for all responses
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    next();
});

//middleware   
function requireSession(req, res, next) {

    if (req.session && req.session.user_id) {
        next();
    } else {
        res.status(401).json({ message: 'Unauthorized' });
    }
}

//Routings

//Home Page routing
app.get("/", (req, res) => {
    res.render("index");
});

app.get("/logout", (req, res) => {
    console.log("Logout")
    req.session.destroy((err) => {
        if (err) {
            console.error("Error destroying session:", err);
        } else {
            res.render("index");
        }
    });
});



//teacher login page routing
app.get("/teacher/login", (req, res) => {
    res.render("loginPages/teacherloginPage", {
        message: "",
        timeout: '3000'// Define an appropriate timeout value in milliseconds
    });
});


//student login page routing
app.get("/student/login", (req, res) => {
    res.render("loginPages/studentloginPage")
});


//teacher login routing for displaying next option page
app.post("/loginteacher", function (request, response, next) {
    var emailid = request.body.emailid;
    var password = request.body.password;
    console.log(emailid + " " + password);
    if (emailid && password) {
        query = `SELECT * FROM teacher where emailid ="${emailid}" `;
        con.query(query, function (error, data) {
            if (data.length > 0) {
                if (data[0].password == password) {
                    request.session.user_id = data[0].emailid;
                    response.render("teacherPages/optionStudent");
                }
                else {
                    const timeout = 3000;
                    response.render('loginPages/teacherloginPage', {
                        message: "Wrong Email or password!!", timeout
                    })
                }
            }
            else {
                const timeout = 3000;
                response.render('loginPages/teacherloginPage', {
                    message: "Wrong Email or password!!", timeout
                })
            }
            response.end();
        });
    }
    else {
        response.redirect('/teacher/login');
        response.end();
    }
});


app.get("/option", requireSession, function (req, res) {
    res.render("teacherPages/optionStudent")
});


//routing to display add student page 
app.get("/teacher/add", requireSession, function (req, res) {
    res.render("teacherPages/addstudentDetails", {
        message: "",
        timeout: '3000'
    })
})


//routing to add student in database
app.post("/addstudent", (req, res) => {
    const { rollno, name, dob, score } = req.body
    console.log("data...", req.body)
    let qry = `SELECT * FROM student WHERE rollno=?`;

    con.query(qry, [rollno], (err, results) => {
        if (err)
            throw err;
        else {
            if (results.length > 0) {
                console.log("Entered in exist..!!" + results + " " + req.body);
                const timeout = 3000;
                res.render('teacherPages/addstudentDetails', {
                    message: "Student Already Exists!!", timeout
                })
            } else {
                let qry2 = `INSERT INTO student values(?,?,?,?)`;
                const timeout = 3000;
                con.query(qry2, [rollno, name, dob, score], (err, results) => {
                    if (err) console.log("error " + err);
                    else {
                        res.render('teacherPages/addstudentDetails', {
                            message: "Student Added Successfully!!", timeout
                        })
                    }
                })
            }
        }
    })
});


// routing for diplaying all student score
app.get('/teacher/viewall', requireSession, (req, res) => {
    console.log("ALLLLL")
    let sql = "SELECT * FROM  student ORDER BY rollno";
    con.query(sql, (err, rows) => {
        if (err) throw err;

        res.render('allDataStudent/viewallStudents', {
            student: rows
        });
    });
});


app.get('/teacher/option', requireSession, (req, res) => {
    res.render("teacherPages/optionStudent")
});


// routing for deleting the student
app.get('/teacher/delete/:userId', requireSession, (req, res) => {
    const userId = req.params.userId;
    let sql = `DELETE from student where rollno = ${userId}`;
    con.query(sql, (err, result) => {
        if (err) throw err;
        res.redirect('/teacher/viewall');
    });
});


// routing to display student edit page
app.get('/teacher/edit/:userId', requireSession, (req, res) => {
    const userId = req.params.userId;
    let sql = `SELECT * FROM student where rollno = ${userId}`;
    con.query(sql, (err, result) => {
        if (err) throw err;
        res.render('teacherPages/editStudent', {
            student: result[0]
        });
    });
});


// routing to update student details after editing
app.post('/update', requireSession, (req, res) => {
    const userId = req.body.rollno;
    let sql = "UPDATE  student SET  name='" + req.body.name + "', dob='" + req.body.dob + "'  ,  score='" + req.body.score + "' where rollno =" + userId;
    con.query(sql, (err, results) => {
        if (err) throw err;
        res.redirect('teacher/viewall');
    });
});


// routing for student login using dob and roll no
app.post("/login", function (request, response, next) {
    var rollno = request.body.rollno;
    var dob = request.body.dob;
    if (rollno && dob) {
        query = `SELECT * FROM student WHERE rollno ="${rollno}" AND dob ="${dob}"`;
        con.query(query, function (error, data) {
            if (data.length > 0) {
                console.log(data.length + " here we check our number of data ");
                response.render("studentPages/viewResult", { student: data });
            }
            else {
                response.render("loginPages/studentloginPage", { error: "Invalid credentials. Please try again." });
            }
            response.end();
        });
    }
    else {
        response.render("loginPages/studentloginPage", { error: "Invalid credentials. Please try again." });
        response.end();
    }
});


//create server
app.listen(port, (err) => {
    if (err)
        throw err
    else
        console.log("Server is running at port %d:", port);
});