const encoder = new TextEncoder();
const decoder = new TextDecoder();

const b64 = (bytes) => btoa(String.fromCharCode(...new Uint8Array(bytes)));
const unb64 = (value) => Uint8Array.from(atob(value), (c) => c.charCodeAt(0));

export const generateIdentityKeyPair = () =>
  crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveKey", "deriveBits"]
  );

export const exportPublicKey = (key) => crypto.subtle.exportKey("jwk", key);

export const importPublicKey = (jwk) =>
  crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "ECDH", namedCurve: "P-256" },
    true,
    []
  );

export const deriveMessageKey = async (privateKey, publicKey, salt) => {
  const shared = await crypto.subtle.deriveBits(
    { name: "ECDH", public: publicKey },
    privateKey,
    256
  );
  const base = await crypto.subtle.importKey("raw", shared, "HKDF", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt,
      info: encoder.encode("webxwhale-e2ee-v1"),
    },
    base,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
};

export const encryptMessage = async (text, key) => {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoder.encode(text)
  );
  return { ciphertext: b64(ciphertext), iv: b64(iv) };
};

export const decryptMessage = async ({ ciphertext, iv }, key) => {
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: unb64(iv) },
    key,
    unb64(ciphertext)
  );
  return decoder.decode(plaintext);
};

export const base64ToBytes = unb64;
export const bytesToBase64 = b64;
