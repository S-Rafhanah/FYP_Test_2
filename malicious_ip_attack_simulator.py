#!/usr/bin/env python3
"""
Malicious IP Attack Simulator
Fetches real malicious IPs from AbuseIPDB and simulates attacks from those IPs.
Safe for demonstration - uses controlled packet rates.
"""

import requests
import json
import subprocess
import time
import sys
from datetime import datetime

# Configuration
ABUSEIPDB_API_KEY = "e618238158897f414b8babd47796198683ec12cac82e20e8ba45d5b7616125c3c47666c8574c1f2d"  # Replace with your actual API key
TARGET_IP = "192.168.56.128"  # Your target server
TARGET_PORT = 80

# Attack parameters (SAFE VALUES)
TOTAL_PACKETS = 50  # Total packets to send
PACKETS_PER_SECOND = 5  # Rate limit (very gentle)
COUNTRIES = ["CN", "RU", "US", "BR", "IN", "KR"]  # Countries to fetch IPs from

def fetch_malicious_ips(api_key, limit=10):
    """
    Fetch malicious IPs from AbuseIPDB with high confidence scores
    Returns list of {ip, country, abuseScore} dictionaries
    """
    print(f"[*] Fetching malicious IPs from AbuseIPDB...")

    url = "https://api.abuseipdb.com/api/v2/blacklist"

    headers = {
        'Accept': 'application/json',
        'Key': api_key
    }

    params = {
        'confidenceMinimum': 90,  # High confidence malicious IPs
        'limit': limit,
    }

    try:
        response = requests.get(url, headers=headers, params=params, timeout=10)
        response.raise_for_status()

        data = response.json()

        if 'data' not in data:
            print(f"[!] Error: {data.get('errors', 'Unknown error')}")
            return []

        malicious_ips = []
        for entry in data['data']:
            malicious_ips.append({
                'ip': entry['ipAddress'],
                'country': entry.get('countryCode', 'UN'),
                'score': entry.get('abuseConfidenceScore', 0)
            })

        print(f"[+] Fetched {len(malicious_ips)} malicious IPs")
        for ip_data in malicious_ips:
            print(f"    - {ip_data['ip']} ({ip_data['country']}) - Score: {ip_data['score']}")

        return malicious_ips

    except requests.exceptions.RequestException as e:
        print(f"[!] Error fetching IPs from AbuseIPDB: {e}")
        return []

def fetch_malicious_ips_by_country(api_key, country_code):
    """
    Fetch a malicious IP from a specific country
    """
    url = "https://api.abuseipdb.com/api/v2/blacklist"

    headers = {
        'Accept': 'application/json',
        'Key': api_key
    }

    params = {
        'confidenceMinimum': 75,
        'limit': 50,
    }

    try:
        response = requests.get(url, headers=headers, params=params, timeout=10)
        response.raise_for_status()
        data = response.json()

        if 'data' not in data:
            return None

        # Find IP from specific country
        for entry in data['data']:
            if entry.get('countryCode') == country_code:
                return {
                    'ip': entry['ipAddress'],
                    'country': country_code,
                    'score': entry.get('abuseConfidenceScore', 0)
                }

        return None

    except Exception as e:
        print(f"[!] Error fetching IP for {country_code}: {e}")
        return None

def send_spoofed_syn_packet(source_ip, target_ip, target_port):
    """
    Send a single spoofed SYN packet using hping3
    """
    cmd = [
        'hping3',
        '-S',  # SYN flag
        '-p', str(target_port),
        '-a', source_ip,  # Spoof source IP
        '-c', '1',  # Send only 1 packet
        '--fast',  # Fast mode
        target_ip
    ]

    try:
        subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=5)
        return True
    except Exception as e:
        print(f"[!] Error sending packet from {source_ip}: {e}")
        return False

def simulate_distributed_attack(malicious_ips, target_ip, target_port, total_packets, rate):
    """
    Simulate a distributed attack using real malicious IPs
    """
    if not malicious_ips:
        print("[!] No malicious IPs available. Cannot simulate attack.")
        return

    print(f"\n[*] Starting attack simulation...")
    print(f"[*] Target: {target_ip}:{target_port}")
    print(f"[*] Total packets: {total_packets}")
    print(f"[*] Rate: {rate} packets/second")
    print(f"[*] Source IPs: {len(malicious_ips)} malicious IPs from AbuseIPDB")
    print(f"[*] Duration: ~{total_packets / rate:.1f} seconds")
    print()

    delay = 1.0 / rate  # Delay between packets

    for i in range(total_packets):
        # Rotate through malicious IPs
        ip_data = malicious_ips[i % len(malicious_ips)]
        source_ip = ip_data['ip']

        print(f"[{i+1}/{total_packets}] Sending SYN from {source_ip} ({ip_data['country']}) - Score: {ip_data['score']}", end='')

        success = send_spoofed_syn_packet(source_ip, target_ip, target_port)

        if success:
            print(" ✓")
        else:
            print(" ✗")

        # Rate limiting - sleep between packets
        time.sleep(delay)

    print(f"\n[+] Attack simulation complete!")
    print(f"[+] Check your IDS dashboard for alerts from these malicious IPs")

def check_prerequisites():
    """
    Check if required tools are installed
    """
    # Check for hping3
    try:
        subprocess.run(['which', 'hping3'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
    except subprocess.CalledProcessError:
        print("[!] Error: hping3 is not installed")
        print("[!] Install with: sudo apt install hping3")
        return False

    # Check for root privileges
    import os
    if os.geteuid() != 0:
        print("[!] Error: This script requires root privileges for packet spoofing")
        print("[!] Run with: sudo python3 malicious_ip_attack_simulator.py")
        return False

    return True

def main():
    print("=" * 70)
    print("  Malicious IP Attack Simulator - Safe Demo Mode")
    print("  Powered by AbuseIPDB")
    print("=" * 70)
    print()

    # Check prerequisites
    if not check_prerequisites():
        sys.exit(1)

    # Validate API key
    if ABUSEIPDB_API_KEY == "YOUR_API_KEY_HERE" or not ABUSEIPDB_API_KEY:
        print("[!] Error: Please set your AbuseIPDB API key in the script")
        print("[!] Edit ABUSEIPDB_API_KEY variable at the top of this file")
        sys.exit(1)

    # Fetch malicious IPs
    print(f"[*] Fetching malicious IPs from diverse countries: {', '.join(COUNTRIES)}")
    malicious_ips = fetch_malicious_ips(ABUSEIPDB_API_KEY, limit=20)

    if not malicious_ips:
        print("[!] Failed to fetch malicious IPs. Exiting.")
        sys.exit(1)

    # Display summary
    print(f"\n[+] Using {len(malicious_ips)} malicious IPs for simulation")

    countries_found = {}
    for ip_data in malicious_ips:
        country = ip_data['country']
        countries_found[country] = countries_found.get(country, 0) + 1

    print(f"[+] Countries represented: {', '.join(f'{k}({v})' for k, v in countries_found.items())}")

    # Confirm before starting
    print(f"\n[?] Ready to simulate attack on {TARGET_IP}:{TARGET_PORT}")
    print(f"[?] This will send {TOTAL_PACKETS} packets at {PACKETS_PER_SECOND} packets/second")
    response = input("[?] Continue? (yes/no): ")

    if response.lower() not in ['yes', 'y']:
        print("[!] Aborted by user")
        sys.exit(0)

    # Run attack simulation
    simulate_distributed_attack(
        malicious_ips,
        TARGET_IP,
        TARGET_PORT,
        TOTAL_PACKETS,
        PACKETS_PER_SECOND
    )

    print(f"\n[+] Simulation complete at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"[+] Your IDS should now show alerts from known malicious IPs!")

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n[!] Interrupted by user")
        sys.exit(0)
