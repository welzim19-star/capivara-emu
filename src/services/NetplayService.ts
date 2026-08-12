import { registerPlugin } from '@capacitor/core';
const CapivaraEngine = registerPlugin<any>('CapivaraEngine');

/**
 * NetplayService (Input-Delay Architecture via WebRTC P2P)
 * Focado em 0-delay real (sem passar por servidor central).
 */
export class NetplayService {
  private peerConnection: RTCPeerConnection | null = null;
  private dataChannel: RTCDataChannel | null = null;
  
  public onOfferCreated?: (offerStr: string) => void;
  public onConnected?: () => void;
  public onDisconnected?: () => void;

  public initialize(isHost: boolean) {
    this.peerConnection = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });

    if (isHost) {
      this.dataChannel = this.peerConnection.createDataChannel('netplay', {
        ordered: true,
        maxRetransmits: 0 // Fast UDP-like behavior
      });
      this.setupDataChannel();

      this.peerConnection.createOffer().then(offer => {
        this.peerConnection!.setLocalDescription(offer);
      });
    } else {
      this.peerConnection.ondatachannel = (event) => {
        this.dataChannel = event.channel;
        this.setupDataChannel();
      };
    }

    this.peerConnection.onicecandidate = (event) => {
      if (!event.candidate && this.peerConnection?.localDescription) {
        // ICE gathering finished, emit full SDP
        const sdp = btoa(JSON.stringify(this.peerConnection.localDescription));
        if (this.onOfferCreated) this.onOfferCreated(sdp);
      }
    };
    
    this.peerConnection.onconnectionstatechange = () => {
      if (this.peerConnection?.connectionState === 'connected') {
        if (this.onConnected) this.onConnected();
      } else if (this.peerConnection?.connectionState === 'disconnected' || this.peerConnection?.connectionState === 'failed') {
        if (this.onDisconnected) this.onDisconnected();
      }
    };
  }

  private setupDataChannel() {
    if (!this.dataChannel) return;
    this.dataChannel.onmessage = (event) => {
      try {
        const input = JSON.parse(event.data);
        // Inject remote input to Port 1 (Player 2)
        if (input.type === 'button') {
          CapivaraEngine.sendInput({ port: 1, button: input.button, isPressed: input.isPressed });
        } else if (input.type === 'analog') {
          CapivaraEngine.sendAnalog({ port: 1, stick: input.stick, x: input.x, y: input.y });
        }
      } catch (e) {
        console.error("Netplay Sync Error", e);
      }
    };
  }

  public async acceptOffer(sdpBase64: string): Promise<string | null> {
    if (!this.peerConnection) return null;
    try {
      const desc = JSON.parse(atob(sdpBase64));
      await this.peerConnection.setRemoteDescription(desc);
      if (desc.type === 'offer') {
        const answer = await this.peerConnection.createAnswer();
        await this.peerConnection.setLocalDescription(answer);
        return new Promise(resolve => {
          this.peerConnection!.onicecandidate = (event) => {
            if (!event.candidate) {
               resolve(btoa(JSON.stringify(this.peerConnection!.localDescription)));
            }
          };
        });
      }
      return null;
    } catch (e) {
      console.error(e);
      return null;
    }
  }

  // Hook this to local input events
  public broadcastButton(button: number, isPressed: boolean) {
    if (this.dataChannel?.readyState === 'open') {
      this.dataChannel.send(JSON.stringify({ type: 'button', button, isPressed }));
    }
  }

  public broadcastAnalog(stick: number, x: number, y: number) {
    if (this.dataChannel?.readyState === 'open') {
      this.dataChannel.send(JSON.stringify({ type: 'analog', stick, x, y }));
    }
  }

  public disconnect() {
    this.dataChannel?.close();
    this.peerConnection?.close();
  }
}

export const netplay = new NetplayService();
