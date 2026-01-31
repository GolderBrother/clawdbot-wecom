import crypto from "crypto";

export function verifySignature(
  token: string,
  timestamp: string,
  nonce: string,
  signature: string
): boolean {
  const arr = [token, timestamp, nonce].sort();
  const str = arr.join("");
  const sha1 = crypto.createHash("sha1").update(str).digest("hex");
  return sha1 === signature;
}

export function decryptMessage(
  encodingAESKey: string,
  nonce: string,
  ciphertext: string
): string {
  // AES key is base64 encoded
  const aesKey = Buffer.from(encodingAESKey + "=", "base64");

  // Decrypt ciphertext
  const decipher = crypto.createDecipheriv(
    "aes-256-cbc",
    aesKey,
    Buffer.from(nonce, "utf-8")
  );

  decipher.setAutoPadding(false);

  const ciphertextBuffer = Buffer.from(ciphertext, "base64");
  let decrypted = decipher.update(ciphertextBuffer);
  decrypted = Buffer.concat([decrypted, decipher.final()]);

  // Remove PKCS#7 padding
  const pad = decrypted[decrypted.length - 1];
  decrypted = decrypted.subarray(0, decrypted.length - pad);

  // Decode message
  const message = decrypted.toString("utf-8");

  // Extract length and random bytes (first 16 bytes)
  const msgLength = decrypted.readUInt32BE(16);
  const msgContent = decrypted.subarray(20, 20 + msgLength);

  return msgContent.toString("utf-8");
}

export function encryptMessage(
  encodingAESKey: string,
  nonce: string,
  message: string
): string {
  const aesKey = Buffer.from(encodingAESKey + "=", "base64");

  // Create 32-bit length prefix + 16-byte random nonce + message
  const msgBuffer = Buffer.from(message, "utf-8");
  const lengthBuffer = Buffer.alloc(4);
  lengthBuffer.writeUInt32BE(msgBuffer.length, 0);

  const randomBytes = Buffer.from(nonce, "utf-8");

  const content = Buffer.concat([lengthBuffer, randomBytes, msgBuffer]);

  // PKCS#7 padding
  const blockSize = 32;
  const paddingLength = blockSize - (content.length % blockSize);
  const paddingBuffer = Buffer.alloc(paddingLength, paddingLength);

  const paddedContent = Buffer.concat([content, paddingBuffer]);

  // Encrypt
  const cipher = crypto.createCipheriv(
    "aes-256-cbc",
    aesKey,
    randomBytes.subarray(0, 16)
  );
  cipher.setAutoPadding(false);

  let encrypted = cipher.update(paddedContent);
  encrypted = Buffer.concat([encrypted, cipher.final()]);

  return encrypted.toString("base64");
}

export function generateRandomString(length = 16): string {
  return crypto.randomBytes(length).toString("hex");
}
