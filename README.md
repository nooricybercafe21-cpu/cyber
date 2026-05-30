# 🕌 نوری — Noori Cyber Cafe & Noori Perfume
## Complete Smart Shop Manager

---

## ✅ All Features

| Module | Features |
|--------|---------|
| 🛒 **POS / Billing** | Hybrid cart (attar + mobile + cyber), custom volume, loyalty points, khata billing, printable receipts |
| 📦 **Inventory** | Bulk attar tracker (ml/tola), variants, low-stock alerts, stock adjustment |
| 📱 **Mobile Recharge** | All operators (Airtel/Jio/Vi/BSNL), DTH, commission tracking, quick operator buttons |
| 🏦 **Airtel Payment Bank** | Deposit, Withdrawal, Fund Transfer, Aadhaar Pay, Account Opening, Insurance, EMI — all with commission tracking |
| 🧪 **Perfume Creator** | Custom blend logger, attach to customer, % visualizer, recipe library |
| 👥 **Customers** | Loyalty points, khata balance, purchase history, WhatsApp reminders |
| 📒 **Khata Ledger** | Full credit/debit/payment ledger per customer |
| 🚚 **Purchases** | Log wholesale purchases, payment status, supplier tracking |
| 🤝 **Suppliers** | Supplier directory with contacts |
| 💸 **Daily Expenses** | Log rent, electricity, internet, salary, etc. with date/category filters |
| 📝 **Quick Notes** | Staff sticky notes — Urgent / Normal / Info priority, mark done |
| 📈 **Analytics** | Revenue trend, category split, top products, payment methods |
| 🏠 **Dashboard** | Today's earnings (shop + recharge + banking combined), stacked bar chart |

---

## 🐛 BUG FIX — Inventory Not Working After Publish

**Root Cause Fixed:** All modal `onclick` functions are now explicitly bound to `window` scope, so they work perfectly even after publishing.

---

## 📱 HOW TO USE

### First Time
1. Open app → **Noori splash screen** for 2 sec → Dashboard loads
2. Click **"🚀 Load Samples"** banner → demo data fills automatically

### Make a Sale
1. **POS / Billing** → click products → adjust quantities
2. For bulk attar → popup asks "How many ml?" → type volume
3. Add customer (optional) → choose payment → **Complete Sale**
4. Receipt pops up with Noori branding — print or note WhatsApp/Email

### Log a Recharge
1. **Mobile Recharge** → click operator quick button (Airtel, Jio, Vi…)
2. Enter mobile number + plan amount → commission auto-fills
3. Save → commission tracked in monthly report

### Log a Banking Transaction
1. **Airtel Payment Bank** → click quick button (Deposit / Withdrawal / Transfer…)
2. Enter customer name + amount + service charge + Airtel commission
3. Save → all earnings tracked

### Add Inventory
1. **Inventory** → **+ Add Item**
2. For bulk attar: Category = "Attar Bulk", Unit = "ml"
3. For bottles ready to sell: Category = "Attar Variant", Unit = "piece", add variant label
4. For mobile accessories: Category = "Mobile Accessory", Unit = "piece"
5. Set **Low-Stock Alert** number

---

## 🚀 HOW TO PUBLISH ON GENSPARK

**This is the easiest way — no GitHub needed!**

1. Look at the **top of this page** — find the **"Publish"** tab
2. Click **Publish**
3. You get a **live URL** like: `https://your-project.genspark.site`
4. Open it on your **phone**, **computer**, or **tablet** — it works everywhere
5. **Bookmark it** on your phone's home screen for one-tap access
6. All data saves in the cloud automatically — **no data loss**

---

## 💻 HOW TO ADD TO GITHUB (Step by Step)

### What You Need
- A free GitHub account (sign up at github.com)
- That's it! No coding knowledge needed

### Step 1 — Create a GitHub Account
1. Go to **github.com**
2. Click **Sign up**
3. Enter your email, create a password, choose a username (e.g. `noori-shop`)
4. Verify your email

### Step 2 — Create a New Repository
1. After logging in, click the **+** button (top right) → **New repository**
2. Repository name: `noori-shop-manager`
3. Description: `Noori Cyber Cafe & Noori Perfume — Smart Shop Manager`
4. Select **Public** (free) or **Private**
5. Click **Create repository**

### Step 3 — Download Your Project Files
1. On this Genspark page, look for a **Download** or **Export** button
2. Download all files as a ZIP
3. Extract the ZIP on your computer — you'll see folders: `css/`, `js/`, and `index.html`

### Step 4 — Upload to GitHub
1. On your new GitHub repository page, click **"uploading an existing file"** link
2. Drag and drop ALL the files and folders:
   - `index.html`
   - `css/` folder (style.css, animations.css, modules.css)
   - `js/` folder (all .js files)
   - `README.md`
3. Scroll down → write commit message: `Initial upload - Noori Shop Manager`
4. Click **Commit changes**

### Step 5 — Enable GitHub Pages (Free Hosting!)
1. In your repository, click **Settings** tab
2. Scroll down to **Pages** section (left sidebar)
3. Under **Source**, select **Deploy from a branch**
4. Branch: **main**, Folder: **/ (root)**
5. Click **Save**
6. Wait 2-3 minutes → GitHub gives you a URL like:
   `https://your-username.github.io/noori-shop-manager`

### Step 6 — Access Your Live App
- **That URL is your permanent link** — share it with anyone!
- Works on mobile, tablet, and computer
- Free forever on GitHub Pages

> ⚠️ **Note:** GitHub Pages hosts the files, but the **database (tables)** still runs on Genspark servers. So the app URL from **Genspark Publish tab** is the best option for full functionality including data saving.

---

## 💡 10 FEATURES TO ADD NEXT

| # | Feature | Benefit |
|---|---------|---------|
| 1 | **GST Invoice Generator** | Print proper GST bills for business customers |
| 2 | **Monthly P&L Report** | Revenue − Expenses = Your net profit |
| 3 | **Recharge Commission Rate Editor** | Edit % rates per operator from settings page |
| 4 | **Barcode Scanner (Camera)** | Scan mobile accessory barcodes with phone camera |
| 5 | **Staff Login Roles** | Separate access for owner and staff |
| 6 | **Daily Cash Register Summary** | Print end-of-day: Cash + UPI + Khata + Recharge totals |
| 7 | **WhatsApp Receipt API** | Actually send bills via WhatsApp Business automatically |
| 8 | **Customer Birthday Reminder** | Auto-note when a customer's birthday is coming |
| 9 | **Perfume Bottle Label Maker** | Print "Noori Perfume" labels for 6ml/12ml bottles |
| 10 | **Stock Expiry Alerts** | Warn when bulk attar batch is older than 6 months |

---

## 🗄️ Database Tables (9 tables)
`inventory` · `sales` · `purchases` · `suppliers` · `customers` · `khata_ledger` · `perfume_recipes` · `expenses` · `shop_notes` · `recharges` · `banking_transactions`

---

*Made with ❤️ for Noori Cyber Cafe & Noori Perfume — نوری*
