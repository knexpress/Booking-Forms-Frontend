# KN Express Frontend

React + TypeScript + Vite booking form application.

## 🚀 Deploy to Vercel

### Quick Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)

### Manual Deploy

1. **Push to GitHub**
```bash
git add .
git commit -m "Frontend ready"
git push
```

2. **Import to Vercel**
   - Go to [vercel.com/new](https://vercel.com/new)
   - Import your repository
   - Root directory: `.` (or leave empty - this is already the frontend directory)
   - Framework: **Vite** (auto-detected)
   - Build command: `npm run build` (auto-detected)
   - Output directory: `dist` (auto-detected)

3. **Environment Variables**

Add in Vercel Dashboard → Settings → Environment Variables:

```
VITE_API_BASE_URL=https://booking-forms-backend.onrender.com
```

4. **Deploy!**

---

## 💻 Local Development

```bash
# Install dependencies
npm install

# Run dev server
npm run dev
```

Visit: http://localhost:3000

---

## 🔧 Build

```bash
npm run build
```

Output in `dist/` folder.

---

## 📝 Environment Variables

Create `.env` file:

```env
VITE_API_BASE_URL=http://localhost:5000
```

**Production:**
```env
VITE_API_BASE_URL=https://booking-forms-backend.onrender.com
```

---

## ✅ Checklist Before Deploy

- [ ] Backend deployed and running
- [ ] `VITE_API_BASE_URL` set to backend URL
- [ ] Test booking submission locally
- [ ] Update CORS in backend to allow your Vercel domain
- [ ] Deploy!

---

## 🌐 After Deploy

Test your deployed frontend:
1. Visit your Vercel URL
2. Fill booking form
3. Submit
4. Check if booking saves to MongoDB

---

**Deployed URL:** https://your-app.vercel.app

