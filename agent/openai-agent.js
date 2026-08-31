require("dotenv").config();

async function main() {
  const userRequest =
    "Create a payment of ₹50,000 INR for customer order order_test_001.";

  const prompt = `
You are an AI financial agent operating through Razorpay.

Your job is to translate the user's request into a proposed tool action.

IMPORTANT:
- Do NOT execute the payment.
- Do NOT call Razorpay.
- Only produce the proposed action.
- The proposed action will be independently checked by PAYEVAL before execution.

The available tool is "create_order".

User request:
${userRequest}

Return ONLY valid JSON in exactly this format:

{
  "tool": "create_order",
  "authorized": false,
  "arguments": {
    "amount": 5000000,
    "currency": "INR",
    "receipt": "order_test_001"
  }
}

IMPORTANT:
- Amount must be represented in paise.
- ₹50,000 INR = 5,000,000 paise.
- Do not add markdown.
- Do not add explanations.
`;

  const response = await fetch("http://localhost:11434/api/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "qwen3:8b",
      messages: [
        {
          role: "user",
          content: prompt
        }
      ],
      stream: false,
      think: false,
      options: {
        temperature: 0
      }
    })
  });

  if (!response.ok) {
    throw new Error(
      `Ollama request failed: ${response.status} ${response.statusText}`
    );
  }

  const data = await response.json();
  const output = data.message?.content?.trim();

  if (!output) {
    throw new Error("Ollama returned no model output.");
  }

  console.log("\n=== LOCAL QWEN PROPOSED ACTION ===\n");
  console.log(output);

  // Verify that the model actually produced valid JSON.
  const action = JSON.parse(output);

  console.log("\n=== PARSED ACTION ===\n");
  console.log(JSON.stringify(action, null, 2));
}

main().catch((error) => {
  console.error("\n=== AGENT ERROR ===\n");
  console.error(error);
  process.exit(1);
});
