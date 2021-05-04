#!/bin/bash

set -x
sudo apt-get update

# Our mac address will change and we cannot rely on default network configuration.
sudo rm /etc/netplan/50-cloud-init.yaml

# Fix networking.
echo "Create netplan config for enp0s3"
cat << 'EOF' | sudo tee /etc/netplan/01-netcfg.yaml;
network:
  version: 2
  ethernets:
    enp0s3:
      dhcp4: true
EOF

# redis
sudo apt-get -y install redis-server
sudo sed -i 's/supervised no/supervised systemd/g' /etc/redis/redis.conf
# Allow all incoming connections
sudo sed -i 's/bind 127.0.0.1 ::1/bind 0.0.0.0/g ' /etc/redis/redis.conf
sudo systemctl restart redis.service

