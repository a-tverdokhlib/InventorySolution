const Order = require('../models/order');
const Inventory = require('../models/Inventory');
//easypost
const Easypost = require('@easypost/api');
const api = new Easypost(process.env.EASYPOST_API_KEY);

exports.getHome = async (req, res, next) => {
    try {
        const page = req.query.page || 1;
        const productPerPage = 10;

        let dataRangeStart = req.query.dataRangeStart || false;
        let dataRangeEnd = req.query.dataRangeEnd || false;


        let find = {};
        let findInventory = {};
        let low_stock;

        if (req.userRole == 'superadmin' || req.userRole == 'warehouse') {
            if (dataRangeStart && dataRangeEnd) {
                dataRangeStart = new Date(dataRangeStart);
                dataRangeEnd = new Date(dataRangeEnd);
                find = {
                    $and: [
                        { createdAt: { $gt: dataRangeStart } },
                        { createdAt: { $lt: dataRangeEnd } },
                    ],
                    status: 1,

                }
            } else if (dataRangeStart && !dataRangeEnd) {
                dataRangeStart = new Date(dataRangeStart);

                find = {
                    createdAt: { $gt: dataRangeStart },
                    status: 1,
                }

            } else if (!dataRangeStart && dataRangeEnd) {
                dataRangeEnd = new Date(dataRangeEnd);

                find = {
                    createdAt: { $lt: dataRangeEnd },
                    status: 1,
                }

            } else if (!dataRangeStart && !dataRangeEnd) {
                find = {
                    status: 1,
                };
            }
        } else {
            find = {
                status: 1,
                user: req.userId,
            }

            low_stock = await Inventory.find({
                user: req.userId,
                // reorder_quantity:{$gt:this.qoh_case}
            })
                .where('this.reorder_quantity > this.qoh_case')
                .sort({ qoh_case: -1 });

            // +  where finction
        }

        const orders = await Order.find(find)
            .populate({
                path: 'recipient'
            })
            .skip((page - 1) * productPerPage)
            .limit(productPerPage)
            .sort({ createdAt: -1 });
        const totalOrders = await Order.find(find).countDocuments();


        res.status(200).json({
            state: 1,
            orders: orders,
            totalOrders: totalOrders,
            low_stock: low_stock
        });


    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
}


exports.getTestLable = async (req, res, next) => {
    try {
        const from_address = new api.Address({
            company: 'EasyPost',
            street1: '417 Montgomery Street',
            street2: '5th Floor',
            city: 'San Francisco',
            state: 'CA',
            zip: '94104',
            phone: '415-528-7555'
        });

        await from_address.save();

        const to_address = new api.Address({
            name: 'George Costanza',
            company: 'Vandelay Industries',
            street1: '1 E 161st St.',
            city: 'Bronx',
            state: 'NY',
            zip: '10451'
        });
        await to_address.save();

        const parcel = new api.Parcel({
            length: 9,
            width: 6,
            height: 2,
            weight: 10
        });
        await parcel.save();

        let referance = Math.floor(Math.random() * 10000000);
        referance = "PB" + referance.toString();

        const shipment = new api.Shipment({
            to_address:to_address,
            from_address:from_address,
            parcel:parcel,
            reference:referance
        });

        await shipment.save();
        await shipment.buy(shipment.rates[1].id/*,shipment.rates[0].service*/);

        res.status(200).json({
            state:1,
            message:'test lable',
            label:shipment.postage_label.label_url,
            tracking_code:shipment.tracking_code
        });

    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
}