// backend/server.js

const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();

// Middleware
app.use(bodyParser.json());
app.use(cors());

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/expensemanager-db', {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('Could not connect to MongoDB', err));

// User Schema
const userSchema = new mongoose.Schema({
    username: String,
    password: String
});

// Transaction Schema
const transactionSchema = new mongoose.Schema({
    userId: String,
    amount: Number,
    description: String,
    date: { type: Date, default: Date.now },
    type: String // 'income' or 'expense'
});

const User = mongoose.model('User', userSchema);
const Transaction = mongoose.model('Transaction', transactionSchema);

// Routes

// User Registration
app.post('/api/signup', async (req, res) => {
    try {
        const { username, password } = req.body;
        const existingUser = await User.findOne({ username });
        
        if (existingUser) {
            return res.status(400).json({ 
                success: false, 
                message: 'Username already exists' 
            });
        }

        const user = new User({ username, password });
        await user.save();
        
        // Successful response
        res.status(201).json({ 
            success: true,
            message: 'User created successfully',
            userId: user._id 
        });
        
    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({ 
            success: false,
            message: 'Internal server error during signup' 
        });
    }
});

// User Login
app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await User.findOne({ username, password });
        if (!user) {
            return res.status(400).send('Invalid username or password');
        }
        res.status(200).send({ userId: user._id });
    } catch (error) {
        res.status(500).send('Error logging in');
    }
});

// Add Transaction
app.post('/api/transactions', async (req, res) => {
    try {
        const { userId, amount, description, date } = req.body;
        const type = amount >= 0 ? 'income' : 'expense';
        const transaction = new Transaction({ 
            userId, 
            amount, 
            description, 
            date: date || new Date(),
            type 
        });
        await transaction.save();
        res.status(201).send(transaction);
    } catch (error) {
        res.status(500).send('Error adding transaction');
    }
});

// Get User Transactions
app.get('/api/transactions/:userId', async (req, res) => {
    try {
        const transactions = await Transaction.find({ userId: req.params.userId })
            .sort({ date: -1 })
            .limit(10);
        res.status(200).send(transactions);
    } catch (error) {
        res.status(500).send('Error fetching transactions');
    }
});

// Delete Transaction
app.delete('/api/transactions/:id', async (req, res) => {
  try {
    const result = await Transaction.findByIdAndDelete(req.params.id);
    if (!result) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }
    res.status(200).json({ success: true, message: 'Transaction deleted' });
  } catch (error) {
    console.error('Error deleting transaction:', error);
    res.status(500).json({ success: false, message: 'Error deleting transaction' });
  }
});

// Search Transactions by Date
app.get('/api/transactions/search/:userId', async (req, res) => {
  try {
    const { date } = req.query;
    const transactions = await Transaction.find({ 
      userId: req.params.userId,
      date: {
        $gte: new Date(new Date(date).setHours(0, 0, 0)),
        $lt: new Date(new Date(date).setHours(23, 59, 59))
      }
    }).sort({ date: -1 });
    
    res.status(200).json(transactions);
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error searching transactions'
    });
  }
});
// Get Monthly Report
app.get('/api/transactions/report/:userId', async (req, res) => {
    try {
        const { month, year } = req.query;
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0);
        
        const transactions = await Transaction.find({
            userId: req.params.userId,
            date: { $gte: startDate, $lte: endDate }
        });
        
        const report = {
            income: transactions
                .filter(t => t.type === 'income')
                .reduce((sum, t) => sum + t.amount, 0),
            expense: transactions
                .filter(t => t.type === 'expense')
                .reduce((sum, t) => sum + Math.abs(t.amount), 0)
        };
        
        res.status(200).send(report);
    } catch (error) {
        res.status(500).send('Error generating report');
    }
});

// Start the server
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
