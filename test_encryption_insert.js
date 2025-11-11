import db from "./config/db.js";
import { encryptText, saveBundle } from "./modules/encryption_module.js";

function maybeEncryptPayload(species) {
  // this function is to build the payload correctly
  if (species.is_endangered === 1) {
    const bundle = encryptText(JSON.stringify(species));
    return saveBundle(bundle);            // encrypted JSON string
  }
  return null;                            // not endangered → no payload
}

async function insertOne(species) {
  const payloadJson = maybeEncryptPayload(species);

  const sql = `
    INSERT INTO species
      (scientific_name, common_name, is_endangered, description, image_url, species_payload_json)
    VALUES (?, ?, ?, ?, ?, ?)
  `;
  await db.query(sql, [
    species.scientific_name,
    species.common_name,
    species.is_endangered,
    species.description,
    species.image_url,
    payloadJson,                         // will be NULL for non-endangered
  ]);
}

async function run() {
  try {
    const endangered = {
      scientific_name: "Rafflesia arnoldii",
      common_name: "Corpse Flower",
      is_endangered: 1,
      description: "A rare parasitic plant found in Southeast Asia.",
      image_url: "https://example.com/rafflesia.jpg",
    };

    const nonEndangered = {
      scientific_name: "Chamaedorea seifrizii",
      common_name: "Bamboo Palm",
      is_endangered: 0,
      description: "A common ornamental indoor palm species.",
      image_url: "https://example.com/bamboopalm.jpg",
    };

    await insertOne(endangered);
    await insertOne(nonEndangered);
    console.log("OK: inserted species with conditional encryption");
  } catch (e) {
    console.error("Insert error:", e.message);
  } finally {
    await db.end();
  }
}

run();
