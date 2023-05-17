const express = require("express");
const app = express();
const multer  = require('multer');
const { PythonShell } = require('python-shell');
const path = require('path');
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mysql = require('mysql2');


const { spawn } = require('child_process');
const upload = multer({ dest: 'uploads/' });

app.use(express.static("public"));
app.set('view engine' , 'ejs');
app.use(bodyParser.urlencoded({extended : true}));
app.use(express.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.json());

const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: 'password',
    database: 'instituteDB'
});

let Sid ;
let Scid , ssec , att;
let Spass ;
let Tid;
let Tpass;
let cid,tsec,classId,idclass;
let len;
let stime,etime;
let students=[];
let checked=[];
let sCourse =[];
let tCourse =[];
let tCSec =[];
let attend=[];
let att_names=[];
let stu_ids=[];
const date = new Date().toISOString().slice(0, 10);


app.get("/",function(req,res){
    res.render("main");
});

app.get("/teacher",function(req,res){
  res.render("teacher");
});

app.get("/student",function(req,res){
    res.render("student");
});


app.post("/student",function(req,res){
    Sid = req.body.RollNo ;
    Spass = req.body.Pass ;

    pool.query('SELECT * FROM Student where Sid=?',[Sid], function (err, results, fields) {
        if (err) {
          console.log(err);
        } else {
          if(results[0].SPass === Spass){
            pool.query('select Cid from handles join student on handles.Section = student.Section where student.Sid=?',[Sid],function(err,result,fields){
              for (let i = 0; i < result.length; i++) {
                sCourse.push(result[i].Cid);
              }
              console.log(result);
              ssec=results[0].Section;
              res.render("stuHome",{sName: results[0].SName , sid : results[0].Sid , sEmail : results[0].SEmail ,ssec : results[0].Section, syear : results[0].Year, sCourses : sCourse , ele : results[0].Elective });
              sCourse=[];
            })
              
          }
          else{
            res.send("incorrect password");
          }
        }
      });

});

app.post("/teacher",function(req,res){
    Tid = req.body.id ;
    Tpass = req.body.pass ;

    pool.query('SELECT * FROM Teacher where Tid=?',[Tid], function (err, results, fields) {
        if (err) {
          console.log(err);
        } else {
            //console.log(results[0].TName);
          if(results[0].TPass === Tpass){
            pool.query('select courses.Cname,courses.Cid,handles.Section from courses join handles join Teacher on courses.Cid=handles.Cid and teacher.Tid=handles.Tid where handles.Tid=?',[Tid], function (err, result , fields){
              if(err){
                console.log(err);
              }
              else{ 
                for (let i = 0; i < result.length; i++) {
                  tCourse.push(result[i].Cid);
                  tCSec.push(result[i].Section);
                }
                console.log(result);
                res.render("teachHome",{tName : results[0].TName ,tid : results[0].Tid , tEmail : results[0].TEmail , tCourse : tCourse , Sec : tCSec });
                tCSec=[];
                tCourse=[];
              }
            });
           }
          else{
            console.log("incorrect password");
          }
        }
      });
});


app.post("/teachHome",function(req,res){
  console.log(req.body.buttonValue);
  const words = req.body.buttonValue.split("-");
  console.log(words);
  cid=words[0];
  tsec=words[1];
  res.redirect("/createclass");
})

app.post("/stuHome",function(req,res){
  console.log(req.body.buttonValue);
  if(req.body.buttonValue === 'Elective'){
    res.redirect("/elective");
  }
  else{
    Scid=req.body.buttonValue;
    res.redirect("/myattend");
  }
  
})

app.get("/elective",function(req,res){
  res.render("elective");
})

app.post("/elective",function(req,res){
  console.log(req.body.selected);
  pool.query('update student set Elective = ? where Sid=?',[req.body.selected,Sid],function(err,result,fields){
      res.redirect("/student");
    
  })
})

app.get("/myattend",function(req,res){
  pool.query('select count(ClassID) from classes join handles on classes.Tid=handles.Tid where handles.Cid=? and handles.Section=?',[Scid,ssec],function(err,results,fields){
    if(err){
      console.log(err);
    }
    else{
      pool.query('select count(Cid) from classes join attendance join student on attendance.ClassID=classes.ClassID and attendance.Sid=student.Sid where student.Sid=? and Cid=? and isPresent=1',[Sid,Scid],function(err,result,fields){
        att=(result[0]['count(Cid)'])/(results[0]['count(ClassID)']);
        att=att*100;
        att=att.toFixed(2);
        res.render("myattend",{sCourse:Scid , att : att , totclass : results[0]['count(ClassID)'] , attClass : result[0]['count(Cid)']});
        
      })
    }
  })
});


app.get("/createclass",function(req,res){
  res.render("createclass",{date:date});
});

app.post("/createclass",function(req,res){
  stime = req.body.stime;
  etime = req.body.etime;
  const submitBtn = req.body.submitBtn;
  console.log(req.body.stime);
  
  pool.query('insert into classes(Tid,Cid,Date,StartTime,EndTime,Section) values(?,?,?,?,?,?)',[Tid,cid,date,stime,etime,tsec],function(err , result , fields){
    if(err){
      console.log(err);
    }
    else{
      console.log("class created");
      if (submitBtn === 'Manual') {
        res.redirect("/attendance");
      } else if (submitBtn === 'Upload') {
        res.redirect("/faceAtt");
      }
    }
  });
 
})

app.get("/faceAtt",function(req,res){
  res.render("faceAtt");
})

app.post('/faceAtt', upload.single('image'), function(req, res) {
  const image = req.file;
  console.log(image);
  const scriptPath = 'C:\\Sasi\\EPICS PROJECT\\detect_faces.py';
  const python = 'C:\\Users\\sashi\\anaconda3\\envs\\' + '\\python.exe';
  
  const pyScript = spawn('C:\\Users\\sashi\\anaconda3\\python.exe', [scriptPath, req.file.path]);

  pyScript.stdout.on('data', function(data) {
    // att_names.push(data.toString().trim().split(","));
    console.log(data);
    att_names = JSON.parse(data.toString('utf-8'));
  });

  pyScript.stderr.on('data', function(data) {
    console.error(data.toString());
  });

  pyScript.on('exit', function(code) {
    console.log('Python script exited with code', code);
    // res.send('File uploaded successfully');
    pool.query('select classes.classID from teacher join classes on classes.Tid=teacher.Tid where classes.Cid=? and classes.Date=? and StartTime=? and EndTime=? and Section=?',[cid,date,stime,etime,tsec], function (err, rest , fields){
      console.log(rest);
      idclass = rest[0].classID;
      pool.query('select student.Sid from student join classes on student.Section=classes.Section where ClassID=?',[idclass],function(err,result,fields){
        if(err){
          console.log(err);
        }
        else{
          for(let i=0;i<result.length;i++){
            stu_ids.push(result[i].Sid)
          }
          console.log(stu_ids);
          console.log(att_names);
          for(let i=0;i<stu_ids.length;i++){
            pool.query('insert into attendance values(?,?,?)',[idclass,stu_ids[i],0],function (err, results , fields){
              if(err){
                console.log(err);
              }
              else{
                console.log("done");
              }
            });
          }
          pool.query('update attendance set isPresent=1 where Sid in (?) and ClassID=?',[att_names,idclass],function(err,result,fields){
            if(err){
              console.log(err);
            }
            else{
              console.log("done");
              stu_ids=[];
              res.redirect("/viewAtt");
            } 
          })
        }
      })
    })
    
    
  });

});



app.get("/attendance",function(req,res){
  pool.query('select classes.classID from teacher join classes on classes.Tid=teacher.Tid where classes.Cid=? and classes.Date=? and StartTime=? and EndTime=? and Section=?',[cid,date,stime,etime,tsec], function (err, result , fields){
        if(err){
          console.log(err);
        }
        else{
          console.log(result);
          classId=result[0].classID;
          pool.query('select student.Sid from handles join classes join student join teacher on handles.Tid=classes.Tid and handles.Cid=classes.Cid and handles.Section=student.Section where classes.classID=? and student.Section=? and teacher.Tid=classes.Tid and teacher.Dept=student.Branch and handles.Year=student.Year',[classId,tsec], function (err, results , fields){
            if(err){
              //console.log(err);
            }
            else{
              len=results.length;
              console.log(results);
              for (let i = 0; i < len; i++) {
                students.push(results[i].Sid);
              }
              
              res.render("attendance",{cls : classId , stu : students });
              students=[];
              
            }
          });
        }
      });
});

app.post("/attendance",function(req,res){

  checked.push({stdid : req.body.studId , attend : req.body.checkedValues});
  console.log(checked);
  // let totalInserts = checked.length * req.body.studId.length;
  // let completedInserts = 0;

  for(let j=0;j<checked.length;j++){
    let stdid = checked[j].stdid;
    let attend = checked[j].attend;
    for(let i=0;i<stdid.length;i++){
      pool.query('insert into attendance values(?,?,?)',[classId,stdid[i],attend[i]],function (err, result , fields){
        idclass=classId;
        if(err){
          console.log(err);
        }
        else{
          console.log("done");
          // completedInserts++;
          // if (completedInserts === totalInserts) {
          //   res.redirect("/viewAtt");
          // }
        }
      });
    }
  }

  checked=[];
  res.status(200).send({ message: 'Attendance data inserted successfully.' });
  // const names = req.body.names;
  // console.log("Attendance recorded for:", names.join(", "));
  // res.send("Attendance recorded");
});



app.get("/viewAtt",function(req,res){
  console.log("hello");
  pool.query('select * from attendance where ClassID=?',[idclass],function(err,result,fields){
    
    if(err){
      console.log(err);
    }
    else{
      console.log(classId);
      for (let i = 0; i < result.length; i++) {
        students.push(result[i].Sid);
        if(result[i].isPresent === 1)
          attend.push("P");
        else
          attend.push("Ab");
      }
      console.log(students);
        console.log(attend);
      res.render("viewAtt",{clsid : idclass , sids : students , att : attend});
        students=[];
        attend=[];
    }
  })
})


app.listen(3000,function(){
    console.log("Server is running");
})