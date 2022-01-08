const { validationResult } = require("express-validator");

const Recipient = require('../models/Recipient')
const Uploads = require('../models/update')
const Role = require('../models/role')

exports.postAddUpdate = async (req, res, next) => {
  try {
    const name = req.body.name;
    const id = req.body.id;
    const contact = req.body.contact;
    const phone = req.body.phone;
    const email = req.body.email;
    const street1 = req.body.street1;
    const street2 = req.body.street2;
    const city = req.body.city;
    const state = req.body.state;
    const postal = req.body.postal;
    const country = req.body.country;
    let recipient_final;


    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const error = new Error("validation faild");
      error.statusCode = 422;
      error.data = errors.array();
      throw error;
    }

    if (!id) {
      const newRecipient = new Recipient({
        user: req.userId,
        name: name,
        contact: contact,
        phone: phone,
        email: email,
        street1: street1,
        street2: street2,
        city: city,
        state: state,
        postal: postal,
        country: country
      });

      recipient_final = await newRecipient.save();
    } else {
      const recipient = await Recipient.findById(id).populate({
        path: 'user',
        select: 'role',
        populate: {
          path: 'role',
          model: 'role'

        }
      });

      if (!recipient) {
        const error = new Error("recipient not found");
        error.statusCode = 404;
        throw error;
      }

      if (recipient.user.role.name != 'superadmin' && recipient.user._id != req.userId) {
        const error = new Error("not superaddmin or recipient creator");
        error.statusCode = 403;
        throw error;
      }

      recipient.name = name
      recipient.contact = contact
      recipient.phone = phone
      recipient.email = email
      recipient.street1 = street1
      recipient.street2 = street2
      recipient.city = city
      recipient.state = state
      recipient.postal = postal
      recipient.country = country

      recipient_final = await recipient.save();

    }



    res.status(201).json({
      state: 1,
      message: 'created',
      data: recipient_final
    });

  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.getAddUpdate = async (req, res, next) => {
  try {

    const page = req.query.page || 1;
    const productPerPage = 10;
    const recipient = await Recipient.find({ user: req.userId })
      .skip((page - 1) * productPerPage)
      .limit(productPerPage);

    const total = await Recipient.find({ user: req.userId }).countDocuments();



    res.status(200).json({
      state: 1,
      message: `recipients in page ${page}`,
      data: recipient,
      total: total
    });

  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};


exports.getHistory = async (req, res, next) => {
  try {

    const page = req.query.page || 1;
    const productPerPage = 10;

    let dataRangeStart = req.query.dataRangeStart || false;
    let dataRangeEnd = req.query.dataRangeEnd || false;


    let find = {};

    if (dataRangeStart && dataRangeEnd) {
      dataRangeStart = new Date(dataRangeStart);
      dataRangeEnd = new Date(dataRangeEnd);
      find = {
        $and: [
          { createdAt: { $gt:dataRangeStart } },
          { createdAt: { $lt:dataRangeEnd } },
        ],
        user: req.userId,
        kind: 'recipient'
      }
    } else if (dataRangeStart && !dataRangeEnd) {
      dataRangeStart = new Date(dataRangeStart);

      find = {
        createdAt: { $gt: dataRangeStart }
        ,
        user: req.userId,
        kind: 'recipient'
      }

    } else if (!dataRangeStart && dataRangeEnd) {
      dataRangeEnd = new Date(dataRangeEnd);

      find = {
        createdAt: { $lt: dataRangeEnd }
        ,
        user: req.userId,
        kind: 'recipient'
      }

    } else if (!dataRangeStart && !dataRangeEnd) {
      find = {
        user: req.userId,
        kind: 'recipient'
      };
    }

    const upload = await Uploads.find(find)
      .skip((page - 1) * productPerPage)
      .limit(productPerPage)
      .sort({ createdAt: -1 })
      .populate({
        path: 'user',
        select: 'email username'
      });

    const total = await Uploads.find(find).countDocuments();


    res.status(200).json({
      state: 1,
      data: upload,
      total: total,
      message: `files in page ${page}`
    });

  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.getSingle = async (req, res, next) => {
  try {

    const id = req.params.id;

    let recipient = {}

    if (req.userRole == 'superadmin' || req.userRole == 'warehouse') {
      recipient = await Recipient.findById(id)
    } else {
      recipient = await Recipient.findOne({ user: req.userId, _id: id })
    }

    if (!recipient) {
      const error = new Error("recipient not found");
      error.statusCode = 404;
      throw error;
    }




    res.status(200).json({
      state: 1,
      message: `recipient with id page ${id}`,
      data: recipient
    });

  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.search = async (req, res, next) => {
  try {
    const searchQ = req.query.search || '';
    const page = req.query.page || 1;
    const productPerPage = 10 ;

    let recipient = [];
      let total = 0;

    if (req.userRole == 'superadmin' || req.userRole == 'warehouse') {
      recipient = await Recipient.find({
        $or: [
          { name: new RegExp(searchQ.trim(), 'i') },
          { contact: new RegExp(searchQ.trim(), 'i') },
        ]
      })
      .skip((page - 1) * productPerPage)
      .limit(productPerPage)
      total = await Recipient.find({
        $or: [
          { name: new RegExp(searchQ.trim(), 'i') },
          { contact: new RegExp(searchQ.trim(), 'i') },
        ]
      })
      .countDocuments();

    } else {
      console.log('UserID:', req.userId);
      recipient = await Recipient.find({
        $or: [
          { name: new RegExp(searchQ.trim(), 'i') },
          { contact: new RegExp(searchQ.trim(), 'i') },
        ],
        user:req.userId
      })
      .skip((page - 1) * productPerPage)
      .limit(productPerPage)
      total = await Recipient.find({
        $or: [
          { name: new RegExp(searchQ.trim(), 'i') },
          { contact: new RegExp(searchQ.trim(), 'i') },
        ],
        user:req.userId
      })
      .countDocuments();
    }


    res.status(200).json({
      state: 1,
      message: `recipient with search ${searchQ}`,
      data: recipient,
      total:total
    });

  } catch (err) {
    console.log('error occured');
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    console.log(err);
    next(err);
  }
};


exports.postUpload = async (req, res, next) => {
  try {

      const file = req.files ;

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
          const error = new Error("validation faild");
          error.statusCode = 422;
          error.data = errors.array();
          throw error;
      }

      if(file.length == 0){
          const error = new Error("please insert .csv file");
          error.statusCode = 422;
          throw error;
      }

      const newUpload = new Uploads({
          user:req.userId,
          filename:file[0].path,
          kind:'recipient'
      });

      const upload = await newUpload.save();

      res.status(201).json({
          state:1,
          message:'created',
          upload:upload
      });
      

  } catch (err) {
      if (!err.statusCode) {
          err.statusCode = 500;
      }
      next(err);
  }
}