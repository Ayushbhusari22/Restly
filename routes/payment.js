const express = require('express');
const router = express.Router();
const Razorpay = require('razorpay');
const crypto = require('crypto');

const instance = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});

router.post("/create/orderId", async (req, res) => {
    const { amount, currency = "INR", receipt } = req.body;
    try {
        const options = {
            amount: Number(amount) * 100, // amount in the smallest currency unit (paise)
            currency,
            receipt,
        };
        const order = await instance.orders.create(options);
        if (!order) {
            return res.status(500).send("Some error occurred");
        }
        res.json(order);
    } catch (error) {
        console.error(error);
        res.status(500).send(error);
        res.status(500).json({ message: "Failed to create order", error: error.message });
    }
});

router.post("/verify", (req, res) => {
    const { order_id, payment_id, signature } = req.body;
    const key_secret = process.env.RAZORPAY_KEY_SECRET;

    // This is the official logic to verify the signature
    const hmac = crypto.createHmac('sha256', key_secret);
    hmac.update(order_id + "|" + payment_id);
    const generated_signature = hmac.digest('hex');

    if (generated_signature === signature) {
        // Payment is successful and verified
        // You can now save payment details in your database
        res.json({ success: true, message: "Payment has been verified" });
    } else {
        res.status(400).json({ success: false, message: "Payment verification failed" });
    }
});

module.exports = router;
