# Supabase Realtime Troubleshooting Guide

## ✅ What's Working Now

Your Supabase database is properly configured for real-time collaboration:

- **Database**: `hdbwuqvftasbmqtuyzwm` (Active)
- **Realtime**: ✅ Enabled on `elements` table
- **Functions**: ✅ `update_element_position()` working
- **Test File**: `realtime-test.html` demonstrates real-time movement

## 🔧 Common Issues & Solutions

### 1. **"Real-time not working"**

**Check Connection Status:**
```javascript
// In your browser console
console.log('Supabase URL:', supabaseUrl)
console.log('Subscription status:', subscription)
```

**Verify Realtime is enabled:**
- Open the test file: `realtime-test.html`
- You should see "🟢 Connected to Supabase Realtime"
- If red, check your internet connection

### 2. **"Elements not moving in real-time"**

**Test with multiple browser tabs:**
1. Open `realtime-test.html` in 2+ browser tabs
2. Drag an element in one tab
3. It should move immediately in other tabs

**If not working:**
- Check browser console for errors
- Verify the canvas ID exists in your database
- Make sure you're using the correct Supabase keys

### 3. **"Permission denied errors"**

**Check RLS policies:**
```sql
-- Run this in Supabase SQL editor
SELECT * FROM elements WHERE canvas_id = 'd28642c3-6c2b-4811-9486-f36590be52f6' LIMIT 5;
```

**If no results:**
- RLS might be blocking access
- Use a valid user ID or disable RLS for testing

### 4. **"Function not found errors"**

**Verify functions exist:**
```sql
-- Check if functions are created
SELECT routine_name FROM information_schema.routines 
WHERE routine_name LIKE '%element%';
```

**Should return:**
- `update_element_position`
- `create_canvas_element`

## 🧪 Testing Steps

### Step 1: Basic Connection Test
```javascript
// Test Supabase connection
const { data, error } = await supabase
  .from('elements')
  .select('count')
  .limit(1)

console.log('Connection test:', { data, error })
```

### Step 2: Real-time Subscription Test
```javascript
// Test real-time subscription
const subscription = supabase
  .channel('test-channel')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'elements'
  }, (payload) => {
    console.log('Real-time update:', payload)
  })
  .subscribe()
```

### Step 3: Function Test
```javascript
// Test update function
const { data, error } = await supabase.rpc('update_element_position', {
  element_id: 'your-element-id',
  new_position: { x: 100, y: 200 },
  modifier_user_id: 'your-user-id'
})

console.log('Function test:', { data, error })
```

## 🔍 Debug Information

### Your Supabase Configuration:
- **Project ID**: `hdbwuqvftasbmqtuyzwm`
- **URL**: `https://hdbwuqvftasbmqtuyzwm.supabase.co`
- **Region**: `ap-southeast-1`
- **Status**: ✅ Active

### Database Tables:
- ✅ `elements` - Canvas elements with position data
- ✅ `canvases` - Canvas projects
- ✅ `canvas_collaborators` - User permissions
- ✅ `profiles` - User profiles

### Real-time Features:
- ✅ Postgres Changes enabled
- ✅ Row Level Security configured
- ✅ Realtime publication active

## 🚀 Next Steps

1. **Test the HTML file**: Open `realtime-test.html` in multiple tabs
2. **Integrate with your app**: Use `useRealtimeCanvas.js` hook
3. **Add authentication**: Connect with your user system
4. **Customize elements**: Add more element types and properties

## 📞 Still Having Issues?

If real-time is still not working:

1. **Check browser console** for JavaScript errors
2. **Verify network connectivity** to Supabase
3. **Test with the HTML demo** first before integrating
4. **Check Supabase dashboard** for any service issues

The system is configured correctly - real-time collaboration should work when User 1 moves an element and User 2 sees it move instantly!
