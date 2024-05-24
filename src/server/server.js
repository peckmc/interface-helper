require("dotenv").config();
const path = require("path")
const cors = require('cors')
const axios = require('axios')
const express = require('express')
const router = express()
const multer = require('multer')
const jwt = require('jsonwebtoken')
const cookieParser = require('cookie-parser');
const { google } = require('googleapis');
const PORT = process.env.PORT || 3000;
const {fetchImages} = require("./fetchImages.js")
const upload = multer({ dest: 'uploads/' }); // Destination folder for uploaded files

router.use(cookieParser());
router.use(express.json());
router.use(express.static(path.join(__dirname, "../../dist")));

// Configuration
const clientId = process.env.GOOGLE_CLIENT_ID;
const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
const redirectUri = process.env.REDIRECT_URL;
const scopes = ['openid profile email https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/spreadsheets'];

// Create an OAuth2 client
const oAuth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);

// Generate the authentication URL
const authUrl = oAuth2Client.generateAuthUrl({
  // 'online' (default) or 'offline' (gets refresh_token)
  access_type: 'offline',
  /** Pass in the scopes array defined above.
  * Alternatively, if only one scope is needed, you can pass a scope URL as a string */
  scope: scopes,
  // Enable incremental authorization. Recommended as a best practice.
  include_granted_scopes: true
});

// Get the authentication URL
router.get('/auth/google', (req, res) => {
  res.send(JSON.stringify(authUrl));
});

// Handle the callback from the authentication flow
router.get('/auth/token', async (req, res) => {
  const code = req.query.code;

  try {
    // Exchange the authorization code for access and refresh tokens
    const { tokens } = await oAuth2Client.getToken(code);
    const accessToken = tokens.access_token;
    const refreshToken = tokens.refresh_token;
    const id_token = tokens.id_token;
    oAuth2Client.setCredentials({ refresh_token: refreshToken, access_token:accessToken });
    // Save the tokens in a cookie for future use
    if (!id_token) return res.status(400).json({ message: 'Auth error' });
    // Get user info from id token
    const { email, name, picture } = jwt.decode(id_token);
    const user = { name, email, picture };
    // Sign a new token
    const token = jwt.sign({ user }, process.env.TOKEN_SECRET, { expiresIn: 36000 });
    // Set cookies for user
    res.cookie('token', token, { maxAge: 36000, httpOnly: true,  })
    // You can choose to store user in a DB instead
    res.json({
      user,
    })
  } catch (error) {
    console.error('Error authenticating:', error);
    res.status(500).send('Authentication failed.');
  }
});

router.get('/auth/logged_in', (req, res) => {
  try {
    // Get token from cookie
    const token = req.cookies.token;
    if (!token) return res.json({ loggedIn: false });
    const { user } = jwt.verify(token, process.env.TOKEN_SECRET);
    const newToken = jwt.sign({ user }, process.env.TOKEN_SECRET, { expiresIn: 36000 });
    // Reset token in cookie
    res.cookie('token', newToken, { maxAge: 36000, httpOnly: true,  })
    res.json({ loggedIn: true, user });
  } catch (err) {
    res.json({ loggedIn: false });
  }
});

router.post("/auth/logout", (_, res) => {
  // clear cookie
  res.clearCookie('token').json({ message: 'Logged out' });
});

router.get('/auth/callback', (req, res) => {
  res.sendFile(path.join(__dirname, '/../../dist/index.html'));
});

//generic endpoint
// router.post('/urlRange', async (req, res) => {
//   try {
//     const { start, end, prefix, suffix, digitCount } = req.body;
//     let url;
//     let urls = [];

//     //generate the url list from user input
//     for (var i = start; i <= end; i++) {
//       //create digit padding according to user-provided input
//       partNo = i.toString().padStart(digitCount, '0');
//       url = `${prefix}${partNo}${suffix}.jpg`;
//       urls.push({
//         url: url,
//         name: `${prefix}${partNo}${suffix}.jpg`,
//       });
//     }
//     fetchImages(urls, oAuth2Client);
//     res.status(200).json(urls);
//   } catch (err) {
//     console.error('Error:', err)
//   }
// });

// router.get('/main.js', (req, res) => {
//   res.sendFile(path.join(__dirname, '/../../dist/main.js'));
// });

// router.get('/index.html', (req, res) => {
//   res.sendFile(path.join(__dirname, '../../dist/index.html'));
// });

// historic images endpoint
router.post('/urlRange', async (req, res) => {
  try {
    const { start, end, prefix, suffix, digitCount } = req.body;
    let partNo, url;
    let urls = [];

    //generating the url list from user input
    for (var i = start; i <= end; i++) {
      partNo = i.toString().padStart(digitCount, '0');
      url = `https://hipe.historicimages.com/images/${prefix}/${prefix}${partNo}b.jpg`;
      urls.push({
        url: url,
        name: `${prefix}${partNo}b`,
      });
    }
    // fetchImages(urls, oAuth2Client);

    //generate a string of urls to return to client
    let urlList = urls.map((url) => {
      return `${url.url}`
    }).join('\n')

    res.status(200).json(urlList);
  } catch (err) {
    console.error('Error:', err)
  }
});

router.listen(PORT, () => console.log(`🚀 Server listening on port ${PORT}`));