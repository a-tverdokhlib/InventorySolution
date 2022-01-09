const { validationResult } = require("express-validator");
//easypost
const Easypost = require('@easypost/api');
const api = new Easypost(process.env.EASYPOST_API_KEY);

const Order = require('../models/order');
const Resipent = require('../models/Recipient');
const Inventory = require('../models/Inventory');
const OrderLineItem = require('../models/OrderLineItem');
const Uploads = require('../models/update');
const Descounts = require('../models/Discount');

const utils = require('../helpers/utils');
const email = require('../helpers/email');

exports.postAddUpdate = async (req, res, next) => {                               //created order/edit
    try {
        const recipientId = req.body.recipientId;
        const orderId = req.body.orderId;

        //otional 
        const customer_reference = req.body.customer_reference;     //string
        const blind_company = req.body.blind_company;               //string
        const blind_phone = req.body.blind_phone;                   //string
        const notify_recipient = req.body.notify_recipient;         //boolean
        const additionally_notify = req.body.additionally_notify;   //string
        const insurance_value = req.body.insurance_value;           //number
        const signature_option = req.body.signature_option;         //string

        let order;
        let message;
        let status = 200;

        if (!orderId) {                                                                  //create

            if (!recipientId) {
                const error = new Error("validation faild for recipientId");
                error.statusCode = 422;
                throw error;
            }

            const resipent = await Resipent.findById(recipientId)

            if (!resipent) {
                const error = new Error("recipient not found");
                error.statusCode = 404;
                throw error;
            }
            order = new Order({
                user: req.userId,
                recipient: resipent._id
            });

            message = 'order created'
            status = 201;

        } else {                                                                         //edit

            if (req.userRole == 'superadmin' || req.userRole == 'warehouse') {
                order = await Order.findOne({ _id: orderId })

            } else {
                order = await Order.findOne({ _id: orderId, user: req.userId })
            }

            if (!order) {
                const error = new Error("order not found");
                error.statusCode = 404;
                throw error;
            }

            if (customer_reference) order.customer_reference = customer_reference;
            if (blind_company) order.blind_company = blind_company;
            if (blind_phone) order.blind_phone = blind_phone;
            if (notify_recipient) order.notify_recipient = notify_recipient;
            if (additionally_notify) order.additionally_notify = additionally_notify;
            if (insurance_value) order.insurance_value = insurance_value;
            if (signature_option) order.signature_option = signature_option;

        }

        await order.save();


        res.status(status).json({
            state: 1,
            message: message,
            data: order
        });

    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};

exports.postAddInventory = async (req, res, next) => {                               //   add
    try {

        const quantity_cases = req.body.quantity_cases;
        const quantity_units = req.body.quantity_units;
        const inventoryId = req.body.inventoryId;
        const orderId = req.body.orderId;

        let final_line;

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            const error = new Error("validation faild");
            error.statusCode = 422;
            error.data = errors.array();
            throw error;
        }
        const order = await Order.findById(orderId);
        if (!order) {
            const error = new Error("order not found");
            error.statusCode = 404;
            throw error;
        }

        const inventory = await Inventory.findById(inventoryId);
        if (!inventory) {
            const error = new Error("inventory not found");
            error.statusCode = 404;
            throw error;
        }
        const isLineItem = await OrderLineItem.findOne({ item: inventoryId, order: orderId })

        if (isLineItem) {

            if ((isLineItem.quantity_cases + inventory.qoh_case) - quantity_cases < 0) {
                const error = new Error("out of stock, quantity_cases");
                error.statusCode = 409;
                error.data = errors.array();
                throw error;
            }

            if ((isLineItem.quantity_units + inventory.qoh_units) - quantity_units < 0) {
                const error = new Error("out of stock, quantity_units");
                error.statusCode = 409;
                error.data = errors.array();
                throw error;
            }

            //change inventory
            inventory.qoh_case = (isLineItem.quantity_cases + inventory.qoh_case) - quantity_cases;
            inventory.qoh_units = (isLineItem.quantity_units + inventory.qoh_units) - quantity_units;

            await inventory.save();

            //change line item
            isLineItem.quantity_cases = quantity_cases;
            isLineItem.quantity_units = quantity_units;
            final_line = await isLineItem.save();


            // is ineItem.quantity_cases = quantity_cases ;
            // isLineItem.quantity_units = quantity_units ;

        } else {
            if (inventory.qoh_case - quantity_cases < 0) {
                const error = new Error("out of stock, quantity_cases");
                error.statusCode = 409;
                error.data = errors.array();
                throw error;
            }

            if (inventory.qoh_units - quantity_units < 0) {
                const error = new Error("out of stock, quantity_units");
                error.statusCode = 409;
                error.data = errors.array();
                throw error;
            }
            inventory.qoh_case = inventory.qoh_case - quantity_cases;
            inventory.qoh_units = inventory.qoh_units - quantity_units;

            await inventory.save();

            const newOrderLine = new OrderLineItem({
                quantity_cases: quantity_cases,
                quantity_units: quantity_units,
                item: inventory._id,
                order: order._id
            });

            final_line = await newOrderLine.save();

        }

        res.status(200).json({
            state: 1,
            message: 'created',
            lineOrder: final_line
        });


    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};

exports.postRemoveInv = async (req, res, next) => {                               //   remove
    try {

        const lineItemId = req.body.lineItemId;
        let inventory;

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            const error = new Error("validation faild");
            error.statusCode = 422;
            error.data = errors.array();
            throw error;
        }

        const lineItem = await OrderLineItem.findById(lineItemId);

        if (!lineItem) {
            const error = new Error("lineItem not found");
            error.statusCode = 404;
            throw error;
        }
        if (req.userRole == 'superadmin' || req.userRole == 'warehouse') {

            inventory = await Inventory.findById(lineItem.item)

        } else {

            inventory = await Inventory.findOne({ _id: lineItem.item, user: req.userId });

        }

        if (!inventory) {
            const error = new Error("inventory not found");
            error.statusCode = 404;
            throw error;
        }

        inventory.qoh_case = inventory.qoh_case + lineItem.quantity_cases;
        inventory.qoh_units = inventory.qoh_units + lineItem.quantity_units;

        await inventory.save();

        await OrderLineItem.deleteOne({ _id: lineItem._id });

        res.status(200).json({
            state: 1,
            message: "deleted"
        });


    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};

exports.postSelectShipMethod = async (req, res, next) => {
    try {

        const orderId = req.body.orderId;

        let order;

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            const error = new Error("validation faild");
            error.statusCode = 422;
            error.data = errors.array();
            throw error;
        }

        if (req.userRole == 'superadmin' || req.userRole == 'warehouse') {
            order = await Order.findById(orderId)
                .populate({
                    path: 'user',
                    select: 'username company phone email'
                })
                .populate({
                    path: 'recipient',
                });
        } else {
            order = await Order.findOne({ _id: orderId, user: req.userId }).populate({
                path: 'user',
                select: 'username company phone email'
            }).populate({
                path: 'recipient',
            });
        }

        if (!order) {
            const error = new Error("order not found");
            error.statusCode = 404;
            throw error;
        }

        order = await utils.updateOrder(req, order);

        const lineItem = await OrderLineItem.find({ order: order._id })
            .populate({
                path: 'item'
            });

        if (lineItem.length == 0) {
            const error = new Error("order line item is empty");
            error.statusCode = 409;
            throw error;
        }

        const split_packages = await utils.split_packages(lineItem);
        let insurance_cost = 0;
        let total_weight = 0;
        let shipments = [];
        let total_packages = split_packages.length;
        let options = {
            print_custom_1: order.user.username,
            delivered_duty_paid: false,
            label_size: '4x6',
            print_custom_2: order.customer_reference,
            print_custom_1_code: 'PO'
        }

        split_packages.forEach(i => {
            total_weight = total_weight + i[1];
            shipments.push({ parcel: { weight: i[1] * 16 }, options: options })  //16 oz per pound
        });

        const descounts = await Descounts.find({ user: req.userId });

        const descounTable = await utils.build_discount_table(descounts)

        const warehouse = new api.Address({
            street1: '247 Cayuga Rd',
            city: 'Buffalo',
            state: 'NY',
            zip: '14225',
            country: 'US',
            company: 'PriorityBiz',
            phone: '18663426733',
            email:'test@gmail.com'
        });
        await warehouse.save()
        const to_address = new api.Address({
            company: order.recipient.name,
            street1: order.recipient.street1,
            street2: order.recipient.street2,
            city: order.recipient.city,
            state: order.recipient.state,
            zip: order.recipient.postal,
            phone: order.recipient.phone,
            country: order.recipient.country,
            email: order.recipient.email
        });
        await to_address.save()

        const ship = new api.Order({
            to_address: to_address,
            from_address: warehouse,
            shipments: shipments,
            options: options,
            reference: order.customer_reference
        });

        await ship.save();

        order.easypost_order_id = ship.id;

        await order.save();

        res.status(200).json({
            state: 1,
            carrier_error_messages: ship.message,
            shipRayes: ship.rates,
            order: order,
            total_weight: total_weight,
            total_packages: total_packages,
            insurance_cost: insurance_cost,
            lineItem: lineItem,
            descounTable:descounTable
        });


    } catch (err) {
        console.log(err);
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};

exports.postPickRate = async (req, res, next) => {
    try {

        const orderId = req.body.orderId;
        const requested_service = req.body.requested_service;
        const requested_carrier = req.body.requested_carrier;
        const signature_option = req.body.signature_option;     // 'DIRECT_SIGNATURE' || 'ADULT_SIGNATURE' || 'NONE'
        //optional
        const customer_reference = req.body.customer_reference;
        const additionally_notify = req.body.additionally_notify;
        const blind_company = req.body.blind_company;
        const blind_phone = req.body.blind_phone;
        const notify_recipient = Boolean(req.body.notify_recipient);
        const insurance_value = req.body.insurance_value;

        let order;

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            const error = new Error("validation faild");
            error.statusCode = 422;
            error.data = errors.array();
            throw error;
        }

        if (req.userRole == 'superadmin' || req.userRole == 'warehouse') {
            order = await Order.findById(orderId)
                .populate({
                    path: 'user',
                    select: 'username'
                })
                .populate({
                    path: 'recipient',
                });
        } else {
            order = await Order.findOne({ _id: orderId, user: req.userId }).populate({
                path: 'user',
                select: 'username'
            }).populate({
                path: 'recipient',
            });
        }

        if (!order) {
            const error = new Error("order not found");
            error.statusCode = 404;
            throw error;
        }
        const lineItem = await OrderLineItem.find({ order: order._id })
            .populate({
                path: 'item'
            });

        if (lineItem.length == 0) {
            const error = new Error("order line item is empty");
            error.statusCode = 409;
            throw error;
        }
        const options = {
            print_custom_1: order.user.username,
            delivered_duty_paid: false,
            label_size: '4x6',
            print_custom_2: order.customer_reference,
            print_custom_1_code: 'PO'
        }
        const split_packages = await utils.split_packages(lineItem);

        let total_weight = 0;
        let insurance_cost = 0;
        let total_packages = split_packages.length;
        split_packages.forEach(i => {
            total_weight = total_weight + i[1];
        });

        if (requested_carrier && requested_service) {
            order.requested_carrier = requested_carrier;
            order.requested_service = requested_service;
        }
        order.signature_option = signature_option;
        if (customer_reference) order.customer_reference = customer_reference;
        if (blind_company) order.blind_company = blind_company;
        if (blind_phone) order.blind_phone = blind_phone;
        if (notify_recipient) order.notify_recipient = notify_recipient;
        if (additionally_notify) order.additionally_notify = additionally_notify;
        if (insurance_value) order.insurance_value = insurance_value;
        if (signature_option) order.signature_option = signature_option;
        order.status = 1;
        await order.save();

        if (order.insurance_value) {
            insurance_cost = order.insurance_value * 0.01;
            if (insurance_cost < 1) {
                insurance_cost = 1;
            }
        }

        res.status(200).json({
            state: 1,
            order: order,
            insurance_cost: insurance_cost,
            total_weight: total_weight,
            total_packages: total_packages
        });

    } catch (err) {
        console.log(err);
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};

exports.postShip = async (req, res, next) => {
    try {

        const orderId = req.body.orderId;
        // const requested_service = req.body.requested_service;
        // const requested_carrier = req.body.requested_carrier;
        // const signature_option = req.body.signature_option;     // 'DIRECT_SIGNATURE' || 'ADULT_SIGNATURE' || 'NONE'
        // //optional
        // const customer_reference = req.body.customer_reference;
        // const additionally_notify = req.body.additionally_notify;
        // const blind_company = req.body.blind_company;
        // const blind_phone = req.body.blind_phone;
        // const notify_recipient = Boolean(req.body.notify_recipient);
        // const insurance_value = req.body.insurance_value;

        let order;
        let batch;
        let message;
        let insurance_coast = 0;
        let shipments = [];


        console.time("validation");

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            const error = new Error("validation faild");
            error.statusCode = 422;
            error.data = errors.array();
            throw error;
        }

        console.timeEnd("validation");


        console.time("OrderUpdate");
        
        if (req.userRole == 'superadmin' || req.userRole == 'warehouse') {
            order = await Order.findById(orderId)
                .populate({
                    path: 'user',
                    select: 'username company phone'
                })
                .populate({
                    path: 'recipient',
                });
        } else {
            order = await Order.findOne({ _id: orderId, user: req.userId }).populate({
                path: 'user',
                select: 'username company phone'
            }).populate({
                path: 'recipient',
            });
        }

        if (!order) {
            const error = new Error("order not found");
            error.statusCode = 404;
            throw error;
        }

        order = await utils.updateOrder(req, order);

        const lineItem = await OrderLineItem.find({ order: order._id })
            .populate({
                path: 'item'
            });

        if (lineItem.length == 0) {
            const error = new Error("order line item is empty");
            error.statusCode = 409;
            throw error;
        }

        const split_packages = await utils.split_packages(lineItem);
        if (split_packages.length == 0) {
            const error = new Error("Order is empty (there may be line items but they have no quantity) ");
            error.statusCode = 409;
            throw error;
        }
        if (order.easypost_order_id) {
            const ship = await api.Order.retrieve(order.easypost_order_id);
            if (ship.shipments[0].selected_rate) {
                message = "Shipping already purchased. Displaying original labels.";
                if (ship.shipments[0].batch_id) {
                    batch = await api.Batch.retrieve(ship.shipments[0].batch_id);

                    return res.status(200).json({
                        state: 1,
                        message: message,
                        batch: batch
                    });
                }
            }
        }

        let options = {
            print_custom_1: order.user.username,
            delivered_duty_paid: false,
            label_size: '4x6',
            print_custom_2: order.customer_reference,
            print_custom_1_code: 'PO'
        }

        if (order.requested_service && order.requested_carrier) {
            if (order.requested_carrier.toUpperCase() == 'FEDEX') {
                if (order.requested_service == 'FEDEX_EXPRESS_SAVER') {
                    options.bill_third_party_account = '308754227';
                    options.bill_third_party_country = 'US';
                } else if (order.requested_service == 'FEDEX_GROUND' || order.requested_service.toLowerCase() == 'ground') {
                    const payment = {
                        type: 'SENDER',
                        account: 291480179,
                        country: "US"
                    }
                    options.payment = payment;
                } else if (order.user.username == 'Buffalofoodproducts.com') {
                    options.bill_third_party_account = '210128980';
                    options.bill_third_party_country = 'US';
                } else if (order.requested_service == 'FedExMediumBox' || order.requested_service == 'FedExSmallBox' || order.requested_service == 'FedExPak' || order.requested_service == 'FedExEnvelope') {
                    const payment = {
                        type: 'SENDER',
                        account: 242823303,
                        country: "US"
                    }
                    options.payment = payment;
                } else {
                    options.bill_third_party_account = '210128980';
                    options.bill_third_party_country = 'US';
                }
            }
        }
        if (order.signature_option) {
            if (order.signature_option == 'DIRECT_SIGNATURE') {
                options.delivery_confirmation = 'SIGNATURE';
            } else if (order.signature_option == 'ADULT_SIGNATURE') {
                options.delivery_confirmation = 'ADULT_SIGNATURE';
            }
        }
        if (order.insurance_value) {
            insurance_coast = order.insurance_value * 0.01;
            if (insurance_coast < 1) {
                insurance_coast = 1;
            }
        }

        console.timeEnd("OrderUpdate");


        console.time('ShippingTotalTime');

        let total_weight = 0;
        let total_packages = split_packages.length;

        let shipments2 = shipments;

        console.time('SplitPackage');

        split_packages.forEach(ele => {
            total_weight = total_weight + ele[1];
            if (order.requested_service == 'FedExMediumBox' || order.requested_service == 'FedExSmallBox'
                || order.requested_service == 'FedExPak' || order.requested_service == 'FedExEnvelope') {
                shipments2.push({ parcel: { weight: ele[1] * 16, predefined_package: rq.requested_service, }, options: options })
            }
            shipments2.push({ parcel: { weight: ele[1] * 16 }, options: options })

        });
        console.timeEnd('SplitPackage');


        console.time('Warehousing');

        let company = 'PriorityBiz';
        let phone = '18663426733';

        if (order.blind_company) company = order.blind_company;
        else if (order.user.company) company = order.user.company;

        if (order.blind_phone) phone = order.blind_phone;
        else if (order.user.phone) phone = order.user.phone;

        const warehouse = new api.Address({
            street1: '247 Cayuga Rd',
            city: 'Buffalo',
            state: 'NY',
            zip: '14225-1911',
            country: 'US',
            company: company,
            phone: phone,
        });
        await warehouse.save()
        console.timeEnd('Warehousing');

        console.time('Toaddressing');

        const to_address = new api.Address({
            company: order.recipient.contact + " " + order.recipient.name,
            street1: order.recipient.street1,
            street2: order.recipient.street2,
            city: order.recipient.city,
            state: order.recipient.state,
            zip: order.recipient.postal,
            phone: order.recipient.phone,
            country: order.recipient.country
        });
        await to_address.save();
        console.timeEnd('Toaddressing');

        console.time('ShipSaving');
        let ship;
        let ship2;
        if (order.requested_service == 'FedExMediumBox' || order.requested_service == 'FedExSmallBox'
            || order.requested_service == 'FedExPak' || order.requested_service == 'FedExEnvelope') {
            ship2 = new api.Order({
                to_address: to_address,
                from_address: warehouse,
                shipments: shipments2,
                options: options,
                reference: order.customer_reference
            });
            await ship2.save();
        }
        ship = new api.Order({
            to_address: to_address,
            from_address: warehouse,
            shipments: shipments,
            options: options,
            reference: order.customer_reference
        });
        await ship.save();
        console.timeEnd('ShipSaving');

        

        let rates = ship.rates;
        rates.forEach(rate => {
            rate.custom_shipment_id = ship.id;
        });

        if (order.requested_service == 'FedExMediumBox' || order.requested_service == 'FedExSmallBox'
            || order.requested_service == 'FedExPak' || order.requested_service == 'FedExEnvelope') {
            if (ship2.rates) {

                ship2.rates.forEach(rate => {
                    if (rate.service == 'FEDEX_2_DAY') {
                        rate.custom_shipment_id = ship2.id;
                        rare.custom_predefined_package = true;
                        rates.push(rate);
                    }
                })
            }
        }
        const carrier_error_messages = ship.messages;
        await order.save();

        console.timeEnd('ShippingTotalTime');


        res.status(200).json({
            state: 1,
            total_weight: total_weight,
            total_packages: total_packages,
            message: 'shipped',
            rates: rates,
            shipment_id: ship.id,
            order: order,
            insurance_cost: insurance_coast,
            carrier_error_messages: carrier_error_messages,
            box: split_packages
        });

    } catch (err) {
        console.log(err);
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};

//post do-ship

exports.postDoShip = async (req, res, next) => {
    try {

        console.time('Validation');
        const orderId = req.body.orderId;
        const actual_service = req.body.actual_service;
        const actual_carrier = req.body.actual_carrier;
        const box = req.body.box;                     //wight and Customs_desc and Customs_value
        const rateId = req.body.rateId;
        const shipment_id = req.body.shipment_id;
        const tracking = req.body.tracking;

        let order;
        let ship = false;

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            const error = new Error("validation faild");
            error.statusCode = 422;
            error.data = errors.array();
            throw error;
        }
        console.timeEnd('Validation');

        console.time('OrderUpdate');
        if (req.userRole == 'superadmin' || req.userRole == 'warehouse') {
            order = await Order.findById(orderId)
                .populate({
                    path: 'user',
                    select: 'username company first_name email phone'
                })
                .populate({
                    path: 'recipient',
                });
        } else {
            order = await Order.findOne({ _id: orderId, user: req.userId }).populate({
                path: 'user',
                select: 'username company first_name email phone'
            }).populate({
                path: 'recipient',
            });
        }

        if (!order) {
            const error = new Error("order not found");
            error.statusCode = 404;
            throw error;
        }
        const lineItem = await OrderLineItem.find({ order: order._id })
            .populate({
                path: 'item'
            });

        if (lineItem.length == 0) {
            const error = new Error("order line item is empty");
            error.statusCode = 409;
            throw error;
        }
        order = await utils.updateOrder(req, order);
        
        console.timeEnd('OrderUpdate');


        console.time('Shipping');
        order.status = 2;
        order.actual_carrier = actual_carrier;
        order.actual_service = actual_service;
        order.shipped = Date.now();
        let manule = true;

        if (rateId) {
            manule = false;
            if (order.easypost_order_id) {
                const ship = await api.Order.retrieve(order.easypost_order_id);
                if (ship.shipments[0].selected_rate) {
                    let message = "Shipping already purchased. Displaying original labels.";
                    if (ship.shipments[0].batch_id) {
                        batch = await api.Batch.retrieve(ship.shipments[0].batch_id);

                        return res.status(200).json({
                            state: 1,
                            message: message,
                            batch: batch
                        });
                    }
                }
            }

            const old_ship = await api.Order.retrieve(shipment_id);
            let options = {
                print_custom_1: order.user.username,
                delivered_duty_paid: false,
                label_size: '4x6',
                print_custom_2: order.customer_reference,
                print_custom_1_code: 'PO'
            }

            if (order.actual_carrier && order.actual_service) {

                if (order.actual_carrier.toUpperCase() == 'FEDEX') {

                    if (order.actual_service == 'FEDEX_EXPRESS_SAVER') {
                        options.bill_third_party_account = '308754227';
                        options.bill_third_party_country = 'US';

                    } else if (order.actual_service == 'FEDEX_GROUND' || order.actual_service.toLowerCase() == 'ground') {
                        const payment = {
                            type: 'SENDER',
                            account: 291480179,
                            country: "US"
                        }
                        options.payment = payment;
                    } else if (order.user.username == 'Buffalofoodproducts.com') {
                        options.bill_third_party_account = '210128980';
                        options.bill_third_party_country = 'US';
                    } else if (order.requested_service == 'FedExMediumBox' || order.requested_service == 'FedExSmallBox' || order.requested_service == 'FedExPak' || order.requested_service == 'FedExEnvelope') {
                        const payment = {
                            type: 'SENDER',
                            account: 242823303,
                            country: "US"
                        }
                        options.payment = payment;
                    } else {
                        options.bill_third_party_account = '210128980';
                        options.bill_third_party_country = 'US';
                    }

                }
                if (order.signature_option) {
                    if (order.signature_option == 'DIRECT_SIGNATURE') {
                        options.delivery_confirmation = 'SIGNATURE';
                    } else if (order.signature_option == 'ADULT_SIGNATURE') {
                        options.delivery_confirmation = 'ADULT_SIGNATURE';
                    }
                }
                let international = false;
                let customs_forms = [];
                box.forEach(i => {

                    if (i.customs_desc && i.customs_value) {

                        international = true;
                        let customItems = [];

                        const citem = new api.CustomsItem({
                            description: i.customs_desc,
                            quantity: 1,
                            value: i.customs_value,
                            weight: i.weight,
                            origin_country: 'US',

                        });
                        citem.save().then(resb => {
                            customItems.push(resb);
                        });

                        const cFitem = new api.CustomsInfo({
                            eel_pfc: 'NOEEI 30.37(a)',
                            customs_certify: true,
                            customs_signer: 'Ray',
                            contents_type: 'merchandise',
                            customs_items: customItems
                        });
                        cFitem.save().then(resb => {
                            customs_forms.push(resb);

                        });

                    }
                });
                let new_shipments = [];

                old_ship.shipments.forEach((ele, index) => {
                    if (international) {
                        new_shipments.push({ parcel: ele.parcel, options: options, customs_info: customs_forms[index] })
                    } else {
                        new_shipments.push({ parcel: ele.parcel, options: options })
                    }
                });

                console.log('Shipping Address Started');
                console.log('From Address=>', old_ship.from_address);
                console.log('To Address=>', old_ship.to_address);
                console.log('Shipments=>', new_shipments);
                console.log('Reference=>', order.customer_reference);
                ship = new api.Order({
                    to_address: old_ship.to_address,
                    from_address: old_ship.from_address,
                    shipments: new_shipments,
                    reference: order.customer_reference
                });
                await ship.save();
                console.log('Shipping Address Done');


                order.easypost_order_id = ship.id;
                await ship.buy(actual_carrier, actual_service);
                order.shipping_cost = ship.shipments[0].selected_rate.rate;

                let finalShip = [];
                ship.shipments.forEach(i => {
                    // i.label('zpl');
                    // i.label('pdf');
                    finalShip.push(i.id);

                    if (ship.shipments.length > 1) {
                        const pathch = new api.Batch(finalShip);
                        //pathch.label('zpl');

                    }
                });
                order.tracking = ship.shipments[0].tracking_code;
            }





        } else {
            if (!tracking) {
                const error = new Error('tracking is required in manual rate');
                error.statusCode = 422;
                throw error;
            }
            order.tracking = tracking;
        }

        await order.save();
        console.timeEnd('OrderUpdate');

        console.log('Emailing');
        
        //send emails
        if (order.notify_recipient) {
            let fromName = '';
            if (order.blind_company) fromName = order.blind_company;
            else if (order.user.company) fromName = order.user.company;

            console.log('Notify_Recipient=>',order.recipient.email);
            console.log('From=>',fromName);
            const message = await email(order.recipient.email, fromName, order, ship, lineItem);
        }

        if (order.additionally_notify) {
            let fromName = '';
            if (order.blind_company) fromName = order.blind_company;
            else if (order.user.company) fromName = order.user.company;
            console.log('Additional Notify=>',order.additionally_notify);
            console.log('From=>',fromName);

            const message = await email(order.additionally_notify, fromName, order, ship, lineItem);
        }
        console.timeEnd('Emailing');

        res.status(201).json({
            state: 1,
            message: 'shipped'
        });

    } catch (err) {
        console.log(err);
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};


// exports.getAddUpdate = async (req, res, next) => {
//     try {

//         const page = req.query.page || 1;
//         const productPerPage = 10;
//         const inventory = await Inventory.find({ user: req.userId })
//             .skip((page - 1) * productPerPage)
//             .limit(productPerPage);

//         const total = await Inventory.find({ user: req.userId }).countDocuments();



//         res.status(200).json({
//             state: 1,
//             message: `Inventory in page ${page}`,
//             data: inventory,
//             total: total
//         });

//     } catch (err) {
//         if (!err.statusCode) {
//             err.statusCode = 500;
//         }
//         next(err);
//     }
// };

exports.getOrders = async (req, res, next) => {
    try {

        const page = req.query.page || 1;
        const productPerPage = 10;
        let resIds = [];

        let find = {};

        let dataRangeStart = req.query.dataRangeStart || false;
        let dataRangeEnd = req.query.dataRangeEnd || false;

        const recipent = req.query.recipent || '';
        const customerTransaction = req.query.customerTransaction || '';
        const tracking = req.query.tracking || '';

        let enableDateFilter = true;

        if (recipent) {
            enableDateFilter = false;

            const reci = await Resipent.find({ user: req.userId })
                .select('_id');
            reci.forEach(i => {
                resIds.push(
                    i._id
                );
            });

            find = {
                ...find,
                recipient: { $in: resIds }
            }


        } if (customerTransaction) {
            enableDateFilter = false;

            const reci = await Resipent.find({ customer_reference: new RegExp(customerTransaction.trim(), 'i'), user: req.userId })
                .select('_id');
            reci.forEach(i => {
                resIds.push(
                    i._id
                );
            });
            find = {
                ...find,
                recipient: { $in: resIds }
            }

        } if (tracking) {
            enableDateFilter = false;

            // const reci = await Resipent.find({ tracking: new RegExp(tracking.trim(), 'i'), user: req.userId })
            //     .select('_id');
            // reci.forEach(i => {
            //     resIds.push(
            //         i._id
            //     );
            // });
            find = {
                ...find,
                tracking: tracking
            }
        }

        if (enableDateFilter) {

            if (dataRangeStart && dataRangeEnd) {
                dataRangeStart = new Date(dataRangeStart);
                dataRangeEnd = new Date(dataRangeEnd);
                find = {
                    $and: [
                        { createdAt: { $gt: dataRangeStart } },
                        { createdAt: { $lt: dataRangeEnd } },
                    ],
                    user: req.userId,
                }
            } else if (dataRangeStart && !dataRangeEnd) {
                dataRangeStart = new Date(dataRangeStart);

                find = {
                    createdAt: { $gt: dataRangeStart }
                    ,
                    user: req.userId,
                }

            } else if (!dataRangeStart && dataRangeEnd) {
                dataRangeEnd = new Date(dataRangeEnd);

                find = {
                    createdAt: { $lt: dataRangeEnd }
                    ,
                    user: req.userId,
                }

            } else if (!dataRangeStart && !dataRangeEnd) {

                find = {
                    user: req.userId,
                };
            }
        }

        const order = await Order.find(find)
            .skip((page - 1) * productPerPage)
            .limit(productPerPage)
            .sort({ createdAt: -1 })
            .populate({
                path: 'recipient',
                select: 'name contact customer_reference country phone'
            })

        const total = await Order.find(find).countDocuments();


        res.status(200).json({
            state: 1,
            orders: order,
            total: total,
            message: `order in page ${page}`
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
                    { createdAt: { $gt: dataRangeStart } },
                    { createdAt: { $lt: dataRangeEnd } },
                ],
                user: req.userId,
                kind: 'order'
            }
        } else if (dataRangeStart && !dataRangeEnd) {
            dataRangeStart = new Date(dataRangeStart);

            find = {
                createdAt: { $gt: dataRangeStart }
                ,
                user: req.userId,
                kind: 'order'
            }

        } else if (!dataRangeStart && dataRangeEnd) {
            dataRangeEnd = new Date(dataRangeEnd);

            find = {
                createdAt: { $lt: dataRangeEnd }
                ,
                user: req.userId,
                kind: 'order'
            }

        } else if (!dataRangeStart && !dataRangeEnd) {
            find = {
                user: req.userId,
                kind: 'order'
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

exports.getAddUpdate = async (req, res, next) => {
    try {

        const id = req.params.orderId;

        let order;
        if (req.userRole == 'superadmin' || req.userRole == 'warehouse') {
            order = await Order.findById(id);
        } else {
            order = await Order.findOne({ _id: id, user: req.userId });
        }

        if (!order) {
            const error = new Error("order not found");
            error.statusCode = 404;
            throw error;
        }

        const lineItem = await OrderLineItem.find({ order: order._id })
            .populate({
                path: 'item'
            });

        res.status(200).json({
            state: 1,
            message: 'order items',
            order: order,
            items_in_order: lineItem
        });


    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};

exports.postCancelRestore = async(req, res, next)=>{
    try{
        const action = req.body.action ;
        const orderId = req.body.orderId ;

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            const error = new Error("validation faild");
            error.statusCode = 422;
            error.data = errors.array();
            throw error;
        }

        const order = await Order.findById(orderId)
        .select('status');
        if(action == 'cancel'){
            
            order.status = 3 ;
            await order.save();

        }else if(action == 'restore'){
            
            order.status = 1 ;
            await order.save();

        }else{
            const error = new Error("un prossessable value for action");
            error.statusCode = 422;
            throw error;
        }

        res.status(200).json({
            state:1,
            message:`action = ${action} done`,
            orderStatus:order.status
        });

    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
}


exports.postUpload = async (req, res, next) => {
    try {
  
        const file = req.files ;
  
        const err = validationResult(req);
        if (!err.isEmpty()) {
            const error = new Error("validation faild");
            error.statusCode = 422;
            error.data = err.array();
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
            kind:'order'
        });
  
        const upload = await newUpload.save();
        
        const {errors, fail} = await utils.parse_order_upload(file[0].path, req.userId);

        res.status(201).json({
            state:1,
            message:'created',
            errors:errors,
            fail:fail,
            upload:upload
        });
        
  
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
  }

  exports.getPackingSlip = async (req, res, next)=>{
      try{
        const orderId = req.params.id ;

        let order ;
        if(req.userRole == 'warehouse' || req.userRole == 'superadmin' ){
            order = await Order.findById(orderId)
            .select('recipient customer_reference tracking actual_carrier actual_service')
            .populate({
                path:'recipient',
                select:'name contact street1 street2 city state postal phone'
            })
        }else{
            order = await Order.findOne({_id:orderId, user:req.userId})
            .select('recipient customer_reference tracking actual_carrier actual_service')
            .populate({
                path:'recipient',
                select:'name contact street1 street2 city state postal phone'
            });
        }
        if(!order){
            const error = new Error("order not found");
            error.statusCode = 404;
            throw error;
        }

        const lineItem = await OrderLineItem.find({order:orderId})
        .select('item quantity_cases quantity_units')
        .populate({
            path:'item',
            select:'name number description'
        });


        res.status(200).json({
            state:1,
            message:'order data',
            order:order,
            lineItem:lineItem
        });
        

      }catch(err){
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
      }
  }