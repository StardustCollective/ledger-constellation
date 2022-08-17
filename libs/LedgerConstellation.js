"use strict";

import ledgerCommUtil from "./ledger-comm.js";
import integrationUtil from "./integration.js";
import addressTranscodeUtil from "./address-transcode.js";
import txTranscodeUtil from "./tx-transcode.js";
import txHashEncodeUtil from "./tx-hash-encode.js";

const getPublicKey = async (config) => {
  return new Promise((resolve, reject) => {
    const callback = async (msg) => {
      if (msg.success) {
        resolve(msg);
      } else {
        resolve(msg);
        if (config.debug) {
          console.log("getPublicKey", "error ", msg);
        }
      }
    };
    ledgerCommUtil.getPublicKey(config.transport, callback);
  });
};

const signTransaction = async (config, amount, toAddress) => {
  /* istanbul ignore if */
  if (config == undefined) {
    throw Error("config is a required parameter.");
  }
  /* istanbul ignore if */
  if (amount == undefined) {
    throw Error("amount is a required parameter.");
  }
  /* istanbul ignore if */
  if (toAddress == undefined) {
    throw Error("toAddress is a required parameter.");
  }

  return new Promise((resolve) => {
    const getAddressCallback = async (msg) => {
      /* istanbul ignore if */
      if (config.debug) {
        console.log("sendAmountUsingLedger", "msg", msg);
      }
      if (msg.success) {
        const publicKey = msg.publicKey;
        /* istanbul ignore if */
        if (config.debug) {
          console.log("sendAmountUsingLedger", "publicKey", publicKey);
        }
        const address =
          addressTranscodeUtil.getAddressFromRawPublicKey(publicKey);
        /* istanbul ignore if */
        if (config.debug) {
          console.log("sendAmountUsingLedger", "address", address);
        }

        const callback = {};
        callback.signEncodedTx = (encodedTx) => {
          return new Promise((resolve, reject) => {
            const signCallback = (response) => {
              /* istanbul ignore if */
              if (config.debug) {
                console.log(
                  "sendAmountUsingLedger",
                  "signCallback",
                  "response",
                  response
                );
              }
              if (response.success) {
                resolve(response.signature);
                // resolve(Buffer.from(response.signature, 'hex'));
              } else {
                reject(Error(response.message));
              }
            };
            /* istanbul ignore if */
            if (config.debug) {
              console.log(
                "sendAmountUsingLedger",
                "signCallback",
                "encodedTx",
                encodedTx
              );
            }
            ledgerCommUtil.sign(config.transport, encodedTx, signCallback);
          });
        };

        resolve(
          await signTransactionCallback(
            config,
            amount,
            toAddress,
            address,
            publicKey,
            callback
          )
        );
      } else {
        resolve(msg);
        /* istanbul ignore if */
        if (config.debug) {
          console.log("getBalanceFromLedger", "error ", msg);
        }
      }
    };
    ledgerCommUtil.getPublicKey(config.transport, getAddressCallback);
  });
};

const signTransactionCallback = async (
  config,
  amount,
  toAddress,
  address,
  publicKey,
  callback
) => {
  const lastRefPath = `/transaction/last-ref/${address}`;
  const lastRefResponse = await integrationUtil.get(config, lastRefPath);
  if (config.debug) {
    console.log("signTransactionCallback", "lastRefResponse", lastRefResponse);
  }

  amount = Number(amount);

  lastRefResponse.tx = {
    edge: {
      observationEdge: {
        parents: [
          {
            hashReference: address,
            hashType: "AddressHash",
          },
          {
            hashReference: toAddress,
            hashType: "AddressHash",
          },
        ],
        data: {
          hashType: "TransactionDataHash",
        },
      },
      signedObservationEdge: {
        signatureBatch: {
          hash: "",
          signatures: [],
        },
      },
      data: {
        amount: amount,
        lastTxRef: {
          prevHash: lastRefResponse.prevHash,
          ordinal: lastRefResponse.ordinal,
        },
        salt: config.salt,
      },
    },
    lastTxRef: {
      prevHash: lastRefResponse.prevHash,
      ordinal: lastRefResponse.ordinal,
    },
    isDummy: false,
    isTest: false,
  };

  if (config.fee > 0) {
    lastRefResponse.tx.edge.data.fee = config.fee;
  }

  const hashReference = txHashEncodeUtil.encodeTxHash(lastRefResponse.tx, true);
  lastRefResponse.tx.edge.observationEdge.data.hashReference = hashReference;

  const encodedTx = txTranscodeUtil.encodeTx(lastRefResponse.tx, false, false);

  try {
    const signature = await callback.signEncodedTx(encodedTx);
    const successResponse = {};
    successResponse.success = true;
    successResponse.signature = signature;
    successResponse.message = "Transaction Signed Successfully";
    return successResponse;
  } catch (error) {
    const errorResponse = {};
    errorResponse.success = false;
    errorResponse.message = error.message;
    return errorResponse;
  }
};

export default {};
export { signTransaction, getPublicKey };
