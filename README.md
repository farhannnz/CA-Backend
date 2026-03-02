# CA Document Automation System

Production-ready MERN stack application for Chartered Accountants to manage client documents and automate WhatsApp responses using Twilio.

## 🚀 Features

- **CA Dashboard**: Secure login and client management
- **Document Upload**: Upload and organize client documents (ITR, GST, etc.)
- **WhatsApp Automation**: Automatic document delivery via WhatsApp
- **MongoDB Storage**: Secure document metadata storage
- **Twilio Integration**: Real WhatsApp messaging (not simulation)

## 📂 Project Structure

```
ca-doc-system/
├── backend/
│   ├── server.js
│   ├── models/
│   ├── routes/
│   ├── controllers/
│   ├── middleware/
│   └── uploads/
└── frontend/
    └── src/
        ├── pages/
        ├── components/
        └── api.js
```

## 🛠 Tech Stack

**Frontend:**
- React.js
- Axios
- React Router

**Backend:**
- Node.js + Express
- MongoDB + Mongoose
- Multer (file uploads)
- Twilio SDK
- JWT Authentication

## 📋 Prerequisites

- Node.js (v14+)
- MongoDB Atlas account
- Twilio account with WhatsApp sandbox
- Git

## 🔧 Installation & Setup

### Step 1: Clone and Install

```bash
# Clone the repository
git clone <your-repo-url>
cd ca-doc-system

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### Step 2: MongoDB Setup

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a free cluster
3. Create a database user
4. Whitelist your IP (or use 0.0.0.0/0 for development)
5. Get your connection string

### Step 3: Twilio Setup

1. Sign up at [Twilio](https://www.twilio.com/)
2. Go to **Console Dashboard**
3. Note your:
   - Account SID
   - Auth Token
4. Go to **Messaging > Try it out > Send a WhatsApp message**
5. Join the Twilio Sandbox:
   - Send the code (e.g., "join <code>") to the Twilio WhatsApp number
   - Save the Twilio WhatsApp number (format: whatsapp:+14155238886)

### Step 4: Configure Environment Variables

Create `backend/.env` file:

```env
PORT=5000
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/ca-docs?retryWrites=true&w=majority
JWT_SECRET=your_super_secret_jwt_key_here_change_in_production
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886
BASE_URL=http://localhost:5000
```

Create `frontend/.env` file:

```env
REACT_APP_API_URL=http://localhost:5000/api
```

### Step 5: Run the Application

**Terminal 1 - Backend:**
```bash
cd backend
npm start
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm start
```

Frontend will open at: `http://localhost:3000`
Backend will run at: `http://localhost:5000`

## 🌐 Deployment

### Backend Deployment (Render)

1. Push code to GitHub
2. Go to [Render](https://render.com/)
3. Create new **Web Service**
4. Connect your repository
5. Configure:
   - **Build Command**: `cd backend && npm install`
   - **Start Command**: `cd backend && npm start`
6. Add Environment Variables (from .env)
7. Deploy
8. Copy your backend URL (e.g., `https://your-app.onrender.com`)

### Frontend Deployment (Vercel)

1. Go to [Vercel](https://vercel.com/)
2. Import your repository
3. Configure:
   - **Root Directory**: `frontend`
   - **Framework Preset**: Create React App
4. Add Environment Variable:
   - `REACT_APP_API_URL=https://your-app.onrender.com/api`
5. Deploy

### Step 6: Configure Twilio Webhook

1. Go to Twilio Console
2. Navigate to **Messaging > Settings > WhatsApp Sandbox Settings**
3. Set **When a message comes in**:
   ```
   https://your-app.onrender.com/api/webhook
   ```
4. Method: **POST**
5. Save

## 📱 Testing the System

### 1. Register CA Account
- Open frontend URL
- Click "Register"
- Create your CA account

### 2. Add Client
- Login to dashboard
- Click "Add Client"
- Enter:
  - Client Name: "John Doe"
  - WhatsApp Number: "+919876543210" (use real number for testing)

### 3. Upload Document
- Click "Upload Document"
- Select client
- Enter year: "2025-26"
- Select type: "ITR"
- Upload PDF file
- Submit

### 4. Test WhatsApp
- From the client's WhatsApp, send message to Twilio number:
  ```
  ITR 2025-26
  ```
- System will respond with document link or file

### Message Format Examples:
```
ITR 2025-26
GST 2024-25
Balance Sheet 2025-26
```

## 🔒 Security Features

- JWT authentication
- Password hashing (bcrypt)
- File type validation (PDF only)
- File size limits (10MB)
- WhatsApp number validation
- Protected API routes

## 📊 Database Schema

### User (CA)
```javascript
{
  name: String,
  email: String (unique),
  password: String (hashed)
}
```

### Client
```javascript
{
  name: String,
  whatsappNumber: String,
  createdBy: ObjectId (User reference)
}
```

### Document
```javascript
{
  clientId: ObjectId (Client reference),
  year: String,
  documentType: String,
  fileUrl: String,
  uploadDate: Date
}
```

## 🐛 Troubleshooting

### Issue: Webhook not receiving messages
- Check Twilio webhook URL is correct
- Ensure backend is deployed and accessible
- Check Twilio console logs

### Issue: File upload fails
- Check `uploads/` folder exists
- Verify file size < 10MB
- Ensure file is PDF format

### Issue: WhatsApp message not sending
- Verify Twilio credentials in .env
- Check Twilio account balance
- Ensure WhatsApp number format is correct

### Issue: MongoDB connection fails
- Check MongoDB Atlas IP whitelist
- Verify connection string
- Ensure database user has correct permissions

## 📝 API Endpoints

### Authentication
- `POST /api/auth/register` - Register CA
- `POST /api/auth/login` - Login CA

### Clients
- `GET /api/clients` - Get all clients
- `POST /api/clients` - Add new client

### Documents
- `GET /api/documents` - Get all documents
- `GET /api/documents/client/:clientId` - Get client documents
- `POST /api/documents/upload` - Upload document

### Webhook
- `POST /api/webhook` - Twilio WhatsApp webhook

## 🚀 Production Checklist

- [ ] Change JWT_SECRET to strong random string
- [ ] Set MongoDB IP whitelist properly
- [ ] Enable CORS for specific domains only
- [ ] Set up file storage (AWS S3 or Cloudinary)
- [ ] Add rate limiting
- [ ] Set up logging (Winston/Morgan)
- [ ] Add error monitoring (Sentry)
- [ ] Set up backup strategy
- [ ] Add SSL certificates
- [ ] Configure CDN for static files

## 📈 Future Enhancements

- Multi-CA SaaS version
- Document expiry notifications
- Bulk document upload
- Client portal
- Email notifications
- Document templates
- Analytics dashboard
- Mobile app
- Meta Cloud API integration (direct WhatsApp Business)

## 🤝 Support

For issues or questions:
1. Check troubleshooting section
2. Review Twilio documentation
3. Check MongoDB Atlas documentation

## 📄 License

MIT License - Feel free to use for your CA practice!

---

**Built with ❤️ for Chartered Accountants**

*Automate your document delivery and focus on what matters - serving your clients!*
