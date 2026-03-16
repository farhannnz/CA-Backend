# 🚀 Production Deployment Guide

## Phase 1: Twilio Production Setup (2-3 weeks)

### Option A: WhatsApp Business API (Recommended)

**Requirements:**
- Facebook Business Manager account
- Business verification documents:
  - GST Certificate
  - Company Registration Certificate
  - Address Proof
  - Bank Statement

**Steps:**
1. Create Facebook Business Manager account
2. Submit business verification
3. Apply for WhatsApp Business API through Twilio
4. Wait for Meta approval (2-3 weeks)
5. Configure WhatsApp Business Profile
6. Get your own WhatsApp number

**Cost:**
- Business-initiated conversations: ₹0.50-1 per conversation
- User-initiated conversations: Free for 24 hours
- Monthly cost estimate: ₹2,000-5,000 (depends on usage)

### Option B: Twilio Verified Number (Quick Start)

**Steps:**
1. Buy Twilio phone number: $1-2/month
2. Enable WhatsApp on that number
3. Verify your business
4. No Meta approval needed
5. Limited to verified numbers only

**Limitation:** Clients need to be verified first

---

## Phase 2: AWS Migration

### 2.1 File Storage → AWS S3

**Setup:**

1. **Create S3 Bucket:**
```bash
aws s3 mb s3://your-ca-firm-documents --region ap-south-1
```

2. **Set Bucket Policy (Public Read):**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::your-ca-firm-documents/*"
    }
  ]
}
```

3. **Create IAM User:**
- Service: S3
- Permissions: AmazonS3FullAccess
- Get Access Key ID and Secret Key

4. **Install Dependencies:**
```bash
npm install aws-sdk multer-s3
```

5. **Update Environment Variables:**
```env
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=ap-south-1
AWS_S3_BUCKET=your-ca-firm-documents
```

6. **Update Document Controller:**
- Use `s3Upload.js` instead of `upload.js`
- File URL will be: `https://your-bucket.s3.ap-south-1.amazonaws.com/path/to/file.pdf`

**Cost Estimate:**
- Storage: ₹1.5 per GB/month
- Data transfer: ₹6 per GB
- For 100GB + 50GB transfer: ~₹450/month

---

### 2.2 Database → Keep MongoDB Atlas or Migrate to DocumentDB

**Option A: Keep MongoDB Atlas (Recommended)**
- Already on AWS infrastructure
- Easy to manage
- Free tier: 512MB
- Paid: $9/month for 2GB

**Option B: AWS DocumentDB**
- Fully managed MongoDB-compatible
- Better AWS integration
- Cost: $50-100/month (minimum)

**Recommendation:** Stick with MongoDB Atlas for now

---

### 2.3 Backend → AWS ECS (Docker)

**Setup:**

1. **Create Dockerfile:**
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 5000
CMD ["npm", "start"]
```

2. **Push to AWS ECR:**
```bash
aws ecr create-repository --repository-name ca-backend
docker build -t ca-backend .
docker tag ca-backend:latest <account-id>.dkr.ecr.ap-south-1.amazonaws.com/ca-backend:latest
docker push <account-id>.dkr.ecr.ap-south-1.amazonaws.com/ca-backend:latest
```

3. **Create ECS Cluster:**
- Use Fargate (serverless)
- Configure task definition
- Set environment variables
- Deploy service

4. **Set up Load Balancer:**
- Application Load Balancer
- SSL certificate (AWS Certificate Manager)
- Domain: api.yourfirm.com

**Cost Estimate:**
- ECS Fargate: ₹1,500-3,000/month
- Load Balancer: ₹1,500/month
- Total: ~₹3,000-5,000/month

---

### 2.4 Frontend Deployment Options

#### Option A: Render (Recommended for Quick Start)

**Setup:**

1. **Push code to GitHub/GitLab**

2. **Deploy on Render:**
   - Go to https://render.com
   - New → Static Site
   - Connect your repository
   - Build Command: `cd frontend && npm install && npm run build`
   - Publish Directory: `frontend/build`
   - Add Environment Variable: `REACT_APP_API_URL=https://ca-backend-cqed.onrender.com/api`

3. **Auto-deploy on push:**
   - Render automatically deploys on git push

**Cost:**
- Free tier available
- Paid: $7/month for custom domain + CDN

#### Option B: AWS S3 + CloudFront

**Setup:**

1. **Build Frontend:**
```bash
cd frontend
npm run build
```

2. **Upload to S3:**
```bash
aws s3 sync build/ s3://your-ca-firm-frontend --acl public-read
```

3. **Enable Static Website Hosting:**
- S3 bucket → Properties → Static website hosting
- Index document: index.html
- Error document: index.html

4. **Set up CloudFront (CDN):**
- Create distribution
- Origin: S3 bucket
- SSL certificate
- Domain: yourfirm.com

**Cost Estimate:**
- S3: ₹50/month
- CloudFront: ₹200-500/month
- Total: ~₹300-600/month

---

## Phase 3: Domain & SSL

1. **Buy Domain:**
   - GoDaddy / Namecheap: ₹500-1,000/year
   - Route 53: $12/year

2. **SSL Certificate:**
   - AWS Certificate Manager: FREE
   - Let's Encrypt: FREE

3. **Configure DNS:**
   - Frontend: yourfirm.com → CloudFront
   - Backend: api.yourfirm.com → Load Balancer

---

## Phase 4: Security & Monitoring

### 4.1 Security

1. **Environment Variables:**
   - Use AWS Secrets Manager
   - Never commit .env files

2. **API Rate Limiting:**
```bash
npm install express-rate-limit
```

3. **CORS Configuration:**
```javascript
app.use(cors({
  origin: ['https://yourfirm.com'],
  credentials: true
}));
```

4. **Helmet.js (Security headers):**
```bash
npm install helmet
```

### 4.2 Monitoring

1. **AWS CloudWatch:**
   - Log all errors
   - Set up alarms
   - Monitor costs

2. **Sentry (Error tracking):**
```bash
npm install @sentry/node
```

3. **Uptime Monitoring:**
   - UptimeRobot (free)
   - Pingdom

---

## Total Cost Estimate (Monthly)

### Minimal Setup:
- MongoDB Atlas: Free (512MB) or ₹700 (2GB)
- Render Backend: Free (with limitations)
- Vercel Frontend: Free
- Twilio: ₹2,000-3,000
- **Total: ₹2,000-4,000/month**

### AWS Production Setup:
- S3 Storage: ₹500
- ECS Backend: ₹3,000
- CloudFront: ₹500
- MongoDB Atlas: ₹700
- Twilio WhatsApp: ₹3,000
- **Total: ₹7,700/month (~$95)**

### Enterprise Setup:
- AWS DocumentDB: ₹4,000
- ECS with Auto-scaling: ₹6,000
- S3 + CloudFront: ₹1,000
- Monitoring & Logs: ₹1,000
- Twilio: ₹5,000
- **Total: ₹17,000/month (~$210)**

---

## Migration Steps (When Ready)

### Week 1: Twilio Setup
1. Apply for WhatsApp Business API
2. Submit business documents
3. Wait for approval

### Week 2: AWS Setup
1. Create S3 bucket
2. Set up IAM users
3. Configure CloudFront

### Week 3: Backend Migration
1. Update code for S3
2. Test locally
3. Deploy to ECS

### Week 4: Frontend Migration
1. Update API URLs
2. Build and deploy to S3
3. Configure CloudFront

### Week 5: Testing & Go Live
1. Test all features
2. Migrate existing data
3. Update DNS
4. Monitor for issues

---

## Quick Start (Abhi Ke Liye)

**Current Setup is GOOD for:**
- Testing
- Small client base (< 50 clients)
- Low document volume (< 1000 docs)

**Migrate to AWS when:**
- Client base > 100
- Document volume > 5000
- Need better reliability
- Need faster performance
- Have budget for infrastructure

---

## Support & Resources

- **Twilio WhatsApp Docs:** https://www.twilio.com/docs/whatsapp
- **AWS S3 Docs:** https://docs.aws.amazon.com/s3/
- **AWS ECS Docs:** https://docs.aws.amazon.com/ecs/
- **MongoDB Atlas:** https://docs.atlas.mongodb.com/

---

**Recommendation:** 
Start with current Render + Vercel setup. Migrate to AWS when you have:
1. 50+ active clients
2. Consistent revenue
3. AWS credits to use
4. Time to manage infrastructure

Current setup can easily handle 100-200 clients! 🚀

