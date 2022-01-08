const express      = require('express');
const {body}       = require('express-validator');

const authController = require('../controllers/recipient');

const isAuth = require('../meddlewere/isAuth');

const router  = express.Router();


router.post('/add-update', isAuth ,[
    body('name')
    .not().isEmpty()
    .trim(),
    body('contact')
    .not().isEmpty(),
    body('phone')
    .not().isEmpty()
    .trim(),
    body('email')
    .not().isEmpty(),
    body('street1')
    .not().isEmpty()
    .trim(),
    body('city')
    .not().isEmpty()
    .trim(),
    body('state')
    .not().isEmpty(),
    body('postal')
    .not().isEmpty()
    .trim(),
    body('country')
    .not().isEmpty(),
  ],authController.postAddUpdate);           
  
  
  router.get('/add-update', isAuth ,authController.getAddUpdate);

  router.get('/history', isAuth ,authController.getHistory);

  router.get('/:id', isAuth ,authController.getSingle);

  router.get('/api/search', isAuth ,authController.search);

  

  router.post('/import', isAuth ,authController.postUpload);  

module.exports = router;