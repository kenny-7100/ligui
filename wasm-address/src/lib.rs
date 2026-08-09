use k256::{
    AffinePoint, ProjectivePoint, SecretKey,
    elliptic_curve::{BatchNormalize, sec1::ToEncodedPoint},
};
use sha3::{Digest, Keccak256};
use wasm_bindgen::prelude::*;

const PRIVATE_KEY_LENGTH: usize = 32;
const ADDRESS_LENGTH: usize = 20;
const MAX_POINT_BATCH_SIZE: usize = 16_384;

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

    let secret_key = SecretKey::from_slice(&private_key)
        .map_err(|_| JsValue::from_str("Invalid secp256k1 private key"))?;
    let mut public_key = ProjectivePoint::from(secret_key.public_key());
    let mut projective_points = Vec::with_capacity((count as usize).min(MAX_POINT_BATCH_SIZE));
    let mut last_private_key = private_key;
    let mut last_address = [0_u8; ADDRESS_LENGTH];
    let mut remaining = count as usize;

    while remaining > 0 {
        let batch_len = remaining.min(MAX_POINT_BATCH_SIZE);
        projective_points.clear();

        for _ in 0..batch_len {
            projective_points.push(public_key);
            public_key += AffinePoint::GENERATOR;
            last_private_key.copy_from_slice(&private_key);
            increment_private_key(&mut private_key);
        }

        let affine_points = <ProjectivePoint as BatchNormalize<[ProjectivePoint]>>::batch_normalize(
            projective_points.as_slice(),
        );

        for point in &affine_points {
            let encoded_point = point.to_encoded_point(false);
            let hash = Keccak256::digest(&encoded_point.as_bytes()[1..]);
            last_address.copy_from_slice(&hash[12..]);
        }

        remaining -= batch_len;
    }

    let mut result = Vec::with_capacity(PRIVATE_KEY_LENGTH * 2 + ADDRESS_LENGTH);
    result.extend_from_slice(&last_private_key);
    result.extend_from_slice(&last_address);
    result.extend_from_slice(&private_key);
    Ok(result)
}
