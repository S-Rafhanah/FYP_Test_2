#!/bin/bash
# setup-network.sh - Auto-configure IDS for current VM network
# Run this script after importing the VM on a new machine

set -e

echo "==========================================="
echo "IDS Network Configuration Setup"
echo "==========================================="
echo ""

# Detect the VM's IP address on 192.168.56.x network
VM_IP=$(ip addr show | grep -oP '192\.168\.56\.\d+' | head -1)

if [ -z "$VM_IP" ]; then
    echo "❌ Error: Could not detect 192.168.56.x IP address"
    echo "   Please ensure VM is connected to the correct network"
    exit 1
fi

echo "✅ Detected VM IP: $VM_IP"
echo ""

# Update frontend .env file
ENV_FILE="/home/user/FYP_Test_2/Project-Syntra-main/.env"
echo "📝 Updating frontend configuration..."

cat > "$ENV_FILE" << EOF
GENERATE_SOURCEMAP=false

# Configure this with your VM's network IP (192.168.56.x)
# This allows access from other machines on the same network
REACT_APP_API_URL=http://$VM_IP:3001
EOF

echo "✅ Updated $ENV_FILE with IP: $VM_IP"
echo ""

# Rebuild frontend
echo "🔨 Rebuilding frontend application..."
cd /home/user/FYP_Test_2/Project-Syntra-main

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies first..."
    npm install
fi

npm run build

echo "✅ Frontend rebuilt successfully"
echo ""

# Display access instructions
echo "==========================================="
echo "✅ Configuration Complete!"
echo "==========================================="
echo ""
echo "VM IP Address: $VM_IP"
echo ""
echo "To start the IDS:"
echo "  1. Start backend: cd /home/user/FYP_Test_2/Project-Syntra-main/user-api && node server.js &"
echo "  2. Start frontend: cd /home/user/FYP_Test_2/Project-Syntra-main && npm start &"
echo "  3. Start Suricata: sudo systemctl start suricata"
echo "  4. Start Zeek: sudo systemctl start zeek"
echo ""
echo "Access the dashboard from your laptop:"
echo "  http://$VM_IP:3000"
echo ""
echo "Test connectivity:"
echo "  ping $VM_IP"
echo "  curl http://$VM_IP:3001/api/health"
echo ""
echo "==========================================="
