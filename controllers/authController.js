const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { userModel } = require('../Model/userModel');
const transporter = require('../Config/Nodemailer');

/////////// register function/////////////
const register = async (req, res) => {
    const { name, email, password } = req.body;
    if (!name || !password || !email) {
        return res.json({ success: false, message: 'Missing details' });
    }
    try {
        const existingUser = await userModel.findOne({ email });
        if (existingUser) {
            return res.json({ success: false, message: 'User Already Exists' });
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = new userModel({ name, email, password: hashedPassword, balance: 100000 });
        await user.save();

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET_KEY, { expiresIn: '7d' });

        // FORCED CROSS-SITE COOKIE SETTINGS FOR PRODUCTION
        const isProduction = process.env.NODE_ENV === 'production';
        
        res.cookie('token', token, {
            httpOnly: true,
            secure: true,  // Force true for cross-site
            sameSite: 'none',  // Force 'none' for cross-site
            maxAge: 7 * 24 * 60 * 60 * 1000,
            path: '/',
            domain: isProduction ? '.onrender.com' : undefined  // Add domain only in production
        });

        // Log cookie settings
        console.log('✅ Registration - Cookie set with:', {
            secure: true,
            sameSite: 'none',
            domain: isProduction ? '.onrender.com' : 'localhost',
            environment: process.env.NODE_ENV
        });

        // SENDING WELCOME EMAIL
        const mailOptions = {
            from: process.env.SENDER_EMAIL,
            to: email,
            subject: 'Welcome to TradeX',
            text: `Welcome to TradeX website, Your Account has been created with email id: ${email}`
        };

        await transporter.sendMail(mailOptions);

        // Send user data back
        const userData = {
            _id: user._id,
            name: user.name,
            email: user.email,
            balance: user.balance || 0,
            isAccountVerified: user.isAccountVerified || false
        };

        return res.json({ success: true, userData: userData });
    }
    catch (e) {
        console.error('❌ Registration error:', e.message);
        return res.json({ success: false, message: e.message });
    }
}

/////////////////Login function/////////////
const login = async (req, res) => {
    const { email, password } = req.body;
    if (!password || !email) {
        return res.json({ success: false, message: 'Email and Password are required' });
    }
    try {
        const user = await userModel.findOne({ email });
        if (!user) {
            return res.json({ success: false, message: 'Invalid Email' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.json({ success: false, message: 'Invalid email id or password' });
        }
        
        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET_KEY, { expiresIn: '7d' });

        // FORCED CROSS-SITE COOKIE SETTINGS FOR PRODUCTION
        const isProduction = process.env.NODE_ENV === 'production';
        
        res.cookie('token', token, {
            httpOnly: true,
            secure: true,  // Force true for cross-site
            sameSite: 'none',  // Force 'none' for cross-site
            maxAge: 7 * 24 * 60 * 60 * 1000,
            path: '/',
            domain: isProduction ? '.onrender.com' : undefined  // Add domain only in production
        });
        
        // Log cookie settings
        console.log('✅ Login successful for:', email);
        console.log('🍪 Cookie set with:', {
            secure: true,
            sameSite: 'none',
            domain: isProduction ? '.onrender.com' : 'localhost',
            environment: process.env.NODE_ENV
        });
        
        // Send user data back
        const userData = {
            _id: user._id,
            name: user.name,
            email: user.email,
            balance: user.balance || 0,
            isAccountVerified: user.isAccountVerified || false
        };
        
        return res.json({ success: true, userData: userData });

    } catch (e) {
        console.error('❌ Login error:', e.message);
        return res.json({ success: false, message: e.message });
    }
}

////////////////////logout function/////////////////////////////////////////
const logout = async (req, res) => {
    try {
        const isProduction = process.env.NODE_ENV === 'production';
        
        res.clearCookie('token', {
            httpOnly: true,
            secure: true,
            sameSite: 'none',
            path: '/',
            domain: isProduction ? '.onrender.com' : undefined
        });
        
        console.log('✅ Logout successful, cookie cleared');
        return res.json({ success: true, message: 'Logged Out' });
    } catch (e) {
        console.error('❌ Logout error:', e.message);
        return res.json({ success: false, message: e.message });
    }
}

////////////////////Sending Verification OTP///////////////////////
const sendVerifyOtp = async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await userModel.findById(userId);
        if (user.isAccountVerified) {
            return res.json({ success: false, message: 'Account is already verified!' });
        }
        const otp = String(Math.floor(100000 + Math.random() * 900000));
        user.verifyOtp = otp;
        user.verifyOtpExpiresAt = Date.now() + 24 * 60 * 60 * 1000;
        await user.save();

        const mailOptions = {
            from: process.env.SENDER_EMAIL,
            to: user.email,
            subject: 'Account Verification OTP',
            text: `Your OTP is ${otp}. Verify your account using this OTP.`
        };
        await transporter.sendMail(mailOptions);
        return res.json({ success: true, message: 'Verification OTP sent on Email' });

    } catch (e) {
        console.error('❌ Send OTP error:', e.message);
        return res.json({ success: false, message: e.message });
    }
}

/////////////////////Verifying Email///////////////////
const verifyEmail = async (req, res) => {
    const userId = req.user.id;
    const { otp } = req.body;
    if (!userId || !otp) {
        return res.json({ success: false, message: 'Missing details' });
    }
    try {
        const user = await userModel.findById(userId);
        if (!user) {
            return res.json({ success: false, message: 'User not found' });
        }
        if (user.verifyOtp === '' || user.verifyOtp !== otp) {
            return res.json({ success: false, message: 'Invalid OTP' });
        }
        if (user.verifyOtpExpiresAt < Date.now()) {
            return res.json({ success: false, message: 'OTP Expired' });
        }
        user.isAccountVerified = true;
        user.verifyOtp = '';
        user.verifyOtpExpiresAt = 0;
        await user.save();

        return res.json({ success: true, message: 'Account Verified Successfully' });

    } catch (e) {
        console.error('❌ Verify email error:', e.message);
        return res.json({ success: false, message: e.message });
    }
}

//////////////////// user is Authenticated & Get User Data /////////////////////////
const isAuthenticated = async (req, res) => {
    try {
        // Get full user data from database
        const user = await userModel.findById(req.user.id).select('-password');
        if (!user) {
            return res.status(401).json({ success: false, message: 'User not found' });
        }
        
        const userData = {
            _id: user._id,
            name: user.name,
            email: user.email,
            balance: user.balance || 0,
            isAccountVerified: user.isAccountVerified || false
        };
        
        return res.json({ success: true, userData: userData });
    } catch (e) {
        console.error('❌ Is authenticated error:', e.message);
        return res.status(500).json({ success: false, message: e.message });
    }
}

///////////////////Send password reset otp////////////////////////////
const sendResetOtp = async (req, res) => {
    const { email } = req.body;
    if (!email) {
        return res.json({ success: false, message: 'Email is required' });
    }
    try {
        const user = await userModel.findOne({ email });
        if (!user) {
            return res.json({ success: false, message: 'User not found' });
        }
        const otp = String(Math.floor(100000 + Math.random() * 900000));
        user.resetOtp = otp;
        user.resetOtpExpiresAt = Date.now() + 15 * 60 * 1000;

        await user.save();

        const mailOptions = {
            from: process.env.SENDER_EMAIL,
            to: user.email,
            subject: 'Password Reset OTP',
            text: `Your OTP for resetting your password is ${otp}. Use this OTP to proceed with resetting your password.`
        };
        await transporter.sendMail(mailOptions);

        return res.json({ success: true, message: 'Reset OTP sent on Email' });

    } catch (e) {
        console.error('❌ Send reset OTP error:', e.message);
        return res.json({ success: false, message: e.message });
    }
}

//////////////////////Reset User Password///////////////////////
const resetPassword = async (req, res) => {
    const { email, otp, newPassword } = req.body;
    if (!otp || !newPassword || !email) {
        return res.json({ success: false, message: 'Email, Otp, and new password are required' });
    }

    try {
        const user = await userModel.findOne({ email });
        if (!user) {
            return res.json({ success: false, message: "User not found" });
        }
        if (user.resetOtp === "" || user.resetOtp !== otp) {
            return res.json({ success: false, message: "Invalid OTP" });
        }
        if (user.resetOtpExpiresAt < Date.now()) {
            return res.json({ success: false, message: "OTP Expired" });
        }
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        user.password = hashedPassword;
        user.resetOtp = '';
        user.resetOtpExpiresAt = 0;

        await user.save();

        return res.json({ success: true, message: "Password has been reset successfully" });

    } catch (e) {
        console.error('❌ Reset password error:', e.message);
        return res.json({ success: false, message: e.message });
    }
}

module.exports = {
    resetPassword,
    sendResetOtp,
    isAuthenticated,
    verifyEmail,
    sendVerifyOtp,
    register,
    login,
    logout
};