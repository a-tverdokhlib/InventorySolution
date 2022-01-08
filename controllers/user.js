const { validationResult } = require("express-validator");
const bcrypt = require('bcryptjs')
const jwt = require("jsonwebtoken");

const User = require('../models/user');
const Role = require("../models/role");
const Descount = require("../models/Discount");

const carrier_services = require('../helpers/carrer_services');

exports.postAddUpdate = async (req, res, next) => {
    try {

        const username = req.body.username;
        const email = req.body.email;
        const phone = req.body.phone;
        const id = req.body.id;
        const companyName = req.body.companyName;
        const fname = req.body.fname;
        const lname = req.body.lname;
        const password = req.body.password;
        const confirmed_at = req.body.confirmed_at;
        const is_enabled = Boolean(req.body.is_enabled);
        const send_tracking_emails_by_default = Boolean(req.body.send_tracking_emails_by_default);

        let user_final;
        let message = '';

        if (req.userRole != 'superadmin') {
            const error = new Error("You are not a superadmin. You cannot create/edit users");
            error.statusCode = 403;
            throw error;
        }

        if (id) {
            const user = await User.findById(id);
            if (!user) {
                const error = new Error("user not found");
                error.statusCode = 404;
                throw error;
            }

            if (username) {
                const isHere = await User.findOne({ username: username, _id: { $ne: user._id } })
                if (isHere) {
                    const error = new Error("You cannot add a new user with the same username as an existing user");
                    error.statusCode = 409;
                    throw error;
                }

                user.username = username;

            } if (email) {
                const isHere = await User.findOne({ email: email, _id: { $ne: user._id } })
                if (isHere) {
                    const error = new Error("You cannot add a new user with the same email as an existing user");
                    error.statusCode = 409;
                    throw error;
                }

                user.email = email;
            } if (phone) {
                const isHere = await User.findOne({ phone: phone, _id: { $ne: user._id } })
                if (isHere) {
                    const error = new Error("You cannot add a new user with the same phone as an existing user");
                    error.statusCode = 409;
                    throw error;
                }

                user.phone = phone;
            } if (companyName) {

                user.company = companyName;
            } if (fname) {


                user.first_name = fname;
            } if (lname) {

                user.last_name = lname;

            } if (password) {
                const hashedPass = await bcrypt.hash(password, 12);

                user.password = hashedPass;
            } if (confirmed_at) {

                user.confirmed_at = new Date(confirmed_at);

            }
            user.is_enabled = is_enabled;
            user.send_tracking_emails_by_default = send_tracking_emails_by_default;
            //password update missing 

            user_final = await user.save();
            message = 'user edited'

        } else {

            if (!username) {
                const error = new Error("validation faild for username");
                error.statusCode = 422;
                throw error;
            }
            if (!phone) {
                const error = new Error("validation faild for phone");
                error.statusCode = 422;
                throw error;
            }
            if (!email) {
                const error = new Error("validation faild for email");
                error.statusCode = 422;
                throw error;
            }
            if (!password) {
                const error = new Error("validation faild for password");
                error.statusCode = 422;
                throw error;
            }
            if (!confirmed_at) {
                const error = new Error("validation faild for confirmed_at");
                error.statusCode = 422;
                throw error;
            }
            const isHereUsername = await User.findOne({ username: username })

            if (isHereUsername) {
                const error = new Error("user name allready registered for another user");
                error.statusCode = 409;
                throw error;
            }

            const isHereEmail = await User.findOne({ email: email })
            if (isHereEmail) {
                const error = new Error("email allready registered for another user");
                error.statusCode = 409;
                throw error;
            }

            const isHerePhone = await User.findOne({ phone: phone })
            if (isHerePhone) {
                const error = new Error("phone allready registered for another user");
                error.statusCode = 409;
                throw error;
            }

            const hashedPass = await bcrypt.hash(password, 12);
            const role = await Role.findOne({ name: 'none' })
            const newUser = new User({
                email: email,
                password: hashedPass,
                username: username,
                confirmed_at: new Date(confirmed_at),
                is_enabled: is_enabled,
                send_tracking_emails_by_default: send_tracking_emails_by_default,
                first_name: fname,
                last_name: lname,
                company: companyName,
                phone: phone,
                role: role
            });

            user_final = await newUser.save();

            message = 'user created';

        }

        res.status(200).json({
            state: 1,
            message: message,
            data: user_final
        });

    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};


exports.postDiscounts = async (req, res, next) => {

    try {
        const carrier = req.body.carrier;
        const service = req.body.service;
        const discount = Number(req.body.discount);
        const id = req.body.id;
        let final_dis;

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            const error = new Error("validation faild");
            error.statusCode = 422;
            error.data = errors.array();
            throw error;
        }

        if (req.userRole != 'superadmin') {
            const error = new Error("You are not a superadmin. You cannot create/edit users");
            error.statusCode = 403;
            throw error;
        }

        const user = await User.findById(id);
        if (!user) {
            const err = new Error('user not found');
            err.statusCode = 404;
            throw err;
        }

        const isDiscount = await Descount.findOne({ user: user._id, carrier: carrier, service: service });

        if (isDiscount) {
            isDiscount.discount = discount;
            final_dis = await isDiscount.save();
        } else {
            const newDiscount = new Descount({
                user: user._id,
                carrier: carrier,
                service: service,
                discount: discount
            });
            final_dis = await newDiscount.save();

        }

        res.status(201).json({
            state: 1,
            message: 'descount added',
            descount: final_dis
        });


    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};

exports.getDescounts = async (req, res, next) => {

    try {

        const id = req.params.id;

        const descouns = await Descount.find({ user: id });
        let final_res = [];
        carrier_services.forEach(i => {
            const carrerElement = descouns.find(ele => ele.carrier == i.carrier && ele.service == i.service)

            if (carrerElement) {
                final_res.push({
                    carrier: i.carrier,
                    service: i.service,
                    discount: carrerElement.discount
                });
            } else {
                final_res.push({
                    carrier: i.carrier,
                    service: i.service,
                    discount: 0
                });
            }
        });

        res.status(200).json({
            state: 1,
            message: `descounts for user ${id}`,
            descounts: final_res
        });



    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};


exports.getUsers = async (req, res, next) => {

    try {

        const page = req.query.page || 1;
        const active = req.query.active || 'all';
        const productPerPage = 10;
        let user;
        let total = 0;
        if (req.userRole != 'superadmin') {
            const error = new Error("You are not a superadmin. You cannot create/edit users");
            error.statusCode = 403;
            throw error;
        }

        if (active == 'active') {
            console.log(Boolean(active));
            user = await User.find({ is_enabled: true })
                .skip((page - 1) * productPerPage)
                .limit(productPerPage)
                .select('username company first_name last_name is_enabled role phone email confirmed_at send_tracking_emails_by_default')
                .populate({
                    path: 'role',
                    select: 'name'
                });
            total = await User.find({ is_enabled: true }).countDocuments()

        } if (active == 'Inactive') {
            console.log(Boolean(active));
            user = await User.find({ is_enabled: false })
                .skip((page - 1) * productPerPage)
                .limit(productPerPage)
                .select('username company first_name last_name is_enabled role phone email confirmed_at send_tracking_emails_by_default')
                .populate({
                    path: 'role',
                    select: 'name'
                });
            total = await User.find({ is_enabled: false }).countDocuments()

        } else if (active == 'all') {
            user = await User.find()
                .skip((page - 1) * productPerPage)
                .limit(productPerPage)
                .select('username company first_name last_name is_enabled role phone email confirmed_at send_tracking_emails_by_default')
                .populate({
                    path: 'role',
                    select: 'name'
                });
            total = await User.find().countDocuments()
        }


        res.status(200).json({
            state: 1,
            message: `users in page ${page}`,
            users: user,
            total: total
        });



    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};

exports.getSudo = async (req, res, next) => {

    try {

        const users = await User.find({})
            .select('username first_name last_name')

        res.status(201).json({
            state: 1,
            message: 'users for sudo',
            descount: users
        });


    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};



exports.sudo = async (req, res, next) => {

    try {

        const id = req.body.id;
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            const error = new Error("validation faild");
            error.statusCode = 422;
            error.data = errors.array();
            throw error;
        }

        if(req.userRole !== 'superadmin' && req.userRole !== 'warehouse' ){
            const error = new Error("You are not a superadmin. You cannot create/edit users");
            error.statusCode = 403;
            throw error;
        }

        const user = await User.findById(id);

        if (!user) {
            const error = new Error("user not found");
            error.statusCode = 404;
            throw error;
        }

        const token = jwt.sign(
            {
              email: user.username,
              userId: user._id.toString(),
            },
            process.env.JWT_PRIVATE_KEY_SUDO,
            {expiresIn:'3h'}
          );



          res.status(200).json({
            state: 1,
            data:{
                token: token,
                token_expiresIn: 10000000,
                email:user.email,
                role:user.role.name,
                userName:user.username
            },
            message:'user logedin'
          });


    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};

