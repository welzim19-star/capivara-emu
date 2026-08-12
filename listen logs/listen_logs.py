import socket
import datetime

# Create a UDP socket
sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)

# Bind to all interfaces on port 9999
server_address = ('0.0.0.0', 9999)
print(f"[*] Escutando os Logs do Capivara-Emu na porta {server_address[1]}...")
sock.bind(server_address)

while True:
    data, address = sock.recvfrom(4096)
    timestamp = datetime.datetime.now().strftime("%H:%M:%S.%f")[:-3]
    try:
        msg = data.decode('utf-8').strip()
        print(f"[{timestamp}] [{address[0]}] {msg}")
    except:
        print(f"[{timestamp}] [{address[0]}] (Raw Bytes) {data}")
