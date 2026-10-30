# Wedding-shower-registry

# Setting up Melissa & Chad's registry

The page works straight away in **preview mode** (open `index.html`, tap a gift, and it scratches off), but
claims are only saved on that one device. To make the scratch-offs shared between all guests, and to get an email
every time someone picks a gift, connect it to a free Google Sheet. It takes about 5 minutes.

## 1. Create the Sheet and paste in the script

1. Go to [sheets.new](https://sheets.new) and name the sheet **Wedding Registry Claims**.
2. Click **Extensions → Apps Script**.
3. Delete everything in the editor and paste in the contents of [`Code.gs`](./Code.gs).
4. At the top, change `PUT-YOUR-EMAIL-HERE@example.com` to the email address where you want the notifications.
5. Click the **Save** icon.

## 2. Give it permission (once)

1. In the function dropdown at the top, pick **authorizeOnce** and click **Run**.
2. Google will ask you to review permissions. Choose your account, then **Advanced → Go to (project name) → Allow**.
   (It says "unsafe" only because you wrote the script yourself and Google hasn't reviewed it.)
3. You should receive a test email, and a **Claims** tab appears in your Sheet.

## 3. Publish it as a web app

1. Click **Deploy → New deployment**.
2. Click the gear icon next to "Select type" and choose **Web app**.
3. Set **Execute as: Me** and **Who has access: Anyone**.
4. Click **Deploy** and copy the **Web app URL** (it ends in `/exec`).

## 4. Connect the page

1. Open `script.js` and paste the URL between the quotes:

   ```js
   APPS_SCRIPT_URL: "https://script.google.com/macros/s/XXXXXXXX/exec",
   ```

2. Upload the updated files to your site (e.g. commit and push to GitHub Pages).

The grey "Preview mode" banner disappears once the URL is set. Until then, claims are stored only in each
guest's own browser and will not sync between devices. With the backend connected, open pages check for new
claims every 15 seconds (and when a guest returns to the tab).

## How you'll use it

- **Every claim** sends you an email: *"Registry: Thandi is bringing Rice"* with her name and email.
- The **Claims** tab in the Sheet is the full "who's bringing what" list.
- **To free up an item** (someone cancels), delete that row in the Claims tab. It becomes available again.
- Guests also get a thank-you email. To turn that off, set `SEND_GUEST_CONFIRMATION = false` in the script.

## If you change Code.gs later

Changes only go live after **Deploy → Manage deployments → ✏️ Edit → Version: New version → Deploy**.
The URL stays the same.

## Notes

- Google limits free accounts to about 100 emails a day through scripts. Each claim sends 2 (you + the guest), so
  that's roughly 50 claims a day, which is plenty for 65 items.
- Guests' names and emails are never shown on the page. They only go to you and the Sheet.