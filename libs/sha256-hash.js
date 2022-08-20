"user strict";

const crypto = require('crypto');

const sha256Hash = (buffer) => {
  return crypto.createHash("sha256").update(buffer).digest();
};

module.exports = {
  sha256Hash,
};
