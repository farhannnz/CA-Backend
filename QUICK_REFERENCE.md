# 🚀 Quick Reference Guide

## 📝 Common Commands

### Start Development

```cmd
# Terminal 1 - Backend
cd backend
npm start

# Terminal 2 - Frontend  
cd frontend
npm start
```

### Install Dependencies

```cmd
# Backend
cd backend
npm install

# Frontend
cd frontend
npm install
```

---

## 🔑 Environment Variables

### Backend (.env)
```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886
BASE_URL=http://localhost:5000
```

### Frontend (.env)
```env
REACT_APP_API_URL=http://localhost:5000/api
```

---

## 📱 WhatsApp Message Format

Clients send messages in this format:

```
<DocumentType> <Year>
```

### Examples:
```
ITR 2025-26
GST 2024-25
Balance Sheet 2025-26
TDS Return 2025-26
Audit Report 2024-25
```

---

## 🗄 MongoDB Connection String Format

```
mongodb+srv://<username>:<password>@<cluster>.mongodb.net/<database>?retryWrites=true&w=majority
```

### Example:
```
mongodb+srv://ca_admin:mypassword@cluster0.abc123.mongodb.net/ca-docs?retryWrites=true&w=majority
```

---

## 🌐 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new CA
- `POST /api/auth/login` - Login CA

### Clients
- `GET /api/clients` - Get all clients (requires auth)
- `POST /api/clients` - Add new client (requires auth)

### Documents
- `GET /api/documents` - Get all documents (requires auth)
- `GET /api/documents/client/:clientId` - Get client documents
- `POST /api/documents/upload` - Upload document (requires auth)

### Webhook
- `POST /api/webhook` - Twilio WhatsApp webhook (public)

---

## 🔒 Authentication

All protected routes require JWT token in header:

```javascript
headers: {
  'Authorization': 'Bearer <your_jwt_token>'
}
```

Token is automatically handled by frontend after login.

---

## 📤 File Upload Specifications

- **Allowed Format**: PDF only
- **Max Size**: 10MB
- **Storage**: `uploads/` folder
- **URL Format**: `http://localhost:5000/uploads/<filename>`

---

## 🐛 Debugging

### Check Backend Logs
```cmd
cd backend
npm start
# Watch terminal for errors
```

### Check Frontend Console
- Open browser
- Press F12
- Go to Console tab
- Check for errors

### Check MongoDB Connection
```cmd
# In backend terminal, you should see:
MongoDB Connected
```

### Check Twilio Webhook
1. Go to Twilio Console
2. Monitor → Logs → Errors
3. Check for webhook errors

---

## 🧪 Testing Checklist

- [ ] Backend starts without errors
- [ ] Frontend opens in browser
- [ ] Can register new CA account
- [ ] Can login successfully
- [ ] Can add new client
- [ ] Can upload document
- [ ] Document appears in uploads folder
- [ ] WhatsApp message triggers response
- [ ] Document link/file is received

---

## 📊 Database Collections

### users
```javascript
{
  _id: ObjectId,
  name: String,
  email: String,
  password: String (hashed)
}
```

### clients
```javascript
{
  _id: ObjectId,
  name: String,
  whatsappNumber: String,
  createdBy: ObjectId (User reference)
}
```

### documents
```javascript
{
  _id: ObjectId,
  clientId: ObjectId (Client reference),
  year: String,
  documentType: String,
  fileUrl: String,
  uploadDate: Date
}
```

---

## 🚀 Deployment URLs

### Development
- Frontend: `http://localhost:3000`
- Backend: `http://localhost:5000`

### Production (Example)
- Frontend: `https://your-app.vercel.app`
- Backend: `https://your-app.onrender.com`

---

## 🔧 Troubleshooting Commands

### Clear npm cache
```cmd
npm cache clean --force
```

### Reinstall dependencies
```cmd
# Backend
cd backend
rmdir /s /q node_modules
del package-lock.json
npm install

# Frontend
cd frontend
rmdir /s /q node_modules
del package-lock.json
npm install
```

### Check Node version
```cmd
node --version
npm --version
```

### Check running processes
```cmd
# Windows
netstat -ano | findstr :5000
netstat -ano | findstr :3000
```

---

## 📞 Support Resources

- **MongoDB**: https://docs.mongodb.com/
- **Twilio**: https://www.twilio.com/docs/whatsapp
- **React**: https://react.dev/
- **Express**: https://expressjs.com/
- **Node.js**: https://nodejs.org/docs/

---

## 💡 Pro Tips

1. **Keep terminals open**: Don't close backend/frontend terminals while testing
2. **Check logs first**: Most issues show up in terminal logs
3. **Test incrementally**: Test each feature after building it
4. **Save credentials**: Keep all API keys and passwords in a secure place
5. **Use Postman**: Test API endpoints independently
6. **Monitor Twilio**: Check Twilio console for webhook delivery status
7. **Backup database**: Export MongoDB data regularly
8. **Version control**: Commit code frequently to Git

---

## 🎯 Quick Test Flow

1. Start backend → Check "MongoDB Connected"
2. Start frontend → Opens browser automatically
3. Register → Creates CA account
4. Login → Redirects to dashboard
5. Add Client → With your WhatsApp number
6. Upload Document → Select PDF file
7. Send WhatsApp → "ITR 2025-26"
8. Receive Response → Document link or file

---

**Keep this guide handy for quick reference! 📌**
