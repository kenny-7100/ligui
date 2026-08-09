use k256::{EncodedPoint, SecretKey, elliptic_curve::sec1::ToEncodedPoint};
use sha3::{Digest, Keccak256};
use wasm_bindgen::prelude::*;

const PRIVATE_KEY_LENGTH: usize = 32;
const ADDRESS_LENGTH: usize = 20;

fn increment_private_key(private_key: &mut [u8; PRIVATE_KEY_LENGTH]) {
    loop {
        for byte in private_key.iter_mut().rev() {
            let (value, overflow) = byte.overflowing_add(1);
            *byte = value;

            if !overflow {
                break;
            }
        }

        if SecretKey::from_slice(private_key).is_ok() {
            return;
        }
    }
}

#[wasm_bindgen]
pub fn generate_batch(start_private_key: &[u8], count: u32) -> Result<Vec<u8>, JsValue> {
    if start_private_key.len() != PRIVATE_KEY_LENGTH {
        return Err(JsValue::from_str("Private key must contain 32 bytes"));
    }

    if count == 0 {
        return Err(JsValue::from_str("Batch size must be greater than zero"));
    }

    let mut private_key = [0_u8; PRIVATE_KEY_LENGTH];
    private_key.copy_from_slice(start_private_key);

    while SecretKey::from_slice(&private_key).is_err() {
        increment_private_key(&mut private_key);
    }

    let mut last_private_key = private_key;
    let mut last_address = [0_u8; ADDRESS_LENGTH];

    for _ in 0..count {
        let secret_key = SecretKey::from_slice(&private_key)
            .map_err(|_| JsValue::from_str("Invalid secp256k1 private key"))?;
        let public_key: EncodedPoint = secret_key.public_key().to_encoded_point(false);
        let hash = Keccak256::digest(&public_key.as_bytes()[1..]);

        last_private_key.copy_from_slice(&private_key);
        last_address.copy_from_slice(&hash[12..]);
        increment_private_key(&mut private_key);
    }

    let mut result = Vec::with_capacity(PRIVATE_KEY_LENGTH * 2 + ADDRESS_LENGTH);
    result.extend_from_slice(&last_private_key);
    result.extend_from_slice(&last_address);
    result.extend_from_slice(&private_key);
    Ok(result)
}
