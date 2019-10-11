//[test entry limit thoroughly]
//todo: host on the beanstalk (?)
//language of page and form has label element for accessibility

var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var session = require('client-sessions');
app.use(bodyParser.urlencoded({extended:false}));
app.use(bodyParser.json());
app.use(express.static(__dirname + '/templates'));
app.use(session({
  cookieName: 'session',
  secret: 'budtoblossomencryptionstring',
  duration: 30 * 60 * 1000,
  activeDuration: 5 * 60 * 1000,
}));

var mysql = require('mysql');  
var conn = mysql.createConnection({  
  host: "bud2blossometge.c1np8stfxf7y.us-east-1.rds.amazonaws.com",  
  user: "b2badmin",  
  password: "blossometge",  
  database: "bud2blossometge"
});  
conn.connect(function(err) {  
  if (err) throw err;  
  console.log("Connected!");
 
});  
   
var engines = require('consolidate');
app.engine('html', engines.hogan);
app.set('views', __dirname + '/templates');
app.set('view engine', 'html');


let usersql='CREATE TABLE IF NOT EXISTS users(uname varchar(30) NOT NULL, pword varchar(30), school varchar(50), grade INT,PRIMARY KEY(uname))';
conn.query(usersql,
function (error, data) {
  if (error) throw error;
});

let emotionsQuery='CREATE TABLE IF NOT EXISTS emotions (uname varchar(30),q1 varchar(255), q2 varchar(255), q3 varchar(255), q4 varchar(255), feelings varchar(255), positive INT,negative INT, date varchar(50), FOREIGN KEY (uname) REFERENCES users(uname))';
conn.query(emotionsQuery,
  function (error, data) {
    if (error) throw error;
  });

let plantsQuery='CREATE TABLE IF NOT EXISTS plants (id INT PRIMARY KEY AUTO_INCREMENT,type varchar(100), x INT, y INT, user varchar(100), FOREIGN KEY (user) REFERENCES users(uname))';
  
  conn.query(plantsQuery,
    function (error, data) {
      if (error) throw error;
    });
  
let recentsQuery='CREATE TABLE IF NOT EXISTS recents (user varchar(50), latest varchar(100),num INT, FOREIGN KEY (user) REFERENCES users(uname))';

conn.query(recentsQuery,
  function (error, data) {
    if (error) throw error;
  });

function newOkay(req, res) {
  var user = req.session.user;
  var sql = `SELECT latest, num FROM recents WHERE user='${user}'`;
  conn.query(sql, function(err, rows) {
    if(err) {
      console.log(err);
    } else if(rows. length == 0) {
      res.send("0");
    } else {
      console.log(rows);
      var theDate = formatDate();
      if(rows[0].latest == theDate) {
        req.session.moods = undefined;
        res.send("1");
      } else if(rows[0].latest.substring(0,8) == theDate.substring(0,8)
      && rows[0].num > 3) {
        req.session.moods = undefined;
        res.send("2");
      } else {
        res.send("0");
      }
    }
  });
}

function newEntry(date, user) {
  const recentdetails= { user: user, latest: date, num: 1};
  var sql = `SELECT latest, num FROM recents WHERE user='${user}'`;

  conn.query(sql, function(err, rows) {
    if(err) {console.log(err);
    } else if(rows.length == 0) {
      var query = 'INSERT INTO recents SET ?';
      conn.query(query,recentdetails, function(e1, d1) {
        if(e1) console.log(e1);
      });
    } else {
      var entrynum = rows[0].num;
      if(date.substring(0,8) == rows[0].latest.substring(0,8)) {
        entrynum++;
      } else {
        entrynum = 1;
      } 
      conn.query('UPDATE recents SET ?,? WHERE ?',[{latest: date},{num: entrynum},{user: user}],function(e2, d2) {
        if(e2) console.log(e2);
      });
    }
  });
}

function addPlant(username, type, res) {
  var idval=null;
  var plantData={id:idval,type:type,x:0,y:0,user:username};
  var sql = 'INSERT INTO plants SET ?';
  conn.query(sql, plantData, function(err, data) {
    if(err) console.log(err);
    var sel= `SELECT Auto_increment FROM information_schema.tables WHERE table_name='plants'`;
    conn.query(sel, function(err1, data1) {
      if(err1) console.log(err1);
      res.send(data1[0].seq + "");
    });
  });
}

function updatePlant(id, x, y) {
  var sql = `UPDATE plants SET x = '${x}', y = '${y}' WHERE id='${id}'`;
  conn.query(sql,
  function(err, data) {
    if(err) console.log(err);
  });
}

function deletePlant(id) {
  var sql = `DELETE FROM plants WHERE id='${id}'`;
  conn.query(sql);
}

function addUser(req, res) {
  var uname = req.query.uname.toLowerCase();
  var pword = req.query.pword;
  var group = req.query.group;
  var grade = parseInt(req.query.grade);
  const userData= { uname: uname, pword: pword, school: group, grade:grade };
  var sql = 'INSERT INTO users SET ?';
  conn.query(sql, [userData],
    function (error, data) {
      if(error)  {
        res.send("invalid username");
      } else {
        req.session.user = uname;
        res.send("valid");
      }
    });
}


function setUser(req, res) {
var uname = req.query.uname.toLowerCase();
var pword = req.query.pword;
var group = req.query.group;
var grade = parseInt(req.query.grade);
var sql = `SELECT * FROM users where uname = '${uname}'`;
// "'+ uname + '"';
const user= { uname: uname, pword: pword, school: group, grade:grade };
var execsql = 'INSERT INTO users SET ?';

conn.query(sql, function(err, data) {
    if(err) {
    res.send("error");
    return;
  }
  if(data.length == 0) {    
    conn.query(execsql, user,
      function (error, data) {
        if(error)  {
          res.send("invalid username");
        } else {
          req.session.user = uname;
          res.send("valid");
        }
      });
  } else {
      req.session.user = uname;
      res.send("valid");
    
  }
});

}
function validLogin(req, res) {
  var uname = req.query.uname.toLowerCase();
  var pword = req.query.pword;
  var sql = `SELECT * FROM users where uname = '${uname}'`;
  conn.query(sql, function(err, data) {
    if(err) {
      res.send("error");
      return;
    }
    if(data.length == 0) {
      res.send("invalid username");
    } else {
      if(data[0].pword == pword) {
        req.session.user = uname;
        res.send("valid");
      } else {
        res.send("invalid password");
      }
    }
  });
}

function negMood(emotions) {
  return (emotions.includes("sad") || emotions.includes("angry") ||
  emotions.includes("annoyed") || emotions.includes("fearful") ||
  emotions.includes("hurt") || emotions.includes("nervous") ||
  emotions.includes("lonely") || emotions.includes("worried"));
}



app.get("/", function(request, response) {
  if (typeof request.session.user !== 'undefined') {
    response.render("landing.html", {name:request.session.user});
  } else {
    response.render("home.html", {});
  }
});

app.get("/landing", function(request, response) {
  if (typeof request.session.user !== 'undefined') {
    response.render("landing.html", {name:request.session.user, message: "welcome back!"});
  } else {
    console.log('redirect url');  
    response.redirect("/");
  }
});

app.get("/signup", function(request, response) {
  response.render("signup.html", {});
});

app.get("/tracker", function(request, response) {
  if (typeof request.session.user !== 'undefined') {
    response.render("tracker.html", {});
  } else {
    response.redirect("/");
  }
});

app.get("/log", function(request, response) {
  var moods = request.session.moods;
  if (typeof moods !== 'undefined') {
    var moodmap = moods.map(function(el) {
      return {emo: el};
    });
    if(negMood(moods)) {
      response.render("diary.html", {moods: moodmap});
    } else {
      response.render("pdiary.html", {moods: moodmap});
    }
  } else if(typeof request.session.user !== 'undefined') {
    response.redirect("/tracker");
  } else {
    response.redirect("/");
  }
});

app.get("/jungle", function(request, response) {
  if (typeof request.session.user !== 'undefined') {
    if(request.session.plant == "yes") {
      request.session.plant = "no";
      response.render("jungle.html", {modal: "yes"});
    } else {
      response.render("jungle.html", {modal: "no"});
    }
  } else {
    response.redirect("/");
  }
});    

app.get("/calendar", function(request, response) {
  if (typeof request.session.user !== 'undefined') {
    response.render("calendar.html", {});
  } else {
    response.redirect("/");
  }
});

app.get("/validate/profile", function(request, response) {
  console.log('profile');
  setUser(request, response);
  
}); 

app.get("/logout", function(req, res) {
  req.session.reset();
  res.redirect('/');
});

app.get("/validate/login", function(request, response) {
  validLogin(request, response);
}); 

app.get("/validate/signup", function(request, response) {
  addUser(request, response);
});

function formatDate() {
  var date = new Date();
  var dd = date.getDate();
  var mm = date.getMonth() + 1;
  var yyyy = date.getFullYear();
  var hour = date.getHours();
  if (dd < 10){
    dd ='0' + dd;
  }
  if (mm < 10){
    mm ='0' + mm;
  }
  return yyyy + mm + dd + hour + "";
}

app.get("/validate/addmoods", function(request, response) {
  request.session.moods = request.query.moods;
  response.end();
});

app.get("/validate/adddiary", function(req, res) {
  req.session.plant = "yes";
  var positives = 0;
  var negatives = 0;
  var emotions = req.session.moods;
  var feelings = emotions.join(" ");
  for (i = 0; i < emotions.length; i++) {
    if (emotions[i] === "happy" || emotions[i] === "content" || emotions[i] === "excited" || emotions === "surprised") {
      positives += 1;
    } else {
      negatives += 1;
    }
  }
  var q1 = req.query.q1;
  var q2 = req.query.q2;
  var q3 = req.query.q3;
  var q4 = req.query.q4;
  var date = formatDate();
  var emotionData={uname:req.session.user,feelings:feelings,positive:positives,negative:positives,q1:q1, q2:q2, q3:q3, q4:q4, date:date}
  var sql = 'INSERT INTO emotions SET ?';
  newEntry(date, req.session.user);
  conn.query(sql, emotionData, function(err, data) {
    if(err) throw err;
  });
  req.session.moods = undefined;
  res.end();
});

app.get("/calendar/byDay", function(request, response) {
  var uname = request.session.user;
  var date = request.query.date;
  var sql = `select feelings, q1, q2, q3, q4, date from emotions where uname='${uname}' AND substr(date,1,8)='${date}'`;
  conn.query(sql, function (error, data) {
    response.send(data);
  });
});

function daysInMonth (month, year) {
    return new Date(year, month, 0).getDate();
}

app.get("/calendar/30days", function(request, response) {
  var uname = request.session.user;
  var month = parseInt(request.query.date.substring(0,4));
  var year = parseInt(request.query.date.substring(4,6));
  var daynum = daysInMonth(month, year);
  var sql = `select feelings, positive, negative, date from emotions where uname='${uname}' AND substr(date,1,6)='${request.query.date}'`;
  conn.query(sql, function(error, rows) {
    posValues = Array.apply(null, Array(daynum)).map(Number.prototype.valueOf,0);
    negValues = Array.apply(null, Array(daynum)).map(Number.prototype.valueOf,0);;
    emotionCounts = {};
    for (i = 0; i < rows.length; i++) {
      var emotions = [];
      if(rows[i].feelings !== null) {
        emotions = rows[i].feelings.split(" ");
      }
      var date = parseInt((rows[i].date + "").substring(6,8)) - 1;
      posValues[date] = posValues[date] + rows[i].positive;
      negValues[date] = negValues[date] + rows[i].negative;
      for (j = 0; j < emotions.length; j++) {
        if (!(emotions[j] in emotionCounts)) {
          emotionCounts[emotions[j]] = 1;
        } else {
          emotionCounts[emotions[j]] +=1;
        }
      }
    }
    response.send([emotionCounts, posValues, negValues]);
  });
});

app.get("/validate/diaryOkay", function(req, res) {
  newOkay(req, res);
});

app.get("/validate/addplant", function(req, res) {
  var type = req.query.type;
  addPlant(req.session.user, type, res);
});

app.get("/validate/deleteplant", function(req, res) {
  var id = req.query.id;
  deletePlant(id);
  res.end();
});

app.get("/validate/moveplant", function(req, res) {
  var id = parseInt(req.query.id);
  var x = req.query.x;
  var y = req.query.y;
  updatePlant(id, x, y);
  res.end();
});

app.get("/validate/getplants", function(req, res) {
  var id = req.session.user;
  var sql = `SELECT * FROM plants WHERE user='${id}'`;
  conn.query(sql, function(err, data) {
    if(err) console.log(err);
    res.send(data);
  });
});

app.listen(8080);
