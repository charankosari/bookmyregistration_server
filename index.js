const express = require('express');
const bodyParser = require('body-parser');
const admin = require('firebase-admin');

const app = express();
app.use(bodyParser.json());

// Initialize Firebase Admin SDK
const serviceAccount = require('./serviceAccountKey.json');
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const auth = admin.auth();

app.post('/sendOtp', async (req, res) => {      
    const { phoneNumber } = req.body;

    try {
        // Send OTP
        const verificationId = await auth.createUser({ phoneNumber });
        res.status(200).send({ verificationId });
    } catch (error) {
        res.status(500).send({ error: error.message });
    }
});

app.post('/verifyOtp', async (req, res) => {
    const { verificationId, otp } = req.body;

    try {
        // Verify OTP
        const sessionInfo = await auth.verifyIdToken(verificationId);
        const verified = sessionInfo.phoneNumber === otp;

        if (verified) {
            res.status(200).send({ success: true });
        } else {
            res.status(400).send({ success: false, message: 'Invalid OTP' });
        }
    } catch (error) {
        res.status(500).send({ error: error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
