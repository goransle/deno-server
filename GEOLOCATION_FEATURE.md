# Geolocation-Based Ferry Route Selection - POC

## Overview
This POC implements automatic selection of the closest ferry route based on the user's geographic location.

## Features

### Automatic Route Selection
When geolocation is enabled in settings:
- On visiting `/` or `/ferjetider` (default pages)
- The app automatically detects your location
- Calculates distance to all available ferry stops
- Redirects to the ferry route with the closest stop

### Supported Ferry Routes
- Vangsnes ↔ Hella
- Hella ↔ Dragsvik
- Vangsnes ↔ Dragsvik
- Fodnes ↔ Mannheller

## How to Use

1. **Enable Geolocation**
   - Click the settings button (🛠️) at the bottom of the page
   - Check the "Use geolocation" checkbox
   - Click "Save"

2. **Visit the Default Page**
   - Navigate to `/` or `/ferjetider`
   - The app will request your location permission (first time only)
   - Once granted, you'll be automatically redirected to the closest ferry route

3. **Session Behavior**
   - The redirect only happens once per session
   - To test again, clear session storage or open a new incognito window

## Technical Details

### Distance Calculation
The app uses **actual road distance** by calling the OpenRouteService API via the `/ferje-directions` endpoint:

```javascript
async function getRoadDistance(ferryStop, userLon, userLat) {
  const response = await fetch(`/ferje-directions/${ferryStop}/${userLon},${userLat}`);
  const data = await response.json();
  return parseFloat(data.routes[0].summary.distance) / 1000; // Convert meters to km
}
```

If the API is unavailable, it falls back to the Haversine formula for straight-line distance:
```javascript
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
```

**Why road distance matters:** In areas with fjords and mountains, straight-line distance can be misleading. For example, Vangsnes may be farther "as the crow flies" but closer by road than Hella due to terrain.

### Route Selection Algorithm
1. Get user's current location via geolocation API
2. Query actual road distance to each ferry stop using OpenRouteService API
3. Select the ferry stop with the shortest road distance
4. Find a ferry route that includes that stop
5. If the closest stop is normally a "to" location, swap direction to make it the "from"

This ensures users are directed to the ferry that's actually easiest to reach by road, not just closest in a straight line.

### Storage
- **localStorage**: Stores user preference for geolocation (`allowedSettings`)
- **sessionStorage**: Prevents repeated redirects (`hasRedirectedToClosestFerry`)

## Example Scenarios

### Scenario 1: User in Vangsnes Area
- User location: `61.17°N, 6.64°E` (near Vangsnes)
- Closest stop: Vangsnes ferjekai
- Redirect: `/ferjetider/vangsnes-hella`

### Scenario 2: User in Mannheller Area
- User location: `61.16°N, 7.34°E` (near Mannheller)
- Closest stop: Mannheller ferjekai
- Redirect: `/ferjetider/mannheller-fodnes`

## Testing

### Manual Testing Steps
1. Open the app in a browser
2. Open developer console to see logs
3. Enable geolocation in settings
4. Navigate to `/`
5. Check console for messages:
   - "Finding closest ferry based on location: [lat] [lon]"
   - "Redirecting to closest ferry route: [from] to [to]"

### Simulating Different Locations
In Chrome DevTools:
1. Open DevTools (F12)
2. Press Ctrl+Shift+P (Cmd+Shift+P on Mac)
3. Type "sensors"
4. Select "Show Sensors"
5. Choose a location or enter custom coordinates

## Future Enhancements

Potential improvements for a production version:
1. **Fallback for denied permissions**: Show manual selection UI
2. **Distance display**: Show how far the user is from each ferry
3. **Smart defaults**: Remember user's most frequently visited routes
4. **Offline support**: Cache last known location
5. **Multiple route options**: Show top 2-3 closest routes with distances
6. **Time-based suggestions**: Consider ferry schedule and arrival time
