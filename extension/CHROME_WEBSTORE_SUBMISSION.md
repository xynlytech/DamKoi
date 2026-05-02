# DamKoi Chrome Extension — Web Store Submission Checklist

## Pre-Submission Requirements ✅

### 1. Developer Account
- [ ] Create Google Play Developer Account (free for Chrome Web Store now)
- [ ] Go to: https://chrome.google.com/webstore/developer/dashboard
- [ ] Add payment method (free, but required for verification)
- [ ] Agree to Chrome Web Store policies

### 2. Extension Package
- [ ] Verify `manifest.json` is correct
- [ ] All icons exist and are proper PNG files (16x16, 48x48, 128x128)
- [ ] **IMPORTANT:** Remove localhost from `host_permissions`
- [ ] Test extension locally: Load unpacked works without errors
- [ ] No console errors when extension loads
- [ ] No hardcoded credentials or secrets in code

### 3. Code Quality
- [ ] No eval() or unsafe scripts
- [ ] Content Security Policy is strict
- [ ] No DOM manipulation vulnerabilities
- [ ] All API calls use HTTPS only
- [ ] Permission scope is minimal (only necessary permissions)

### 4. Privacy & Compliance
- [ ] Privacy Policy created and ready to link
- [ ] Terms of Service created and ready to link  
- [ ] No user data collection beyond what's required
- [ ] No third-party tracking scripts
- [ ] Clear disclosure of affiliate commission (if any)

---

## Pre-Submission Fixes Needed

### Fix 1: Update manifest.json for Production
```json
"host_permissions": [
  "https://api.damkoi.com/*"
]
// REMOVE: "http://localhost:8000/*"
```

### Fix 2: Ensure Icons are Real PNG Files
Current icons are 77 bytes (likely invalid). Need to create proper icons:
- 16x16 px: icon16.png (favicon size)
- 48x48 px: icon48.png (extension listing)  
- 128x128 px: icon128.png (Chrome Web Store)

**Quick fix:** Use any online icon generator or create a simple DK logo.

### Fix 3: Remove Debug Endpoints
Search for any `http://localhost` references and ensure they're not in production code:
```bash
grep -r "localhost" extension/ --include="*.js"
# Should only find comments, not active code
```

### Fix 4: Add Privacy Policy
Create a simple privacy policy at a public URL (e.g., `damkoi.com/privacy`):

```markdown
# Privacy Policy — DamKoi Chrome Extension

## Data Collection
We collect:
- Product URLs you visit on Daraz
- Your target prices for alerts
- Your email address (for alerts only)

We do NOT collect:
- Browsing history
- Personal information beyond what you provide
- Credit card or payment information

## Data Usage
- Your data is stored securely
- We do not sell your data
- We do not track you across websites
- Alerts are sent only when price drops below target

## Contact
Email: damkoi@example.com
```

---

## Submission Steps

### Step 1: Package Extension
```bash
cd /Volumes/T7\ Shield/Xynly/Products/DamKoi/DamKoi\ Codebase/extension

# Create a zip file (Chrome Web Store requirement)
zip -r DamKoi-v1.0.0.zip \
  manifest.json \
  popup.html popup.js popup.css \
  content.js content.css \
  background.js \
  utils.js visualizer.js icons.js \
  icons/
```

### Step 2: Upload to Chrome Web Store
1. Go to: https://chrome.google.com/webstore/developer/new
2. Click "Create Item"
3. Fill out the form:
   - **Item Name:** DamKoi — Bangladesh Shopping Intelligence
   - **Category:** Shopping
   - **Language:** English
   - **Upload ZIP:** Select the file you just created

### Step 3: Fill in Store Listing
- **Short Description:** (132 chars max)
  "See if Daraz discounts are real or fake with price history and deal scores."

- **Detailed Description:** (Keep it concise)
```
DamKoi is the shopping intelligence layer for Bangladesh.

✅ Price History: See how prices have changed over 90 days
✅ Fake Discount Detector: Know if a "sale" is real or inflated
✅ Deal Score: 1-10 rating for every product
✅ Price Alerts: Get emailed when prices drop
✅ Cheaper Alternatives: Find better deals in same category

Why DamKoi?
- Sellers on Daraz often inflate base prices before sales, then show large "discount" badges
- DamKoi gives you the data to know the truth
- Make smarter shopping decisions based on real price history

⚠️ This extension only works on daraz.com.bd and is not affiliated with Daraz.
```

- **Category:** Shopping
- **Language:** English
- **Screenshots:** (at least 1, max 5)
  - Screenshot 1: Extension popup showing FAKE_DISCOUNT verdict
  - Screenshot 2: Price history chart
  - Screenshot 3: Deal score visualization

- **Privacy Policy URL:** https://damkoi.com/privacy
- **Support URL:** https://damkoi.com/support
- **Permissions:**
  ```
  This extension:
  - Runs on Daraz product pages only
  - Sends product URLs to our API for price history
  - Stores your email locally for price alerts
  - Does NOT track your browsing outside Daraz
  - Does NOT store sensitive information
  ```

### Step 4: Upload Icons
- Update extension store icon (128x128): Shows in Web Store listing
- Upload screenshot (1280x800): Shows in Web Store details

### Step 5: Review & Submit
- Review all fields for accuracy
- Check for typos and grammatical errors
- Verify icons and screenshots display correctly
- Click "Submit for Review"

---

## After Submission

### Timeline
- **Initial Review:** 24-48 hours
- **Possible Feedback:** 1-7 days
- **Approved & Live:** Another 24-48 hours after approval

### Possible Rejection Reasons & Fixes
| Reason | Fix |
|--------|-----|
| "Extension doesn't work" | Test locally, ensure API is reachable |
| "Permissions are too broad" | Minimize to only what's needed |
| "Unclear purpose" | Improve description, add better screenshots |
| "Privacy concerns" | Add privacy policy, be transparent about data |
| "Broken links" | Verify privacy/support URLs work |
| "Contains ads/tracking" | Remove any third-party scripts |

---

## Post-Launch Checklist

- [ ] Extension approved and live
- [ ] Share link: https://chrome.google.com/webstore/search/damkoi
- [ ] Add link to damkoi.com website
- [ ] Track install metrics
- [ ] Respond to reviews promptly
- [ ] Monitor for user feedback and bugs

---

## Links & Resources

- Chrome Web Store Developer Guide: https://developer.chrome.com/docs/webstore/
- Manifest V3 Reference: https://developer.chrome.com/docs/extensions/mv3/manifest/
- Best Practices: https://developer.chrome.com/docs/webstore/best-practices/
- Policies: https://developer.chrome.com/docs/webstore/program-policies/

---

**Current Status:** ⏳ READY for submission
**Blockers:** Update manifest.json to remove localhost, create proper icons, write privacy policy
**Estimated Time to Fix:** 30 minutes
**Estimated Review Time:** 48-72 hours
