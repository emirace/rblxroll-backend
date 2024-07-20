const validator = require("validator");
const fetch = require("node-fetch");
const crypto = require("crypto");
const axios = require("axios");

const cashierCheckSendCryptoWithdrawData = (data) => {
  if (data === undefined || data === null) {
    throw new Error("Something went wrong. Please try again in a few seconds.");
  } else if (
    data.currency === undefined ||
    typeof data.currency !== "string" ||
    ["btc", "eth", "ltc"].includes(data.currency) !== true
  ) {
    throw new Error("You’ve entered an invalid withdraw currency.");
  } else if (
    data.amount === undefined ||
    isNaN(data.amount) === true ||
    Math.floor(data.amount) <= 0
  ) {
    throw new Error("You’ve entered an invalid withdraw amount.");
  } else if (
    data.address === undefined ||
    typeof data.address !== "string" ||
    (data.currency === "btc" &&
      validator.isBtcAddress(data.address) !== true) ||
    (data.currency === "eth" &&
      validator.isEthereumAddress(data.address) !== true) ||
    (data.currency === "ltc" &&
      /^([LM3]{1}[a-km-zA-HJ-NP-Z1-9]{26,33}||ltc1[a-z0-9]{39,59})$/.test(
        data.address
      ) !== true)
  ) {
    throw new Error(
      `You’ve entered an invalid ${data.currency} withdraw address.`
    );
  }
};

const cashierCheckSendCryptoWithdrawUser = (data, user) => {
  if (user.balance < Math.floor(data.amount)) {
    throw new Error("You don’t have enough balance for this action.");
  } else if (user.limits.betToWithdraw >= 10) {
    throw new Error(
      `You need to wager ${parseFloat(
        Math.floor(user.limits.betToWithdraw / 10) / 100
      )
        .toFixed(2)
        .replace(/\B(?=(\d{3})+(?!\d))/g, ",")} more before you can withdraw.`
    );
  } else if (user.limits.blockSponsor === true) {
    throw new Error(
      "You aren`t allowed to withdraw at the moment. Please contact the support for more information."
    );
  }
};

const cashierCheckSendCryptoWithdrawTransactions = (transactionsDatabase) => {
  if (transactionsDatabase.length >= 5) {
    throw new Error(
      "You aren`t allowed to have more then 5 pending crypto withdraws."
    );
  }
};

// const cashierCryptoGetPrices = () => {
//   return new Promise(async (resolve, reject) => {
//     try {
//       // Create body object
//       const body = {
//         cmd: "rates",
//         short: 1,
//         accepted: 2,
//         key: process.env.COINPAYMENTS_API_KEY,
//         version: 1,
//         format: "json",
//       };

//       // Convert body object to string
//       const bodyString = Object.entries(body)
//         .map(([key, value]) => `${key}=${value}`)
//         .join("&");

//       // Create headers object
//       let headers = {
//         "content-type": "application/x-www-form-urlencoded",
//         hmac: crypto
//           .createHmac("sha512", process.env.COINPAYMENTS_PRIVATE_KEY)
//           .update(bodyString)
//           .digest("hex"),
//       };

//       // Send get crypto deposit address
//       let response = await fetch(`https://www.coinpayments.net/api.php`, {
//         method: "POST",
//         headers: headers,
//         body: new URLSearchParams(body),
//       });

//       // Check if the response is successful
//       if (response.ok) {
//         response = await response.json();
//         resolve(response.result);
//       } else {
//         reject(new Error(response.statusText));
//       }
//     } catch (err) {
//       reject(err);
//     }
//   });
// };

// const cashierCryptoGenerateAddress = (currency) => {
//     return new Promise(async(resolve, reject) => {
//         try {
//             // Create body object
//             const body = {
//                 cmd: 'get_callback_address',
//                 currency: currency,
//                 key: process.env.COINPAYMENTS_API_KEY,
//                 version: 1,
//                 format: 'json'
//             };

//             // Convert body object to string
//             const bodyString = Object.entries(body).map(([key, value]) => `${key}=${value}`).join('&');

//             // Create headers object
//             let headers = {
//                 'content-type': 'application/x-www-form-urlencoded',
//                 'hmac': crypto.createHmac('sha512', process.env.COINPAYMENTS_PRIVATE_KEY).update(bodyString).digest('hex')
//             };

//             // Send get crypto deposit address
//             let response = await fetch(`https://www.coinpayments.net/api.php`, {
//                 method: 'POST',
//                 headers: headers,
//                 body: new URLSearchParams(body)
//             });

//             // Check if the response is successful
//             if(response.ok) {
//                 response = await response.json();
//                 resolve(response.result);
//             } else {
//                 reject(new Error(response.statusText));
//             }
//         } catch(err) {
//             reject(err);
//         }
//     });
// }

const cashierCryptoGetPrices = () => {
  return new Promise(async (resolve, reject) => {
    try {
      // const response = await axios.get('https://api.oxapay.com/price', {
      //   headers: {
      //     'Authorization': `Bearer ${process.env.OXAPAY_API_KEY}`
      //   }
      // });

      let response = await axios.get("https://oxapay.onrender.com/get-prices", {
        headers: {
          "Content-Type": "application/json",
        },
      });
      console.log(response.data);

      if (response.status === 200 && response.data.result === 100) {
        resolve(response.data.data);
      } else {
        reject(new Error(response.data.message || "Failed to fetch prices"));
      }
    } catch (err) {
      reject(err);
    }
  });
};

const cashierCryptoGenerateAddress = (currency) => {
  return new Promise(async (resolve, reject) => {
    try {
      // Create the request body
      const body = {
        merchant: process.env.OXAPAY_API_KEY,
        currency: currency,
        callbackUrl: `${process.env.SERVER_BACKEND_URL}/callback/oxapay`, // Replace with your actual callback URL
        network: "default", // Optional: specify the network if needed
      };

      // Send the request to Oxapay
      let response = await axios.post(
        "https://oxapay.onrender.com/generate-address",
        { currency },
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
      // Check if the response is successful
      if (response.status === 200) {
        resolve(response.data);
      } else {
        reject(new Error(response.statusText));
      }
    } catch (err) {
      reject(err);
    }
  });
};

module.exports = {
  cashierCheckSendCryptoWithdrawData,
  cashierCheckSendCryptoWithdrawUser,
  cashierCheckSendCryptoWithdrawTransactions,
  cashierCryptoGetPrices,
  cashierCryptoGenerateAddress,
};
