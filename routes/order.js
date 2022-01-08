const express      = require('express');
const {body}       = require('express-validator');

const authController = require('../controllers/order');

const isAuth = require('../meddlewere/isAuth');

const router  = express.Router();

router.get('/', isAuth ,authController.getOrders);  

router.post('/add-update', isAuth ,authController.postAddUpdate);       //add & adit

router.post('/add-update/add-inventory', isAuth ,[
    body('quantity_cases')
    .not().isEmpty()
    .isNumeric( {min: 0}),
    body('quantity_units')
    .not().isEmpty()
    .isNumeric({min: 0}),
    body('inventoryId')
    .not().isEmpty(),
    body('orderId')
    .not().isEmpty(),
],authController.postAddInventory);       //add   
  
  
//   router.get('/add-update', isAuth ,authController.getAddUpdate);    


router.get('/history', isAuth ,authController.getHistory);  



router.post('/add-update/remove-inventory',[
    body('lineItemId')
    .not().isEmpty(),
], isAuth ,authController.postRemoveInv);    

router.post('/add-update/select-ship-method',[
    body('orderId')
    .not().isEmpty(),
], isAuth ,authController.postSelectShipMethod);  

router.post('/add-update/pick-rate',[
    body('orderId')
    .not().isEmpty(),
    body('requested_service')
    .not().isEmpty(),
    body('requested_carrier')
    .not().isEmpty(),
    body('signature_option')
    .not().isEmpty(),
], isAuth ,authController.postPickRate); 

router.post('/add-update/ship',[
    body('orderId')
    .not().isEmpty(),
], isAuth ,authController.postShip); 

router.post('/add-update/do-ship',[
    body('orderId')
    .not().isEmpty(),
    body('actual_service')
    .not().isEmpty(),
    body('actual_carrier')
    .not().isEmpty(),
    body('box')
    .not().isEmpty()
], isAuth ,authController.postDoShip); 

router.get('/add-update/:orderId', isAuth ,authController.getAddUpdate);  

//cancel and restore 

router.post('/add-update/cancel-restore',[
    body('action')
    .not().isEmpty(),
    body('orderId')
    .not().isEmpty(),
], isAuth ,authController.postCancelRestore); 

router.post('/import', isAuth ,authController.postUpload);  

router.get('/packing-slip/:id', isAuth ,authController.getPackingSlip);  




module.exports = router;