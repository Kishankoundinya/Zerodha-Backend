const { userModel } = require('../Model/userModel');

// Get user data
const getUserData = async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await userModel.findById(userId);
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User doesn't exist"
            });
        }

        return res.status(200).json({
            success: true,
            userData: {
                name: user.name,
                email: user.email,
                isAccountVerified: user.isAccountVerified,
                currentBalance: user.currentBalance
            }
        });

    } catch (e) {
        console.error('Error in getUserData:', e.message);
        return res.status(500).json({
            success: false,
            message: e.message || 'Internal server error'
        });
    }
}

// Get user balance
const getBalance = async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await userModel.findById(userId);
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User doesn't exist"
            });
        }

        return res.status(200).json({
            success: true,
            data: {
                balance: user.currentBalance,
                currency: 'INR'
            }
        });

    } catch (e) {
        console.error('Error in getBalance:', e.message);
        return res.status(500).json({
            success: false,
            message: e.message || 'Internal server error'
        });
    }
}

// Add balance to user account
const addBalance = async (req, res) => {
    try {
        const userId = req.user.id;
        const { amount } = req.body;

        // Validate amount
        if (!amount || amount <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Please enter a valid amount greater than 0'
            });
        }

        // Optional: Set maximum deposit limit (10,00,000 INR)
        const maxLimit = 1000000;
        if (amount > maxLimit) {
            return res.status(400).json({
                success: false,
                message: `Maximum deposit limit is ₹${maxLimit.toLocaleString()}`
            });
        }

        const user = await userModel.findById(userId);
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User doesn't exist"
            });
        }

        const oldBalance = user.currentBalance;
        
        // Add balance
        user.currentBalance += amount;
        
        // Add transaction record (if you have transactions array in schema)
        // If not, you can add it to your schema first
        if (!user.transactions) {
            user.transactions = [];
        }
        
        user.transactions.push({
            type: 'credit',
            amount: amount,
            description: `Balance added via funds transfer`,
            date: new Date(),
            status: 'completed',
            balanceAfter: user.currentBalance
        });

        await user.save();

        return res.status(200).json({
            success: true,
            message: `₹${amount.toFixed(2)} added successfully to your account`,
            data: {
                newBalance: user.currentBalance,
                addedAmount: amount,
                oldBalance: oldBalance
            }
        });

    } catch (e) {
        console.error('Error in addBalance:', e.message);
        return res.status(500).json({
            success: false,
            message: e.message || 'Internal server error'
        });
    }
}

// Withdraw balance from user account
const withdrawBalance = async (req, res) => {
    try {
        const userId = req.user.id;
        const { amount } = req.body;

        // Validate amount
        if (!amount || amount <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Please enter a valid amount greater than 0'
            });
        }

        const user = await userModel.findById(userId);
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User doesn't exist"
            });
        }

        // Check sufficient balance
        if (user.currentBalance < amount) {
            return res.status(400).json({
                success: false,
                message: `Insufficient balance. Your current balance is ₹${user.currentBalance.toFixed(2)}`,
                currentBalance: user.currentBalance,
                requestedAmount: amount
            });
        }

        // Optional: Set minimum withdrawal limit
        const minWithdrawal = 100;
        if (amount < minWithdrawal) {
            return res.status(400).json({
                success: false,
                message: `Minimum withdrawal amount is ₹${minWithdrawal}`
            });
        }

        const oldBalance = user.currentBalance;
        
        // Withdraw balance
        user.currentBalance -= amount;
        
        // Add transaction record
        if (!user.transactions) {
            user.transactions = [];
        }
        
        user.transactions.push({
            type: 'debit',
            amount: amount,
            description: `Balance withdrawn`,
            date: new Date(),
            status: 'completed',
            balanceAfter: user.currentBalance
        });

        await user.save();

        return res.status(200).json({
            success: true,
            message: `₹${amount.toFixed(2)} withdrawn successfully from your account`,
            data: {
                newBalance: user.currentBalance,
                withdrawnAmount: amount,
                oldBalance: oldBalance
            }
        });

    } catch (e) {
        console.error('Error in withdrawBalance:', e.message);
        return res.status(500).json({
            success: false,
            message: e.message || 'Internal server error'
        });
    }
}

// Get transaction history
const getTransactionHistory = async (req, res) => {
    try {
        const userId = req.user.id;
        const { limit = 50, page = 1 } = req.query;
        
        const user = await userModel.findById(userId);
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User doesn't exist"
            });
        }

        // Get transactions (if you have them stored)
        let transactions = user.transactions || [];
        
        // Sort by date (newest first)
        transactions = transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        // Pagination
        const startIndex = (page - 1) * limit;
        const endIndex = page * limit;
        const paginatedTransactions = transactions.slice(startIndex, endIndex);
        
        // Calculate summary
        const totalCredits = transactions
            .filter(t => t.type === 'credit')
            .reduce((sum, t) => sum + t.amount, 0);
        
        const totalDebits = transactions
            .filter(t => t.type === 'debit')
            .reduce((sum, t) => sum + t.amount, 0);

        return res.status(200).json({
            success: true,
            data: {
                transactions: paginatedTransactions,
                summary: {
                    totalCredits: totalCredits,
                    totalDebits: totalDebits,
                    netBalance: totalCredits - totalDebits,
                    currentBalance: user.currentBalance,
                    totalTransactions: transactions.length
                },
                pagination: {
                    currentPage: parseInt(page),
                    totalPages: Math.ceil(transactions.length / limit),
                    totalItems: transactions.length,
                    itemsPerPage: parseInt(limit)
                }
            }
        });

    } catch (e) {
        console.error('Error in getTransactionHistory:', e.message);
        return res.status(500).json({
            success: false,
            message: e.message || 'Internal server error'
        });
    }
}

// Update user profile
const updateUserProfile = async (req, res) => {
    try {
        const userId = req.user.id;
        const { name, email } = req.body;

        // Check if at least one field is provided
        if (!name && !email) {
            return res.status(400).json({
                success: false,
                message: 'Please provide at least one field to update'
            });
        }

        // If email is being updated, check if it's already taken
        if (email) {
            const existingUser = await userModel.findOne({ email, _id: { $ne: userId } });
            if (existingUser) {
                return res.status(400).json({
                    success: false,
                    message: 'Email already in use'
                });
            }
        }

        const updateData = {};
        if (name) updateData.name = name;
        if (email) updateData.email = email;

        const user = await userModel.findByIdAndUpdate(
            userId,
            updateData,
            { new: true, runValidators: true }
        ).select('-password -verifyOtp -verifyOtpExpiresAt -resetOtp -resetOtpExpiresAt');

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User doesn't exist"
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Profile updated successfully',
            userData: {
                id: user._id,
                name: user.name,
                email: user.email,
                isAccountVerified: user.isAccountVerified,
                currentBalance: user.currentBalance
            }
        });

    } catch (e) {
        console.error('Error in updateUserProfile:', e.message);
        return res.status(500).json({
            success: false,
            message: e.message || 'Internal server error'
        });
    }
}

// Delete user account
const deleteAccount = async (req, res) => {
    try {
        const userId = req.user.id;
        const { confirm } = req.body;
        
        // Require confirmation
        if (confirm !== 'DELETE') {
            return res.status(400).json({
                success: false,
                message: 'Please type "DELETE" to confirm account deletion'
            });
        }

        const user = await userModel.findById(userId);
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User doesn't exist"
            });
        }

        // Check if user has any active holdings
        const activeHoldings = user.stockTransactions.filter(
            transaction => transaction.sellingDate === null
        );
        
        if (activeHoldings.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Cannot delete account with active holdings. Please sell all stocks first.',
                activeHoldings: activeHoldings.length
            });
        }

        // Delete user account
        await userModel.findByIdAndDelete(userId);

        return res.status(200).json({
            success: true,
            message: 'Account deleted successfully'
        });

    } catch (e) {
        console.error('Error in deleteAccount:', e.message);
        return res.status(500).json({
            success: false,
            message: e.message || 'Internal server error'
        });
    }
}

module.exports = { 
    getUserData,
    getBalance,
    addBalance,
    withdrawBalance,
    getTransactionHistory,
    updateUserProfile,
    deleteAccount
};