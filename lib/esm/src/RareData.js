import * as crypto from 'crypto-browserify';
import { Buffer } from 'buffer';
const ALGO = 'aes-256-gcm';
class RareData {
    // ECIES is implemented for data encryption
    static encryptData = async (toPubKeyHex, data, fromPrivKeyHex) => {
        // convert hex key to buffer key
        const toPubKeyBuffer = Buffer.from(toPubKeyHex, 'hex');
        // convert data to buffer
        const fromAlice = await crypto.createECDH('secp256k1');
        let fromPubKey;
        if (fromPrivKeyHex === undefined) {
            fromPubKey = await fromAlice.generateKeys();
        }
        else {
            // convert hex key to buffer key
            const fromPrivKeyBuffer = Buffer.from(fromPrivKeyHex, 'hex');
            fromAlice.setPrivateKey(fromPrivKeyBuffer);
            fromPubKey = fromAlice.getPublicKey();
        }
        const ecdhKey = await fromAlice.computeSecret(toPubKeyBuffer);
        // aes-256-gcm is implemented as symmetric key encryption
        const initializationVector = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv(ALGO, ecdhKey, initializationVector);
        const firstChunk = cipher.update(data);
        const secondChunk = cipher.final();
        const tag = cipher.getAuthTag();
        return Buffer
            .concat([firstChunk, secondChunk, tag, initializationVector, fromPubKey])
            .toString('base64');
    };
    // decrypt encrypted data
    static decryptData = async (privKeyHex, encryptedData) => {
        // covert string to buffer for encryptedData
        const encryptedDataShared = Buffer.from(encryptedData, 'base64');
        // convert hex key to buffer key
        const privKeyBuffer = Buffer.from(privKeyHex, 'hex');
        // get fromPubKey and compute ecdh key
        const fromPubKey = Buffer.from(encryptedDataShared.slice(encryptedDataShared.length - 65));
        const toBob = await crypto.createECDH('secp256k1');
        toBob.setPrivateKey(privKeyBuffer);
        const ecdhKey = await toBob.computeSecret(fromPubKey);
        // aes-256-gcm is implemented as symmetric key decryption
        const initializationVector = encryptedDataShared.slice(encryptedDataShared.length - 81, encryptedDataShared.length - 65);
        const tag = encryptedDataShared.slice(encryptedDataShared.length - 97, encryptedDataShared.length - 81);
        const encryptedMessage = encryptedDataShared.slice(0, encryptedDataShared.length - 97);
        const decipher = crypto.createDecipheriv(ALGO, ecdhKey, initializationVector);
        decipher.setAuthTag(tag);
        const firstChunk = decipher.update(encryptedMessage);
        const secondChunk = decipher.final();
        return Buffer.concat([firstChunk, secondChunk]).toString();
    };
}
export default RareData;
