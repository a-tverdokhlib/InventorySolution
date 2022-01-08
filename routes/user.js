const express      = require('express');
const {body}       = require('express-validator');

const authController = require('../controllers/user');

const isAuth = require('../meddlewere/isAuth');

const router  = express.Router();


router.post('/add-update', isAuth ,authController.postAddUpdate);    

router.get('/add-update', isAuth ,authController.getUsers);    

router.post('/add-update/discounts', isAuth,[
    body('carrier')
    .not().isEmpty()
    .trim(),
    body('service')
    .not().isEmpty()
    .trim(),
    body('discount')
    .not().isEmpty()
    .isNumeric(),
    body('id')
    .not().isEmpty()
    .trim(),
] ,authController.postDiscounts);    

router.get('/add-update/discounts/:id', isAuth,authController.getDescounts);   

router.get('/sudo', isAuth, authController.getSudo);

router.post('/sudo', isAuth,[
    body('id')
    .not().isEmpty()
    .trim(),
], authController.sudo);




module.exports = router;