const carrier_services = require('./carrer_services');
const csv = require('csvtojson');
const path = require('path');
const { json } = require('body-parser');

const Recipient = require('../models/Recipient');
const Order = require('../models/order');
const User = require('../models/user');
const Inventory = require('../models/Inventory');
const OrderLineItem = require('../models/OrderLineItem');
const Descounts = require('../models/Discount');


exports.split_packages = async (lineItems) => {
    try {
        let packages = []
        let total_packages = 0
        let unit_weight_tally = 0
        for (line of lineItems) {
            if (line.item.case_weight > 150) {
                const err = new Error('Weight over 150 lbs');
                err.statusCode = 409;
                throw err;
            }

            if (line.quantity_units >= line.item.case_quantity) {
                while (line.quantity_units > line.item.case_quantity) {
                    line.quantity_units = line.quantity_units - line.item.case_quantity;
                    line.quantity_cases = line.quantity_cases + 1;
                }
            }

            if (line.quantity_cases > 0) {
                total_packages = total_packages + line.quantity_cases;
                for (let i = 0; i < line.quantity_cases; i++) {
                    packages.push([1, line.item.case_weight])
                }
            }

            if (line.quantity_units > 0) {
                for (let i = 0; i < line.quantity_units; i++) {
                    let p_unit_weight_tally = unit_weight_tally + (line.item.case_weight / line.item.case_quantity)
                    if (p_unit_weight_tally > 150) {
                        packages.push([1, unit_weight_tally]);
                        total_packages = total_packages + 1;
                        unit_weight_tally = (line.item.case_weight / line.item.case_quantity)
                    } else {
                        unit_weight_tally = p_unit_weight_tally;
                    }
                }
            }

            if (unit_weight_tally > 0) {
                total_packages = total_packages + 1;
                packages.push([1, unit_weight_tally])
            }

            return packages;

        }
    } catch (err) {
        console.log(err);
        throw err;
    }
}

exports.build_discount_table = async (descouns) => {
    try {
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

        return final_res;
    } catch (err) {
        throw err
    }
}

exports.updateOrder = async (req, order) => {

    try {
        const customer_reference = req.body.customer_reference;     //string
        const blind_company = req.body.blind_company;               //string
        const blind_phone = req.body.blind_phone;                   //string
        const notify_recipient = req.body.notify_recipient;         //boolean
        const additionally_notify = req.body.additionally_notify;   //string
        const insurance_value = req.body.insurance_value;           //number
        const signature_option = req.body.signature_option;         //string

        if (customer_reference) order.customer_reference = customer_reference;
        if (blind_company) order.blind_company = blind_company;
        if (blind_phone) order.blind_phone = blind_phone;
        if (additionally_notify) order.additionally_notify = additionally_notify;
        if (insurance_value) order.insurance_value = insurance_value;
        if (signature_option) order.signature_option = signature_option;

        order.notify_recipient = Boolean(notify_recipient);

        const updatedOrder = await order.save();

        return updatedOrder;

    } catch (err) {
        throw err;
    }


}


exports.parse_order_upload = async (fileName, userId) => {


    const required_columns = ["Transaction ID", "Item", "Unit of Measure", "Quantity", "Insured Value", "Carrier", "Shipping Method", "Contact Name", "Phone", "Address 1", "City", "State Code", "Zip", "Country Code"];

    const optional_columns = ["Company Name", "Email", "Address 2", "Residential", "Signature Option", "Blind Shipper Name", "Blind Shipper Phone", "Blind Ship Company", "Blind Ship Company Phone", "Customs Value", "Customs Description", "Send Tracking"];

    const all_columns = required_columns.concat(optional_columns);

    let errors = [];

    let csv_data = [];
    try {
        try {
            const jsonArray = await csv().fromFile(path.join('./', fileName));

            let ship_rows = false;

            jsonArray.forEach((ele, index) => {

                let missed = [];

                required_columns.forEach(i => {
                    if(i == 'Insured Value'){
                        ele[i] = 0 ;
                    }
                    else if (!ele[i]) {
                        missed.push(i);
                        ship_rows = true;
                    }
                    console.log(ele['Contact Name']);
                });

                if (missed.length > 0) {
                    errors.push(`Missing expected required: ${missed} in row ${index + 1}`)
                }


                if (ele['Unit of Measure'] != 'U' && ele['Unit of Measure'] != 'C') {
                    const e = new Error(`unprossesable Unit of Measure for reference_id = ${ele['Transaction ID']}`);
                    e.statusCode = 422;
                    throw e;
                }

                if (!ship_rows && csv_data[ele['Transaction ID']]) {

                    csv_data[ele['Transaction ID']]['items'].push({
                        'Item': ele['Item'], 'Unit Of Measure': ele['Unit of Measure'], 'Quantity': ele['Quantity'],
                        'Insured Value': ele['Insured Value']
                    });
                } else if (!ship_rows) {
                    csv_data[ele['Transaction ID']] = {};
                    csv_data[ele['Transaction ID']]['items'] = [
                        {
                            'Item': ele['Item'], 'Unit Of Measure': ele['Unit of Measure'],
                            'Quantity': ele['Quantity'], 'Insured Value': ele['Insured Value']
                        }
                    ]
                }

                all_columns.forEach(all => {
                    if (ele[all]) {

                        csv_data[ele['Transaction ID']][all] = ele[all];
                    }
                })

                // console.log(csv_data[ele['Transaction ID']]);


            });

        } catch (err) {
            console.log(err);
            if (!err.message) err.message = 'error in reading the file'
            err.data = errors;
            throw err;
        }


        //created Recipient
        for (let element in csv_data) {
            element = csv_data[element];

            let resipent = await Recipient.findOne({
                user: userId,
                name: element['Contact Name'],
                contact: element['Contact Name'],
                phone: element['Phone'],
                email: element['Email'],
                street1: element['Address 1'],
                street2: element['Address 2'],
                city: element['City'],
                state: element['State Code'],
                postal: element['Zip'].replace("'", ""),
                country: element['Country Code']
            });

            if (!resipent) {
                const newRes = new Recipient({
                    user: userId,
                    name: element['Contact Name'],
                    contact: element['Contact Name'],
                    phone: element['Phone'],
                    email: element['Email'],
                    street1: element['Address 1'],
                    street2: element['Address 2'],
                    city: element['City'],
                    state: element['State Code'],
                    postal: element['Zip'].replace("'", ""),
                    country: element['Country Code'].replace("USA", "US").replace("United States", "US")
                });
                resipent = await newRes.save();

            }

            element['Recipient_ID'] = resipent._id;

        }
        let fail = false;

        //created order
        for (let element in csv_data) {

            const reference_id = element;

            element = csv_data[element];

            let resipent;

            resipent = await Recipient.findById(element['Recipient_ID'])

            if (!resipent) {
                const e = new Error(`Cannot process order due to bad recipient data reference_id = ${reference_id}`);
                e.statusCode = 409;
                throw e;
            }
            const user = await User.findById(userId).select('send_tracking_emails_by_default');

            let blind_comp, blind_ph, notify_recipient;

            if (element['Blind Ship Company']) {
                blind_comp = element['Blind Ship Company'];
            }
            if (element['Blind Shipper Name']) {
                blind_comp = element['Blind Shipper Name'];
            }
            if (element['Blind Ship Company Phone']) {
                blind_ph = element['Blind Ship Company Phone'];
            }
            if (element['Blind Shipper Phone']) {
                blind_ph = element['Blind Shipper Phone'];
            }

            if (user.send_tracking_emails_by_default) {
                notify_recipient = true;
            }

            if (element['Send Tracking']) {
                if (element['Send Tracking'].toLowerCase() == 'true') {
                    notify_recipient = true;
                }
                if (element['Send Tracking'].toLowerCase() == 'false') {
                    notify_recipient = false;
                }
            }

            const newOrder = new Order({
                user: userId,
                recipient: resipent._id,
                customer_reference: reference_id,
                blind_company: blind_comp,
                blind_phone: blind_ph,
                customs_value: element['Customs Value'],
                customs_description: element['Customs Description'],
                notify_recipient: notify_recipient
            });

            //manage line items

            for (let item in element['items']) {

                item = element['items'][item]


                const inventory = await Inventory.findOne({ user: userId, number: item['Item'] });
                if (!inventory) {
                    errors.push(`Cannot find item ${item['Item']} in inventory for user ${userId}`);
                    fail = true;
                } else {
                    let quantity_units = 0;
                    let quantity_cases = 0;


                    if (item['Unit Of Measure'].toUpperCase() == 'U') {
                        quantity_units = Number(item['Quantity']);
                    } else if (item['Unit Of Measure'].toUpperCase() == 'C') {
                        quantity_cases = Number(item['Quantity']);
                    }

                    const newLineItem = new OrderLineItem({
                        item: inventory._id,
                        quantity_cases: quantity_cases,
                        quantity_units: quantity_units,
                        order: newOrder._id
                    });

                    if (newLineItem.quantity_units >= inventory.case_quantity) {
                        while (newLineItem.quantity_units >= inventory.case_quantity) {
                            newLineItem.quantity_units = newLineItem.quantity_units - inventory.case_quantity;
                            newLineItem.quantity_cases = newLineItem.quantity_cases - 1;
                        }
                    }
                    if (inventory.qoh_case < newLineItem.quantity_cases) {
                        if (inventory.qoh_case + Number(inventory.qoh_units / inventory.case_quantity) < newLineItem.quantity_cases) {
                            errors.push(`Not enough cases of ${inventory.number} for order ${reference_id}`);
                            fail = true;
                        } else {
                            while (inventory.qoh_case < newLineItem.quantity_cases) {
                                inventory.qoh_case = inventory.qoh_case + 1;
                                inventory.qoh_units = inventory.qoh_units - inventory.case_quantity;
                            }
                        }
                    } else if (inventory.qoh_units < newLineItem.quantity_units) {
                        if (inventory.qoh_case > 0 && inventory.qoh_case * inventory.case_quantity > newLineItem.quantity_units) {
                            while (inventory.qoh_units < newLineItem.quantity_units) {
                                inventory.qoh_case = inventory.qoh_case - 1;
                                inventory.qoh_units = inventory.qoh_units + inventory.case_quantity;
                            }
                        } else {
                            errors.push(`Not enough units of ${inventory.number} for order ${reference_id}`);
                            fail = true;
                        }
                    }

                    if (!fail) {
                        inventory.qoh_units = inventory.qoh_units - newLineItem.quantity_units;
                        inventory.qoh_case = inventory.qoh_case - newLineItem.quantity_cases;
                        await newOrder.save();
                        await inventory.save();
                        await newLineItem.save();
                        console.log("order", newOrder);
                        console.log("inventory", inventory);
                        console.log("line item", newLineItem);
                    }
                }
            }

        }

        return { errors, fail };


    } catch (err) {

        throw err;
    }
}


exports.parse_inventory_upload = async (fileName, userId) => {
    try {
        let errors = []

        const required_columns = ["Units in Case", "Unit Description", "Current Quantity Cases", "Current Quantity Units",
            "Item #", "Case Weight"];

        const optional_columns = ["Item Name", "Re-order Quantity", "Length", "Width", "Height", "Ship Ready"];

        const all_columns = required_columns.concat(optional_columns);
        let arr = [];
        let created = 0;
        let updated = 0;

        try {
            const jsonArray = await csv().fromFile(path.join('./', fileName));

            let ship_rows = false;

            jsonArray.forEach((ele, index) => {

                let missed = [];

                if (ele['Transaction ID' || ele['Shipping Method']]) {
                    errors.push("It looks like you might be trying to upload an order file as an inventory file. Don't do that.")
                }
                if (ele['Units per Case'] && !ele['Units in Case']) {
                    ele['Units in Case'] = ele['Units per Case']
                }
                if (ele['Cases'] && !ele['Current Quantity Cases']) {
                    ele['Current Quantity Cases'] = ele['Cases']
                }
                if (ele['Units'] && !ele['Current Quantity Units']) {
                    ele['Current Quantity Units'] = ele['Units']
                }
                if (ele['Description'] && !ele['Unit Description']) {
                    ele['Unit Description'] = ele['Description']
                }
                if (!ele['Item Name']) {
                    ele['Item Name'] = ele['Item #']
                }


                required_columns.forEach(i => {
                    if (!ele[i]) {
                        missed.push(i);
                        ship_rows = true;
                    }
                });

                if (missed.length > 0) {
                    errors.push(`Missing expected required: '${missed}' in row '${index + 1}'`)
                    const e = new Error('error in reading the file');
                    e.statusCode = 422;
                    throw e;
                }

                arr[index] = ele;
            });

            for (let item in arr) {
                item = arr[item];

                let inventory = await Inventory.findOne({
                    $or: [
                        { name: item['Item Name'] },
                        { number: item['Item #'] }
                    ]
                })
                if (inventory) {
                    inventory.name = item['Item Name']
                    inventory.number = item['Item #']
                    inventory.case_quantity = Number(item['Units in Case'])
                    inventory.description = item['Unit Description']
                    inventory.qoh_case = Number(item['Current Quantity Cases'])
                    inventory.qoh_units = Number(item['Current Quantity Units'])
                    inventory.case_weight = Number(item['Case Weight'])

                    if (item['Re-order Quantity']) inventory.reorder_quantity = item['Re-order Quantity'];
                    if (item['Length']) {
                        if (item['Length'] == '') {
                            inventory.length = 0;
                        } else {
                            inventory.length = Number(item['Length']);
                        }
                    }
                    if (item['Width']) {
                        if (item['Width'] == '') {
                            inventory.width = 0;
                        } else {
                            inventory.width = Number(item['Width']);
                        }
                    }
                    if (item['Height']) {
                        if (item['Height'] == '') {
                            inventory.height = 0;
                        } else {
                            inventory.height = Number(item['Height']);
                        }
                    }
                    if (item['Ship Ready']) {
                        if (item['Ship Ready'].toLowerCase() == 'true' || item['Ship Ready'] == '1' || item['Ship Ready'].toLowerCase() == 'yes' || item['Ship Ready'].toLowerCase() == 'y') {
                            inventory.ship_ready = true;

                        } else {
                            inventory.ship_ready = false;
                        }
                    }
                    try{
                        await inventory.save();
                        updated = updated + 1;
                        continue ;
                    }catch(OoOoOo){
                        errors.push(OoOoOo.message);
                        continue;
                    }
                    

                } else {
                    inventory = new Inventory({
                        user: userId,
                        name: item['Item Name'],
                        number: item['Item #'],
                        case_quantity: Number(item['Units in Case']),
                        description: item['Unit Description'],
                        qoh_case: Number(item['Current Quantity Cases']),
                        qoh_units: Number(item['Current Quantity Units']),
                        case_weight: Number(item['Case Weight']),
                    });
                    if (item['Re-order Quantity']) inventory.reorder_quantity = item['Re-order Quantity'];
                    if (item['Length']) {
                        if (item['Length'] == '') {
                            inventory.length = 0;
                        } else {
                            inventory.length = Number(item['Length']);
                        }
                    }
                    if (item['Width']) {
                        if (item['Width'] == '') {
                            inventory.width = 0;
                        } else {
                            inventory.width = Number(item['Width']);
                        }
                    }
                    if (item['Height']) {
                        if (item['Height'] == '') {
                            inventory.height = 0;
                        } else {
                            inventory.height = Number(item['Height']);
                        }
                    }
                    if (item['Ship Ready']) {
                        if (item['Ship Ready'].toLowerCase() == 'true' || item['Ship Ready'] == '1' || item['Ship Ready'].toLowerCase() == 'yes' || item['Ship Ready'].toLowerCase() == 'y') {
                            inventory.ship_ready = true;

                        } else {
                            inventory.ship_ready = false;
                        }
                    }

                    try{
                        await inventory.save();
                        created = created + 1 ;
                        continue ;
                    }catch(OoOoOo){
                        errors.push(OoOoOo.message);
                        continue;
                    }

                    
                }
            }

            return {errors, created, updated};

        } catch (err) {
            if (!err.message) err.message = 'error in reading the file'
            err.data = errors;
            throw err;
        }

    } catch (err) {
        throw err;
    }
}


// exports.getLowestRate = async (rates, userId)=>{
//     try{
//         const descouns = await Descounts.find({user:userId});

//         const finalRate = rates.map(rate=>{
//             descouns.forEach(disc=>{
//                 if(disc.carrier == rate.carrier && disc.service == rate.service){
//                     rate.rate
//                     return rate
//                 }else{

//                 }
//             })
//         })
//     }catch(err){
//         throw err ;
//     }
// }