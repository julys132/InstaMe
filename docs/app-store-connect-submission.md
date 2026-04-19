# App Store Connect Submission Worksheet

This worksheet is tailored to the current app in this repo.

## Critical Before Submit

1. Final public brand chosen: `Chicoo`.
  Use `Chicoo` consistently in:
   - App Store name
   - subtitle
   - screenshots
   - preview text
   - welcome screen
   - legal/support pages

2. iOS monetization must stay Apple-compliant.
   The iOS app should only sell digital goods through Apple IAP.
   Avoid any iOS-facing copy or buttons that route users to Stripe or web checkout for digital features.

3. Use your real production Railway URL right now.
  Current recommended URLs until you add a custom domain:
  - Marketing URL: `https://instame.up.railway.app`
  - Support URL: `https://instame.up.railway.app/contact`
  - Privacy URL: `https://instame.up.railway.app/privacy`
  - Terms URL: `https://instame.up.railway.app/terms`
  - Delete account URL: `https://instame.up.railway.app/delete-account`

  Later, if you add a custom domain, replace the Railway URLs everywhere in App Store Connect.

## App Information

### Recommended ASO Metadata

Use these as the recommended listing values for the final `Chicoo` brand.

- Name:
  `Chicoo`

- Subtitle:
  `Instagrammable AI Photo Edits`

- Subtitle alternatives under 30 characters:
  - `Instagrammable AI Edits`
  - `AI Edits for Chic Photos`
  - `Styled Photo Edits with AI`

- Promotional Text:
  `Create trend-led portraits, edit selfies, try AI style looks, and save reusable style references in seconds.`

- Keywords:
  `ai photo editor,portrait,style,outfit,fashion,selfie,stylist,photo effects,looks,headshots`

### Long Description Draft

Use this in the App Store version metadata description field.

`Chicoo helps you turn everyday portraits into polished, trend-led AI images. Upload a selfie, enhance your base portrait, apply curated fashion-inspired styles, or build your own reusable style references for consistent results.

With Chicoo, you can:
- transform portraits into premium AI-styled looks
- refine generated images with one-tap edit tools
- save favorite styles and reusable Own Styles
- compare before and after results
- keep a recent history of your best generations
- enhance portraits before styling for cleaner, more realistic output

Chicoo is built for users who want fast, modern portrait styling without complicated editing workflows. Whether you want elevated editorial looks, cleaner social content, or repeatable personal style references, Chicoo gives you an easy AI workflow in one app.

Core features:
- AI portrait styling
- portrait enhancement
- reusable custom style references
- favorites and generation history
- downloadable high-resolution exports
- account-based credit system for image generations and edits

Some features require credits or in-app purchases.`

### General Information

- Bundle ID:
  `com.instame.app`

- SKU:
  `EX1773333285575`

- Apple ID:
  `6760482093`

- Primary language:
  `English (U.S.)`

- Primary category:
  `Photo & Video`
  Reason: this is the strongest fit because the core product is AI photo editing, portrait styling, image generation, and downloadable visual output.

- Secondary category:
  `Lifestyle`
  Reason: this supports the fashion, aesthetic, and personal-style positioning without conflicting with the app's main photo-editing purpose.

If Apple asks for the optional secondary category and you want the safest setup, use:
- Primary: `Photo & Video`
- Secondary: `Lifestyle`

Do not use these as the primary category unless the product direction changes:
- `Graphics & Design`: too creator-tool oriented for the current product
- `Social Networking`: the app does not function as a social platform
- `Entertainment`: too broad and weaker for ASO than Photo & Video

### Content Rights

Recommended choice:

- If Apple asks whether the app contains or accesses third-party content:
  choose the option that says you have the necessary rights for all content shown or processed in the app.

Reason:
The app processes user-uploaded images and uses internal style assets and AI providers. Do not choose an option that implies zero third-party content if you are unsure.

## Age Rating

Recommended questionnaire answers based on the current app behavior:

### Quick Fill Answers

If you want the short version for App Store Connect, use these:

- In-App Controls
  - Parental Controls: `No`
  - Age Assurance: `No`

- Capabilities
  - Unrestricted Web Access: `No`
  - User-Generated Content: `Yes`
  - Messaging and Chat: `No`
  - Advertising: `No`

- Mature Themes
  - Profanity or Crude Humor: `None`
  - Horror/Fear Themes: `None`
  - Alcohol, Tobacco, or Drug Use or References: `None`

- Medical or Wellness
  - Medical or Treatment Information: `None`
  - Health or Wellness Topics: `None`

- Sexuality or Nudity
  - Mature or Suggestive Themes: `None`
  - Sexual Content or Nudity: `None`
  - Graphic Sexual Content and Nudity: `None`

- Violence
  - Cartoon or Fantasy Violence: `None`
  - Realistic Violence: `None`
  - Prolonged Graphic or Sadistic Realistic Violence: `None`
  - Guns or Other Weapons: `None`

- Chance-Based Activities
  - Gambling: `No`
  - Simulated Gambling: `No`
  - Contests: `No`
  - Loot Boxes: `No`

Recommended final result to expect:
- likely `12+`

### In-App Controls

- Parental Controls: `No`
- Age Assurance: `No`

### Capabilities

- Unrestricted Web Access: `No`
- User-Generated Content: `Yes`
- Messaging and Chat: `No`
- Advertising: `No`

### Mature Themes

- Profanity or Crude Humor: `None`
- Horror/Fear Themes: `None`
- Alcohol, Tobacco, or Drug Use or References: `None`

### Medical or Wellness

- Medical or Treatment Information: `None`
- Health or Wellness Topics: `None`

### Sexuality or Nudity

- Mature or Suggestive Themes: `None` unless your marketing screenshots contain suggestive fashion imagery
- Sexual Content or Nudity: `None`
- Graphic Sexual Content and Nudity: `None`

### Violence

- Cartoon or Fantasy Violence: `None`
- Realistic Violence: `None`
- Prolonged Graphic or Sadistic Realistic Violence: `None`
- Guns or Other Weapons: `None`

### Chance-Based Activities

- Gambling: `No`
- Simulated Gambling: `No`
- Contests: `No`
- Loot Boxes: `No`

Expected outcome:
likely `12+`, depending on Apple’s final calculation.

## App Encryption Documentation

Current app config already sets:

- `ITSAppUsesNonExemptEncryption = false`

Recommended answer:

- This app does not use non-exempt encryption beyond standard Apple platform encryption.

No additional export compliance document should be needed unless you later add custom crypto.

## App Store Regulations & Permits

### For The Screen You Attached

Use these exact actions for the visible sections in App Store Connect:

- App Encryption Documentation:
  - Do not upload anything right now.
  - Your app already declares `ITSAppUsesNonExemptEncryption = false`.
  - If App Store Connect still shows the upload area, you can leave it alone unless Apple explicitly asks for extra export-compliance documents.

- Digital Services Act:
  - No extra action needed here if trader information is already correctly set.
  - Only edit it if your legal trader name, address, email, or phone details are wrong.

- Vietnam Game License:
  - Leave empty.
  - Do not add anything.
  - The app is not a game.

- Regulated Medical Devices:
  - Open it and declare `No`.
  - The app is not a medical device.

- App Store Server Notifications:
  - Set both `Production Server URL` and `Sandbox Server URL` to your backend notification endpoint.
  - Recommended path: `https://YOUR_DOMAIN/api/apple/server-notifications`

- App-Specific Shared Secret:
  - Configure it before testing or submitting iOS auto-renewable subscriptions.
  - Copy the shared secret into your backend environment as `APPLE_SHARED_SECRET`.

- Additional Information:
  - No action needed there for submission.

### Digital Services Act

- Trader status: already marked as trader.
- Fill legal trader details exactly as they appear in your company or sole-trader registration.

### Vietnam Game License

- `Not applicable`

### Regulated Medical Device

- `No`

### App Store Server Notifications

Only configure this if you are actively using App Store server notifications for subscriptions or IAP backend automation.

Current repo signals:
- iOS credit packs are handled via IAP verification
- iOS auto-renewable subscriptions are active in the shipped mobile flow
- Apple renew, cancel, expire, and revoke events can now be synchronized from backend notifications

Recommended now:
- configure both Production and Sandbox URLs to `https://YOUR_DOMAIN/api/apple/server-notifications`
- keep `APPLE_SHARED_SECRET` configured for receipt verification
- optional: leave `APPLE_SERVER_NOTIFICATION_ROOT_CERT_URL` at the default Apple Root CA G3 URL unless you need to override it

## App Review

### Contact Information

Use real reviewer contact details, not placeholders.

- First Name: your real first name
- Last Name: your real last name
- Phone Number: your reachable phone number with country code
- Email: an address you actively monitor during review, ideally your founder/support email that you check daily during review

### Review Notes

Use this draft and replace the bracketed values.

`Chicoo is an AI portrait styling app. Users can sign in with email, Apple Sign In, or Google Sign In, upload a portrait, optionally enhance the portrait, choose a style or create an Own Style reference, and generate edited image results.

Main reviewer flow:
1. Sign in or create an account.
2. Open Chicoo.
3. Upload a portrait or choose one from Uploaded Images / Enhanced Portraits.
4. Select a Main Style or Own Style.
5. Tap Transform now.

For iOS, credit packs are purchased through Apple in-app purchases.
Account deletion path: Profile > Delete Account.
Public support URL: [SUPPORT_URL]
Privacy policy: [PRIVACY_URL]

Review account:
Email: [REVIEW_EMAIL]
Password: [REVIEW_PASSWORD]

If needed, the app can also be tested by creating a new account directly in the app.`

### Demo Account

Because the app requires sign-in for core use, give Apple a working demo account.

Recommended:
- create one dedicated review account
- preload a few credits on it
- keep it active until review finishes

## App Privacy

### Tracking

Recommended answer:

- `No, this app does not track users across apps and websites owned by other companies.`

### Data Collection Summary

Recommended disclosures based on the codebase and privacy policy.

#### Data linked to the user

- Contact Info
  - Name
  - Email Address

- User Content
  - Photos or Videos
  - Other User Content: prompts, saved references, generated outputs

- Purchases
  - Purchase History

- Identifiers
  - User ID

- Usage Data
  - Product Interaction

- Diagnostics
  - Crash Data
  - Performance Data

### Purposes

Use these purpose selections where applicable:

- App Functionality
- Account Management
- Customer Support
- Fraud Prevention / Security
- Analytics only if you truly collect product interaction analytics beyond operational logging

### Suggested mapping

- Name, email: `Account Management`, `App Functionality`
- Uploaded photos, prompts, generated outputs: `App Functionality`
- Purchase history: `App Functionality`, `Fraud Prevention`, `Customer Support`
- User ID: `App Functionality`
- Crash/performance logs: `App Functionality`

### Not currently indicated by code

Do not claim these unless separately implemented:

- precise location
- health data
- contacts
- browsing history
- advertising data
- IDFA-based tracking

## App Accessibility

Only declare features you have actually verified.

Conservative recommendation if not formally tested yet:

- Do not overclaim accessibility support in App Store Connect.
- If you have not validated VoiceOver, Dynamic Type, sufficient contrast, captions, and reduced motion behavior end-to-end, leave unsupported items unchecked.

If you want a safer public statement:

`Chicoo supports standard iOS accessibility settings where available, and the team continues improving usability for VoiceOver, text scaling, and contrast.`

## Ratings and Reviews

- No setup needed before review.
- After launch, answer negative reviews quickly and treat screenshot clarity plus subscription confusion as top ASO priorities.

## Growth & Marketing

### In-App Events

- `Skip for v1`

### Custom Product Pages

- `Skip for initial review`

### Product Page Optimization

- `Skip until baseline conversion data exists`

### Promo Codes

- Optional later for creators, testers, or press

### Game Center

- `Not applicable`

## Monetization

### Pricing and Availability

Recommended:

- All countries and regions where you can legally support the app and billing flows
- Remove countries only if support, payments, or legal coverage is incomplete

### In-App Purchases

### For The Screen You Attached

Your current draft IAP is:
- `Quick Start 10 Credits`
- Product ID: `com.instame.app.credits.quickstart10`
- Type: `Consumable`

If App Store Connect shows `Missing Metadata`, open that IAP and complete these fields:

#### Required fields to fill

- Reference Name:
  `Quick Start 10 Credits`

- Product ID:
  `com.instame.app.credits.quickstart10`

- Price:
  choose the tier matching `$2.99`

- Localizations:
  - Display Name: `Quick Start - 10 Credits`
  - Description: `Consumable credits used to generate and edit AI portrait images in Chicoo.`

- Review Screenshot:
  upload one screenshot that clearly shows the credits purchase screen inside the app

#### What to do after metadata is complete

- Save the IAP.
- Go back to the app version page.
- In `In-App Purchases and Subscriptions`, attach `Quick Start 10 Credits` to the version.
- Submit the app version and that first IAP together.

Important:
- Apple requires the first in-app purchase to be submitted together with a new app version.
- After the first IAP is approved, future IAPs can be submitted separately.

#### Recommended metadata for the other packs

- `com.instame.app.credits.creator30`
  - Reference Name: `Creator Pack 30 Credits`
  - Display Name: `Creator Pack - 30 Credits`
  - Description: `Consumable credits used to generate and edit AI portrait images in Chicoo.`

- `com.instame.app.credits.studio60`
  - Reference Name: `Studio Pack 60 Credits`
  - Display Name: `Studio Pack - 60 Credits`
  - Description: `Consumable credits used to generate and edit AI portrait images in Chicoo.`

- `com.instame.app.credits.bestvalue200`
  - Reference Name: `Best Value 200 Credits`
  - Display Name: `Best Value - 200 Credits`
  - Description: `Consumable credits used to generate and edit AI portrait images in Chicoo.`

For iOS, create these as consumable credit packs if not already fully configured:

- `com.instame.app.credits.quickstart10`
  - Reference Name: `Quick Start 10 Credits`
  - Display Name: `Quick Start - 10 Credits`
  - Price: `$2.99`

- `com.instame.app.credits.creator30`
  - Reference Name: `Creator Pack 30 Credits`
  - Display Name: `Creator Pack - 30 Credits`
  - Price: `$7.99`

- `com.instame.app.credits.studio60`
  - Reference Name: `Studio Pack 60 Credits`
  - Display Name: `Studio Pack - 60 Credits`
  - Price: `$14.99`

- `com.instame.app.credits.bestvalue200`
  - Reference Name: `Best Value 200 Credits`
  - Display Name: `Best Value - 200 Credits`
  - Price: `$44.99`

IAP review screenshot guidance:
- use a clean credits purchase screen screenshot from the app
- show the user can buy credits used for image generation and editing

IAP review notes:

`Credit packs are consumable in-app purchases used to generate and edit AI portrait images inside Chicoo. Credits are deducted when the user runs paid image actions.`

### Subscriptions

Current iOS subscription setup:

- iOS subscriptions should be created as `Auto-Renewable Subscriptions` in App Store Connect.
- Put all three plans in one subscription group so users can upgrade or downgrade cleanly.
- The app expects these product IDs by default:
  - `com.instame.app.sub.lite.monthly`
  - `com.instame.app.sub.plus.monthly`
  - `com.instame.app.sub.studio.monthly`

Recommended metadata:

- `com.instame.app.sub.lite.monthly`
  - Group: `Chicoo Pro`
  - Reference Name: `Lite Monthly`
  - Display Name: `Lite`
  - Duration: `1 month`
  - Price: `$4.99`
  - Description: `20 credits every month for AI portrait styling and edits in Chicoo.`

- `com.instame.app.sub.plus.monthly`
  - Group: `Chicoo Pro`
  - Reference Name: `Plus Monthly`
  - Display Name: `Plus`
  - Duration: `1 month`
  - Price: `$9.99`
  - Description: `50 credits every month for AI portrait styling and edits in Chicoo.`

- `com.instame.app.sub.studio.monthly`
  - Group: `Chicoo Pro`
  - Reference Name: `Studio Monthly`
  - Display Name: `Studio`
  - Duration: `1 month`
  - Price: `$19.99`
  - Description: `100 credits every month for AI portrait styling and edits in Chicoo.`

Review notes suggestion:

`iOS subscriptions are auto-renewable subscriptions managed through Apple In-App Purchase. Users can purchase, restore, upgrade, downgrade, and cancel from Apple subscription management. Credits are granted monthly based on the active plan.`

Server notification note:

`The backend listens for App Store Server Notifications at /api/apple/server-notifications so Apple subscription renewals, cancellations, expirations, and revocations can update subscription state automatically.`

## Screenshots and Creative

For SEO/ASO performance, make screenshots keyword-clear instead of only aesthetic.

Recommended screenshot sequence:

1. `AI Portrait Styling in Seconds`
2. `Upload a Selfie, Get a Styled Look`
3. `Create Reusable Own Styles`
4. `Enhance Portraits Before Styling`
5. `Edit Results and Compare Before / After`

Use short overlays with high contrast and one feature per screenshot.

## URLs To Paste

Use your live Railway domain right now unless you already connected a custom domain.

- Marketing URL: `https://instame.up.railway.app`
- Support URL: `https://instame.up.railway.app/contact`
- Privacy Policy URL: `https://instame.up.railway.app/privacy`
- Terms of Service URL: `https://instame.up.railway.app/terms`
- Account Deletion URL: `https://instame.up.railway.app/delete-account`

## Items You Still Need To Fill With Real Data

These cannot be guessed safely:

- legal trader name and address
- review contact name
- review phone number
- review email
- reviewer demo account email
- reviewer demo account password
- final public domain to use in listing URLs
- final brand choice: `InstaMe` vs `Chicoo`

## Recommended Final Submission Order

1. Lock final public brand and metadata.
2. Upload screenshots and optional preview video.
3. Complete App Information and Age Rating.
4. Complete App Privacy questionnaire.
5. Verify iOS IAP products and review screenshots.
6. Add App Review contact details and demo account.
7. Confirm privacy URL, support URL, and delete-account URL are public and working.
8. Submit build for review.
