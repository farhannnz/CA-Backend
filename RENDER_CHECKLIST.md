# ✅ Render Deployment Checklist

## Before Deploying

- [ ] Code is pushed to GitHub/GitLab
- [ ] Backend is already deployed on Render (✅ You have this: https://ca-backend-cqed.onrender.com)
- [ ] Frontend `.env` has correct backend URL

## Deploy Frontend on Render

### Method 1: Manual Setup (Recommended for First Time)

1. [ ] Go to https://render.com
2. [ ] Click "New +" → "Static Site"
3. [ ] Connect your repository
4. [ ] Configure:
   - Build Command: `cd frontend && npm install && npm run build`
   - Publish Directory: `frontend/build`
5. [ ] Add Environment Variable:
   - Key: `REACT_APP_API_URL`
   - Value: `https://ca-backend-cqed.onrender.com/api`
6. [ ] Click "Create Static Site"
7. [ ] Wait 3-5 minutes for build

### Method 2: Using render.yaml (Automated)

1. [ ] Push the `render.yaml` file to your repo
2. [ ] On Render, click "New +" → "Blueprint"
3. [ ] Connect repository
4. [ ] Render auto-configures everything

## After Deployment

1. [ ] Test the live URL
2. [ ] Verify login works
3. [ ] Test file upload
4. [ ] Check WhatsApp integration
5. [ ] Update backend CORS (see below)

## Optional: Secure Backend CORS

Your backend currently allows all origins. For production, update `backend/server.js`:

```javascript
app.use(cors({
  origin: [
    'http://localhost:3000',  // Local development
    'https://your-render-url.onrender.com',  // Your Render frontend URL
    'https://yourfirm.com'  // Custom domain (if you add one)
  ],
  credentials: true
}));
```

## Custom Domain (Optional)

1. [ ] Buy domain from GoDaddy/Namecheap
2. [ ] In Render dashboard → Custom Domain
3. [ ] Add your domain
4. [ ] Update DNS records as shown
5. [ ] Wait for SSL certificate (automatic)

## Costs

- Free tier: Good for testing
- Paid ($7/month): Better for production
  - Custom domain support
  - More bandwidth
  - CDN included

## Your URLs

- Backend: https://ca-backend-cqed.onrender.com
- Frontend: Will be `https://your-site-name.onrender.com`

## Need Help?

Check `RENDER_DEPLOYMENT.md` for detailed instructions.
