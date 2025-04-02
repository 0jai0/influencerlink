const admin = require("firebase-admin");
const serviceAccount = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS);
//const serviceAccount = process.env.GOOGLE_APPLICATION_CREDENTIALS;

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const messaging = admin.messaging();
module.exports = messaging;
