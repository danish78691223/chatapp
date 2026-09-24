import "dotenv/config";
import SibApiV3Sdk from "@sendinblue/client";

const apiKey = process.env.BREVO_API_KEY;

if (!apiKey) {
  console.warn("⚠️ BREVO_API_KEY is not loaded.");
}

const client = new SibApiV3Sdk.TransactionalEmailsApi();

client.setApiKey(
  SibApiV3Sdk.TransactionalEmailsApiApiKeys.apiKey,
  apiKey
);

export default client;
