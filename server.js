const mongoose = require('mongoose');
const dbConfig = require('./configs/db.config');
const serverConfig = require('./configs/server.config');
const User = require('./models/user.model');
const bcrypt = require('bcryptjs');
require('dotenv').config();
const cors = require('cors');

// Express settings
const bodyParser = require('body-parser');
const express = require('express');
const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Allow requests from your frontend origin
app.use(cors({ origin: 'http://localhost:3000' }));

// Establish DB connection
mongoose.connect(dbConfig.DB_URL, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    console.log('Connected to MongoDB');
    // Create an admin if admin user doesn't exist
    init();
  })
  .catch((error) => {
    console.log('Error while connecting to MongoDB:', error);
    process.exit(1); // Terminate the application
  });

async function init() {
  try {
    const user = await User.findOne({ userId: 'admin' });
    if (user) {
      console.log('Admin user already present');
      return;
    }

    const adminUser = new User({
      name: 'Jeevendra Singh',
      userId: 'admin',
      email: 'jeevendra.singh1992@gmail.com',
      userType: 'ADMIN',
      userStatus: 'APPROVED',
      password: bcrypt.hashSync('Welcome1', 8)
    });

    await adminUser.save();
    console.log('Admin user created:', adminUser);
  } catch (error) {
    console.log('Error while creating admin user:', error);
  }
}

// Import the routes
require('./routes/auth.routes')(app);
require('./routes/user.routes')(app);
require('./routes/ticket.routes')(app);

// App (Server) to listen for HTTP requests at the specified port
app.listen(serverConfig.PORT, () => {
  console.log('Application started on port', serverConfig.PORT);
});
