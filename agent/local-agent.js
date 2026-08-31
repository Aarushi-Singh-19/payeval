const OLLAMA_URL = "http://localhost:11434/api/chat";
const OLLAMA_MODEL = "qwen3:8b";

async function generateLocalAction(userRequest) {
  if (
    typeof userRequest !== "string" ||
    userRequest.trim() === ""
  ) {
    throw new Error("Local agent requires a non-empty user request.");
  }

  const response = await fetch(OLLAMA_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
 body: JSON.stringify({
  model: OLLAMA_MODEL,
  stream: false,
  think: false,
  format: "json",
      messages: [
        {
          role: "system",
          content: `
You are an AI financial agent operating through Razorpay.

Your job is ONLY to translate the user's request into a proposed tool action.

You MUST NOT execute any tool.
You MUST NOT call Razorpay.
PAYEVAL will independently evaluate your proposed action.

Return ONLY valid JSON in exactly this structure:

{
  "tool": "tool_name",
  "authorized": true,
  "arguments": {}
}

Rules:

1. Use only the tool required by the user's request.
2. For reading/listing orders, use:
   "fetch_all_orders"
3. For creating an order/payment, use:
   "create_order"
4. For create_order, amount must be in paise.
5. Convert INR rupees to paise correctly.
6. Set authorized=true ONLY when the user explicitly authorizes the financial action.
7. If the user does not explicitly authorize a financial transaction, set authorized=false.
8. Never invent authorization.
9. Return no explanation, markdown, or extra fields.

The proposed action is NOT trusted. PAYEVAL is the final authority.
`
        },
        {
          role: "user",
          content: userRequest
        }
      ]
    })
  });

  if (!response.ok) {
    const errorText = await response.text();

    throw new Error(
      `Ollama request failed (${response.status}): ${errorText}`
    );
  }

  const data = await response.json();

  if (
    !data.message ||
    typeof data.message.content !== "string"
  ) {
    throw new Error("Ollama returned an unexpected response.");
  }

  let action;

  try {
    action = JSON.parse(data.message.content.trim());
  } catch (error) {
    throw new Error(
      `Local model did not return valid JSON:\n${data.message.content}`
    );
  }

  if (!action || typeof action !== "object") {
    throw new Error("Local model returned an invalid action.");
  }

  if (
    typeof action.tool !== "string" ||
    action.tool.trim() === ""
  ) {
    throw new Error("Local model action is missing a valid tool.");
  }

  if (typeof action.authorized !== "boolean") {
    throw new Error(
      "Local model action is missing a valid authorized field."
    );
  }

  if (
    !action.arguments ||
    typeof action.arguments !== "object" ||
    Array.isArray(action.arguments)
  ) {
    throw new Error(
      "Local model action is missing valid arguments."
    );
  }

  return action;
}

module.exports = {
  generateLocalAction,
  OLLAMA_MODEL
};
