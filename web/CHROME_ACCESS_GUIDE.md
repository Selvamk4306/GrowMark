# GrowMark WebApp - Chrome & Network Access Guide

## Fixed Issues

The Vite configuration has been updated to properly support:
- ✅ CORS (Cross-Origin Resource Sharing)
- ✅ Network access from other machines
- ✅ Multiple network interfaces
- ✅ Proper HMR (Hot Module Replacement) for dev mode

## Updated Files

### `vite.config.ts`
Added comprehensive server configuration:
```typescript
server: {
  host: '0.0.0.0',           // Listen on all network interfaces
  port: 5173,
  strictPort: false,         // Try next port if 5173 is in use
  cors: true,                // Enable CORS
  hmr: {
    protocol: 'ws',
    host: 'localhost',
    port: 5173,
  }
}
```

## How to Access in Chrome

### On the Same Machine:
1. Open Chrome on your Windows machine
2. Go to: **http://localhost:5173**
3. The app should load smoothly just like in VS Code

### On Another Machine (Same Network):
1. From the terminal output, use one of the Network URLs, for example:
   - `http://192.168.56.1:5173`
   - `http://192.168.88.1:5173`
   - `http://10.186.179.88:5173`
2. Open Chrome on another machine and enter the URL

### If It Still Doesn't Work:

1. **Check if port 5173 is already in use:**
   ```bash
   netstat -ano | findstr :5173
   ```

2. **Kill existing process (if needed):**
   ```bash
   taskkill /PID <PID> /F
   ```

3. **Restart the dev server:**
   ```bash
   npm run dev
   ```

4. **Clear Chrome cache:**
   - Press `Ctrl + Shift + Delete`
   - Select "All time"
   - Check "Cookies and other site data"
   - Clear

5. **Try Incognito Mode:**
   - Open Chrome in Incognito mode (Ctrl + Shift + N)
   - Go to http://localhost:5173
   - This bypasses all extensions and cached data

## Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| "Cannot GET /" | Dev server not running, start with `npm run dev` |
| White screen | Check browser console (F12) for errors |
| CORS errors | Should be fixed - reload the page |
| Hot reload not working | Restart the dev server |
| Port already in use | Change port in vite.config.ts or kill existing process |

## Browser Console Debugging

If the app doesn't work in Chrome:
1. Open Chrome DevTools (F12)
2. Go to the **Console** tab
3. Take a screenshot of any red error messages
4. Check the **Network** tab to see if API calls are failing

## Environment Variables

Make sure your `.env` file has the correct Supabase credentials:
```
VITE_SUPABASE_URL=https://sklmxtvmpmudofuqtsxq.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable__6sdUhbPyp__VzpxJP14HQ_Id2n-DRo
```

These should be automatically loaded by Vite during development.
