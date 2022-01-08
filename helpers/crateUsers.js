
const User = require('../models/user');
const Role = require('../models/role');
const bcrypt = require("bcryptjs");



// const newOne =  new Role({
//     name:'superadmin',
// });
// newOne.save().then(dd=>{
//     console.log('done');
// })

// const newOne1 =  new Role({
//     name:'warehouse',
// });
// newOne1.save().then(dd=>{
//     console.log('done');
// })

// const newOne1 =  new Role({
//     name:'none',
// });
// newOne1.save().then(dd=>{
//     console.log('done');
// })

const createdRoles = async (roleName) => {
    try {
        let role = await Role.findOne({ name: roleName });
        if (!role) {
            const newRole = new Role({
                name: roleName
            });
            role = await newRole.save();
        }
        return role;
    } catch (err) {
        throw err;
    }
}

module.exports = async () => {

    try {
        let tim = await User.findOne({ username: 'tim' });
        let demo = await User.findOne({ username: 'demo' });
        let warehousedemo = await User.findOne({ username: 'warehousedemo' });
        let admindemo = await User.findOne({ username: 'admindemo' });
        let totalCreated = 0 ;
        if (!tim) {
            
            const role = await createdRoles('superadmin');
            const hashed = await bcrypt.hash('MKC2018', 12);
            const newTim = new User({
                username: 'tim',
                email: 'tim@ginn.ca',
                is_enabled: true,
                password: hashed,
                phone: '123456789',
                company: 'My Company',
                role:role,
                first_name:'tim',
                last_name:'tim',
                confirmed_at:Date.now()
            });

            tim = await newTim.save();
            totalCreated = totalCreated + 1 ;
        }
        if (!demo) {
            const role = await createdRoles('none');
            const hashed = await bcrypt.hash('demo', 12);
            const newDemo = new User({
                username: 'demo',
                email: 'demo@example.com',
                is_enabled: true,
                password: hashed,
                phone: '123456789',
                company: 'Acme Ltd',
                role:role,
                first_name:'demo',
                last_name:'demo',
                confirmed_at:Date.now()
            });

            demo = await newDemo.save();
            totalCreated = totalCreated + 1 ;

        }
        if (!warehousedemo) {
            const role = await createdRoles('warehouse');
            const hashed = await bcrypt.hash('warehousedemo', 12);
            const newWarehousedemo = new User({
                username: 'warehousedemo',
                email: 'warehouse@example.com',
                is_enabled: true,
                password: hashed,
                phone: '123456789',
                company: 'Demo Warehouse Ltd',
                role:role,
                first_name:'warehousedemo',
                last_name:'warehousedemo',
                confirmed_at:Date.now()
            });

            warehousedemo = await newWarehousedemo.save();
            totalCreated = totalCreated + 1 ;

        }
        if (!admindemo) {
            const role = await createdRoles('superadmin');
            const hashed = await bcrypt.hash('admindemo', 12);
            const newWarehousedemo = new User({
                username: 'admindemo',
                email: 'admin@example.com',
                is_enabled: true,
                password: hashed,
                phone: '123456789',
                company: 'PriorityBiz',
                role:role,
                first_name:'admindemo',
                last_name:'admindemo',
                confirmed_at:Date.now()
            });
            admindemo = await newWarehousedemo.save();
            totalCreated = totalCreated + 1 ;

        }
       
        console.log('\n\ntotal user created : ', totalCreated);
        return totalCreated ;

    } catch (err) {
        throw err;
    }



}