
const { Types } = require('mongoose')
const csv = require('csvtojson');
const path = require('path');
const writeFile = require('fs').writeFile;
const csvjson = require('csvjson');
const bcrypt = require('bcryptjs');

//models 

const User = require('../../models/user');
const Role = require('../../models/role');
const Desc = require('../../models/Discount');
const Inv = require('../../models/Inventory');
const Order = require('../../models/order');


const ToObjectId = async (fileName, fields) => {
    try {

        const jsonArray = await csv().fromFile(path.join(__dirname, fileName));

        const newFile = await csv().fromFile(path.join(__dirname, fileName));


        newFile.map(item => {
            fields.forEach(field => {

                if (field.ref) {
                    //change the value of the ref due to the value of the reference with the comparison with the new object id and the orignal file

                    const index = field.ref.jsonArray.findIndex(i => i['_id'] == item[field.path])

                    //console.log(`for  ${item[field.path]}`, index);

                    if (index > -1) {
                        item[field.path] = field.ref.newFile[index]['_id'];
                    }


                } else {
                    return item[field.path] = new Types.ObjectId();

                }

            });
        })


        return { jsonArray, newFile };

    } catch (err) {
        throw err;
    }
}

const saveFiles = async (dataArr) => {
    try {
        dataArr.forEach(i => {
            const fileDate = csvjson.toCSV(JSON.parse(JSON.stringify(i.data)), {
                headers: 'key'
            });

            writeFile(path.join(__dirname + `/new csv/${i.fileName}`), fileDate, (err) => {
                if (err) {
                    throw err;
                }
            });

        });
    } catch (err) {
        throw err;
    }
}


const defaultValues = async (fileName, fields) => {
    try {

        const jsonArray = await csv().fromFile(path.join(__dirname + `/new csv/${fileName}`));
        jsonArray.map((item) => fields.find(f => {
            
            if (!item[f.path] || item[f.path]=='\\N') {
                item[f] = f.value
            }
        }));

    } catch (err) {
        throw err;
    }
}
exports.fixDb = async () => {
    try {

        const users = await User.find({});

        users.forEach(async (user) => {
            if (!user.first_name) {
                user.first_name = ' ';
            }
            if (!user.last_name) {
                user.last_name = ' ';
            }
            if (!user.role) {
                const role = await Role.findOne({ name: 'none' });
                console.log(role);
                if (!role) {
                    const newRole = new Role({
                        name: 'none'
                    });
                    await newRole.save();
                    user.role = newRole._id;
                } else {
                    user.role = role._id;
                }
            }
            const hased = await bcrypt.hash('500',12);
            user.password = hased ;
            await user.save();
        });


        // const desc = await Inv.find({})
        // .populate({
        //     path:'user',
        //     select:'username'
        // })
        // .limit(10);

        // console.log(desc);





    } catch (err) {
        throw err;
    }
}

const replaceValue = async (fileName, fields, withValue,replace1, replace2=false) => {
    try {
        const jsonArray = await csv().fromFile(path.join(__dirname + `/new csv/${fileName}`));
        jsonArray.map((item, index) => fields.find(f => {

            if (item[f] == replace1) {

                item[f] = withValue
            } 
            if(replace2){
                if (item[f] == replace2) {

                    item[f] = withValue
                }
            }
            if(!item[f]){
                item[f] = '' ;
            }
            // console.log(item);
            // const _idIsObject = new Types.ObjectId(item['_id']);
            // const userIsObject = new Types.ObjectId(item['user']);
            // const isResObject = new Types.ObjectId(item['recipient']);
            // if(_idIsObject != item['_id']){
            //     console.log('not _id', item);
            // }
            // if(userIsObject != item['user']){
            //     console.log('not user', item);
            // }
            // if(item['recipient']=='\\N' || item['recipient'] == '\N' || !item['recipient']){
            //     console.log(item);
            //     item['recipient'] = new Types.ObjectId();
            // }



        }));


        await saveFiles([{
            data: jsonArray,
            fileName: fileName
        }]);

    } catch (err) {
        throw err;
    }
}

exports.mainTask = async () => {
    try {

        const role = await ToObjectId('../../csv sql/role.csv', [{
            path: '_id'
        }]);



        const user = await ToObjectId('../../csv sql/user.csv', [{
            path: '_id',
        }, {
            path: 'role',
            ref: role
        }
        ]);

        const discount = await ToObjectId('../../csv sql/discount.csv', [
            {
                path: '_id'
            }, {
                path: 'user',
                ref: user
            }

        ]);

        const inventory = await ToObjectId('../../csv sql/inventory.csv', [
            {
                path: '_id'
            }, {
                path: 'user',
                ref: user
            }
        ]);

        const resipent = await ToObjectId('../../csv sql/recipient.csv', [
            {
                path: '_id'
            }, {
                path: 'user',
                ref: user
            }
        ]);

        const order = await ToObjectId('../../csv sql/order.csv', [
            {
                path: '_id'
            }, {
                path: 'user',
                ref: user
            }, {
                path: 'recipient',
                ref: resipent
            }
        ]);

        const LineItems = await ToObjectId('../../csv sql/order_line_item.csv', [
            {
                path: '_id'
            }, {
                path: 'item',
                ref: inventory
            }, {
                path: 'order',
                ref: order
            }
        ]);

        const update = await ToObjectId('../../csv sql/upload.csv', [
            {
                path: '_id'
            }, {
                path: 'user',
                ref: user
            }
        ]);


        console.log('id created');


        await saveFiles([
            {
                data: role.newFile,
                fileName: 'role.csv'
            },
            {
                data: user.newFile,
                fileName: 'user.csv'
            },
            {
                data: discount.newFile,
                fileName: 'discount.csv'
            },
            {
                data: inventory.newFile,
                fileName: 'inventory.csv'
            },
            {
                data: resipent.newFile,
                fileName: 'resipent.csv'
            },
            {
                data: update.newFile,
                fileName: 'update.csv'
            },
            {
                data: order.newFile,
                fileName: 'order.csv'
            },
            {
                data: LineItems.newFile,
                fileName: 'LineItems.csv'
            }
        ]);

        console.log('order replace nulls');
        //order replace nulls
        await replaceValue('order.csv',
            ['blind_company', 'blind_company', 'customer_reference',
                , 'requested_carrier', 'requested_service',
                'actual_carrier', 'actual_service',
                'additionally_notify', 'easypost_order_id', 'signature_option',
                'tracking', 'customs_description'], '', "\N", "\\N");
        console.log('order default');

        //order default
        await defaultValues('order.csv', [
            {
                path: 'status',
                value: 1
            },
            {
                path: 'insurance_value',
                value: 0
            },
            {
                path: 'shipping_cost',
                value: 0
            },
            {
                path: 'customs_value',
                value: 0
            },
            {
                path: 'notify_recipient',
                value: 0
            }
        ]);
        console.log('inventory default');

        //inventory default
        await defaultValues('inventory.csv', [
            {
                path: 'case_quantity',
                value: 1
            },
            {
                path: 'qoh_case',
                value: 0
            },
            {
                path: 'qoh_units',
                value: 0
            },
            {
                path: 'case_weight',
                value: 0
            },
            {
                path: 'reorder_quantity',
                value: 0
            }
            ,
            {
                path: 'length',
                value: 0
            }
            ,
            {
                path: 'width',
                value: 0
            }
            ,
            {
                path: 'height',
                value: 0
            }
        ]);






    } catch (err) {
        throw err;
    }
}

exports.test = async ()=>{
    try{
        await replaceValue('order.csv',
            ['blind_company', 'blind_company', 'customer_reference',
                , 'requested_carrier', 'requested_service',
                'actual_carrier', 'actual_service',
                'additionally_notify', 'easypost_order_id', 'signature_option',
                'tracking', 'customs_description'], '', "\N", "\\N");
        //order default
        await defaultValues('order.csv', [
            {
                path: 'status',
                value: 1
            },
            {
                path: 'insurance_value',
                value: 0
            },
            {
                path: 'shipping_cost',
                value: 0
            },
            {
                path: 'customs_value',
                value: 0
            },
            {
                path: 'notify_recipient',
                value: 0
            }
        ]);
        console.log('inventory default');

        // //inventory default
        // await defaultValues('inventory.csv', [
        //     {
        //         path: 'case_quantity',
        //         value: 1
        //     },
        //     {
        //         path: 'qoh_case',
        //         value: 0
        //     },
        //     {
        //         path: 'qoh_units',
        //         value: 0
        //     },
        //     {
        //         path: 'case_weight',
        //         value: 0
        //     },
        //     {
        //         path: 'reorder_quantity',
        //         value: 0
        //     }
        //     ,
        //     {
        //         path: 'length',
        //         value: 0
        //     }
        //     ,
        //     {
        //         path: 'width',
        //         value: 0
        //     }
        //     ,
        //     {
        //         path: 'height',
        //         value: 0
        //     }
        // ]);
        
    }catch(err){
        throw err;
    }
}