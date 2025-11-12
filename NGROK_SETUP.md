# Setting Up Frontend with Ngrok

## Quick Setup

### 1. Start Backend Server
```bash
cd backend
node server.js
# Backend runs on http://localhost:5000
```

### 2. Expose Backend with Ngrok
```bash
ngrok http 5000
# Note the ngrok URL (e.g., https://abc123.ngrok.io)
```

### 3. Update Frontend Vite Config
Update `vite.config.ts` to use your backend's ngrok URL:

```typescript
proxy: {
  '/api': {
    target: 'https://YOUR_BACKEND_NGROK_URL.ngrok.io', // Replace with your ngrok URL
    changeOrigin: true,
    secure: true,
  }
}
```

### 4. Start Frontend
```bash
cd frontend
npm run dev
# Frontend runs on http://localhost:3000
```

### 5. Expose Frontend with Ngrok
```bash
ngrok http 3000
# Use this ngrok URL to access your frontend
```

## Alternative: Environment Variable Approach

Create a `.env` file in the frontend folder:

```env
VITE_API_URL=https://YOUR_BACKEND_NGROK_URL.ngrok.io
```

Then update `vite.config.ts`:
```typescript
proxy: {
  '/api': {
    target: process.env.VITE_API_URL || 'http://localhost:5000',
    changeOrigin: true,
    secure: true,
  }
}
```

## Important Notes

1. **CORS**: Your backend must allow requests from your frontend's ngrok URL
2. **HTTPS**: Ngrok provides HTTPS, so set `secure: true` in the proxy config
3. **Dynamic URLs**: Each time you restart ngrok, you get a new URL - update your config
4. **Ngrok Free Limitations**: 
   - URLs change on restart
   - Limited bandwidth
   - Consider ngrok paid plan for static URLs

## Testing

Access your frontend via the frontend's ngrok URL. The API calls will be proxied to your backend's ngrok URL.

