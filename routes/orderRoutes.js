const express = require('express');
const router = express.Router();
const { userAuth } = require('../Middleware/userAuth');
const { userModel } = require('../Model/userModel');

// Place order endpoint
router.post('/place-order', userAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        const { symbol, companyName, quantity, orderType, price, total } = req.body;

        // Validate input
        if (!symbol || !quantity || !price || !total) {
            return res.status(400).json({ 
                success: false, 
                message: 'Missing required fields' 
            });
        }

        // Validate quantity
        if (quantity <= 0) {
            return res.status(400).json({ 
                success: false, 
                message: 'Quantity must be greater than 0' 
            });
        }

        // Find user
        const user = await userModel.findById(userId);
        if (!user) {
            return res.status(404).json({ 
                success: false, 
                message: 'User not found' 
            });
        }

        // Check if user has sufficient balance
        if (user.currentBalance < total) {
            return res.status(400).json({ 
                success: false, 
                message: 'Insufficient balance',
                currentBalance: user.currentBalance,
                requiredAmount: total
            });
        }

        // Create stock transaction object
        const stockTransaction = {
            stockName: symbol,
            buyingPrice: price,
            buyingQuantity: quantity,
            buyingDate: new Date(),
            sellingDate: null,
            sellingPrice: null
        };

        // Add transaction to user's stockTransactions array
        user.stockTransactions.push(stockTransaction);
        
        // Deduct from current balance
        user.currentBalance -= total;

        // Save to database
        await user.save();

        res.status(200).json({
            success: true,
            message: 'Order placed successfully',
            data: {
                transaction: stockTransaction,
                newBalance: user.currentBalance,
                totalInvested: total
            }
        });

    } catch (error) {
        console.error('Error placing order:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server error', 
            error: error.message 
        });
    }
});

// Get user's portfolio (all stocks and balance)
router.get('/portfolio', userAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await userModel.findById(userId);
        
        if (!user) {
            return res.status(404).json({ 
                success: false, 
                message: 'User not found' 
            });
        }

        // Separate active holdings (not sold) and completed transactions
        const activeHoldings = user.stockTransactions.filter(
            transaction => transaction.sellingDate === null
        );
        
        const completedTransactions = user.stockTransactions.filter(
            transaction => transaction.sellingDate !== null
        );

        res.status(200).json({
            success: true,
            data: {
                currentBalance: user.currentBalance,
                activeHoldings: activeHoldings,
                completedTransactions: completedTransactions,
                totalTransactions: user.stockTransactions.length
            }
        });

    } catch (error) {
        console.error('Error fetching portfolio:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server error' 
        });
    }
});

// Get user's holdings (grouped by stock with totals) - ADD THIS NEW ENDPOINT
router.get('/holdings', userAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        console.log('Fetching holdings for user:', userId);
        
        const user = await userModel.findById(userId);
        
        if (!user) {
            console.log('User not found:', userId);
            return res.status(404).json({ 
                success: false, 
                message: 'User not found' 
            });
        }

        console.log('Total transactions found:', user.stockTransactions.length);

        // Filter only active holdings (not sold)
        const activeHoldings = user.stockTransactions.filter(
            transaction => transaction.sellingDate === null
        );

        console.log('Active holdings count:', activeHoldings.length);

        // Group holdings by stock name
        const holdingsMap = new Map();
        
        activeHoldings.forEach(transaction => {
            const stockName = transaction.stockName;
            if (holdingsMap.has(stockName)) {
                const existing = holdingsMap.get(stockName);
                const totalQuantity = existing.quantity + transaction.buyingQuantity;
                const totalCost = existing.totalCost + (transaction.buyingPrice * transaction.buyingQuantity);
                holdingsMap.set(stockName, {
                    stockName: stockName,
                    quantity: totalQuantity,
                    totalCost: totalCost,
                    avgPrice: totalCost / totalQuantity,
                    transactions: [...existing.transactions, transaction]
                });
            } else {
                holdingsMap.set(stockName, {
                    stockName: stockName,
                    quantity: transaction.buyingQuantity,
                    totalCost: transaction.buyingPrice * transaction.buyingQuantity,
                    avgPrice: transaction.buyingPrice,
                    transactions: [transaction]
                });
            }
        });

        const holdings = Array.from(holdingsMap.values());
        console.log('Processed holdings count:', holdings.length);

        res.status(200).json({
            success: true,
            data: {
                holdings: holdings,
                currentBalance: user.currentBalance
            }
        });

    } catch (error) {
        console.error('Error fetching holdings:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server error',
            error: error.message 
        });
    }
});

// Get specific stock details
router.get('/stock/:symbol', userAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        const { symbol } = req.params;
        
        const user = await userModel.findById(userId);
        
        if (!user) {
            return res.status(404).json({ 
                success: false, 
                message: 'User not found' 
            });
        }

        // Find all transactions for specific stock
        const stockTransactions = user.stockTransactions.filter(
            transaction => transaction.stockName === symbol
        );

        // Calculate total holdings for this stock (active only)
        const activeHoldings = stockTransactions.filter(
            transaction => transaction.sellingDate === null
        );
        
        const totalQuantity = activeHoldings.reduce(
            (sum, holding) => sum + holding.buyingQuantity, 0
        );
        
        const totalInvestment = activeHoldings.reduce(
            (sum, holding) => sum + (holding.buyingPrice * holding.buyingQuantity), 0
        );

        res.status(200).json({
            success: true,
            data: {
                symbol,
                transactions: stockTransactions,
                activeHoldings: activeHoldings,
                totalQuantity,
                totalInvestment,
                averageBuyPrice: totalQuantity > 0 ? totalInvestment / totalQuantity : 0
            }
        });

    } catch (error) {
        console.error('Error fetching stock details:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server error' 
        });
    }
});

// Sell stock endpoint
router.post('/sell-stock', userAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        const { transactionId, sellingPrice, quantity } = req.body;

        if (!transactionId || !sellingPrice || !quantity) {
            return res.status(400).json({ 
                success: false, 
                message: 'Missing required fields' 
            });
        }

        const user = await userModel.findById(userId);
        
        if (!user) {
            return res.status(404).json({ 
                success: false, 
                message: 'User not found' 
            });
        }

        // Find the transaction
        const transaction = user.stockTransactions.id(transactionId);
        
        if (!transaction) {
            return res.status(404).json({ 
                success: false, 
                message: 'Transaction not found' 
            });
        }

        // Check if already sold
        if (transaction.sellingDate !== null) {
            return res.status(400).json({ 
                success: false, 
                message: 'Stock already sold' 
            });
        }

        // Check if selling quantity is valid
        if (quantity > transaction.buyingQuantity) {
            return res.status(400).json({ 
                success: false, 
                message: 'Cannot sell more than purchased quantity' 
            });
        }

        
        const totalSellingAmount = sellingPrice * quantity;
        
        // Update transaction
        transaction.sellingDate = new Date();
        transaction.sellingPrice = sellingPrice;
        
        // Add to current balance
        user.currentBalance += totalSellingAmount;
        
        // Calculate profit/loss
        const totalBuyingAmount = transaction.buyingPrice * transaction.buyingQuantity;
        const profitLoss = totalSellingAmount - totalBuyingAmount;

        await user.save();

        res.status(200).json({
            success: true,
            message: 'Stock sold successfully',
            data: {
                transaction,
                newBalance: user.currentBalance,
                profitLoss: profitLoss,
                totalSellingAmount: totalSellingAmount
            }
        });

    } catch (error) {
        console.error('Error selling stock:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server error' 
        });
    }
});

module.exports = router;