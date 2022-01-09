const nodemailer = require("nodemailer");

const ejs = require('ejs');
const path = require('path');

const transport = nodemailer.createTransport({
    host: process.env.EMAIL_SENDER_host,
    port: process.env.MAIL_PORT,
    secure: true,
    auth: {
        user: process.env.NODEMAILER_GMAIL,
        pass: process.env.NODEMAILER_PASS
    }
});

console.log('Transport=>',transport);

module.exports = async (to, fromName, order, ship, lineItem) => {
    try {
        let blind_company = order.user.company ;

        if(order.blind_company){
            blind_company = order.blind_company ;
        }

        

        const ejsFile = await ejs.renderFile(path.join(__dirname,'../templates/email.ejs'),{
            blind_company:blind_company,
            order:order,
            lineItem:lineItem
        });
        
        console.log('Message FROM =>', process.env.EMAIL_SENDER + ` ${fromName}`);
        console.log('Message TO =>', to);

        const message = await transport.sendMail({
            to: to,
            from: process.env.EMAIL_SENDER + ` ${fromName}`,
            subject: `Your ${fromName} Order ${order._id} will be shipped today`,
            html:ejsFile
        });
        
        return message;

    } catch (err) {
        throw err;
    }
}