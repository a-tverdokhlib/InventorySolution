const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const multer = require('multer');
const path = require('path');
var expressValidator = require('express-validator');


const Uploads = require('./models/update');
const isAuth = require('./meddlewere/isAuth');

require('dotenv').config();

//easypost
const Easypost = require('@easypost/api');
const api = new Easypost(process.env.EASYPOST_API_KEY);

const app = express();


const MONGODB_URI = process.env.MONGODB_URI;

const port = process.env.PORT || 3000;

//multer
const fileStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads');
    },
    filename: (req, file, cb) => {
        cb(null, new Date().toISOString() + '-' + file.originalname);
    }
});




const fileFilter = (req, file, cb) => {

    const fileName = path.extname(file.originalname);

    if (fileName === '.csv') {
        cb(null, true);
    } else {
        cb('not an .csv file', false);
    }
}

//meddleWere
app.use(bodyParser.json());

//created user

require('./helpers/crateUsers')();


//multer meddlewere

//headers meddlewere
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization, Sudo');
    next();
});

app.use(multer({ storage: fileStorage, fileFilter: fileFilter }).any('uploads'));


//uploaded files 
// app.use('/uploads/:name', isAuth, async (req, res, next) => {
//     try {

//         const uploads = await Uploads.findOne({ filename: 'uploads/' + req.params.name, user: req.userId });


//         if (!uploads) {
//             const error = new Error("no such file or you don't have access");
//             error.statusCode = 404;
//             throw error;
//         }
//         next();
//     } catch (err) {
//         if (!err.statusCode) {
//             err.statusCode = 500;
//         }
//         next(err);
//     }
// });

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use(express.static(path.join(__dirname, 'templates')));



//lables
app.get('/labels/:id', isAuth, async (req, res, next) => {
    try {
        const batch = await api.Batch.retrieve(req.params.id)
        if (!batch) {
            const error = new Error("not ready yet");
            error.statusCode = 404;
            throw error;
        }

        res.status(200).json({
            state: 1,
            message: 'batch',
            batch: batch.label_url
        });

    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 404;
        }
        next(err);
    }
});



//routes

const erorrMeddlewere = require('./helpers/errors');

const authRouter = require('./routes/auth');
const homeRouter = require('./routes/home');
const recipientRouter = require('./routes/recipient');
const inventoryRouner = require('./routes/inventory');
const orderRoutyer = require('./routes/order');
const userRouter = require('./routes/user');

app.use('/', homeRouter);
app.use('/auth', authRouter);
app.use('/recipient', recipientRouter);
app.use('/inventory', inventoryRouner);
app.use('/order', orderRoutyer);
app.use('/user', userRouter);

//error handle meddlewere
app.use(erorrMeddlewere);


mongoose
    .connect(
        MONGODB_URI, {
        useNewUrlParser: true, useUnifiedTopology: true, useFindAndModify: false
    })
    .then(result => {
        const server = app.listen(port);
        console.log('listinig in port 3000...');
        //data manipulation 
        // require('./helpers/data migration/objectId').fixDb();

    }).catch(err => {
        console.log(err);
    });