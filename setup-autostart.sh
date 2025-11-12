#!/bin/bash
# setup-autostart.sh - Configure services to start automatically on boot
# Run this once to ensure services start after VM reboot/import

echo "==========================================="
echo "Configuring Services for Automatic Startup"
echo "==========================================="
echo ""

# Enable services to start on boot
echo "Enabling services..."

sudo systemctl enable elasticsearch 2>/dev/null && echo "✅ Elasticsearch enabled" || echo "⚠ Could not enable elasticsearch"
sudo systemctl enable suricata 2>/dev/null && echo "✅ Suricata enabled" || echo "⚠ Could not enable suricata"
sudo systemctl enable filebeat 2>/dev/null && echo "✅ Filebeat enabled" || echo "⚠ Could not enable filebeat"
sudo systemctl enable zeek 2>/dev/null && echo "✅ Zeek enabled" || echo "⚠ Could not enable zeek (may not have systemd service)"

echo ""
echo "Creating startup script for Backend API..."

# Create a systemd service for the backend API
cat << 'EOF' | sudo tee /etc/systemd/system/syntra-backend.service > /dev/null
[Unit]
Description=Syntra IDS Backend API
After=network.target elasticsearch.service

[Service]
Type=simple
User=user
WorkingDirectory=/home/user/FYP_Test_2/Project-Syntra-main/user-api
ExecStart=/usr/bin/node server.js
Restart=on-failure
RestartSec=10
StandardOutput=append:/home/user/FYP_Test_2/Project-Syntra-main/user-api/server.log
StandardError=append:/home/user/FYP_Test_2/Project-Syntra-main/user-api/server.log

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable syntra-backend.service
echo "✅ Backend API service created and enabled"

echo ""
echo "==========================================="
echo "Auto-start Configuration Complete"
echo "==========================================="
echo ""
echo "Services will now start automatically on boot:"
echo "  • Elasticsearch"
echo "  • Suricata IDS"
echo "  • Zeek Network Monitor"
echo "  • Filebeat"
echo "  • Backend API"
echo ""
echo "To start services now without rebooting:"
echo "  sudo ./start-services.sh"
echo ""
echo "To check service status:"
echo "  ./check-services.sh"
echo ""
