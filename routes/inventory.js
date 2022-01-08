const express      = require('express');
const {body}       = require('express-validator');
const path = require('path')
const authController = require('../controllers/inventory');

const isAuth = require('../meddlewere/isAuth');

const router  = express.Router();


router.post('/add-update', isAuth ,[
    body('name')
    .not().isEmpty()
    .trim(),
    body('number')
    .not().isEmpty(),
    body('case_quantity')
    .not().isEmpty()
    .isNumeric(),
    body('description')
    .not().isEmpty(),
    body('qoh_case')
    .not().isEmpty()
    .isNumeric(),
    body('qoh_units')
    .not().isEmpty()
    .isNumeric(),
    body('case_weight')
    .not().isEmpty()
    .isNumeric(),
    body('reorder_quantity')
    .not().isEmpty()
    .isNumeric(),
    body('length')
    .not().isEmpty()
    .isNumeric(),
    body('width')
    .not().isEmpty()
    .isNumeric(),
    body('height')
    .not().isEmpty()
    .isNumeric(),
    body('ship_ready')
    .not().isEmpty()
    .isBoolean()
  ],authController.postAddUpdate);           
  
  router.post('/add-update/edit', isAuth ,[
    body('name')
    .not().isEmpty()
    .trim(),
    body('id')
    .not().isEmpty()
    .trim(),
    body('number')
    .not().isEmpty(),
    body('case_quantity')
    .not().isEmpty()
    .isNumeric(),
    body('description')
    .not().isEmpty(),
    body('qoh_case')
    .not().isEmpty()
    .isNumeric(),
    body('qoh_units')
    .not().isEmpty()
    .isNumeric(),
    body('case_weight')
    .not().isEmpty()
    .isNumeric(),
    body('reorder_quantity')
    .not().isEmpty()
    .isNumeric(),
    body('length')
    .not().isEmpty()
    .isNumeric(),
    body('width')
    .not().isEmpty()
    .isNumeric(),
    body('height')
    .not().isEmpty()
    .isNumeric(),
    body('ship_ready')
    .not().isEmpty()
    .isBoolean()
  ],authController.editInventory);           
  
  
  router.get('/add-update', isAuth ,authController.getAddUpdate);    

router.get('/history', isAuth ,authController.getHistory);    

router.get('/:id', isAuth ,authController.getSingle);   

router.post('/import', isAuth /*,[
    body('uploads')
    .not().isEmpty()
    .custom((fileName, req)=>{
      const file = path.extname(fileName);

      switch(file){
          case '.csv':
              return '.csv';
          default:
              return false;
      }

  })
  ]*/,authController.postUpload);  

  router.post('/split', isAuth ,[
    body('id')
    .not().isEmpty(),
  ],authController.postSplit);    

module.exports = router;