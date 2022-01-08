const express      = require('express');
const {body}       = require('express-validator');
const path = require('path')
const homeController = require('../controllers/home');

const isAuth = require('../meddlewere/isAuth');

const router  = express.Router();

router.get('/',isAuth ,homeController.getHome);

router.get('/test-lable',isAuth ,homeController.getTestLable);


module.exports = router;