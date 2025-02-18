"user strict";

const LedgerConstellation = require("./libs/LedgerConstellation.js");
const http = require("http");
class Index {
  constructor(transport, debug) {
    if (!transport) {
      throw "Error: Missing Transport";
    }
    this.config = {};
    // config.fee = 1;
    this.config.debug = debug || false;
    this.config.http = http;
    this.config.transport = transport;
    this.config.hostname = "lb.constellationnetwork.io";
    this.config.port = 9000;
    this.config.salt = 0;
  }

  async signTransaction(amount, toAddress) {
    const response = await LedgerConstellation.signTransaction(
      this.config,
      amount,
      toAddress
    );
    if (response.success) {
      if (this.config.debug) {
        console.log("Signature: ", response.signature);
      }
      return response.signature;
    } else {
      console.log("send error", response.message);
    }
  }

  // TODO
  async signMessage() {}

  async getPublicKey() {
    const response = await LedgerConstellation.getPublicKey(this.config);
    if (response.success) {
      if (this.config.debug) {
        console.log("Public Key: ", response.publicKey);
      }
      return response.publicKey;
    } else {
      console.log("Error: ", response.message);
    }
  }
}

module.exports = Index;
