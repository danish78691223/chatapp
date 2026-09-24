import {
  generateIdentityKeyPair,
  exportPublicKey,
  importPublicKey,
  deriveMessageKey,
  encryptMessage,
  decryptMessage,
  base64ToBytes,
  bytesToBase64,
} from "../utils/cryptoUtils";

const PRIVATE_KEY = "webxwhale.e2ee.private.v1";
const PUBLIC_KEY = "webxwhale.e2ee.public.v1";

const loadPrivateKey = async () => {
  const value = localStorage.getItem(PRIVATE_KEY);
  if (!value) return null;
  return crypto.subtle.importKey(
    "jwk",
    JSON.parse(value),
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveKey", "deriveBits"]
  );
};

export const ensureIdentity = async () => {
  let privateKey = await loadPrivateKey();
  let publicJwk = JSON.parse(localStorage.getItem(PUBLIC_KEY) || "null");

  if (!privateKey || !publicJwk) {
    const pair = await generateIdentityKeyPair();
    const privateJwk = await crypto.subtle.exportKey("jwk", pair.privateKey);
    publicJwk = await exportPublicKey(pair.publicKey);
    localStorage.setItem(PRIVATE_KEY, JSON.stringify(privateJwk));
    localStorage.setItem(PUBLIC_KEY, JSON.stringify(publicJwk));
    privateKey = pair.privateKey;
  }

  return { privateKey, publicJwk };
};

export const encryptForRecipient = async (text, recipientPublicJwk) => {
  const { privateKey, publicJwk } = await ensureIdentity();
  const recipientPublic = await importPublicKey(recipientPublicJwk);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await deriveMessageKey(privateKey, recipientPublic, salt);
  const encrypted = await encryptMessage(text, key);

  return {
    ...encrypted,
    salt: bytesToBase64(salt),
    senderPublicKey: publicJwk,
    e2eeVersion: 1,
  };
};

export const decryptFromSender = async (payload) => {
  const { privateKey } = await ensureIdentity();
  const senderPublic = await importPublicKey(payload.senderPublicKey);
  const key = await deriveMessageKey(
    privateKey,
    senderPublic,
    base64ToBytes(payload.salt)
  );
  return decryptMessage(payload, key);
};
