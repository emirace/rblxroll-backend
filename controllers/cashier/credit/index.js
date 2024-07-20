// Load database models
const CreditTransaction = require("../../../database/models/CreditTransaction");

// Load utils
const { socketRemoveAntiSpam } = require("../../../utils/socket");
const {
  cashierCheckSendCreditDepositData,
} = require("../../../utils/cashier/credit");
const skinsdripSDK = require("@bananastressreliever/skinsdrip-sdk").default;

const skinsdrip = new skinsdripSDK(
  process.env.SKINSDRIP_MERCHANT,
  process.env.SKINSDRIP_SECRET
);

const cashierSendCreditDepositSocket = async (
  io,
  socket,
  user,
  data,
  callback
) => {
  try {
    // Validate sent data
    cashierCheckSendCreditDepositData(data);

    // Validate input
    const amount = parseFloat(data.amount);
    if (isNaN(amount) || amount <= 0) {
      return callback({
        success: false,
        error: { type: "error", message: "Invalid deposit amount." },
      });
    }
    console.log("b4");
    // Must run this command before making any other calls
    const res = await skinsdrip.authenticate();
    console.log("after auth", res);
    const checkoutUrlRes = await skinsdrip.getPaySession(
      process.env.SKINSDRIP_MERCHANT
    );
    console.log("after");

    const url = checkoutUrlRes.data.url;
    const orderId = checkoutUrlRes.data.orderId;
    console.log(url, orderId);
    // Save deposit request to database
    let transactionDatabase = await CreditTransaction.findOne({
      type: "deposit",
      user: user._id,
      state: "created",
      amount,
    })
      .select("data type user state")
      .lean();

    if (transactionDatabase === null) {
      transactionDatabase = await CreditTransaction.create({
        data: {
          providerId: orderId,
          providerUrl: url,
          amountCurrency: amount,
          currency: "usd",
        },
        type: "deposit",
        user: user._id,
        amount,
        state: "created",
      });

      transactionDatabase = transactionDatabase.toObject();
    }

    callback({ success: true, url: transactionDatabase.data.providerUrl });

    socketRemoveAntiSpam(user._id);
  } catch (err) {
    console.log("error", err);
    socketRemoveAntiSpam(socket.decoded._id);
    callback({
      success: false,
      error: { type: "error", message: err.message || err.msg },
    });
  }
};

// const cashierSendCreditDepositSocket = async(io, socket, user, data, callback) => {
//     try {
//         // Validate sent data
//         cashierCheckSendCreditDepositData(data);

//         // Get active user steam transaction from database
//         let transactionDatabase = await CreditTransaction.findOne({ type: 'deposit', user: user._id, state: 'created' }).select('data type user state').lean();

//         if(transactionDatabase === null) {
//             // Create body object
//             let body = { userId: user._id.toString() };

//             // Create signature and add to body
//             body.signature = cashierCreditCreateSignature(body);

//             // Create zebrasmarket transaction
//             const transactionData = await cashierCreditCreateTransaction(body);

//             // Create new credit transaction in database
//             transactionDatabase = await CreditTransaction.create({
//                 data: {
//                     providerId: transactionData.orderId,
//                     providerUrl: transactionData.url
//                 },
//                 type: 'deposit',
//                 user: user._id,
//                 state: 'created'
//             });

//             // Convert transaction to javascript object
//             transactionDatabase = transactionDatabase.toObject();
//         }

//         // Get sent amount
//         const amount = String(Math.floor(data.amount) / 1000 * 3 / 1000);

//         // Get zebrasmarket url
//         const urlData = await cashierCreditCreateUrl(transactionDatabase.data.providerUrl, amount);

//         callback({ success: true, url: urlData });

//         socketRemoveAntiSpam(user._id);
//     } catch(err) {
//         socketRemoveAntiSpam(socket.decoded._id);
//         callback({ success: false, error: { type: 'error', message: err.message } });
//     }
// }

module.exports = {
  cashierSendCreditDepositSocket,
};
