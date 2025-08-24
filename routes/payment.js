const express = require('express');
const router = express.Router();
const Razorpay = require('razorpay');
const crypto = require('crypto');

// Initialize a new Razorpay instance with your key ID and key secret.
// These should be loaded from your environment variables for security.
const instance = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});

/**
 * @route   POST /api/create/orderId
 * @desc    Creates a new Razorpay order.
 * @access  Private
 * * @body    {
 * "amount": number,    // The amount to be paid in your currency's smallest unit (e.g., paise for INR)
 * "currency": string,  // The currency code (e.g., "INR")
 * "receipt": string    // A unique receipt ID for your reference
 * }
 */
router.post("/create/orderId", async (req, res) => {
    // Destructure the required fields from the request body
    const { amount, currency = "INR", receipt } = req.body;

    try {
        // Prepare the options for the order creation API call
        const options = {
            // Razorpay expects the amount in the smallest currency unit (e.g., paise).
            // We multiply the received amount by 100 to convert it.
            amount: Number(amount) * 100,
            currency,
            receipt,
        };

        // Create the order using the Razorpay instance
        const order = await instance.orders.create(options);

        // Check if the order was created successfully
        if (!order) {
            return res.status(500).send("Some error occurred while creating the order");
        }

        // Send the created order object back to the client
        res.json(order);
    } catch (error) {
        // Log the error to the console for debugging
        console.error("Error creating Razorpay order:", error);

        // Send a single, informative JSON response to the client
        res.status(500).json({
            message: "Failed to create order",
            error: error.message
        });
    }
});

/**
 * @route   POST /api/verify
 * @desc    Verifies the payment signature received from Razorpay.
 * @access  Private
 * * @body    {
 * "order_id": string,
 * "payment_id": string,
 * "signature": string
 * }
 */
router.post("/verify", (req, res) => {
    // Get the required fields from the request body
    const { order_id, payment_id, signature } = req.body;

    // Get your key secret from environment variables
    const key_secret = process.env.RAZORPAY_KEY_SECRET;

    // This is the official logic to verify the signature as per Razorpay documentation.
    // A HMAC SHA256 signature is generated using the order ID and payment ID.
    const hmac = crypto.createHmac('sha256', key_secret);
    hmac.update(order_id + "|" + payment_id);
    const generated_signature = hmac.digest('hex');

    // Compare the generated signature with the signature received from the client
    if (generated_signature === signature) {
        // Payment is successful and verified
        // You can now save the payment details in your database for a permanent record.
        res.json({ success: true, message: "Payment has been verified successfully" });
    } else {
        // If the signatures do not match, the payment verification has failed
        res.status(400).json({ success: false, message: "Payment verification failed" });
    }
});

module.exports = router;
