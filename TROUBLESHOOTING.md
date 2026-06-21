# Troubleshooting Guide

## Error: "Error submitting triage package"

This error occurs when the scan cannot be submitted to the backend server. Here's how to fix it:

### Solution 1: Ensure Backend Server is Running

**The most common cause is that the backend server is not running.**

1. Open a terminal/command prompt
2. Navigate to the project folder:
   ```bash
   cd f:\Downloads\Kalinga\kalinga
   ```

3. Make sure you're running BOTH servers:
   ```bash
   npm run dev
   ```

4. You should see BOTH of these messages:
   ```
   [KalingaAI Server] running on http://localhost:5000
   VITE ready in XXX ms
   ```

**If you only see one server running:**
- Press `Ctrl+C` to stop
- Run `npm run dev` again
- Wait for both servers to start

### Solution 2: Check Server Logs

Look at your terminal where you ran `npm run dev`. Check for errors like:
- `Error: listen EADDRINUSE: address already in use :::5000` (port already in use)
- Connection errors
- Database errors

### Solution 3: Port Already in Use

If port 5000 is already in use by another application:

1. Stop the current process (Ctrl+C)
2. Find and kill the process using port 5000:
   
   **Windows:**
   ```bash
   netstat -ano | findstr :5000
   taskkill /PID <PID_NUMBER> /F
   ```

3. Restart: `npm run dev`

### Solution 4: Check Network Connection

1. Open your browser
2. Navigate to: `http://localhost:5000/api/health`
3. You should see: `{"status":"healthy","timestamp":"..."}`

**If you see an error:**
- Backend server is not running
- Backend crashed - check terminal for errors

### Solution 5: Clear Browser Cache & Restart

1. Stop all servers (Ctrl+C)
2. Close the browser completely
3. Delete `server/data/db.json` (will be recreated)
4. Restart: `npm run dev`
5. Open browser to `http://localhost:5173`

### Solution 6: Try Offline Mode

If the server won't start, you can still use offline mode:

1. In the app, click "Online Mode" to switch to "Offline Mode"
2. Submit the scan - it will be saved locally
3. When you get the server working, switch back to "Online Mode"
4. Click "Pending Uploads" to sync

### Solution 7: Check Dependencies

Ensure all dependencies are installed:

```bash
cd f:\Downloads\Kalinga\kalinga
npm install
```

### Solution 8: Verify File Structure

Ensure these files exist:
- `server/src/index.js`
- `server/src/db.js`
- `server/src/routes/scans.js`
- `server/data/` folder (will be auto-created)

### Quick Test Script

Run this to test if the backend is working:

**PowerShell:**
```powershell
Invoke-WebRequest -Uri http://localhost:5000/api/health
```

**Command Prompt:**
```bash
curl http://localhost:5000/api/health
```

**Expected response:**
```json
{"status":"healthy","timestamp":"2026-06-21T..."}
```

## Other Common Errors

### "Assets not loading" / Images not showing

**Solution:**
1. Ensure backend server is running on port 5000
2. Check that `assets/` folder exists in root directory
3. Verify `Screens/` folder exists in root directory

### "Offline queue not syncing"

**Solution:**
1. Check that you're in "Online Mode" (green indicator)
2. Ensure backend server is running
3. Click "Pending Uploads" button on dashboard
4. Check browser console (F12) for errors

### "Patient not appearing in OB-GYN portal"

**Solution:**
1. Ensure scan was submitted successfully (green toast message)
2. Check that backend server is running
3. Refresh the OB-GYN portal page
4. Wait up to 30 seconds for auto-refresh
5. Check `server/data/db.json` to see if scan was saved

### "Statistics not updating"

**Solution:**
1. Wait 30 seconds for auto-refresh
2. Manually refresh the page (F5)
3. Check browser console for errors
4. Verify backend is running

### Database appears corrupted

**Solution:**
1. Stop all servers (Ctrl+C)
2. Delete `server/data/db.json`
3. Restart: `npm run dev`
4. Database will be recreated with seed data

## Still Having Issues?

### Step-by-Step Complete Reset

1. **Stop everything:**
   ```bash
   # Press Ctrl+C in terminal
   ```

2. **Clean install:**
   ```bash
   cd f:\Downloads\Kalinga\kalinga
   rm -rf node_modules
   rm -rf client/node_modules
   rm -rf server/node_modules
   npm install
   ```

3. **Reset database:**
   ```bash
   rm server/data/db.json
   ```

4. **Start fresh:**
   ```bash
   npm run dev
   ```

5. **Open browser:**
   - Go to: `http://localhost:5173`
   - Clear cache (Ctrl+Shift+Delete)
   - Try the workflow again

### Check Your System

**Node.js version:**
```bash
node --version
# Should be v16 or higher
```

**npm version:**
```bash
npm --version
# Should be 7.0 or higher
```

### Debug Mode

To see detailed logs:

1. Open browser console (F12)
2. Go to Console tab
3. Perform the action that's failing
4. Look for red error messages
5. Copy the error message for troubleshooting

### Common Error Messages Decoded

| Error Message | Meaning | Solution |
|--------------|---------|----------|
| "Failed to fetch" | Backend not running | Start backend with `npm run dev` |
| "Network request failed" | Backend not reachable | Check backend is on port 5000 |
| "Server not reachable" | Backend offline | Restart backend server |
| "Scan ID is required" | Malformed data | Check scan object has ID field |
| "Patient ID required" | Missing patient data | Re-register patient |
| "listen EADDRINUSE" | Port in use | Kill process on port 5000/5173 |

### Getting Help

If you're still stuck:

1. Check terminal output for error messages
2. Check browser console (F12) for errors
3. Take a screenshot of the error
4. Note what step you were on when it failed
5. Check if backend server is actually running

## Quick Checklist

Before reporting an issue, verify:

- ✅ Node.js v16+ installed
- ✅ All dependencies installed (`npm install`)
- ✅ Backend server running on port 5000
- ✅ Frontend server running on port 5173
- ✅ No other apps using ports 5000 or 5173
- ✅ `assets/` and `Screens/` folders exist
- ✅ Browser cache cleared
- ✅ No errors in terminal output
- ✅ Can access `http://localhost:5000/api/health`

---

**Most issues are solved by ensuring both frontend and backend servers are running with `npm run dev`!**
