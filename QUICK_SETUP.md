# ⚡ Quick Setup: New Device Checklist

## Before You Start
- Have access to your MongoDB Atlas credentials
- Know your Ganache private key (from Device 1)

---

## 🔧 Step-by-Step Commands

### **1. ON NEW DEVICE - Clone Your Project**
```bash
# Clone the repo
git clone [your-repo-url] PASSMAR
cd PASSMAR
```

---

### **2. BACKEND SETUP**

```bash
cd backend

# Install dependencies
npm install

# Create .env file
cat > .env << EOF
MONGODB_URI=mongodb+srv://user:password@passmar-cluster.jknxxtz.mongodb.net/test
GANACHE_URL=http://127.0.0.1:7545
PASSPORT_REGISTRY_ADDRESS=0x[WILL_UPDATE_AFTER_DEPLOY]
DEPLOYER_PRIVATE_KEY=0x[YOUR_GANACHE_KEY]
NODE_ENV=development
PORT=5000
FRONTEND_ORIGIN=http://localhost:3000
SECRET_KEY=your-secret-key
EOF

# Verify it was created
cat .env
```

---

### **3. BLOCKCHAIN SETUP**

```bash
cd blockchain

# Install dependencies
npm install

# Create .env
cat > .env << EOF
DEPLOYER_PRIVATE_KEY=0x[YOUR_GANACHE_KEY]
EOF

# Start Ganache (in a NEW terminal)
ganache-cli --port 7545 --deterministic

# In main terminal - Deploy smart contract
npx hardhat run scripts/deploy.js --network ganache
```

**You'll see:**
```
PassportRegistry deployed to: 0x[NEW_ADDRESS]
```

**Copy this address and update `/backend/.env`:**
```bash
PASSPORT_REGISTRY_ADDRESS=0x[NEW_ADDRESS]
```

---

### **4. FRONTEND SETUP**

```bash
cd frontend
npm install
```

---

### **5. START THE APP**

**Terminal 1 - Ganache:**
```bash
cd blockchain
ganache-cli --port 7545
```

**Terminal 2 - Backend:**
```bash
cd backend
npm start
# or for auto-reload: npm run dev
```

**Terminal 3 - Frontend:**
```bash
cd frontend
npm start
# Opens http://localhost:3000
```

---

## 🔍 How to Get Private Key from Ganache

If you don't have the private key:

1. **Start Ganache UI** (desktop app) or **ganache-cli**
2. **In Ganache UI:**
   - Click on key icon 🔑 next to first account
   - Copy the private key starting with `0x`

3. **In Terminal (ganache-cli):**
   - Look for first account with `0x` prefix
   - Copy the private key

---

## ✅ Testing the Setup

```bash
# Test Backend is running
curl http://localhost:5000/health
# Should return: {"ok":true,"service":"passmar-api"}

# Test MongoDB connection
# Check logs: "MongoDB: connecté — ... / base « test »"

# Test Blockchain connection
# Check logs: "Blockchain: connecté (ethers)"

# Test Frontend loads
open http://localhost:3000
```

---

## 🆘 Troubleshooting

### ❌ "MONGODB_URI missing"
```bash
# Make sure .env exists in /backend
ls -la backend/.env
cat backend/.env | grep MONGODB
```

### ❌ "Cannot find contract at address"
```bash
# Re-deploy contract and update address
cd blockchain
npx hardhat run scripts/deploy.js --network ganache
# Copy new address to backend/.env
```

### ❌ "Connection refused at 127.0.0.1:7545"
```bash
# Ganache not running
# Start it in a new terminal:
ganache-cli --port 7545
```

### ❌ "PORT 3000 already in use"
```bash
# Change port in frontend:
cd frontend
PORT=3001 npm start
```

---

## 📊 What's Different on New Device

| Item | Current Device | New Device |
|------|---|---|
| MongoDB | Same Atlas (URL) | Same Atlas (URL) |
| Ganache | 127.0.0.1:7545 | New instance (different blockchain) |
| Contract Address | 0x... (OLD) | 0x... (NEW) - Must update .env |
| Data (Passports) | In MongoDB | In same MongoDB (shared) |
| Travel Records | In MongoDB | In same MongoDB (shared) |
| Blockchain Proofs | On OLD Ganache | On NEW Ganache (separate) |

---

## 🔄 After Setup: Normal Workflow

```bash
# Terminal 1: Ganache
ganache-cli --port 7545

# Terminal 2: Backend
cd backend && npm start

# Terminal 3: Frontend  
cd frontend && npm start

# Open browser
http://localhost:3000
```

---

## 💾 Environment Variables Explained

```env
# Database - Same on all devices
MONGODB_URI=mongodb+srv://user:password@cluster.xxx.mongodb.net/test

# Blockchain - DIFFERENT on each device
GANACHE_URL=http://127.0.0.1:7545
PASSPORT_REGISTRY_ADDRESS=0x[NEW_CONTRACT_ADDRESS]  ← CHANGE THIS!
DEPLOYER_PRIVATE_KEY=0x[YOUR_KEY]

# Server settings
NODE_ENV=development
PORT=5000
FRONTEND_ORIGIN=http://localhost:3000
SECRET_KEY=your-secret-key
```

---

## 🎯 Summary

✅ Use **SAME MongoDB** on all devices (it's in the cloud)
❌ Each device gets **DIFFERENT Ganache & contract address**
✅ Copy `.env` template but **update PASSPORT_REGISTRY_ADDRESS** after deploying
✅ All passport/travel data stays in MongoDB (shared)
⛓️ Each blockchain keeps its own transaction history

**That's it! 🚀**
