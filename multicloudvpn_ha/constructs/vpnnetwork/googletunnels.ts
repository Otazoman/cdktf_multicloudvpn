import { ComputeExternalVpnGateway } from "@cdktf/provider-google/lib/compute-external-vpn-gateway";
import { ComputeRouterInterface } from "@cdktf/provider-google/lib/compute-router-interface";
import { ComputeRouterPeer } from "@cdktf/provider-google/lib/compute-router-peer";
import { ComputeVpnTunnel } from "@cdktf/provider-google/lib/compute-vpn-tunnel";
import { GoogleProvider } from "@cdktf/provider-google/lib/provider";
import { Construct } from "constructs";

interface ExternalVpnGatewayParams {
  name: string;
  interfaces: { ipAddress: string }[];
}

interface TunnelConfig {
  preshared_key: string;
  cgw_inside_address: string;
  vgw_inside_address: string;
}

interface GoogleVpnParams {
  vpnTnnelname: string;
  routerInterfaceName: string;
  routerPeerName: string;
  tunnelCount: number;
  ikeVersion?: number;
  routerName: string;
  vpnGateway: {
    vpnGatewayId: string;
    peerAsn: number;
  };
  vpnConnections: TunnelConfig[];
  externalVpnGateway: ExternalVpnGatewayParams;
  connectDestination: string; // "AWS" or "Azure"
}

export function createGooglePeerTunnel(scope: Construct, provider: GoogleProvider, params: GoogleVpnParams) {
  // External Gateway
  const externalVpnGateway = new ComputeExternalVpnGateway(scope, params.externalVpnGateway.name, {
    provider: provider,
    name: params.externalVpnGateway.name,
    redundancyType: params.connectDestination === 'aws' ? "FOUR_IPS_REDUNDANCY" : "TWO_IPS_REDUNDANCY",
    interface: params.externalVpnGateway.interfaces.map((iface, index) => ({
      id: index,
      ipAddress: iface.ipAddress,
    })),
  });

  // Vpn Tunnel
  const vpnTunnels = params.vpnConnections.map((tunnel, index) => 
    new ComputeVpnTunnel(scope, `VpnTunnel${params.connectDestination}-${index + 1}`, {
      provider,
      name: `${params.vpnTnnelname}-${params.connectDestination}-${index + 1}`,
      vpnGateway: params.vpnGateway.vpnGatewayId,
      vpnGatewayInterface: Math.floor(index / 2),
      peerExternalGateway: externalVpnGateway.id,
      peerExternalGatewayInterface: index,
      sharedSecret: tunnel.preshared_key,
      router: params.routerName,
      ikeVersion: params.ikeVersion,
    })
  );

  // Peer Connection
  const routerInterfaces = vpnTunnels.map((tunnel, index) => {
    const tunnelIndex = index % 2;
    const connectionIndex = Math.floor(index / 2);

    return new ComputeRouterInterface(scope, `RouterInterface${params.connectDestination}-${index + 1}`, {
      provider,
      name: `${params.routerInterfaceName}-${params.connectDestination}-${index + 1}`,
      router: params.routerName,
      ipRange: `${params.vpnConnections[connectionIndex * 2 + tunnelIndex].cgw_inside_address}/30`,
      vpnTunnel: tunnel.name,
    });
  });

  const routerPeers = routerInterfaces.map((routerInterface, index) => {
    const tunnelIndex = index % 2;
    const connectionIndex = Math.floor(index / 2);

    return new ComputeRouterPeer(scope, `RouterPeer${params.connectDestination}-${index + 1}`, {
      provider,
      name: `${params.routerPeerName}-${params.connectDestination}-${index + 1}`,
      router: params.routerName,
      peerIpAddress: params.vpnConnections[connectionIndex * 2 + tunnelIndex].vgw_inside_address,
      peerAsn: params.vpnGateway.peerAsn,
      interface: routerInterface.name,
      advertiseMode: "CUSTOM",
      advertisedRoutePriority: 100,
      advertisedGroups: ["ALL_SUBNETS"],
    });
  });

  return {
    externalVpnGateway,
    vpnTunnels,
    routerInterfaces,
    routerPeers,
  };
}
