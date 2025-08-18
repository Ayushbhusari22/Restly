const payButton = document.getElementById('pay-button');

if (payButton) {
    payButton.addEventListener('click', async (e) => {
        e.preventDefault();

        const listingId = payButton.dataset.listingId;
        const amount = payButton.dataset.amount;

        // 1. Create an order on the server
        const response = await fetch('/payment/create/orderId', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                amount: amount,
                receipt: `receipt_listing_${listingId}`
            })
        });
        const order = await response.json();

        // 2. Open Razorpay checkout
        const options = {
            "key": RAZORPAY_KEY_ID, // This is now a global variable from the EJS template
            "amount": order.amount,
            "currency": order.currency,
            "name": "Restly",
            "description": "Booking Payment",
            "image": "/images/favicon.ico",
            "order_id": order.id,
            "handler": function (response) {
                // This function is called on successful payment
                // Now, verify the payment on your server
                verifyPayment(response.razorpay_order_id, response.razorpay_payment_id, response.razorpay_signature);
            },
            "prefill": {
                // We recommend not pre-filling customer details
            },
            "theme": {
                "color": "#FE424D" // Your brand color
            }
        };

        const rzp1 = new Razorpay(options);

        rzp1.on('payment.failed', function (response) {
            alert(`Payment Failed: ${response.error.description}`);
        });

        rzp1.open();
    });
}

async function verifyPayment (order_id, payment_id, signature) {
    try {
        const response = await fetch('/payment/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ order_id, payment_id, signature })
        });

        const result = await response.json();
        alert(result.success ? "Payment successful and verified!" : "Payment verification failed!");
        if (result.success) {
            window.location.href = '/'; // Redirect on success
        }
    } catch (error) {
        console.error("Verification request failed:", error);
        alert("An error occurred during payment verification.");
    }
}
