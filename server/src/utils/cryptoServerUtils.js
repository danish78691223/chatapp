import crypto from "crypto";

/* =========================================================
   🔐 AES-256 Key Generator
   - Returns a 32-byte random buffer
========================================================= */
export const generateAesKey = () => crypto.randomBytes(32);

/* =========================================================
   🔐 Convert RSA JWK to PEM (for Node's crypto)
========================================================= */
export const jwkToPem = (jwk) => {
  if (!jwk || !jwk.n || !jwk.e) {
    throw new Error("Invalid RSA JWK format");
  }

  const getBase64 = (str) => Buffer.from(str, "base64url").toString("base64");

  const pubKey = {
    kty: "RSA",
    n: getBase64(jwk.n),
    e: getBase64(jwk.e),
  };

  // Convert base64url values to buffers
  const derHeader = Buffer.from("30819f300d06092a864886f70d010101050003818d0030818902818100", "hex");
  const nBuf = Buffer.from(pubKey.n, "base64");
  const eBuf = Buffer.from(pubKey.e, "base64");

  // Assemble DER structure manually (simplified)
  const der = Buffer.concat([
    derHeader,
    nBuf,
    Buffer.from("0203010001", "hex"),
  ]);

  const pem = `-----BEGIN PUBLIC KEY-----\n${der.toString("base64").match(/.{1,64}/g).join("\n")}\n-----END PUBLIC KEY-----`;
  return pem;
};

/* =========================================================
   🔐 Encrypt AES key with user's RSA public key
   - Supports both PEM and JWK formats
========================================================= */
export const encryptAesKeyWithPublicKey = (aesKeyBuffer, userPublicKey) => {
  try {
    let pemKey;

    // If already PEM (string)
    if (typeof userPublicKey === "string" && userPublicKey.includes("BEGIN PUBLIC KEY")) {
      pemKey = userPublicKey;
    }
    // If stored as JWK object
    else if (typeof userPublicKey === "object" && userPublicKey.kty === "RSA") {
      pemKey = jwkToPem(userPublicKey);
    } else {
      throw new Error("Unsupported publicKey format");
    }

    const encrypted = crypto.publicEncrypt(
      {
        key: pemKey,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: "sha256",
      },
      aesKeyBuffer
    );

    return encrypted.toString("base64");
  } catch (err) {
    console.error("❌ Error encrypting AES key with public key:", err.message);
    throw err;
  }
};
