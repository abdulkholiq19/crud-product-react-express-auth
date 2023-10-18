const mysql = require('mysql')
const express = require('express')
var cors = require('cors')
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser')
const bcrypt = require('bcrypt')

const app = express()
const port = 3001
// app.use(cors());
app.use(cookieParser());
app.use(cors({
  origin: ["http://localhost:3000"],
  methods: ["POST", "GET", "PATCH", "DELETE"],
  credentials: true
}));
app.use(express.json());
dotenv.config();

const db = mysql.createConnection({
  host: process.env.HOST,
  user: process.env.USER,
  password: process.env.PASSWORD,
  database: process.env.DATABASE,
});

app.get("/users", (req, res) => {
  const q = "SELECT * FROM Users";
  db.query(q, (err, data) => {
    if (err) {
      return res.json(err);
    }
    return res.json(data);
  });
});

app.post("/product/add", (req, res) => {
  const q = "INSERT INTO Products(`ProductName`, `ProductDesc`, `ProductCover`) VALUES (?)";

  const values = [
    req.body.ProductName,
    req.body.ProductDesc,
    req.body.ProductCover,
  ];

  db.query(q, [values], (err, data) => {
    if (err) return res.send(err);
    return res.json(data);
  });
});


app.get("/products", (req, res) => {
  const q = "SELECT * FROM products";
  db.query(q, (err, data) => {
    if (err) {
      return res.json(err);
    }
    return res.json(data);
  });
});

app.get("/product/:id", (req, res) => {
  const q = "SELECT * FROM products WHERE id= ?";
  const { id } = req.params
  db.query(q, id, (err, data) => {
    // res.send(data[0])
    if (err) {
      return res.json(err);
    }
    return res.json(data[0]);
  });
});

app.patch("/product/:id", (req, res) => {
  const { id } = req.params
  const q = `UPDATE Products SET ? WHERE id =${id}`;

  const dataPost = {
    ProductName: req.body.ProductName,
    ProductDesc: req.body.ProductDesc,
    ProductCover: req.body.ProductCover,
  }

  db.query(q, dataPost, (err) => {
    // res.send(data)
    if (err) {
      return res.status(500).json({
        status: false,
        message: 'Internal Server Error',
      })
    }
    return res.status(200).json({
      status: true,
      message: 'Update Data Successfully!'
    })
  });
});


/// DELETE 
app.delete("/product/:id", (req, res) => {
  const { id } = req.params
  const queryDelete = 'DELETE FROM products WHERE id= ?';
  const querySelect = 'SELECT * FROM products WHERE id= ?';

  db.query(querySelect, id, (err, data) => {
    if (err) {
      return res.send(err);
    }

    if (data.length !== 0) {
      db.query(queryDelete, id, (err) => {
        return res.send({ message: 'Success Deleted' });
      });
    } else {
      return res.send({ message: 'Data Not Found' })
    }
  });
});


// USER REGISTER
app.post("/register", async (req, res) => {
  const hashedPassword = await bcrypt.hash(req.body.password, 10)
  const q = "INSERT INTO Users(`name`, `username`, `email`, `password`) VALUES (?)";

  const values = [
    req.body.name,
    req.body.username,
    req.body.email,
    hashedPassword
  ];
  // res.send({values})

  db.query(q, [values], (err, data) => {
    if (err) return res.send(err);
    return res.json({status: 'Success', message: 'Data berhasil di Submit'});
  });
});

// USER LOGIN

const generateAccessToken = (username) => {
  return jwt.sign(username, process.env.TOKEN_SECRET, { expiresIn: '1d' });
}

app.post("/login", (req, res) => {
  const q = "SELECT * FROM users WHERE username = ?";
  
  db.query(q, [req.body.username], async (err, data) => {
    if (err) return res.send(err);
    if (data.length > 0) {
      const comparePassword = await bcrypt.compare(req.body.password, data[0].password)
      if(comparePassword){
        const token = generateAccessToken({ username: req.body.username });
        res.cookie('token', token)
        return res.json({ status: 'Success', token: token });
      } else {
        return res.json({status: 'Failed', message: 'Password does not match .'})
      }
    } else {
      return res.json('Login Erorr');
    }
  });
});

const verifyUser = (req, res, next) => {
  const token = req.cookies.token;
  if (!token) {
    return res.json({
      message: 'Your token has expired !!!'
    })
  } else {
    return jwt.verify(token, process.env.TOKEN_SECRET, (err, decode) => {
      if (err) {
        return res.json({ message: "Authentication Error ." })
      } else {
        req.username = decode.username
        next()
      }
    })
  }
}

app.get('/', verifyUser, (req, res) => {
  return res.json({ status: 200, message: 'Login Succesfully', token: req.cookies.token })
})

app.get('/logout', (req, res) => {
  res.clearCookie('token')
  return res.json({ status: 200, message: 'Success Logout' })
})
app.listen(port, () => {
  console.log(`Example app listening on ${port}`)
})