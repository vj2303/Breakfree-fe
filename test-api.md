# Manual API Test for Assessment Center

## Test the Backend API Directly

Replace `YOUR_TOKEN` with your actual Bearer token from localStorage.

### Test 1: POST with Template ID (New Format)

```bash
curl -X POST 'http://localhost:3001/api/assessment-centers' \
  --header 'Authorization: Bearer YOUR_TOKEN' \
  --header 'Content-Type: application/json' \
  --data '{
    "name": "Test Assessment Center",
    "description": "Test description",
    "displayName": "Test Display Name",
    "displayInstructions": "Test instructions",
    "competencyIds": [],
    "reportTemplateName": "Test Report",
    "reportTemplateType": "68fde9e273c67932391a522a",
    "activities": [],
    "assignments": []
  }'
```

### Test 2: POST with Old Enum Format (Should fail if backend updated)

```bash
curl -X POST 'http://localhost:3001/api/assessment-centers' \
  --header 'Authorization: Bearer YOUR_TOKEN' \
  --header 'Content-Type: application/json' \
  --data '{
    "name": "Test Assessment Center 2",
    "description": "Test description",
    "displayName": "Test Display Name",
    "displayInstructions": "Test instructions",
    "competencyIds": [],
    "reportTemplateName": "Test Report",
    "reportTemplateType": "TEMPLATE1",
    "activities": [],
    "assignments": []
  }'
```

## How to Get Your Token

1. Open browser DevTools (F12)
2. Go to Application/Storage tab
3. Click on Local Storage
4. Find the `token` key
5. Copy the value

## Expected Results

- **Test 1** should succeed if backend changes are applied
- **Test 2** should fail with validation error if backend changes are applied

If Test 1 still fails, the backend changes haven't been deployed or there's a validation layer that wasn't updated.
