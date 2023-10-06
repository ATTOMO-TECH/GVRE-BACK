const nodemailer = require("nodemailer");
require("dotenv").config();

// Transporters de los usuarios

const ele = nodemailer.createTransport({
    service: "Gmail",
    auth: {
        user: "ele.caudete@gmail.com",
        pass: "c707f7f54e0c89B",
    }
});

// const davidS = nodemailer.createTransport({
//     service: "Gmail",
//     auth: {
//         user: "ele.caudete@gmail.com",
//         pass: "c707f7f54e0c89B",
//     }
// });
// const davidO = nodemailer.createTransport({
//     service: "Gmail",
//     auth: {
//         user: "ele.caudete@gmail.com",
//         pass: "c707f7f54e0c89B",
//     }
// });
// const cariM = nodemailer.createTransport({
//     service: "Gmail",
//     auth: {
//         user: "ele.caudete@gmail.com",
//         pass: "c707f7f54e0c89B",
//     }
// });
// const nuriaS = nodemailer.createTransport({
//     service: "Gmail",
//     auth: {
//         user: "ele.caudete@gmail.com",
//         pass: "c707f7f54e0c89B",
//     }
// });
// const pelayoF = nodemailer.createTransport({
//     service: "Gmail",
//     auth: {
//         user: "ele.caudete@gmail.com",
//         pass: "c707f7f54e0c89B",
//     }
// });
// const ireneB = nodemailer.createTransport({
//     service: "Gmail",
//     auth: {
//         user: "ele.caudete@gmail.com",
//         pass: "c707f7f54e0c89B",
//     }
// });
// const teresaR = nodemailer.createTransport({
//     service: "Gmail",
//     auth: {
//         user: "ele.caudete@gmail.com",
//         pass: "c707f7f54e0c89B",
//     }
// });
// const martaG = nodemailer.createTransport({
//     service: "Gmail",
//     auth: {
//         user: "ele.caudete@gmail.com",
//         pass: "c707f7f54e0c89B",
//     }
// });
// const beatrizM = nodemailer.createTransport({
//     service: "Gmail",
//     auth: {
//         user: "ele.caudete@gmail.com",
//         pass: "c707f7f54e0c89B",
//     }
// });
// const montseA = nodemailer.createTransport({
//     service: "Gmail",
//     auth: {
//         user: "ele.caudete@gmail.com",
//         pass: "c707f7f54e0c89B",
//     }
// });
// const alejandraG = nodemailer.createTransport({
//     service: "Gmail",
//     auth: {
//         user: "ele.caudete@gmail.com",
//         pass: "c707f7f54e0c89B",
//     }
// });
// const anaG = nodemailer.createTransport({
//     service: "Gmail",
//     auth: {
//         user: "ele.caudete@gmail.com",
//         pass: "c707f7f54e0c89B",
//     }
// });
// const mariaM = nodemailer.createTransport({
//     service: "Gmail",
//     auth: {
//         user: "ele.caudete@gmail.com",
//         pass: "c707f7f54e0c89B",
//     }
// });
// const alejandroE = nodemailer.createTransport({
//     service: "Gmail",
//     auth: {
//         user: "ele.caudete@gmail.com",
//         pass: "c707f7f54e0c89B",
//     }
// });
// const anaM = nodemailer.createTransport({
//     service: "Gmail",
//     auth: {
//         user: "ele.caudete@gmail.com",
//         pass: "c707f7f54e0c89B",
//     }
// });
// const luciaS = nodemailer.createTransport({
//     service: "Gmail",
//     auth: {
//         user: "ele.caudete@gmail.com",
//         pass: "c707f7f54e0c89B",
//     }
// });
// const leticiaM = nodemailer.createTransport({
//     service: "Gmail",
//     auth: {
//         user: "ele.caudete@gmail.com",
//         pass: "c707f7f54e0c89B",
//     }
// });
// const victoriaM = nodemailer.createTransport({
//     service: "Gmail",
//     auth: {
//         user: "ele.caudete@gmail.com",
//         pass: "c707f7f54e0c89B",
//     }
// });

ele.verify((error, success) => {
    if (error) {
        console.log(error)
    } else {
        console.log("Nodemailer is ready!");
    }
});