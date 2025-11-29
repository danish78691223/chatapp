// src/utils/brevoClient.js
import SibApiV3Sdk from "@sendinblue/client";

const client = new SibApiV3Sdk.TransactionalEmailsApi();
client.setApiKey(
  SibApiV3Sdk.TransactionalEmailsApiApiKeys.apiKey,
  process.env.BREVO_API_KEY
);

export default client;
