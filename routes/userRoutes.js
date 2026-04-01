const express = require("express");
const { userAuth } = require("../Middleware/userAuth");
const { 
    getUserData, 
    updateUserProfile,
    getBalance,
    addBalance,
    withdrawBalance,
    getTransactionHistory,
    deleteAccount
} = require("../controllers/userController");
const userRouter = express.Router();


userRouter.get('/data', userAuth, getUserData);
userRouter.put('/profile', userAuth, updateUserProfile);


userRouter.get('/balance', userAuth, getBalance);
userRouter.post('/add-balance', userAuth, addBalance);
userRouter.post('/withdraw-balance', userAuth, withdrawBalance);


userRouter.get('/transactions', userAuth, getTransactionHistory);


userRouter.delete('/account', userAuth, deleteAccount);

module.exports = { userRouter };