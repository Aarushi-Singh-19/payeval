require("dotenv").config();

const https = require("https");

const RAZORPAY_TEST_BASE = "api.razorpay.com";
const RAZORPAY_TEST_PREFIX = "rzp_test_";

function assertTestModeCredentials() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    throw new Error(
      "Razorpay Test Mode credentials are not configured."
    );
  }

  if (!keyId.startsWith(RAZORPAY_TEST_PREFIX)) {
    throw new Error(
      "PAYEVAL Secure Gateway only permits Razorpay Test Mode credentials."
    );
  }

  return { keyId, keySecret };
}

function createOrder(arguments_) {
  const { keyId, keySecret } = assertTestModeCredentials();

  const payload = JSON.stringify({
    amount: arguments_.amount,
    currency: arguments_.currency,
    receipt: arguments_.receipt
  });

  return new Promise((resolve, reject) => {
    const auth = Buffer
      .from(`${keyId}:${keySecret}`)
      .toString("base64");

    const request = https.request(
      {
        hostname: RAZORPAY_TEST_BASE,
        path: "/v1/orders",
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(payload)
        }
      },
      (response) => {
        let body = "";

        response.on("data", (chunk) => {
          body += chunk;
        });

        response.on("end", () => {
          let parsed;

          try {
            parsed = JSON.parse(body);
          } catch {
            parsed = { raw: body };
          }

          if (response.statusCode < 200 || response.statusCode >= 300) {
            const error = new Error(
              parsed?.error?.description ||
              parsed?.error?.reason ||
              `Razorpay API returned HTTP ${response.statusCode}`
            );

            error.statusCode = response.statusCode;
            error.response = parsed;

            reject(error);
            return;
          }

          resolve(parsed);
        });
      }
    );

    request.on("error", reject);

    request.write(payload);
    request.end();
  });
}

async function executeRazorpayTestAction(actualAction) {
  if (!actualAction || actualAction.tool !== "create_order") {
    throw new Error(
      `Unsupported Razorpay Test Gateway tool: ${actualAction?.tool}`
    );
  }

  return createOrder(actualAction.arguments || {});
}

module.exports = {
  executeRazorpayTestAction,
  createOrder
};
