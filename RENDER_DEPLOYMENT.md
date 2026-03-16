# 🚀 Render Frontend Deployment Guide

## Quick Deploy Steps

### 1. Push Your Code to GitHub

If you haven't already:
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/yourusername/your-repo.git
git push -u origin main
```

### 2. Deploy on Render

1. Go to https://render.com and sign up/login
2. Click "New +" → "Static Site"
3. Connect your GitHub/GitLab repository
4. Configure the deployment:

**Settings:**
- Name: `ca-frontend` (or your preferred name)
- Branch: `main`
- Root Directory: Leave empty
- Build Command: `cd frontend && npm install && npm run build`
- Publish Directory: `frontend/build`

**Environment Variables:**
- Key: `REACT_APP_API_URL`
- Value: `https://ca-backend-cqed.onrender.com/api`

5. Click "Create Static Site"

### 3. Wait for Deployment

Render will:
- Install dependencies
- Build your React app
- Deploy to CDN
- Give you a URL like: `https://ca-frontend.onrender.com`

### 4. Custom Domain (Optional)

1. Go to your site settings on Render
2. Click "Custom Domain"
3. Add your domain (e.g., `yourfirm.com`)
4. Update DNS records as instructed
5. Render provides free SSL certificate

## Auto-Deploy

Every time you push to your main branch, Render automatically:
- Pulls latest code
- Rebuilds the app
- Deploys new version

## Troubleshooting

### Build Fails

Check build logs on Render dashboard. Common issues:
- Missing dependencies in package.json
- Build errors in code
- Environment variables not set

### API Not Working

Verify:
- `REACT_APP_API_URL` is set correctly
- Backend CORS allows your Render domain
- Backend is running on Render

### Update Backend CORS

In your backend, update CORS to allow Render domain:

```javascript
app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://ca-frontend.onrender.com',  // Add your Render URL
    'https://yourfirm.com'  // Add custom domain if you have one
  ],
  credentials: true
}));
```

## Cost

- Free tier: Available with some limitations
- Paid: $7/month for:
  - Custom domain
  - Better CDN
  - More bandwidth
  - Priority support

## Alternative: Using render.yaml

If you want infrastructure as code, use the `render.yaml` file in the root:

1. Push `render.yaml` to your repo
2. On Render, click "New +" → "Blueprint"
3. Connect repository
4. Render reads the yaml and sets everything up automatically

## Next Steps

After deployment:
1. Test all features on the live URL
2. Update any hardcoded URLs in your code
3. Set up custom domain if needed
4. Monitor usage and performance

Your frontend will be live at: `https://your-site-name.onrender.com` 🎉
