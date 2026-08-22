require("dotenv").config();

const credentials = Buffer.from(
  `${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`
).toString("base64");

async function testRazorpayConnection() {
  const response = await fetch(
    "https://api.razorpay.com/v1/orders?count=1",
    {
      headers: {
        Authorization: `Basic ${credentials}`,
      },
    }
  );

  const body = await response.text();

  console.log("HTTP Status:", response.status);
  console.log("Response:", body);
}

testRazorpayConnection().catch((error) => {
  console.error("Connection test failed:");
  console.error(error);
  process.exit(1);
});