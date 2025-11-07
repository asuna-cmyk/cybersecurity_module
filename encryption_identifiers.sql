ALTER TABLE users
  ADD COLUMN email_index CHAR(44) UNIQUE AFTER email,
  ADD COLUMN email_bundle_json JSON NULL AFTER email_index,
  ADD COLUMN username_index CHAR(44) UNIQUE AFTER username,
  ADD COLUMN username_bundle_json JSON NULL AFTER username_index;

ALTER TABLE species
  ADD COLUMN species_payload_json JSON NULL AFTER image_url;

ALTER TABLE plant_observations
  ADD COLUMN observation_payload_json JSON NULL AFTER status;

ALTER TABLE ai_results
  ADD COLUMN ai_payload_json JSON NULL AFTER rank;

ALTER TABLE sensor_devices
  ADD COLUMN device_payload_json JSON NULL AFTER is_active;

ALTER TABLE sensor_readings
  ADD COLUMN reading_payload_json JSON NULL AFTER alert_generated;
