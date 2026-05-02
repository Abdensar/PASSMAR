# 🚀 Deployment Guide: Setting Up ON-CHAIN & OFF-CHAIN on a New Device

## Overview of Your System

Your PASSMAR app has **two parts that work together**:

```
┌─────────────────────────────────────────┐
│          FRONTEND (React)               │
│    http://localhost:3000                │
└──────────────────┬──────────────────────┘
                   │
       ┌───────────┴───────────┐
       │                       │
       ▼                       ▼
┌──────────────────┐    ┌──────────────────┐
│  BACKEND (API)   │    │  BLOCKCHAIN      │
│  :5000           │    │  (Ganache)       │
│                  │    │  :7545           │
│ ┌──────────────┐ │    └──────────────────┘
│ │ MongoDB      │ │         ▲
│ │ (Atlas)      │ │         │
│ └──────────────┘ │         │
└──────────────────┘         │
      │          OFF-CHAIN   │ ON-CHAIN
      └──────────────────────┘
```

---

## 📋 What to Do on a NEW Device

### **Step 1: Setup OFF-CHAIN (Database) 🗄️**

**What it is:** Where you store passport data, travel history, users, etc.

**On your current device:**
- MongoDB Atlas: `mongodb+srv://user:password@passmar-cluster.jknxxtz.mongodb.net/test`

**On NEW device:**

**Option A: Use SAME MongoDB Atlas (Recommended) ✅**
```
✅ No setup needed - just copy your .env file
✅ All data stays in cloud
✅ Easy to scale
```

**Option B: Use NEW MongoDB Atlas (For isolation)**
```
1. Go to: mongodb.com/cloud/atlas
2. Create new cluster
3. Add new database user & IP whitelist
4. Copy new connection string: mongodb+srv://newuser:newpass@newcluster.xxx.mongodb.net/test
```

---

### **Step 2: Setup ON-CHAIN (Blockchain) ⛓️**

**What it is:** Smart contracts that prove passports exist and travels happened.

**On your current device:**
- Ganache running on: `127.0.0.1:7545`
- Smart contract deployed at: `0xc71Bc863731afD74A5858731737EF59000610af4`

**On NEW device: YOU MUST REDEPLOY**

⚠️ **IMPORTANT:** Each device gets its own blockchain instance!

**Steps:**

1. **Install Ganache on new device:**
   ```bash
   # Windows
   # Download: https://trufflesuite.com/ganache/
   # Or use CLI:
   npm install -g ganache-cli
   ganache-cli --port 7545
   ```

2. **Deploy smart contract:**
   ```bash
   cd blockchain
   npx hardhat run scripts/deploy.js --network ganache
   ```
   
   This will output something like:
   ```
   PassportRegistry deployed to: 0xNEWADDRESS123...
   ```

3. **Update your .env file** with new contract address:
   ```
   PASSPORT_REGISTRY_ADDRESS=0xNEWADDRESS123...
   ```

---

### **Step 3: Environment Variables (.env) 📝**

**Create `.env` file in `/backend` folder:**

```bash
# DATABASE
MONGODB_URI=mongodb+srv://user:pass@cluster.xxx.mongodb.net/test

# BLOCKCHAIN
GANACHE_URL=http://127.0.0.1:7545
PASSPORT_REGISTRY_ADDRESS=0x[YOUR_NEW_CONTRACT_ADDRESS]
DEPLOYER_PRIVATE_KEY=[GANACHE_PRIVATE_KEY]

# SERVER
NODE_ENV=development
PORT=5000
FRONTEND_ORIGIN=http://localhost:3000

# AUTH
SECRET_KEY=your-secret-key-here
```

**Also create `.env` in `/blockchain` folder:**

```bash
# Get these from Ganache UI
DEPLOYER_PRIVATE_KEY=0x[GANACHE_ACCOUNT_PRIVATE_KEY]
```

---

## 🔄 Workflow for New Device

```
DEVICE 1 (Current)          →    DEVICE 2 (New)
┌──────────────────┐             ┌──────────────────┐
│ MongoDB Atlas    │─────────────│ Same MongoDB     │
│ (CLOUD)          │             │ (CLOUD)          │
└──────────────────┘             └──────────────────┘

┌──────────────────┐             ┌──────────────────┐
│ Ganache #1       │             │ Ganache #2       │
│ Contract: 0xAAA  │             │ Contract: 0xBBB  │
│ :7545            │             │ :7545            │
└──────────────────┘             └──────────────────┘
         ✗                                ✓
    Can't connect                   Connected
```

---

## ✅ Checklist for New Device

- [ ] Node.js v18+ installed
- [ ] Ganache running on `127.0.0.1:7545`
- [ ] Smart contract deployed (get new address)
- [ ] `.env` file created with:
  - `MONGODB_URI` (same or new)
  - `PASSPORT_REGISTRY_ADDRESS` (new contract address)
  - `GANACHE_URL`
- [ ] `npm install` in `/backend`
- [ ] `npm install` in `/frontend`
- [ ] `npm install` in `/blockchain`
- [ ] Start backend: `npm start` (or `npm run dev`)
- [ ] Start Ganache: `ganache-cli --port 7545`
- [ ] Start frontend: `npm start`

---

## 🔗 How They Work Together

### Creating a Travel Record (Example)

```
1. User submits form on FRONTEND
   "I traveled from Paris to London"

2. BACKEND receives request (OFF-CHAIN)
   Saves to MongoDB:
   ├─ Travel record
   ├─ Date & checkpoint
   └─ Passport ID

3. BACKEND calls BLOCKCHAIN (ON-CHAIN)
   Smart contract records:
   ├─ Proof exists
   ├─ Hash (hmac_hash)
   └─ Transaction hash (tx_hash)

4. RESPONSE sent to FRONTEND
   {
     tx_hash: "0x123abc...",      ← Blockchain proof
     hmac_hash: "abc123...",      ← Database ID
     message: "Travel recorded"
   }
```

---

## ❓ Common Questions

### Q: Can I use Device A's blockchain on Device B?
**A:** ❌ NO - Each Ganache instance is isolated. You must deploy new contract.

### Q: Can I use same MongoDB?
**A:** ✅ YES - MongoDB Atlas is cloud-based, so all devices can share it.

### Q: What if I want to sync data between devices?
**A:** Same MongoDB URI + sync scripts (backup/restore from different devices)

### Q: How to backup before switching devices?
```bash
# Export from Device 1
mongodump --uri="mongodb+srv://..." --out=./backup

# Import to Device 2
mongorestore --uri="mongodb+srv://..." ./backup
```

### Q: My contract address changes every deploy - is that normal?
**A:** ✅ YES - Each device/deployment gets unique address. Update `.env` each time.

---

## 🎯 Quick Setup Summary

| Component | Device 1 | Device 2 | Action |
|-----------|----------|----------|--------|
| **MongoDB** | Atlas Cloud | Same Atlas | Share URL in .env |
| **Ganache** | 127.0.0.1:7545 | Different instance | Run new Ganache |
| **Contract Address** | 0xAAA... | 0xBBB... | **Deploy & update .env** |
| **Data (passports/travels)** | In DB | Same DB | Shared automatically |
| **Blockchain Proofs** | On Chain 1 | On Chain 2 | Each device keeps its own |

---

## 📚 Files to Check/Update

```
backend/
├─ .env ← UPDATE with new contract address & MongoDB URI
├─ config/db.js ← Reads MONGODB_URI from .env
└─ services/blockchainService.js ← Uses PASSPORT_REGISTRY_ADDRESS

blockchain/
├─ .env ← Private key for deploying
├─ hardhat.config.js ← GANACHE_URL configuration
└─ scripts/deploy.js ← Run this to get new address

frontend/
├─ src/services/apiClient.js ← Uses http://localhost:5000
└─ .env (if any) ← Backend URL
```
